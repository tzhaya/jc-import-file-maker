---
name: e2e-test
description: Playwrightを使ってmake_jc_importer_test.htmlまたはfunder_lookup_test.htmlのE2Eテストを実行する。DOIや課題番号を入力し、取得結果のフィールドを検証する。
disable-model-invocation: true
argument-hint: "[main | funder] [DOI or award number]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# E2E テスト（Playwright）

ブラウザを自動操作して、テスト用HTMLの動作を検証します。

## 前提条件

Node.js と Playwright がインストールされていること。未インストールの場合は以下を実行:
```bash
npm init -y 2>/dev/null
npm install --save-dev playwright
npx playwright install chromium
```

## 引数

- 第1引数: `main`（make_jc_importer_test.html、デフォルト）または `funder`（funder_lookup_test.html）
- 第2引数: テスト対象の DOI または課題番号（省略時はデフォルト値を使用）

デフォルト値:
- main: `10.1016/j.advnut.2025.100480`
- funder: `JPMJPR2125`

## 重要: DOM セレクタの注意点

make_jc_importer_test.html の DOM 構造:
- **metadata-fields**: `#metadata-fields` — 全フィールドのコンテナ
- **data-key 属性**: FIELD_DEFS の配列インデックスが付与される（例: `item_30002_title0`, `item_30002_creator2`）。固定値ではないため、**部分一致** `[data-key*="title"]` で検索すること
- **著者カード**: `.person-card` は存在しない。著者は `[data-key*="creator"] .nested-item.level-1` で取得
- **資源タイプ**: `[data-key*="resource_type"] select`
- **データ取得完了の検知**: `#metadata-fields` の子要素数が 0 より大きくなるのを `waitForFunction` で待機する（`.person-card` や `#error-msg` の visible 待ちは不可）
- **追加待機**: 非同期処理（助成情報のKAKEN/JGN取得、ROR取得等）があるため、metadata-fields 描画後に `waitForTimeout(5000)` で追加待機する
- **ブラウザ起動オプション**: `chromium.launch({ headless: true, args: ['--disable-web-security'] })` を使用する（file:// からのAPI呼び出し対応）

## テスト手順

### 1. テストスクリプトの生成

プロジェクトルートに一時的なテストスクリプト `_e2e_test.mjs` を生成してください。
テスト用HTMLは `file://` プロトコルでローカルファイルを直接開きます。

#### main（make_jc_importer_test.html）の場合

