'use strict';
// #253: Crossref関連DOIタイトル取得（fetchRelationTitle）のペーシング（同時実行1・
// 開始間隔制御）と429リトライの単体テスト（node:test）。
// 実時間を待たずに検証するため、sleep と now（単調時計）を注入する。

const test = require('node:test');
const assert = require('node:assert');
const CrossrefHttp = require('../chrome-extension/shared.js');
globalThis.CrossrefHttp = CrossrefHttp;
const importer = require('../chrome-extension/make_jc_importer.js');
const {
  fetchCrossref, fetchRelationTitle, fetchCrossrefFunderDetails,
  fetchJgn: fetchImporterJgn, setJgnRateLimitWarning, hasJgnRateLimitWarning, collectFundingField,
} = importer;
const funderLookup = require('../chrome-extension/funder_lookup.js');
const crossrefPaced = CrossrefHttp._paced;
const _resetCrossrefPacingForTest = CrossrefHttp._resetForTest;

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

test('JGN 429警告: DOM状態の保存・解除とcollector向け復元判定が往復する', () => {
  const originalDocument = globalThis.document;
  const badges = [];
  const row = {
    dataset: {},
    querySelector: () => badges[0] || null,
    appendChild: badge => badges.push(badge),
  };
  globalThis.document = {
    createElement: () => ({
      dataset: {},
      remove() { badges.splice(badges.indexOf(this), 1); },
    }),
  };
  try {
    setJgnRateLimitWarning(row, true);
    assert.strictEqual(row.dataset.warnJgnRateLimited, 'true');
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0].dataset.warningKind, 'jgn-rate-limited');
    assert.strictEqual(hasJgnRateLimitWarning({ querySelector: () => row }), true);
    const fc = {
      querySelector: selector => selector.includes('subitem_award_number') ? row : null,
      querySelectorAll: () => [],
    };
    const section = {
      querySelector: () => ({
        querySelectorAll: () => [{ querySelector: () => fc }],
      }),
    };
    assert.strictEqual(collectFundingField(section)[0]._warnJgnRateLimited, true);

    setJgnRateLimitWarning(row, false);
    assert.strictEqual(row.dataset.warnJgnRateLimited, 'false');
    assert.strictEqual(badges.length, 0);
    assert.strictEqual(hasJgnRateLimitWarning({ querySelector: () => row }), false);
    assert.strictEqual(collectFundingField(section)[0]._warnJgnRateLimited, undefined);
  } finally {
    globalThis.document = originalDocument;
  }
});

// 実際に処理が「重なる」条件を作るため、fn()の完了を外部から制御できるdeferredを使う。
// 同期本体のfn()（awaitを含まない）はJSのシングルスレッド実行により、ゲートの有無に
// 関わらずactive++/active--が重ならず偽陽性になるため使わない（レビュー指摘）。
function waitUntilTrue(cond, timeoutMs = 2000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      if (cond()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('waitUntilTrue timeout'));
      setTimeout(poll, 1);
    })();
  });
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

