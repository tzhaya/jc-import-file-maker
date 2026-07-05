'use strict';
// #192: 所属誤判定（#186）の単体テスト（node:test）
// 対象: chrome-extension/openalex_panel.js の
//   detectAffMisattribution / canonicalRor / affStringSupportsInst / warnTooltip

const test = require('node:test');
const assert = require('node:assert');
const {
  detectAffMisattribution,
  canonicalRor,
  affStringSupportsInst,
  warnTooltip,
} = require('../chrome-extension/openalex_panel.js');

const JIRCAS_ROR = 'https://ror.org/005pdtr14';
const JIRCAS_ID = 'https://openalex.org/I0000JIRCAS';
const JIRCAS_NAME = 'Japan International Research Center for Agricultural Sciences';

// 検索機関(JIRCAS)が著者に付与されているが、所属表記は別機関を指す（#186 実例）
function workWith(rawAffiliation) {
  return {
    authorships: [{
      author: { display_name: 'Taro Yamada' },
      institutions: [{ id: JIRCAS_ID, ror: JIRCAS_ROR, display_name: JIRCAS_NAME }],
      affiliations: [{ institution_ids: [JIRCAS_ID], raw_affiliation_string: rawAffiliation }],
    }],
  };
}

test('canonicalRor: フル URL・bare ID・末尾スラッシュ・大文字を同一に正規化', () => {
  assert.strictEqual(canonicalRor('https://ror.org/005pdtr14'), '005pdtr14');
  assert.strictEqual(canonicalRor('005pdtr14'), '005pdtr14');
  assert.strictEqual(canonicalRor('ror.org/005pdtr14/'), '005pdtr14');
  assert.strictEqual(canonicalRor('HTTPS://ROR.ORG/005PDTR14'), '005pdtr14');
  assert.strictEqual(canonicalRor(''), '');
  assert.strictEqual(canonicalRor(null), '');
});

test('affStringSupportsInst: 頭字語(JIRCAS)が表記にあれば裏付けありと判定', () => {
  assert.strictEqual(affStringSupportsInst(JIRCAS_NAME, 'JIRCAS, Tsukuba, Japan'), true);
});

test('affStringSupportsInst: 弱語(Japan)だけの一致では裏付けなし', () => {
  assert.strictEqual(affStringSupportsInst(JIRCAS_NAME, 'Hokkaido University, Sapporo, Japan'), false);
});

test('detectAffMisattribution: 所属表記が別機関 → 警告オブジェクトを返す（#186）', () => {
  const warn = detectAffMisattribution(workWith('Hokkaido University, Sapporo, Japan'), JIRCAS_ROR);
  assert.notStrictEqual(warn, null);
  assert.strictEqual(warn.instName, JIRCAS_NAME);
  assert.deepStrictEqual(warn.authors, ['Taro Yamada']);
  assert.strictEqual(warn.repRaw, 'Hokkaido University, Sapporo, Japan');
  assert.strictEqual(warn.rawCount, 1);
});

test('detectAffMisattribution: 頭字語(JIRCAS)の裏付けがあれば null（誤検出抑制）', () => {
  const warn = detectAffMisattribution(workWith('JIRCAS, Tsukuba, Japan'), JIRCAS_ROR);
  assert.strictEqual(warn, null);
});

test('detectAffMisattribution: bare ID 指定でも ROR 正規化一致で判定される', () => {
  const warn = detectAffMisattribution(workWith('Hokkaido University, Sapporo, Japan'), '005pdtr14');
  assert.notStrictEqual(warn, null);
});

test('detectAffMisattribution: 検索機関が論文に出現しなければ null', () => {
  const other = {
    authorships: [{
      author: { display_name: 'Hanako Suzuki' },
      institutions: [{ id: 'https://openalex.org/I999', ror: 'https://ror.org/00000000x', display_name: 'Other Univ' }],
      affiliations: [{ institution_ids: ['https://openalex.org/I999'], raw_affiliation_string: 'Other University' }],
    }],
  };
  assert.strictEqual(detectAffMisattribution(other, JIRCAS_ROR), null);
});

test('detectAffMisattribution: searchRor が空なら null', () => {
  assert.strictEqual(detectAffMisattribution(workWith('X'), ''), null);
});

test('warnTooltip: 警告オブジェクトから機関名と代表表記を含む文言を組み立てる', () => {
  const warn = detectAffMisattribution(workWith('Hokkaido University, Sapporo, Japan'), JIRCAS_ROR);
  const tip = warnTooltip(warn);
  assert.ok(tip.includes(JIRCAS_NAME));
  assert.ok(tip.includes('Hokkaido University'));
  assert.ok(tip.includes('Taro Yamada'));
});
