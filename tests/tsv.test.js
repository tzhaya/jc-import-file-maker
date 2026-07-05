'use strict';
// #192: TSV 生成の単体テスト（node:test）
// 対象: chrome-extension/make_jc_importer.js の generateTsv
//
// generateTsv は TSV_HEADERS_TEMPLATE をグローバル参照する（遅延参照）。
// Node では実テンプレート data/tsv_headers.json を global に注入して供給する。
// data/tsv_headers.json は CI（scripts/check.js）でテンプレートと構造一致が保証済。

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// require より前に注入しておく（generateTsv は呼び出し時参照なので前後どちらでも可だが明示的に前へ）
global.TSV_HEADERS_TEMPLATE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'tsv_headers.json'), 'utf8')
);

const { generateTsv } = require('../chrome-extension/make_jc_importer.js');

function sampleMetadata(overrides = {}) {
  return {
    system: { doi: '10.1/x', pubdate: '2026-01-01' },
    item_30002_title0: [{ subitem_title: 'Sample Title', subitem_title_language: 'en' }],
    ...overrides,
  };
}

test('generateTsv: 空配列は null', () => {
  assert.strictEqual(generateTsv([]), null);
});

test('generateTsv: 単一 metadata は 5 ヘッダ行 + 1 データ行（末尾改行）', () => {
  const tsv = generateTsv([sampleMetadata()], '', '');
  const lines = tsv.split('\n');
  // 末尾に改行が付くため split で最後に空要素が1つ入る → 5 + 1 + 1(空)
  assert.strictEqual(lines[lines.length - 1], '');
  assert.strictEqual(lines.length, 7);
});

test('generateTsv: N 件で 5 + N データ行', () => {
  const tsv = generateTsv([sampleMetadata(), sampleMetadata(), sampleMetadata()], '', '');
  const lines = tsv.replace(/\n$/, '').split('\n');
  assert.strictEqual(lines.length, 5 + 3);
});

test('generateTsv: セル内のタブ・改行はサニタイズされ列崩れを起こさない', () => {
  const tsv = generateTsv(
    [sampleMetadata({ item_30002_title0: [{ subitem_title: 'A\tB\nC', subitem_title_language: 'en' }] })],
    '', ''
  );
  const lines = tsv.replace(/\n$/, '').split('\n');
  const header = lines[0].split('\t');
  // 全データ行がヘッダと同じ列数（タブが混入していない）
  for (const line of lines) {
    assert.strictEqual(line.split('\t').length, header.length);
  }
  // タブ・改行はスペースに置換されている
  assert.ok(tsv.includes('A B C'));
});

test('generateTsv: repoHost でスキーマ URL の localhost を置換', () => {
  const tsv = generateTsv([sampleMetadata()], '', 'https://repo.example.jp/');
  const firstRow = tsv.split('\n')[0];
  assert.ok(firstRow.includes('repo.example.jp'));
  assert.ok(!firstRow.includes('localhost'));
});

test('generateTsv: repoHost 未指定なら既定の localhost スキーマ URL のまま', () => {
  const tsv = generateTsv([sampleMetadata()], '', '');
  const firstRow = tsv.split('\n')[0];
  assert.ok(firstRow.includes('localhost'));
});
