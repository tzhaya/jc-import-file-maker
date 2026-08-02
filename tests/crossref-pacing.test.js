'use strict';
// #253: Crossref関連DOIタイトル取得（fetchRelationTitle）のペーシング（同時実行1・
// 開始間隔制御）と429リトライの単体テスト（node:test）。
// 実時間を待たずに検証するため、sleep と now（単調時計）を注入する。

const test = require('node:test');
const assert = require('node:assert');
const {
  fetchRelationTitle, crossrefPaced, _resetCrossrefPacingForTest,
} = require('../chrome-extension/make_jc_importer.js');

function makeResponse({ status = 200, headers = {}, body = {} } = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (h.has(name.toLowerCase()) ? h.get(name.toLowerCase()) : null) },
    json: async () => body,
  };
}

// 仮想時計: sleep(ms) は実時間を待たず、仮想時刻を ms 進めて即resolveする。
function makeVirtualClock(start = 0) {
  let t = start;
  const sleepCalls = [];
  return {
    now: () => t,
    sleep: (ms) => { sleepCalls.push(ms); t += ms; return Promise.resolve(); },
    sleepCalls,
  };
}

function withWarnSpy(fn) {
  const calls = [];
  const orig = console.warn;
  console.warn = (...args) => calls.push(args.join(' '));
  return fn(calls).finally(() => { console.warn = orig; });
}

// ===== crossrefPaced: 同時実行数・開始間隔・順序 =====

test('crossrefPaced: 0件の入力では何も実行されない', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const results = await Promise.all([].map((_, i) => crossrefPaced(async () => i, clock)));
  assert.deepStrictEqual(results, []);
});

test('crossrefPaced: 1件はそのまま実行される', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const result = await crossrefPaced(async () => 'ok', clock);
  assert.strictEqual(result, 'ok');
});

test('crossrefPaced: 複数件でも同時実行は1を超えず、開始間隔が既定値(250ms)以上空き、結果順序が保たれる', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  let active = 0;
  let maxActive = 0;
  const starts = [];
  const makeFn = (i) => async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    starts.push(clock.now());
    active--;
    return i;
  };

  const results = await Promise.all([0, 1, 2, 3].map((i) => crossrefPaced(makeFn(i), clock)));

  assert.deepStrictEqual(results, [0, 1, 2, 3]); // 入力順を保つ
  assert.strictEqual(maxActive, 1);              // 同時実行は常に1以下
  for (let i = 1; i < starts.length; i++) {
    assert.ok(starts[i] - starts[i - 1] >= 250, `interval too short: ${starts[i] - starts[i - 1]}`);
  }
});

test('crossrefPaced: 1件目がrejectしても呼び出し元にrejectが伝わり、2件目は実行される', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const calls = [];
  const fn1 = async () => { calls.push('fn1'); throw new Error('boom'); };
  const fn2 = async () => { calls.push('fn2'); return 'ok2'; };

  const p1 = crossrefPaced(fn1, clock);
  const p2 = crossrefPaced(fn2, clock);

  await assert.rejects(p1, /boom/);
  assert.strictEqual(await p2, 'ok2');
  assert.deepStrictEqual(calls, ['fn1', 'fn2']);
});

// ===== fetchRelationTitle: ステータス分岐 =====

test('fetchRelationTitle: 200かつタイトルありで {title, lang} を返す', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl = async () => makeResponse({
    status: 200, body: { message: { title: ['Example Title'], language: 'en' } },
  });
  const result = await fetchRelationTitle('10.1234/abc', { fetchImpl, ...clock });
  assert.deepStrictEqual(result, { title: 'Example Title', lang: 'en' });
});

test('fetchRelationTitle: 200かつタイトルなしはnullを返す', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl = async () => makeResponse({ status: 200, body: { message: {} } });
  const result = await fetchRelationTitle('10.1234/no-title', { fetchImpl, ...clock });
  assert.strictEqual(result, null);
});

test('fetchRelationTitle: 404はnullを返し、console.warnを出さない（正常な未収録との区別）', () => withWarnSpy(async (warnCalls) => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl = async () => makeResponse({ status: 404 });
  const result = await fetchRelationTitle('10.1234/notfound', { fetchImpl, ...clock });
  assert.strictEqual(result, null);
  assert.strictEqual(warnCalls.length, 0);
}));

