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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // HTMLを開く
  await page.goto(`file:///${filePath.replace(/\\/g, '/')}`);

  // DOI入力 → 取得ボタンクリック
  await page.fill('#doi-input', doi);
  await page.click('#fetch-btn');

  // 結果表示を待機（著者セクションまたはエラー表示）
  await page.waitForSelector('.person-card, #error-msg', { timeout: 30000 });

  // エラーチェック
  const error = await page.$('#error-msg');
  if (error) {
    const text = await error.textContent();
    if (text.trim()) {
      console.error(`ERROR: ${text.trim()}`);
      await browser.close();
      process.exit(1);
    }
  }

  // 基本フィールドの検証
  const checks = [];

  // タイトルが取得されているか
  const title = await page.$eval(
    '[data-key="item_30002_title1"] input[type="text"]',
    el => el.value
  ).catch(() => '');
  checks.push({ field: 'タイトル', ok: title.length > 0, value: title || '(空)' });

  // 著者が1人以上いるか
  const authors = await page.$$('.person-card');
  checks.push({ field: '著者数', ok: authors.length > 0, value: `${authors.length}人` });

  // DOIリンクが表示されているか
  const doiLink = await page.$('#doi-link');
  checks.push({ field: 'DOIリンク', ok: !!doiLink, value: doiLink ? 'あり' : 'なし' });

  // 結果出力
  console.log('\n=== E2E テスト結果 ===');
  console.log(`DOI: ${doi}\n`);
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

#### funder（funder_lookup_test.html）の場合

```javascript
import { chromium } from 'playwright';

const awardNumber = process.argv[2] || 'JPMJPR2125';
const filePath = process.argv[3];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`file:///${filePath.replace(/\\/g, '/')}`);

  // 課題番号入力 → 検索ボタンクリック
  await page.fill('#award-input', awardNumber);
  await page.click('#search-btn');

  // 結果を待機
  await page.waitForSelector('.result-card, .error-message', { timeout: 30000 });

  const checks = [];

  // 結果カードが1つ以上あるか
  const cards = await page.$$('.result-card');
  checks.push({ field: '結果カード数', ok: cards.length > 0, value: `${cards.length}件` });

  console.log('\n=== E2E テスト結果 ===');
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

### 3. 追加検証（任意）

テスト結果の出力を確認し、必要に応じて追加の検証項目をスクリプトに加えてください。
例:
- 特定のフィールドに期待する値が入っているか
- プレビュー表示が正しく動作するか
- TSVエクスポートの内容が正しいか

### 4. クリーンアップ

テスト完了後、一時スクリプト `_e2e_test.mjs` を削除してください。

### 5. 結果報告

テストの合否と各検証項目の結果をユーザーに報告してください。
失敗した項目がある場合は、原因の調査も行ってください。
