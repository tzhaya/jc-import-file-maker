'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildUrl,
  normalizeQuery,
  validateQuery,
  normalizeJpcoarItemOrder,
  fetchJpcoar,
  RESOURCE_TYPES,
  ID_ATTRS,
} = require('../chrome-extension/opensearch_panel.js');

function parseVocabularySource() {
  const source = fs.readFileSync(path.join(__dirname, '../docs/resource_type_vocabulary.md'), 'utf8');
  const statusMap = { 'v1.0': 'v1.0', 'v2.0追加': 'v2.0', 'v1.0のみ': 'v1.0only' };
  return source.split(/\r?\n/).flatMap(line => {
    if (!line.startsWith('|') || !line.endsWith('|')) return [];
    const columns = line.slice(1, -1).split('|').map(value => value.trim().replace(/^\*\*|\*\*$/g, ''));
    if (columns.length !== 5 || !statusMap[columns[4]]) return [];
    return [{ en: columns[0], ja: columns[1], status: statusMap[columns[4]] }];
  });
}

test('RESOURCE_TYPES は語彙文書の78件と順序・名称・区分が一致する', () => {
  const sourceTypes = parseVocabularySource();
  assert.strictEqual(sourceTypes.length, 78);
  assert.deepStrictEqual(RESOURCE_TYPES, sourceTypes);
  assert.deepStrictEqual(
    Object.fromEntries(['v1.0', 'v2.0', 'v1.0only'].map(status => [status, RESOURCE_TYPES.filter(type => type.status === status).length])),
    { 'v1.0': 43, 'v2.0': 31, 'v1.0only': 4 },
  );
  assert.strictEqual(new Set(RESOURCE_TYPES.map(type => type.en)).size, 78);
  assert.ok(RESOURCE_TYPES.some(type => type.en === 'conference output'));
  assert.ok(!RESOURCE_TYPES.some(type => type.en === 'conference object'));
});

test('ID_ATTRS は仕様の11種と一致する', () => {
  assert.deepStrictEqual(ID_ATTRS, ['DOI', 'selfDOI', 'ISBN', 'ISSN', 'NCID', 'PMID', 'NAID', 'ICHUSHI', 'URI', 'fullTextURL', 'identifier']);
});

test('normalizeQuery は空値を除外し、標準・詳細項目をtrimする', () => {
  assert.deepStrictEqual(normalizeQuery({
    keyword: ' WebAPI ', title: ' Title ', creator: ' HAYASHI, Takanori ', des: ' ', type: 'journal article',
    subject: ' agriculture ', publisher: ' JIRCAS ', lang: ' eng ', srctitle: ' Journal ', wid: ' 0000-0002-5189-1865 ',
  }), {
    keyword: 'WebAPI', title: 'Title', creator: 'HAYASHI, Takanori', type: 'journal article', subject: 'agriculture',
    publisher: 'JIRCAS', lang: 'eng', srctitle: 'Journal', wid: '0000-0002-5189-1865',
  });
});

test('normalizeQuery はタイトルがある場合だけ完全一致を付与する', () => {
  assert.strictEqual(normalizeQuery({ title: 'Open Access', exactTitleMatch: true }).exact_title_match, 'true');
  assert.deepStrictEqual(normalizeQuery({ title: ' ', exactTitleMatch: true }), {});
});

test('normalizeQuery はID値とID種別を保持する', () => {
  assert.deepStrictEqual(normalizeQuery({ id: ' AA12622284 ', idAttr: 'NCID' }), { id: 'AA12622284', id_attr: 'NCID' });
});

test('validateQuery は空条件とID片側欠落を拒否する', () => {
  assert.deepStrictEqual(validateQuery({}).code, 'empty-query');
  assert.deepStrictEqual(validateQuery({ id: '10.1/example' }), {
    ok: false, code: 'missing-id-attr', message: 'ID種別を選択してください。', focusId: 'q-id-attr',
  });
  assert.deepStrictEqual(validateQuery({ id_attr: 'DOI' }), {
    ok: false, code: 'missing-id', message: 'IDを入力してください。', focusId: 'q-id',
  });
  assert.strictEqual(validateQuery({ id: 'AA12622284', id_attr: 'NCID' }).ok, true);
  assert.strictEqual(validateQuery({ creator: 'Hayashi' }).ok, true);
});

