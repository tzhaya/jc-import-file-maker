# KAKEN連携 実装計画（Issue #2 + #7）

## Context

Crossref の funder 情報に JSPS（日本学術振興会）が含まれる場合、CiNii Research Projects API を使って科研費の課題名（日英）と KAKEN 課題ページ URL を取得し、WEKO の助成情報フィールドに自動入力する。

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `make_jc_importer.html` | **修正**（CONFIG変更、API取得関数追加、マッピング修正） |

---

## 変更箇所の概要

```
make_jc_importer.html
├── CONFIG定数 (~L403-407)          … キー名変更
├── fetchOpenAlex() (~L784-797)     … CONFIG参照先変更
├── 新規: fetchKaken()              … CiNii Research API呼び出し
├── buildFunders() (~L1028-1062)    … async化、CiNiiデータ反映
├── mapToItemType() (~L1064-1308)   … async化（buildFunders await）
├── fetchCrossrefData() (~L847-880) … mapToItemType await対応
└── APIキー未設定警告 (~L2463-2465) … CONFIG参照先変更
```

---

## 実装ステップ

### Step 1: CONFIG定数の変更（~L403-407）

**変更前:**
```js
const CONFIG = {
    API_KEY: "YOUR_API_KEY",
};
```

**変更後:**
```js
const CONFIG = {
    // OpenAlex APIキー（必須）
    // https://openalex.org/settings/api からご自身のキーを取得して貼り付けてください
    OpenAlex_API_KEY: "YOUR_OpenAlex_API_KEY",

    // CiNii APIキー（任意）
    // CiNiiウェブAPI 利用登録 https://support.nii.ac.jp/ja/cinii/api/developer で取得したキーを貼り付けてください
    CiNii_API_KEY: "YOUR_CiNii_API_KEY",
};
```

### Step 2: fetchOpenAlex() の CONFIG参照先変更（~L787-788）

`CONFIG.API_KEY` → `CONFIG.OpenAlex_API_KEY` に変更。判定条件のデフォルト値も合わせて変更。

**変更前:**
```js
if (CONFIG.API_KEY && CONFIG.API_KEY !== 'YOUR_API_KEY') {
    url += `?api_key=${encodeURIComponent(CONFIG.API_KEY)}`;
}
```

**変更後:**
```js
if (CONFIG.OpenAlex_API_KEY && CONFIG.OpenAlex_API_KEY !== 'YOUR_OpenAlex_API_KEY') {
    url += `?api_key=${encodeURIComponent(CONFIG.OpenAlex_API_KEY)}`;
}
```

### Step 3: fetchKaken() の新規追加（~L847付近、fetchCrossrefData の前に挿入）

CiNii Research Projects API を呼び出し、課題名（日英）と課題 URL を返す関数を新規作成する。

