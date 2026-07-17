'use strict';

// #241: 重複照合バッジ（#156）の純粋関数テスト。
// 対象: chrome-extension/openalex_panel.js（照合ロジック）と
//       chrome-extension/weko3_opensearch_core.js（共通コア）。
// parseRepoSearch は parseXml を注入して DOM 非依存でテストする。

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeTitleForSearch,
  parseRepoSearch,
  classifyMatch,
  bareDoi,
  isAllowedHost,
  normalizeJpcoarItemOrder,
  buildWorksUrl,
  buildRepoSearchUrl,
  matchAgainstRepo,
} = require('../chrome-extension/openalex_panel.js');

// buildWorksUrl は CONFIG グローバル（APIキー）を参照するためスタブを用意
global.CONFIG = global.CONFIG || { OpenAlex_API_KEY: '' };

const core = require('../chrome-extension/weko3_opensearch_core.js');

// ---- テスト用の軽量 XML パーサースタブ ----
// records: [{ itemUrl, dois: [doi, ...] }]（ページ内の列挙順のまま）
function fakeXml(records, { parserError = false } = {}) {
  const descriptions = records.map(rec => ({
    getAttributeNS: (_ns, name) => (name === 'about' ? (rec.itemUrl || '') : ''),
    getAttribute: () => '',
    getElementsByTagName: () => (rec.dois || []).map(d => ({ localName: 'identifier', textContent: d })),
  }));
  return {
    querySelector: () => (parserError ? {} : null),
    getElementsByTagNameNS: () => descriptions,
  };
}
const parseWith = records => xmlText => fakeXml(records);

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => body };
}

// ============================================================
// normalizeTitleForSearch
// ============================================================
test('normalizeTitleForSearch: タグ片・エンティティを除去し先頭12語に切り詰める', () => {
  assert.strictEqual(
    normalizeTitleForSearch('A <i>study</i> of &amp; things'),
    'A study of things',
  );
  const long = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ');
  assert.strictEqual(normalizeTitleForSearch(long).split(' ').length, 12);
  assert.strictEqual(normalizeTitleForSearch(''), '');
  assert.strictEqual(normalizeTitleForSearch(null), '');
});

// ============================================================
// bareDoi（コア）
// ============================================================
test('bareDoi: プレフィックスを除去し小文字化する', () => {
  assert.strictEqual(bareDoi('https://doi.org/10.1/AbC'), '10.1/abc');
  assert.strictEqual(bareDoi('https://dx.doi.org/10.1/AbC'), '10.1/abc');
  assert.strictEqual(bareDoi('doi:10.1/AbC'), '10.1/abc');
  assert.strictEqual(bareDoi(''), '');
});

// ============================================================
// normalizeJpcoarItemOrder（コア・改善1）
// ============================================================
test('normalizeJpcoarItemOrder: 配列を逆順にする（元配列は非破壊）', () => {
  const src = [1, 2, 3];
  assert.deepStrictEqual(normalizeJpcoarItemOrder(src), [3, 2, 1]);
  assert.deepStrictEqual(src, [1, 2, 3]);
});

test('openalex_panel の再エクスポートはコア本体と同一関数', () => {
  assert.strictEqual(bareDoi, core.bareDoi);
  assert.strictEqual(isAllowedHost, core.isAllowedHost);
  assert.strictEqual(normalizeJpcoarItemOrder, core.normalizeJpcoarItemOrder);
});

// ============================================================
// parseRepoSearch（改善1: 逆順補正 + パーサー注入）
// ============================================================
test('parseRepoSearch: 各レコードの DOI を抽出する', () => {
  const items = parseRepoSearch('<xml/>', parseWith([
    { itemUrl: 'https://repo.example/records/1', dois: ['10.1000/aaa'] },
  ]));
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].itemUrl, 'https://repo.example/records/1');
  assert.ok(items[0].dois.has('10.1000/aaa'));
});

test('parseRepoSearch: ページ内の逆順を API 指定順へ補正する（改善1）', () => {
  // ページ列挙順（fakeXml へ渡す順）= [pageTop, pageBottom]
  // WEKO3 はページ内で逆順に列挙するため、補正後の先頭は pageBottom になる。
  const items = parseRepoSearch('<xml/>', parseWith([
    { itemUrl: 'pageTop', dois: [] },
    { itemUrl: 'pageBottom', dois: [] },
  ]));
  assert.deepStrictEqual(items.map(i => i.itemUrl), ['pageBottom', 'pageTop']);
});

test('parseRepoSearch: parsererror を検出すると例外を投げる', () => {
  assert.throws(
    () => parseRepoSearch('<xml/>', () => fakeXml([], { parserError: true })),
    /XML解析/,
  );
});

// ============================================================
// classifyMatch（3値判定・改善1）
// ============================================================
test('classifyMatch: ヒットなしは green', () => {
  assert.deepStrictEqual(classifyMatch([], '10.1/x'), { kind: 'green' });
});