test('crossrefPaced: 複数件でも実際の処理重なりは1を超えず、開始間隔が既定値(250ms)以上空き、結果順序が保たれる', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  let active = 0;
  let maxActive = 0;
  const starts = [];
  const releasers = [];

  // fn()はPromiseの外部resolveで完了を制御し、次のfn()が実際に開始されるまで
  // 「処理中」の状態を維持できるようにする（真の重なり検証のため）。
  const makeFn = (i) => () => new Promise((resolve) => {
    active++;
    maxActive = Math.max(maxActive, active);
    starts.push(clock.now());
    releasers.push(() => { active--; resolve(i); });
  });

  const resultsPromise = Promise.all([0, 1, 2, 3].map((i) => crossrefPaced(makeFn(i), clock)));

  for (let i = 0; i < 4; i++) {
    await waitUntilTrue(() => releasers.length === i + 1);
    assert.strictEqual(maxActive, 1, `maxActive exceeded 1 at task ${i}`);
    releasers[i]();
  }

  const results = await resultsPromise;
  assert.deepStrictEqual(results, [0, 1, 2, 3]); // 入力順を保つ
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

test('CrossrefHttp: HTTP-date形式のRetry-Afterを待機時間へ変換する', async () => {
  CrossrefHttp._resetForTest();
  const clock = makeVirtualClock();
  const wallBase = Date.parse('2026-08-02T00:00:00Z');
  let call = 0;
  const fetchImpl = async () => {
    call++;
    if (call === 1) {
      return makeResponse({
        status: 429,
        headers: { 'Retry-After': 'Sun, 02 Aug 2026 00:00:02 GMT' },
      });
    }
    return makeResponse({ status: 200, body: { message: {} } });
  };

  const result = await CrossrefHttp.fetchJson('https://api.crossref.org/works/date-retry', {
    fetchImpl,
    now: clock.now,
    sleep: clock.sleep,
    wallNow: () => wallBase,
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.attempts, 2);
  assert.ok(clock.sleepCalls.includes(2000), `HTTP-date由来の2000ms待機がない: ${clock.sleepCalls}`);
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

test('fetchRelationTitle: リトライを含む全試行が同じゲートを通り、開始間隔が保たれる（Retry-After:0でゲート由来の待機のみを検証）', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  const starts = [];
  let call = 0;
  const fetchImpl = async () => {
    starts.push(clock.now());
    call++;
    // Retry-After:0 とし、リトライ自体の待機を0にする。それでも開始間隔が
    // 250ms以上空くなら、その待機はゲート由来（バックオフ由来ではない）と言える
    // （既定バックオフ500msが偶然250ms以上を満たすだけの偽陽性を避けるため）。
    if (call === 1) return makeResponse({ status: 429, headers: { 'Retry-After': '0' } });
    return makeResponse({ status: 200, body: { message: { title: ['T'], language: 'en' } } });
  };
  await fetchRelationTitle('10.1234/paced-retry-zero', { fetchImpl, ...clock });
  assert.strictEqual(starts.length, 2);
  assert.ok(starts[1] - starts[0] >= 250, `interval too short: ${starts[1] - starts[0]}`);
  // ゲート由来の待機(250ms程度)とリトライ由来の待機(0ms)が別々に発生していることを明示的に確認する。
  assert.ok(clock.sleepCalls.includes(0), `retry wait (0ms) not observed: ${clock.sleepCalls}`);
  assert.ok(clock.sleepCalls.some((ms) => ms >= 250), `gate wait (>=250ms) not observed: ${clock.sleepCalls}`);
});

// ===== 共有ゲート: 429 cooldownの並行呼び出しへの反映・P1回帰の結線検証 =====

test('fetchRelationTitle: 429のRetry-Afterは共有ゲートに反映され、並行呼び出しもcooldownを待つ（実タイマーで検証）', { timeout: 5000 }, async () => {
  _resetCrossrefPacingForTest();
  // このテストは実際のマイクロタスク/タイマーの順序に依存するため、仮想時計では
  // なく実タイマーを使う。sleep()呼び出し時点でtをその場で(同期的に)進める仮想
  // 時計だと、2件目のゲート待機判定より前に1件目のローカル待機が"先に"共有時刻を
  // 進めてしまい、共有notBefore反映の有無に関わらずテストが通る偽陽性を生む
  // （実際のsetTimeoutは、マイクロタスク経由で2件目の待機判定が先に走ってから
  // 初めて後で解決するため、この問題が起きない）。
  const start = Date.now();
  let call1 = 0;
  const fetchImpl1 = async () => {
    call1++;
    if (call1 === 1) return makeResponse({ status: 429, headers: { 'Retry-After': '1' } }); // 1000ms cooldown
    return makeResponse({ status: 200, body: { message: { title: ['A'], language: 'en' } } });
  };
  let start2 = null;
  const fetchImpl2 = async () => {
    start2 = Date.now();
    return makeResponse({ status: 200, body: { message: { title: ['B'], language: 'en' } } });
  };

  const p1 = fetchRelationTitle('10.1234/concurrent-cooldown-1', { fetchImpl: fetchImpl1 });
  const p2 = fetchRelationTitle('10.1234/concurrent-cooldown-2', { fetchImpl: fetchImpl2 });

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.deepStrictEqual(r1, { title: 'A', lang: 'en' });
  assert.deepStrictEqual(r2, { title: 'B', lang: 'en' });
  assert.ok(start2 !== null);
  // 既定の開始間隔(250ms)だけでは説明がつかない、cooldown(1000ms)相当の待機が
  // 2件目にも適用されていることを確認する（既定間隔のみなら250ms程度で開始されるはず）。
  assert.ok(start2 - start >= 900, `2件目がcooldown中に開始された可能性: elapsed=${start2 - start}ms`);
});

test('CrossrefHttp: 429要求のbackoffと待機者のcooldownはtail解放後に別々に開始する', async () => {
  CrossrefHttp._resetForTest();
  const sleeps = [];
  const sleep = (ms) => {
    if (sleeps.length >= 2) return Promise.resolve();
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    sleeps.push({ ms, resolve });
    return promise;
  };
  let firstCalls = 0;
  const first = CrossrefHttp.fetchJson('https://api.crossref.org/works/first', {
    fetchImpl: async () => makeResponse({
      status: firstCalls++ === 0 ? 429 : 200,
      headers: firstCalls === 1 ? { 'Retry-After': '1' } : {},
    }),
    sleep,
  });
  const second = CrossrefHttp.fetchJson('https://api.crossref.org/works/second', {
    fetchImpl: async () => makeResponse({ status: 200 }),
    sleep,
  });

  await waitUntilTrue(() => sleeps.length === 2);
  assert.strictEqual(sleeps.length, 2);
  assert.ok(sleeps.every(s => s.ms >= 990 && s.ms <= 1000),
    `backoff/cooldownが別々に登録されていない: ${sleeps.map(s => s.ms)}`);
  sleeps.forEach(s => s.resolve());
  await Promise.all([first, second]);
});

test('CrossrefHttp: CommonJSではglobalThis.CrossrefHttpを暗黙に公開しない', () => {
  assert.strictEqual(globalThis.CrossrefHttp, CrossrefHttp);
  const modulePath = require.resolve('../chrome-extension/shared.js');
  delete require.cache[modulePath];
  delete globalThis.CrossrefHttp;
  const reloaded = require(modulePath);
  assert.ok(reloaded.fetchJson);
  assert.strictEqual(globalThis.CrossrefHttp, undefined);
  globalThis.CrossrefHttp = CrossrefHttp;
});

test('fetchRelationTitle: 1件目の応答本文(json())が解放されるまで2件目のfetchImplは実行されない（P1回帰・結線レベル）', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();

  let resolveJson1;
  const json1Promise = new Promise((resolve) => { resolveJson1 = resolve; });
  const response1 = {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: () => json1Promise, // 明示的に解放を制御する
  };
  const fetchImpl1 = async () => response1;

  let fetch2Called = false;
  const fetchImpl2 = async () => {
    fetch2Called = true;
    return makeResponse({ status: 200, body: { message: { title: ['B'], language: 'en' } } });
  };

  // このテストの不変条件はPromiseチェーンの構造的な依存（gate task2は1件目の
  // paced task=json()読取完了まで開始できない）であり、時刻の値には依存しない
  // ため、仮想時計を使っても偽陽性の問題は生じない。
  const p1 = fetchRelationTitle('10.1234/gate-body-1', { fetchImpl: fetchImpl1, ...clock });
  const p2 = fetchRelationTitle('10.1234/gate-body-2', { fetchImpl: fetchImpl2, ...clock });

  // 保留中のマイクロタスクが尽きるのを待ってから、まだ呼ばれていないことを確認する。
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(fetch2Called, false, '1件目の本文読取(json())完了前に2件目のfetchImplが呼ばれた（P1回帰）');

  resolveJson1({ message: { title: ['A'], language: 'en' } });

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.deepStrictEqual(r1, { title: 'A', lang: 'en' });
  assert.deepStrictEqual(r2, { title: 'B', lang: 'en' });
  assert.strictEqual(fetch2Called, true);
});

test('fetchRelationTitle: 最終試行(3回目)の429でRetry-Afterが欠落していても共有cooldownが正しく記録される(バックオフ配列末尾へクランプ)', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  // 常に429・Retry-Afterなし。attempt=0,1,2の3回試行し尽くしてnullになる過程で、
  // 最終試行(attempt=2)はCROSSREF_RELATION_TITLE_BACKOFF_MS(長さ2)の範囲外となる。
  // クランプせず[attempt]のまま参照するとundefinedとなり、_recordCrossrefCooldown
  // にNaNが渡って共有cooldownが記録されない（レビュー指摘の境界条件）。
  const fetchImpl = async () => makeResponse({ status: 429 });
  const result = await fetchRelationTitle('10.1234/exhausted-429-no-retry-after', { fetchImpl, ...clock });
  assert.strictEqual(result, null);

  // 直後の別呼び出しの待機が、バックオフ配列末尾(1000ms)相当のcooldownを反映
  // していることを確認する。共有cooldownが記録されていなければ、待機は既定
  // 間隔(250ms)にとどまってしまう。
  clock.sleepCalls.length = 0;
  const fetchImplNext = async () => makeResponse({ status: 200, body: { message: { title: ['T'], language: 'en' } } });
  await fetchRelationTitle('10.1234/after-exhausted-429', { fetchImpl: fetchImplNext, ...clock });
  assert.ok(clock.sleepCalls.some((ms) => ms >= 1000), `shared cooldown not reflected: sleepCalls=${clock.sleepCalls}`);
});

// ===== ヘッダからのペーシング調整（best-effort） =====
// 各テストは、1回目の応答でヘッダを与えてペーシング状態を更新させた後、sleepCalls
// をクリアしてから2回目を呼び、そのgate待機の「正確な値」を検証する（vague な
// `some`/`every` は0件でも真になり得るため、必ず件数と値の両方をassertする）。

async function primeThenMeasure(clock, primeHeaders, primeStatus = 200) {
  const fetchImpl1 = async () => makeResponse({
    status: primeStatus,
    headers: primeHeaders,
    body: { message: { title: ['T1'], language: 'en' } },
  });
  await fetchRelationTitle('10.1234/prime', { fetchImpl: fetchImpl1, ...clock });
  clock.sleepCalls.length = 0;
  const fetchImpl2 = async () => makeResponse({ status: 200, body: { message: { title: ['T2'], language: 'en' } } });
  await fetchRelationTitle('10.1234/measure', { fetchImpl: fetchImpl2, ...clock });
}

test('fetchRelationTitle: Public poolでヘッダの算出値(200ms)が既定値(250ms)を下回っても既定値ちょうどが維持される', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  await primeThenMeasure(clock, { 'x-api-pool': 'public-single', 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '1s' }); // 算出200ms
  assert.deepStrictEqual(clock.sleepCalls, [250], `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: Public poolでヘッダの算出値(500ms)が既定値を上回る場合はその値まで広がる', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  await primeThenMeasure(clock, { 'x-api-pool': 'public-single', 'x-rate-limit-limit': '2', 'x-rate-limit-interval': '1s' }); // 算出500ms
  assert.deepStrictEqual(clock.sleepCalls, [500], `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: x-api-poolが欠落している場合もPublic pool同様に既定値の下限を維持する（pool判定不能時の安全側フォールバック）', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  // x-api-pool自体が無い。limit/intervalの算出値(200ms)は250msを下回るが、
  // pool不明のためフォールバックし既定値250msを維持しなければならない（レビューで
  // 指摘された不具合: 従来はpool欠落時に非Public扱いとなり200msへ縮んでいた）。
  await primeThenMeasure(clock, { 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '1s' });
  assert.deepStrictEqual(clock.sleepCalls, [250], `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: 未知のx-api-pool値でもPublic pool同様に既定値の下限を維持する（既知の非Public poolのみ下限を外す）', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  await primeThenMeasure(clock, { 'x-api-pool': 'some-future-pool', 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '1s' }); // 算出200ms
  assert.deepStrictEqual(clock.sleepCalls, [250], `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: Polite pool（既知の非Public pool）は既定値の下限を適用しない', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  await primeThenMeasure(clock, { 'x-api-pool': 'polite', 'x-rate-limit-limit': '10', 'x-rate-limit-interval': '1s' }); // 算出100ms
  assert.deepStrictEqual(clock.sleepCalls, [100], `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: x-rate-limit-interval の ms サフィックスをbest-effortで解釈する', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  // 500ms ÷ limit 5 = 100ms（Polite想定でfloorなし）
  await primeThenMeasure(clock, { 'x-api-pool': 'polite', 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '500ms' });
  assert.deepStrictEqual(clock.sleepCalls, [100], `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: x-rate-limit-interval の単位なし（秒とみなす）をbest-effortで解釈する', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  // 単位なし"2" → 2秒 → 2000ms ÷ limit 5 = 400ms（Polite想定でfloorなし）
  await primeThenMeasure(clock, { 'x-api-pool': 'polite', 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '2' });
  assert.deepStrictEqual(clock.sleepCalls, [400], `sleepCalls=${clock.sleepCalls}`);
});

test('fetchRelationTitle: 想定外のヘッダ書式は既定値を維持する（安全側フォールバック）', async () => {
  _resetCrossrefPacingForTest();
  const clock = makeVirtualClock();
  await primeThenMeasure(clock, { 'x-api-pool': 'public-single', 'x-rate-limit-limit': 'not-a-number', 'x-rate-limit-interval': 'garbage' });
  assert.deepStrictEqual(clock.sleepCalls, [250], `sleepCalls=${clock.sleepCalls}`);
});

// ===== #256: 共通名前空間・全Crossref経路の結線 =====

test('CrossrefHttp: 公開APIを3キーだけに固定する', () => {
  assert.deepStrictEqual(
    Object.keys(CrossrefHttp).sort(),
    ['_paced', '_resetForTest', 'fetchJson'],
  );
});

test('CrossrefHttp: ネットワーク例外をHTTP結果へ変換せず、再試行なしで伝播する', async () => {
  CrossrefHttp._resetForTest();
  let calls = 0;
  const error = new Error('offline');
  await assert.rejects(
    CrossrefHttp.fetchJson('https://api.crossref.org/works/x', {
      fetchImpl: async () => { calls++; throw error; },
    }),
    error,
  );
  assert.strictEqual(calls, 1);
});

test('CrossrefHttp: ヘッダ欠落時は直前のpolite間隔を保持し、次のpublic応答で250ms下限へ戻る', async () => {
  CrossrefHttp._resetForTest();
  const clock = makeVirtualClock();
  const responses = [
    makeResponse({ headers: { 'x-api-pool': 'polite', 'x-rate-limit-limit': '10', 'x-rate-limit-interval': '1s' } }),
    makeResponse(),
    makeResponse({ headers: { 'x-api-pool': 'public-single', 'x-rate-limit-limit': '5', 'x-rate-limit-interval': '1s' } }),
    makeResponse(),
  ];
  const fetchImpl = async () => responses.shift();
  for (let i = 0; i < 4; i++) {
    await CrossrefHttp.fetchJson(`https://api.crossref.org/works/${i}`, { fetchImpl, ...clock });
  }
  assert.deepStrictEqual(clock.sleepCalls, [100, 100, 250]);
});

test('全6経路が同一CrossrefHttp.fetchJsonへ結線される', async () => {
  const original = CrossrefHttp.fetchJson;
  const originalFetch = global.fetch;
  global.CONFIG = { OpenAlex_API_KEY: '', CiNii_API_KEY: '' };
  const urls = [];
  CrossrefHttp.fetchJson = async (url) => {
    urls.push(url);
    if (url.includes('/funders/')) {
      return { status: 200, ok: true, body: { message: { name: 'Funder' } }, attempts: 1 };
    }
    if (url.includes('10.52926')) {
      return { status: 200, ok: true, body: { message: { type: 'grant', project: [] } }, attempts: 1 };
    }
    return { status: 200, ok: true, body: { message: { title: ['Title'], funder: [] } }, attempts: 1 };
  };
  global.fetch = async () => makeResponse({ body: { grants: [] } });
  try {
    await fetchCrossref('10.1/main');
    await fetchRelationTitle('10.1/relation');
    await fetchCrossrefFunderDetails('https://doi.org/10.13039/test');
    await fetchImporterJgn('JPTEST1');
    await funderLookup.fetchAwardsByDoi('10.1/lookup');
    await funderLookup.fetchJgn('JPTEST2');
  } finally {
    CrossrefHttp.fetchJson = original;
    global.fetch = originalFetch;
  }
  assert.strictEqual(urls.length, 6);
  assert.deepStrictEqual(urls.map(url => {
    if (url.includes('/funders/')) return 'importer-funder';
    if (url.includes('JPTEST1')) return 'importer-jgn';
    if (url.includes('JPTEST2')) return 'lookup-jgn';
    if (url.includes('relation')) return 'relation-title';
    if (url.includes('lookup')) return 'lookup-doi';
    return 'importer-doi';
  }), [
    'importer-doi', 'relation-title', 'importer-funder',
    'importer-jgn', 'lookup-doi', 'lookup-jgn',
  ]);
});

test('両fetchJgn: 429はctxだけに記録し、nullを返してフォールバック契約を維持する', async () => {
  const original = CrossrefHttp.fetchJson;
  CrossrefHttp.fetchJson = async () => ({ status: 429, ok: false, body: {}, attempts: 3 });
  try {
    for (const fetchJgn of [fetchImporterJgn, funderLookup.fetchJgn]) {
      const ctx = {};
      assert.strictEqual(await fetchJgn('JPTEST', ctx), null);
      assert.deepStrictEqual(ctx, { rateLimited: true });
    }
  } finally {
    CrossrefHttp.fetchJson = original;
  }
});

test('funder lookup: JGN 429後にCiNii成功なら通常カードへ警告を表示する', async () => {
  const originalCrossref = CrossrefHttp.fetchJson;
  const originalFetch = global.fetch;
  global.CONFIG = { CiNii_API_KEY: '' };
  CrossrefHttp.fetchJson = async () => ({ status: 429, ok: false, body: {}, attempts: 3 });
  global.fetch = async (url) => makeResponse({
    body: { items: [{ title: url.includes('lang=en') ? 'English' : '日本語', 'dc:source': [{ '@id': 'https://kaken.example/1' }] }] },
  });
  try {
    const result = await funderLookup.lookupOne('JP12A12345');
    assert.strictEqual(result.source, 'KAKEN');
    assert.match(result.supplementaryWarning, /レート制限/);
    const html = funderLookup.buildResultCards([result]);
    assert.match(html, /レート制限/);
    assert.doesNotMatch(html, /error-card/);
  } finally {
    CrossrefHttp.fetchJson = originalCrossref;
    global.fetch = originalFetch;
  }
});

test('funder lookup: JGN 429後にCiNiiも失敗なら未登録と断定しないerror-cardを表示する', async () => {
  const originalCrossref = CrossrefHttp.fetchJson;
  const originalFetch = global.fetch;
  global.CONFIG = { CiNii_API_KEY: '' };
  CrossrefHttp.fetchJson = async () => ({ status: 429, ok: false, body: {}, attempts: 3 });
  global.fetch = async () => makeResponse({ body: { items: [] } });
  try {
    const result = await funderLookup.lookupOne('JPTEST999');
    assert.match(result.error, /レート制限/);
    assert.match(result.error, /登録有無を確認できません/);
    assert.doesNotMatch(result.error, /JGN・KAKEN いずれも見つかりません/);
    const html = funderLookup.buildResultCards([result]);
    assert.match(html, /error-card/);
    assert.match(html, /時間を置いて再試行/);
  } finally {
    CrossrefHttp.fetchJson = originalCrossref;
    global.fetch = originalFetch;
  }
});