```js
// ===== 3.5 CiNii Research KAKEN API =====
async function fetchKaken(awardNumber) {
  // JP プレフィックス除去
  const projectId = awardNumber.replace(/^JP/i, '');
  const appid = encodeURIComponent(CONFIG.CiNii_API_KEY);

  // 日本語・英語タイトルを並列取得
  const [jaResp, enResp] = await Promise.all([
    fetch(`https://cir.nii.ac.jp/opensearch/v2/projects?appid=${appid}&format=json&projectId=${encodeURIComponent(projectId)}`),
    fetch(`https://cir.nii.ac.jp/opensearch/v2/projects?appid=${appid}&format=json&projectId=${encodeURIComponent(projectId)}&lang=en`),
  ]);

  if (!jaResp.ok || !enResp.ok) return null;

  const jaData = await jaResp.json();
  const enData = await enResp.json();

  if (!jaData.items?.length) return null;

  const jaTitle = jaData.items[0].title || '';
  const enTitle = enData.items?.[0]?.title || '';
  const kakenUrl = jaData.items[0]['dc:source']?.[0]?.['@id'] || '';

  // 日英タイトルが同一の場合は英語タイトルなし
  const titles = [];
  if (jaTitle) {
    titles.push({ subitem_award_title: jaTitle, subitem_award_title_language: 'ja' });
  }
  if (enTitle && enTitle !== jaTitle) {
    titles.push({ subitem_award_title: enTitle, subitem_award_title_language: 'en' });
  }

  return { titles, kakenUrl };
}
```

**ポイント:**
- 日英リクエストを `Promise.all` で並列化
- `items` が空の場合は `null` を返す（呼び出し元で空フィールド維持）
- 日英タイトルが同一なら英語タイトルを除外

### Step 4: buildFunders() の async化（~L1028-1062）

`buildFunders` を `async` にし、JSPS funder の場合に `fetchKaken()` を呼び出す。

**変更前:**
```js
function buildFunders(crFunders) {
  return (crFunders || []).flatMap(f => {
    ...
    const buildEntry = (awardNum) => {
      ...
      obj.subitem_award_numbers = {
        subitem_award_number: awardNum,
        subitem_award_number_type: '',
        subitem_award_uri: '',
      };
      obj.subitem_award_titles = [];
      return obj;
    };

    if (awards.length === 0) return [buildEntry('')];
    return awards.map(aw => buildEntry(aw));
  });
}
```

**変更後:**
```js
async function buildFunders(crFunders) {
  const JSPS_DOI = '10.13039/501100001691';
  const isKakenEnabled = CONFIG.CiNii_API_KEY
                      && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY';

  const entries = await Promise.all((crFunders || []).map(async (f) => {
    const name      = f.name  || '';
    const funderDoi = f.DOI   || '';
    const awards    = f.award || [];

    // JSPS判定: DOI一致 かつ CiNii_API_KEY設定済み
    const isJsps = isKakenEnabled && funderDoi === JSPS_DOI;

    const buildEntry = async (awardNum) => {
      const obj = {};
      obj.subitem_funder_names = name
        ? [{ subitem_funder_name: name, subitem_funder_name_language: 'en' }]
        : [];

      if (funderDoi) {
        obj.subitem_funder_identifiers = {
          subitem_funder_identifier:      `https://doi.org/${funderDoi}`,
          subitem_funder_identifier_type: 'Crossref Funder',
        };
      } else {
        obj.subitem_funder_identifiers = {
          subitem_funder_identifier: '',
          subitem_funder_identifier_type: '',
        };
      }

      // KAKEN連携: JSPS かつ award番号ありの場合
      let kakenResult = null;
      if (isJsps && awardNum) {
        try {
          kakenResult = await fetchKaken(awardNum);
        } catch (e) {
          console.warn(`KAKEN取得失敗 (${awardNum}):`, e.message);
        }
      }

      obj.subitem_award_numbers = {
        subitem_award_number:      awardNum,
        subitem_award_number_type: '',
        subitem_award_uri:         kakenResult?.kakenUrl || '',
      };

      obj.subitem_award_titles = kakenResult?.titles || [];
      return obj;
    };

    if (awards.length === 0) return [await buildEntry('')];
    return Promise.all(awards.map(aw => buildEntry(aw)));
  }));

  return entries.flat();
}
```

**ポイント:**
- `flatMap` → `Promise.all` + `map` + `flat()` に変更（async対応）
- JSPS判定: `funderDoi === '10.13039/501100001691'` かつ `CiNii_API_KEY` 設定済み
- KAKEN取得失敗時は `console.warn` のみで Crossref データを保持
- 各 funder の KAKEN リクエストを並列実行

### Step 5: mapToItemType() の async化（~L1064-1308）

`buildFunders` が async になったため、`mapToItemType` も async 化する。

**変更前:**
```js
function mapToItemType(crJson, oaJson, rorMap) {
  ...
  item_30002_funding_reference21: buildFunders(crJson.funder),
  ...
}
```

**変更後:**
```js
async function mapToItemType(crJson, oaJson, rorMap) {
  ...
  item_30002_funding_reference21: await buildFunders(crJson.funder),
  ...
}
```

変更は2箇所のみ:
1. `function` → `async function`
2. `buildFunders(crJson.funder)` → `await buildFunders(crJson.funder)`

### Step 6: fetchCrossrefData() の mapToItemType 呼び出し修正（~L877）

`mapToItemType` が async になったため `await` を追加する。

**変更前:**
```js
const metadata = mapToItemType(crJson, oaJson, rorMap);
```

**変更後:**
```js
const metadata = await mapToItemType(crJson, oaJson, rorMap);
```

`fetchCrossrefData` は既に async 関数のため、`await` を追加するだけでよい。

### Step 7: APIキー未設定警告の変更（~L2463-2465）

`CONFIG.API_KEY` → `CONFIG.OpenAlex_API_KEY` に変更。

**変更前:**
```js
if (!CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_API_KEY') {
  document.getElementById('apikey-warning').style.display = 'block';
}
```

**変更後:**
```js
if (!CONFIG.OpenAlex_API_KEY || CONFIG.OpenAlex_API_KEY === 'YOUR_OpenAlex_API_KEY') {
  document.getElementById('apikey-warning').style.display = 'block';
}
```

---

## 処理フロー

```
fetchData()
  └→ fetchCrossrefData(doi)
       ├→ fetchCrossref(doi)      ─┐
       ├→ fetchOpenAlex(doi)      ─┤ 並列
       │                           ↓
       ├→ fetchAllRorData(oaJson)
       │
       └→ mapToItemType(crJson, oaJson, rorMap)    ← async化
            └→ buildFunders(crJson.funder)          ← async化
                 ├→ JSPS判定 (funder.DOI === "10.13039/501100001691")
                 ├→ fetchKaken(awardNumber)          ← 新規
                 │    ├→ CiNii API (langなし)  ─┐
                 │    └→ CiNii API (lang=en)   ─┤ 並列
                 │                               ↓
                 │    └→ { titles, kakenUrl }
                 └→ subitem_award_titles / subitem_award_uri にセット
```

---

## エラーハンドリング方針

| シナリオ | 挙動 |
|---------|------|
| CiNii_API_KEY 未設定 | KAKEN連携をスキップ（Crossrefデータのみ） |
| JSPS以外の funder | KAKEN連携をスキップ（従来通り） |
| award番号が空 | KAKEN連携をスキップ |
| CiNii API がエラー応答 | `console.warn` で警告、Crossrefデータを保持 |
| `items` が空配列 | CiNii由来フィールドを空のまま |
| 日英タイトルが同一 | 英語タイトルを除外（日本語のみ） |

---

## テスト計画

| テストケース | 入力DOI | 期待結果 |
|---|---|---|
| JSPS助成あり | `10.1016/j.advnut.2025.100480` | JSPS funderのaward番号でKAKEN連携が発動、課題名・URLが入力される |
| JSPS助成なし | 任意の非JSPS DOI | 従来通りの動作（助成情報にCiNiiフィールドなし） |
| CiNii_API_KEY未設定 | 任意 | KAKEN連携スキップ、従来通りの動作 |
| 存在しない課題番号 | JSPS funderで無効な番号 | CiNii由来フィールドが空のまま |
| 空フィールド表示 | 「空の入力フィールド」ボタン | エラーなく表示される |