test('classifyMatch: 候補 DOI 一致は red（該当レコードの itemUrl）', () => {
  const items = [
    { itemUrl: 'A', dois: new Set() },
    { itemUrl: 'B', dois: new Set(['10.1/match']) },
  ];
  assert.deepStrictEqual(classifyMatch(items, 'https://doi.org/10.1/MATCH'), { kind: 'red', itemUrl: 'B' });
});

test('classifyMatch: DOI 不一致は yellow（先頭ヒットの itemUrl）', () => {
  const items = [
    { itemUrl: 'first', dois: new Set(['10.1/other']) },
    { itemUrl: 'second', dois: new Set() },
  ];
  assert.deepStrictEqual(classifyMatch(items, '10.1/x'), { kind: 'yellow', itemUrl: 'first' });
});

test('改善1: parseRepoSearch → classifyMatch で 🟡 代表リンクが API 順の先頭を指す', () => {
  // ページ列挙順 [pageTop, pageBottom] → 補正後 [pageBottom, pageTop]。
  // DOI 不一致なので yellow、その itemUrl は補正後の先頭 = pageBottom。
  const items = parseRepoSearch('<xml/>', parseWith([
    { itemUrl: 'pageTop', dois: [] },
    { itemUrl: 'pageBottom', dois: [] },
  ]));
  assert.deepStrictEqual(classifyMatch(items, '10.1/nomatch'), { kind: 'yellow', itemUrl: 'pageBottom' });
});

// ============================================================
// matchAgainstRepo（改善2: DOI ID検索 → タイトル検索）
// ============================================================
test('buildRepoSearchUrl: DOI中の `/` を保持しID検索パラメータを設定する', () => {
  const url = new URL(buildRepoSearchUrl('https://example.repo.nii.ac.jp/', {
    id: '10.1234/example',
    id_attr: 'DOI',
  }));
  assert.strictEqual(url.pathname, '/api/opensearch/search');
  assert.strictEqual(url.searchParams.get('id'), '10.1234/example');
  assert.strictEqual(url.searchParams.get('id_attr'), 'DOI');
  assert.strictEqual(url.searchParams.get('format'), 'jpcoar');
  assert.strictEqual(url.searchParams.get('size'), '20');
  assert.strictEqual(url.searchParams.get('page'), '1');
});

test('matchAgainstRepo: DOI完全一致なら1回の検索でred確定（via: doi）', async () => {
  const calls = [];
  const result = await matchAgainstRepo('https://example.repo.nii.ac.jp/', 'unused title', '10.1234/MATCH', {
    fetchImpl: async url => {
      calls.push(new URL(url));
      return response('doi-hit');
    },
    parseXml: () => fakeXml([{ itemUrl: 'record-1', dois: ['10.1234/match'] }]),
  });
  assert.deepStrictEqual(result, { kind: 'red', itemUrl: 'record-1', via: 'doi' });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].searchParams.get('id'), '10.1234/match');
  assert.strictEqual(calls[0].searchParams.get('id_attr'), 'DOI');
});

test('matchAgainstRepo: DOI不一致でもselfDOI完全一致なら2回目でred確定する', async () => {
  const calls = [];
  const result = await matchAgainstRepo('https://example.repo.nii.ac.jp/', 'unused title', '10.34556/0002000483', {
    fetchImpl: async url => {
      calls.push(new URL(url));
      return response(calls.length === 1 ? 'doi-miss' : 'self-doi-hit');
    },
    parseXml: text => text === 'doi-miss'
      ? fakeXml([])
      : fakeXml([{ itemUrl: 'jircas-record', dois: ['10.34556/0002000483'] }]),
  });
  assert.deepStrictEqual(result, { kind: 'red', itemUrl: 'jircas-record', via: 'doi' });
  assert.strictEqual(calls.length, 2);
  assert.deepStrictEqual(calls.map(url => url.searchParams.get('id_attr')), ['DOI', 'selfDOI']);
});

test('matchAgainstRepo: DOIとselfDOIが不一致ならタイトル検索へフォールバックする', async () => {
  const calls = [];
  const result = await matchAgainstRepo('https://example.repo.nii.ac.jp/', 'A study title', '10.1234/target', {
    fetchImpl: async url => {
      const parsed = new URL(url);
      calls.push(parsed);
      return response(parsed.searchParams.has('title') ? 'title-hit' : 'doi-miss');
    },
    parseXml: text => text === 'doi-miss'
      ? fakeXml([{ itemUrl: 'other', dois: ['10.1234/other'] }])
      : fakeXml([{ itemUrl: 'target', dois: ['10.1234/target'] }]),
  });
  assert.deepStrictEqual(result, { kind: 'red', itemUrl: 'target' });
  assert.strictEqual(calls.length, 3);
  assert.deepStrictEqual(calls.slice(0, 2).map(url => url.searchParams.get('id_attr')), ['DOI', 'selfDOI']);
  assert.strictEqual(calls[2].searchParams.get('title'), 'A study title');
  assert.strictEqual(calls[2].searchParams.has('id'), false);
});

