'use strict';
// #192: DOI 正規化・検証の単体テスト（node:test）
// 対象: chrome-extension/make_jc_importer.js の normalizeDoi / isValidDoi
// normalizeDoi は #192 で funder_lookup.js に合わせ dx.doi.org 対応へ統一済み。

const test = require('node:test');
const assert = require('node:assert');
const { normalizeDoi, isValidDoi } = require('../chrome-extension/make_jc_importer.js');

test('normalizeDoi: https://doi.org/ プレフィックスを除去', () => {
  assert.strictEqual(normalizeDoi('https://doi.org/10.1016/j.foo.2025.001'), '10.1016/j.foo.2025.001');
});

test('normalizeDoi: http://dx.doi.org/ プレフィックスを除去（#192 統一）', () => {
  assert.strictEqual(normalizeDoi('http://dx.doi.org/10.1016/j.foo.2025.001'), '10.1016/j.foo.2025.001');
});

test('normalizeDoi: https://dx.doi.org/ プレフィックスを除去（#192 統一）', () => {
  assert.strictEqual(normalizeDoi('https://dx.doi.org/10.1/x'), '10.1/x');
});

test('normalizeDoi: doi: プレフィックス（大文字含む）を除去', () => {
  assert.strictEqual(normalizeDoi('DOI:10.1/x'), '10.1/x');
  assert.strictEqual(normalizeDoi('doi:10.1/x'), '10.1/x');
});

test('normalizeDoi: 前後の空白を除去', () => {
  assert.strictEqual(normalizeDoi('  10.1/x  '), '10.1/x');
});

test('normalizeDoi: 素の DOI はそのまま', () => {
  assert.strictEqual(normalizeDoi('10.1016/j.advnut.2025.100480'), '10.1016/j.advnut.2025.100480');
});

test('isValidDoi: 正しい DOI 形式を受理', () => {
  assert.strictEqual(isValidDoi('10.1016/j.advnut.2025.100480'), true);
  assert.strictEqual(isValidDoi('10.1234/x'), true);
});

test('isValidDoi: 不正な値を拒否', () => {
  assert.strictEqual(isValidDoi('not-a-doi'), false);
  assert.strictEqual(isValidDoi('10.1/x'), false);         // 登録者コードが4桁未満
  assert.strictEqual(isValidDoi('10.1234'), false);        // スラッシュ以降なし
  assert.strictEqual(isValidDoi('https://doi.org/10.1234/x'), false); // 正規化前は不可
  assert.strictEqual(isValidDoi(''), false);
  assert.strictEqual(isValidDoi(null), false);
  assert.strictEqual(isValidDoi(12345), false);
});

test('isValidDoi: 256 文字超を拒否', () => {
  assert.strictEqual(isValidDoi('10.1234/' + 'a'.repeat(300)), false);
});

test('normalizeDoi → isValidDoi: dx.doi.org URL 入力が統一後に検証を通る（#192 実挙動）', () => {
  assert.strictEqual(isValidDoi(normalizeDoi('https://dx.doi.org/10.1016/j.foo.2025.001')), true);
});
