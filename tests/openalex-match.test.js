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
} = require('../chrome-extension/openalex_panel.js');

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