test('matchAgainstRepo: DOIが空ならID検索を行わずタイトル検索だけを1回行う', async () => {
  const calls = [];
  const result = await matchAgainstRepo('https://example.repo.nii.ac.jp/', 'Title only', '', {
    fetchImpl: async url => {
      calls.push(new URL(url));
      return response('title-empty');
    },
    parseXml: () => fakeXml([]),
  });
  assert.deepStrictEqual(result, { kind: 'green' });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].searchParams.get('title'), 'Title only');
  assert.strictEqual(calls[0].searchParams.has('id'), false);
});

test('matchAgainstRepo: DOI検索のHTTPエラーはselfDOI・タイトル検索へ進まずerrorにする', async () => {
  let calls = 0;
  const result = await matchAgainstRepo('https://example.repo.nii.ac.jp/', 'must not run', '10.1/x', {
    fetchImpl: async () => {
      calls++;
      return response('', { ok: false, status: 503 });
    },
    parseXml: () => fakeXml([]),
  });
  assert.strictEqual(result.kind, 'error');
  assert.match(result.message, /DOI検索 HTTP 503/);
  assert.strictEqual(calls, 1);
});

test('matchAgainstRepo: selfDOI検索のHTTPエラーはタイトル検索へ進まずerrorにする', async () => {
  const calls = [];
  const result = await matchAgainstRepo('https://example.repo.nii.ac.jp/', 'must not run', '10.1234/x', {
    fetchImpl: async url => {
      const parsed = new URL(url);
      calls.push(parsed);
      return parsed.searchParams.get('id_attr') === 'DOI'
        ? response('doi-miss')
        : response('', { ok: false, status: 503 });
    },
    parseXml: () => fakeXml([]),
  });
  assert.strictEqual(result.kind, 'error');
  assert.match(result.message, /selfDOI検索 HTTP 503/);
  assert.strictEqual(calls.length, 2);
});

test('matchAgainstRepo: DOI検索のXML解析エラーはタイトル検索せずerrorにする', async () => {
  let calls = 0;
  const result = await matchAgainstRepo('https://example.repo.nii.ac.jp/', 'must not run', '10.1/x', {
    fetchImpl: async () => {
      calls++;
      return response('broken-xml');
    },
    parseXml: () => fakeXml([], { parserError: true }),
  });
  assert.strictEqual(result.kind, 'error');
  assert.match(result.message, /XML解析/);
  assert.strictEqual(calls, 1);
});

// ============================================================
// buildWorksUrl（資源タイプ複数選択・OpenAlex type フィルタ OR）
// ============================================================
function typeFilterOf(url) {
  const filter = new URL(url).searchParams.get('filter');
  return (filter.split(',').find(f => f.startsWith('type:')) || '').replace(/^type:/, '');
}

test('buildWorksUrl: 資源タイプ未選択（空配列）なら type フィルタを付けない', () => {
  const url = buildWorksUrl('https://ror.org/x', '2026-01-01', [], '*');
  assert.ok(!new URL(url).searchParams.get('filter').includes('type:'));
});

test('buildWorksUrl: 単一タイプは type:<value>', () => {
  const url = buildWorksUrl('https://ror.org/x', '2026-01-01', ['article'], '*');
  assert.strictEqual(typeFilterOf(url), 'article');
});

test('buildWorksUrl: 複数タイプは `|`（OR）で連結する', () => {
  const url = buildWorksUrl('https://ror.org/x', '2026-01-01', ['article', 'review', 'book-chapter'], '*');
  assert.strictEqual(typeFilterOf(url), 'article|review|book-chapter');
});

test('buildWorksUrl: 後方互換で単一文字列も受け付ける', () => {
  const url = buildWorksUrl('https://ror.org/x', '2026-01-01', 'article', '*');
  assert.strictEqual(typeFilterOf(url), 'article');
});

// ============================================================
// isAllowedHost（改善3）
// ============================================================
test('isAllowedHost: HTTPS の *.repo.nii.ac.jp と固定追加許可ホストのみ許可', () => {
  assert.strictEqual(isAllowedHost('https://foo.repo.nii.ac.jp/'), true);
  assert.strictEqual(isAllowedHost('https://repository.jircas.go.jp/'), true);
  assert.strictEqual(isAllowedHost('http://foo.repo.nii.ac.jp/'), false);   // HTTP は不可
  assert.strictEqual(isAllowedHost('https://evil.example.com/'), false);    // 許可外
  assert.strictEqual(isAllowedHost('not a url'), false);                    // URL 不正
});

// ============================================================
// 許可ホスト定義と manifest.json の整合（改善3）
// ============================================================
test('ALLOWED_HOSTS_EXTRA の各ホストが manifest.json の host_permissions に存在する', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../chrome-extension/manifest.json'), 'utf8'),
  );
  const hostPerms = new Set(manifest.host_permissions);
  for (const host of core.ALLOWED_HOSTS_EXTRA) {
    assert.ok(
      hostPerms.has(`https://${host}/*`),
      `manifest.host_permissions に https://${host}/* がありません`,
    );
  }
  // *.repo.nii.ac.jp ワイルドカードも登録されていること
  assert.ok(hostPerms.has('https://*.repo.nii.ac.jp/*'));
});