test('fetchRelationTitle: 429の後にリトライして200で成功する', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  let call = 0;
  const fetchImpl = async () => {
    call++;
    if (call === 1) return makeResponse({ status: 429, headers: { 'Retry-After': '1' } });
    return makeResponse({ status: 200, body: { message: { title: ['Recovered'], language: 'en' } } });
  };
  const result = await fetchRelationTitle('10.1234/retry-then-ok', { fetchImpl, ...clock });
  assert.deepStrictEqual(result, { title: 'Recovered', lang: 'en' });
  assert.strictEqual(call, 2);
});

test('fetchRelationTitle: 429が続く場合はリトライを尽くしてnullを返し、DOI・status・試行回数をconsole.warnへ出す', () => withWarnSpy(async (warnCalls) => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl = async () => makeResponse({ status: 429 });
  const result = await fetchRelationTitle('10.1234/persistent-429', { fetchImpl, ...clock });
  assert.strictEqual(result, null);
  assert.strictEqual(warnCalls.length, 1);
  assert.match(warnCalls[0], /10\.1234\/persistent-429/);
  assert.match(warnCalls[0], /429/);
  assert.match(warnCalls[0], /試行: 3/); // 初回 + 最大2回リトライ = 3試行
}));

test('fetchRelationTitle: ネットワークエラー（fetch自体の例外）はnullを返す', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl = async () => { throw new Error('network down'); };
  const result = await fetchRelationTitle('10.1234/network-error', { fetchImpl, ...clock });
  assert.strictEqual(result, null);
});

// ===== fetchRelationTitle: Retry-After の扱い =====

test('fetchRelationTitle: Retry-Afterありはその秒数を待機値として使う', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  let call = 0;
  const fetchImpl = async () => {
    call++;
    if (call === 1) return makeResponse({ status: 429, headers: { 'Retry-After': '2' } });
    return makeResponse({ status: 200, body: { message: { title: ['T'], language: 'en' } } });
  };
  await fetchRelationTitle('10.1234/retry-after-present', { fetchImpl, ...clock });
  assert.ok(clock.sleepCalls.includes(2000), `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: Retry-Afterなしは500ms→1000msへフォールバックする', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  let call = 0;
  const fetchImpl = async () => {
    call++;
    if (call <= 2) return makeResponse({ status: 429 });
    return makeResponse({ status: 200, body: { message: { title: ['T'], language: 'en' } } });
  };
  await fetchRelationTitle('10.1234/retry-after-absent', { fetchImpl, ...clock });
  assert.ok(clock.sleepCalls.includes(500), `sleepCalls=${clock.sleepCalls}`);
  assert.ok(clock.sleepCalls.includes(1000), `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: 不正なRetry-Afterは500ms→1000msへフォールバックする', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  let call = 0;
  const fetchImpl = async () => {
    call++;
    if (call === 1) return makeResponse({ status: 429, headers: { 'Retry-After': 'not-a-number' } });
    return makeResponse({ status: 200, body: { message: { title: ['T'], language: 'en' } } });
  };
  await fetchRelationTitle('10.1234/retry-after-invalid', { fetchImpl, ...clock });
  assert.ok(clock.sleepCalls.includes(500), `sleepCalls=${clock.sleepCalls}`);
});

// ===== fetchRelationTitle: リトライを含む全試行のペーシング =====

test('fetchRelationTitle: リトライを含む全試行が同じゲートを通り、開始間隔が保たれる', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const starts = [];
  let call = 0;
  const fetchImpl = async () => {
    starts.push(clock.now());
    call++;
    if (call === 1) return makeResponse({ status: 429 }); // Retry-Afterなし→500ms待機
    return makeResponse({ status: 200, body: { message: { title: ['T'], language: 'en' } } });
  };
  await fetchRelationTitle('10.1234/paced-retry', { fetchImpl, ...clock });
  assert.strictEqual(starts.length, 2);
  assert.ok(starts[1] - starts[0] >= 250, `interval too short: ${starts[1] - starts[0]}`);
});

// ===== ヘッダからのペーシング調整（best-effort） =====