```javascript
import { chromium } from 'playwright';

const doi = process.argv[2] || '10.1016/j.advnut.2025.100480';
const filePath = process.argv[3]; // テスト用HTMLの絶対パス

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
  const page = await browser.newPage();

  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  // HTMLを開く
  await page.goto(`file:///${filePath.replace(/\\/g, '/')}`);

  // DOI入力 → 取得ボタンクリック
  await page.fill('#doi-input', doi);
  await page.click('#fetch-btn');

  // metadata-fieldsに子要素が描画されるのを待つ
  try {
    await page.waitForFunction(
      () => document.getElementById('metadata-fields')?.children.length > 0,
      { timeout: 45000 }
    );
  } catch {
    console.error('TIMEOUT: metadata-fields still empty after 45s');
    await browser.close();
    process.exit(1);
  }

  // 非同期処理（助成情報等）の完了を待機
  await page.waitForTimeout(5000);

  const results = await page.evaluate(() => {
    const mf = document.getElementById('metadata-fields');

    // タイトル
    const titleEl = mf.querySelector('[data-key*="title"] input[type="text"]');
    const title = titleEl?.value || '';

    // 著者
    const creatorSection = mf.querySelector('[data-key*="creator"]');
    const authors = creatorSection ? creatorSection.querySelectorAll('.nested-item.level-1').length : 0;

    // DOIリンク
    const doiLink = document.getElementById('doi-link');
    const doiHref = doiLink?.href || '';

    // 資源タイプ
    const rtSection = mf.querySelector('[data-key*="resource_type"]');
    const rtSelect = rtSection?.querySelector('select');
    const resourceType = rtSelect?.value || '';

    // セクション数
    const sectionCount = mf.children.length;

    // 科研費課題番号の抽出（助成情報セクションから）
    const fundingSection = mf.querySelector('[data-key*="funding"]');
    const awardNumbers = [];
    if (fundingSection) {
      const awardInputs = fundingSection.querySelectorAll('input[type="text"]');
      for (const input of awardInputs) {
        const val = input.value.trim();
        // JP + 英数字のパターン（科研費・JST等の課題番号）
        if (/^JP[A-Za-z0-9]+$/.test(val)) {
          awardNumbers.push(val);
        }
      }
    }

    return { title, authors, doiHref, resourceType, sectionCount, awardNumbers };
  });

  const checks = [
    { field: 'タイトル', ok: results.title.length > 0, value: results.title.substring(0, 80) || '(空)' },
    { field: '著者数', ok: results.authors > 0, value: `${results.authors}人` },
    { field: 'DOIリンク', ok: results.doiHref.includes('doi.org'), value: results.doiHref || 'なし' },
    { field: '資源タイプ', ok: results.resourceType.length > 0, value: results.resourceType || '(空)' },
    { field: 'セクション数', ok: results.sectionCount > 10, value: `${results.sectionCount}セクション` },
  ];

  console.log('\n=== E2E テスト結果 (main) ===');
  console.log(`DOI: ${doi}\n`);
  let allPassed = true;
  for (const c of checks) {
    const mark = c.ok ? 'PASS' : 'FAIL';
    if (!c.ok) allPassed = false;
    console.log(`[${mark}] ${c.field}: ${c.value}`);
  }

  // 科研費課題番号が見つかった場合は出力（funder テスト連携用）
  if (results.awardNumbers.length > 0) {
    console.log(`\n検出された課題番号: ${results.awardNumbers.join(', ')}`);
    console.log(`AWARD_NUMBERS=${results.awardNumbers.join(',')}`);
  } else {
    console.log('\n課題番号: なし');
    console.log('AWARD_NUMBERS=');
  }

  console.log(`\n結果: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();
```

#### funder（funder_lookup_test.html）の場合

```javascript
import { chromium } from 'playwright';

const awardNumber = process.argv[2] || 'JPMJPR2125';
const filePath = process.argv[3];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
  const page = await browser.newPage();

  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  await page.goto(`file:///${filePath.replace(/\\/g, '/')}`);

  // 課題番号入力 → 検索ボタンクリック
  await page.fill('#award-input', awardNumber);
  await page.click('#search-btn');

  // 結果を待機
  try {
    await page.waitForSelector('.result-card, .error-message', { timeout: 30000 });
  } catch {
    const html = await page.evaluate(() => document.getElementById('results')?.innerHTML?.substring(0, 500) || 'NO #results');
    console.log('Timeout - DOM state:', html);
  }

  await page.waitForTimeout(3000);

  const checks = [];

  // 結果カードが1つ以上あるか
  const cards = await page.$$('.result-card');
  checks.push({ field: '結果カード数', ok: cards.length > 0, value: `${cards.length}件` });

  // カード内容の検証（あれば）
  if (cards.length > 0) {
    const cardText = await cards[0].textContent();
    checks.push({ field: 'カード内容', ok: cardText.length > 10, value: cardText.substring(0, 100) });
  }

  console.log('\n=== E2E テスト結果 (funder) ===');
  console.log(`課題番号: ${awardNumber}\n`);
  let allPassed = true;
  for (const c of checks) {
    const mark = c.ok ? 'PASS' : 'FAIL';
    if (!c.ok) allPassed = false;
    console.log(`[${mark}] ${c.field}: ${c.value}`);
  }

  console.log(`\n結果: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
  await browser.close();
  process.exit(allPassed ? 0 : 1);
})();
```

### 2. テストの実行

```bash
node _e2e_test.mjs <DOIまたは課題番号> <テスト用HTMLの絶対パス>
```

### 3. main テスト時の funder 連携テスト

**main テストで科研費課題番号（`JP` で始まる番号）が検出された場合、自動的に funder_lookup_test.html のテストも実行してください。**

手順:
1. main テストの出力から `AWARD_NUMBERS=` 行を解析する
2. `AWARD_NUMBERS=` が空でなければ、カンマ区切りの各課題番号について funder テスト用スクリプトを生成・実行する
3. 両方のテスト結果をまとめて報告する

例: main テストで `JP19KK0341` が検出された場合:
```bash
# 1. main テスト
node _e2e_test.mjs "10.1016/j.advnut.2025.100480" "/path/to/make_jc_importer_test.html"
# → AWARD_NUMBERS=JP19KK0341 が出力される

# 2. funder テスト（検出された課題番号で自動実行）
node _e2e_test_funder.mjs "JP19KK0341" "/path/to/funder_lookup_test.html"
```

### 4. 追加検証（任意）

テスト結果の出力を確認し、必要に応じて追加の検証項目をスクリプトに加えてください。
例:
- 特定のフィールドに期待する値が入っているか
- プレビュー表示が正しく動作するか
- TSVエクスポートの内容が正しいか

### 5. クリーンアップ

テスト完了後、一時スクリプト `_e2e_test.mjs` および `_e2e_test_funder.mjs` を削除してください。

### 6. 結果報告

テストの合否と各検証項目の結果をユーザーに報告してください。
main と funder の両方をテストした場合は、両方の結果をまとめて報告してください。
失敗した項目がある場合は、原因の調査も行ってください。