test('buildUrl は固定値、検索条件、sortを正しく生成する', () => {
  const url = new URL(buildUrl('https://jircas.repo.nii.ac.jp/path', {
    keyword: 'open access', creator: 'HAYASHI, Takanori', type: 'conference output',
  }, 2, '-createdate'));
  assert.strictEqual(url.origin, 'https://jircas.repo.nii.ac.jp');
  assert.strictEqual(url.pathname, '/api/opensearch/search');
  assert.strictEqual(url.searchParams.get('format'), 'jpcoar');
  assert.strictEqual(url.searchParams.get('size'), '20');
  assert.strictEqual(url.searchParams.get('page'), '2');
  assert.strictEqual(url.searchParams.get('keyword'), 'open access');
  assert.strictEqual(url.searchParams.get('creator'), 'HAYASHI, Takanori');
  assert.strictEqual(url.searchParams.get('type'), 'conference output');
  assert.strictEqual(url.searchParams.get('sort'), '-createdate');
});

test('buildUrl は全標準・詳細・ID検索パラメータを直列化する', () => {
  const query = {
    keyword: 'keyword', title: 'title', exact_title_match: 'true', creator: 'creator', des: 'description',
    type: 'journal article', id: 'AA12622284', id_attr: 'NCID', subject: 'subject', publisher: 'publisher',
    lang: 'jpn', srctitle: 'source title', wid: '157097',
  };
  const params = new URL(buildUrl('https://example.repo.nii.ac.jp/', query, 1)).searchParams;
  Object.entries(query).forEach(([key, value]) => assert.strictEqual(params.get(key), value));
});

test('buildUrl は特殊文字をURLSearchParamsで保持する', () => {
  const value = '空白, comma/slash & ampersand';
  const url = new URL(buildUrl('https://tsukuba.repo.nii.ac.jp/', { title: value }, 1));
  assert.strictEqual(url.searchParams.get('title'), value);
});

test('buildUrl は空値・未許可項目・不正sortを生成しない', () => {
  const url = new URL(buildUrl('https://example.repo.nii.ac.jp/', {
    title: '', version: 'VoR', mimetype: 'application/pdf', date_range1_from: '2024-01-01', license: 'x',
  }, 1, 'updatedate'));
  for (const key of ['title', 'version', 'mimetype', 'date_range1_from', 'license', 'sort']) {
    assert.strictEqual(url.searchParams.has(key), false);
  }
});

test('言語検索はlanguageではなくlangパラメータを使用する', () => {
  const query = normalizeQuery({ lang: 'jpn', language: 'eng' });
  assert.deepStrictEqual(query, { lang: 'jpn' });
  const params = new URL(buildUrl('https://example.repo.nii.ac.jp/', query, 1)).searchParams;
  assert.strictEqual(params.get('lang'), 'jpn');
  assert.strictEqual(params.has('language'), false);
});

test('normalizeJpcoarItemOrder はページ内を逆順にし、入力を変更しない', () => {
  const input = ['a', 'b', 'c'];
  assert.deepStrictEqual(normalizeJpcoarItemOrder(input), ['c', 'b', 'a']);
  assert.deepStrictEqual(input, ['a', 'b', 'c']);
  assert.deepStrictEqual(normalizeJpcoarItemOrder(['page2-a', 'page2-b']), ['page2-b', 'page2-a']);
});

test('fetchJpcoar はAcceptヘッダー等のオプションを付けずにfetchする', async () => {
  let receivedArgs;
  const response = { ok: true };
  const result = await fetchJpcoar('https://example.repo.nii.ac.jp/api/opensearch/search?format=jpcoar', (...args) => {
    receivedArgs = args;
    return Promise.resolve(response);
  });
  assert.strictEqual(result, response);
  assert.deepStrictEqual(receivedArgs, ['https://example.repo.nii.ac.jp/api/opensearch/search?format=jpcoar']);
});