test('fetchRelationTitle: Public poolでヘッダの算出値(200ms)が既定値(250ms)を下回っても既定値が維持される', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl1 = async () => makeResponse({
    status: 200,
    headers: { 'x-api-pool': 'public-single', 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '1s' }, // 算出200ms
    body: { message: { title: ['T1'], language: 'en' } },
  });
  await fetchRelationTitle('10.1234/hdr-floor-1', { fetchImpl: fetchImpl1, ...clock });

  clock.sleepCalls.length = 0;
  const fetchImpl2 = async () => makeResponse({ status: 200, body: { message: { title: ['T2'], language: 'en' } } });
  await fetchRelationTitle('10.1234/hdr-floor-2', { fetchImpl: fetchImpl2, ...clock });
  assert.ok(clock.sleepCalls.some((ms) => ms >= 250), `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: Public poolでヘッダの算出値(500ms)が既定値を上回る場合は広がる', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl1 = async () => makeResponse({
    status: 200,
    headers: { 'x-api-pool': 'public-single', 'x-rate-limit-limit': '2', 'x-rate-limit-interval': '1s' }, // 算出500ms
    body: { message: { title: ['T1'], language: 'en' } },
  });
  await fetchRelationTitle('10.1234/hdr-widen-1', { fetchImpl: fetchImpl1, ...clock });

  clock.sleepCalls.length = 0;
  const fetchImpl2 = async () => makeResponse({ status: 200, body: { message: { title: ['T2'], language: 'en' } } });
  await fetchRelationTitle('10.1234/hdr-widen-2', { fetchImpl: fetchImpl2, ...clock });
  assert.ok(clock.sleepCalls.some((ms) => ms >= 500), `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: Polite pool等（x-api-poolがpublicで始まらない）は既定値の下限を適用しない', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl1 = async () => makeResponse({
    status: 200,
    headers: { 'x-api-pool': 'polite', 'x-rate-limit-limit': '10', 'x-rate-limit-interval': '1s' }, // 算出100ms
    body: { message: { title: ['T1'], language: 'en' } },
  });
  await fetchRelationTitle('10.1234/polite-1', { fetchImpl: fetchImpl1, ...clock });

  clock.sleepCalls.length = 0;
  const fetchImpl2 = async () => makeResponse({ status: 200, body: { message: { title: ['T2'], language: 'en' } } });
  await fetchRelationTitle('10.1234/polite-2', { fetchImpl: fetchImpl2, ...clock });
  // 100ms間隔まで縮まるため、250ms以上の待機は発生しない
  assert.ok(clock.sleepCalls.every((ms) => ms < 250), `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: x-rate-limit-interval の ms サフィックス・単位なしをbest-effortで解釈する', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  // 500ms interval, limit 5 → 算出100ms（Polite想定でfloorなし）
  const fetchImplMs = async () => makeResponse({
    status: 200,
    headers: { 'x-api-pool': 'polite', 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '500ms' },
    body: { message: { title: ['T'], language: 'en' } },
  });
  await fetchRelationTitle('10.1234/unit-ms', { fetchImpl: fetchImplMs, ...clock });
  clock.sleepCalls.length = 0;
  const fetchImplNext = async () => makeResponse({ status: 200, body: { message: { title: ['T2'], language: 'en' } } });
  await fetchRelationTitle('10.1234/unit-ms-2', { fetchImpl: fetchImplNext, ...clock });
  assert.ok(clock.sleepCalls.every((ms) => ms < 250), `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: 想定外のヘッダ書式は既定値を維持する（安全側フォールバック）', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const fetchImpl1 = async () => makeResponse({
    status: 200,
    headers: { 'x-api-pool': 'public-single', 'x-rate-limit-limit': 'not-a-number', 'x-rate-limit-interval': 'garbage' },
    body: { message: { title: ['T1'], language: 'en' } },
  });
  await fetchRelationTitle('10.1234/hdr-malformed-1', { fetchImpl: fetchImpl1, ...clock });

  clock.sleepCalls.length = 0;
  const fetchImpl2 = async () => makeResponse({ status: 200, body: { message: { title: ['T2'], language: 'en' } } });
  await fetchRelationTitle('10.1234/hdr-malformed-2', { fetchImpl: fetchImpl2, ...clock });
  assert.ok(clock.sleepCalls.some((ms) => ms >= 250), `sleepCalls=${clock.sleepCalls}`);
});
