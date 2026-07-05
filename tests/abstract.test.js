'use strict';
// #192: 抄録 JATS 処理の単体テスト（node:test）
// 対象: chrome-extension/make_jc_importer.js の processAbstract

const test = require('node:test');
const assert = require('node:assert');
const { processAbstract } = require('../chrome-extension/make_jc_importer.js');

test('processAbstract: 空入力は空文字', () => {
  assert.strictEqual(processAbstract(''), '');
  assert.strictEqual(processAbstract(null), '');
  assert.strictEqual(processAbstract(undefined), '');
});

test('processAbstract: 先頭の <jats:title> は削除される', () => {
  assert.strictEqual(
    processAbstract('<jats:title>Abstract</jats:title><jats:p>Body text.</jats:p>'),
    'Body text.'
  );
});

test('processAbstract: <jats:sec> 内の <jats:title> は "TITLE: " 形式へ変換', () => {
  // 先頭 title は削除、以降の title は "見出し: " に変換される
  const raw = '<jats:title>Main</jats:title>'
    + '<jats:sec><jats:title>Methods</jats:title><jats:p>We did X.</jats:p></jats:sec>';
  assert.strictEqual(processAbstract(raw), 'Methods: We did X.');
});

test('processAbstract: エスケープされた実体参照を解除（順序依存）', () => {
  // &lt;jats:p&gt; はまず < > へ解除され、その後タグとして除去される
  assert.strictEqual(
    processAbstract('&lt;jats:p&gt;Hello &amp; goodbye&lt;/jats:p&gt;'),
    'Hello & goodbye'
  );
});

test('processAbstract: 改行を除去し連続スペースを1つに正規化', () => {
  assert.strictEqual(
    processAbstract('<jats:p>Line one.\n\nLine two.</jats:p>'),
    'Line one.Line two.'
  );
});

test('processAbstract: 残存する全タグを除去', () => {
  assert.strictEqual(
    processAbstract('<jats:p>a<jats:italic>b</jats:italic>c</jats:p>'),
    'abc'
  );
});
