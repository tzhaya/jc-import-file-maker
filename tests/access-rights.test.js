'use strict';
// #225: アクセス権判定（エンバーゴ満了考慮）の単体テスト（node:test）
// 対象: chrome-extension/make_jc_importer.js の determineAccessRights / calcEmbargoEndDate
// determineAccessRights はエンバーゴ期間が満了済み（公開可能日が今日以前）なら
// 'open access'、未満了 or 満了日算出不能なら安全側で 'embargoed access' を返す。

const test = require('node:test');
const assert = require('node:assert');
const {
  determineAccessRights,
  calcEmbargoEndDate,
  todayStr,
} = require('../chrome-extension/make_jc_importer.js');

// ----- ヘルパー -----
// 実行日に依存しないよう、発行日は「今日から monthsAgo ヶ月前」を動的に生成する。
function dateMonthsAgo(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

// embargo 配列から OPFデータ構造を組み立てる。
// embargos: [{ amount, units }] を publisher_policy[].permitted_oa[].embargo に配置。
function opfWithEmbargos(embargos) {
  return {
    items: [
      {
        publisher_policy: embargos.map(e => ({
          permitted_oa: [{ embargo: e }],
        })),
      },
    ],
  };
}

// ===== determineAccessRights =====

test('open系ステータス（gold）は OPF を無視して open access', () => {
  const opf = opfWithEmbargos([{ amount: 12, units: 'months' }]);
  assert.strictEqual(determineAccessRights('gold', opf, dateMonthsAgo(1)), 'open access');
});

test('open系ステータス（green）は open access', () => {
  assert.strictEqual(determineAccessRights('green', null, ''), 'open access');
});

test('closed + OPFデータなし → open access', () => {
  assert.strictEqual(determineAccessRights('closed', null, dateMonthsAgo(1)), 'open access');
});

test('closed + エンバーゴなしOPF → open access', () => {
  const opf = opfWithEmbargos([{ amount: 0, units: 'months' }]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(1)), 'open access');
});

test('closed + embargo 12ヶ月 + 発行日が2年前 → 満了済みで open access', () => {
  const opf = opfWithEmbargos([{ amount: 12, units: 'months' }]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(24)), 'open access');
});

test('closed + embargo 12ヶ月 + 発行日が3ヶ月前 → 未満了で embargoed access', () => {
  const opf = opfWithEmbargos([{ amount: 12, units: 'months' }]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(3)), 'embargoed access');
});

test('closed + embargo あり + pubDate 空 → 安全側で embargoed access', () => {
  const opf = opfWithEmbargos([{ amount: 12, units: 'months' }]);
  assert.strictEqual(determineAccessRights('closed', opf, ''), 'embargoed access');
});

test('closed + embargo あり + pubDate undefined → 安全側で embargoed access', () => {
  const opf = opfWithEmbargos([{ amount: 6, units: 'months' }]);
  assert.strictEqual(determineAccessRights('closed', opf), 'embargoed access');
});

test('複数ポリシー: 片方満了・片方未来 → 1つでも未来なら embargoed access', () => {
  // 発行日6ヶ月前。3ヶ月エンバーゴ=満了、12ヶ月エンバーゴ=未満了。
  const opf = opfWithEmbargos([
    { amount: 3, units: 'months' },
    { amount: 12, units: 'months' },
  ]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(6)), 'embargoed access');
});

test('複数ポリシー: 両方満了 → open access', () => {
  const opf = opfWithEmbargos([
    { amount: 3, units: 'months' },
    { amount: 6, units: 'months' },
  ]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(24)), 'open access');
});

test('units years: 発行日3年前 + 1年エンバーゴ → 満了済みで open access', () => {
  const opf = opfWithEmbargos([{ amount: 1, units: 'years' }]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(36)), 'open access');
});

test('units weeks: 発行日1ヶ月前 + 2週エンバーゴ → 満了済みで open access', () => {
  const opf = opfWithEmbargos([{ amount: 2, units: 'weeks' }]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(1)), 'open access');
});

test('units 不明（calcEmbargoEndDate が null）→ 安全側で embargoed access', () => {
  const opf = opfWithEmbargos([{ amount: 12, units: 'days' }]);
  assert.strictEqual(determineAccessRights('closed', opf, dateMonthsAgo(24)), 'embargoed access');
});

// ===== calcEmbargoEndDate =====

test('calcEmbargoEndDate: pubDate 空 → null', () => {
  assert.strictEqual(calcEmbargoEndDate('', { amount: 12, units: 'months' }), null);
});

test('calcEmbargoEndDate: amount 0/未指定 → null', () => {
  assert.strictEqual(calcEmbargoEndDate('2020-01-01', { amount: 0, units: 'months' }), null);
  assert.strictEqual(calcEmbargoEndDate('2020-01-01', {}), null);
});

test('calcEmbargoEndDate: 不正な日付 → null', () => {
  assert.strictEqual(calcEmbargoEndDate('not-a-date', { amount: 12, units: 'months' }), null);
});

test('calcEmbargoEndDate: months 加算', () => {
  assert.strictEqual(calcEmbargoEndDate('2020-01-15', { amount: 6, units: 'months' }), '2020-07-15');
});

test('calcEmbargoEndDate: years 加算', () => {
  assert.strictEqual(calcEmbargoEndDate('2020-01-15', { amount: 2, units: 'years' }), '2022-01-15');
});

test('calcEmbargoEndDate: weeks 加算', () => {
  assert.strictEqual(calcEmbargoEndDate('2020-01-01', { amount: 2, units: 'weeks' }), '2020-01-15');
});

test('calcEmbargoEndDate: units 既定は months', () => {
  assert.strictEqual(calcEmbargoEndDate('2020-01-15', { amount: 3 }), '2020-04-15');
});

test('calcEmbargoEndDate: units 不明 → null', () => {
  assert.strictEqual(calcEmbargoEndDate('2020-01-15', { amount: 3, units: 'days' }), null);
});

// ===== todayStr =====

test('todayStr: YYYY-MM-DD 形式を返す', () => {
  assert.match(todayStr(), /^\d{4}-\d{2}-\d{2}$/);
});
