# KAKEN連携 実装記録（Issue #2 + #7）

> **ステータス: 実装完了（2026-02-18、JGN連携対応により一部変更 2026-02-23）**

## Context

Crossref の funder 情報に JSPS（日本学術振興会）が含まれる場合、CiNii Research Projects API を使って科研費の課題名（日英）と KAKEN 課題ページ URL を取得し、WEKO の助成情報フィールドに自動入力する。

Issue #14（JGN連携）の実装により、KAKEN連携は「JGN未登録時のフォールバック」として再定義された。

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `make_jc_importer.html` | **修正**（CONFIG変更、API取得関数追加、マッピング修正） |

---

## 変更箇所の概要

```
make_jc_importer.html
├── CONFIG定数 (~L419-427)          … APIキー名変更（OpenAlex_API_KEY / CiNii_API_KEY）
├── fetchOpenAlex() (~L903-917)     … CONFIG参照先変更
├── 新規: fetchKaken() (~L968-1002) … CiNii Research API呼び出し（APIキー任意）
├── buildFunders() (~L1227-1288)    … async化、JGN優先→KAKEN fallback
├── mapToItemType() (~L1290-1565)   … async化（buildFunders await）
├── fetchCrossrefData() (~L1047-1080)… mapToItemType await対応
└── APIキー未設定警告 (~L2806-2808) … CONFIG参照先変更
```

---

## 実装内容

### Step 1: CONFIG定数の変更（~L419-427）

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

### Step 2: fetchOpenAlex() の CONFIG参照先変更（~L903-917）

`CONFIG.API_KEY` → `CONFIG.OpenAlex_API_KEY` に変更。

```js
if (CONFIG.OpenAlex_API_KEY && CONFIG.OpenAlex_API_KEY !== 'YOUR_OpenAlex_API_KEY') {
    url += `?api_key=${encodeURIComponent(CONFIG.OpenAlex_API_KEY)}`;
}
```

### Step 3: fetchKaken() の新規追加（~L968-1002）

CiNii Research Projects API を呼び出し、課題名（日英）と課題 URL を返す関数。

**実装上の注意:** 当初計画では `CiNii_API_KEY` を必須パラメータとして送信する設計だったが、APIキー未設定でも動作するよう変更。`appidParam` は条件付きで構築する。

```js
// ===== 3.5 CiNii Research KAKEN API =====
async function fetchKaken(awardNumber) {
  // JP プレフィックス除去
  const projectId = awardNumber.replace(/^JP/i, '');
  const appidParam = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY'
    ? `&appid=${encodeURIComponent(CONFIG.CiNii_API_KEY)}` : '';

  // 日本語・英語タイトルを並列取得
  const [jaResp, enResp] = await Promise.all([
    fetch(`https://cir.nii.ac.jp/opensearch/v2/projects?format=json&projectId=${encodeURIComponent(projectId)}${appidParam}`),
    fetch(`https://cir.nii.ac.jp/opensearch/v2/projects?format=json&projectId=${encodeURIComponent(projectId)}&lang=en${appidParam}`),
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
- `appid` はAPIキー設定済みの場合のみ付加（`CiNii_API_KEY` は任意）
- `items` が空の場合は `null` を返す（呼び出し元で空フィールド維持）
- 日英タイトルが同一なら英語タイトルを除外

### Step 4: buildFunders() の async化（~L1227-1288）

`buildFunders` を `async` にし、JSPS funder の場合に JGN（優先）→ KAKEN（フォールバック）の順で取得する。

**実装上の変更点（当初計画との差分）:**
- `isKakenEnabled`（`CiNii_API_KEY` チェック）を削除 → JSPS判定は funder DOI のみで行う
- KAKEN呼び出し前に JGN連携（`fetchJgn`）を試みる（Issue #14対応）
- KAKEN は JGN が失敗した場合のフォールバックとして動作

```js
// ===== 4.4 助成情報マッピング =====
async function buildFunders(crFunders) {
  const JSPS_DOI = '10.13039/501100001691';

  const entries = await Promise.all((crFunders || []).map(async (f) => {
    const name      = f.name  || '';
    const funderDoi = f.DOI   || '';
    const awards    = f.award || [];

    // JSPS判定: funder DOI が JSPS（APIキー不要）
    const isJsps = funderDoi === JSPS_DOI;

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
        obj.subitem_funder_identifiers = { subitem_funder_identifier: '', subitem_funder_identifier_type: '' };
      }

      // JGN連携: award が JP で始まる場合（JST助成金等）
      let kakenResult = null;
      if (awardNum && /^JP/i.test(awardNum)) {
        try {
          kakenResult = await fetchJgn(awardNum);
        } catch (e) {
          console.warn(`JGN取得失敗 (${awardNum}):`, e.message);
        }
      }

      // KAKEN連携: JSPS かつ award番号あり かつ JGN取得できなかった場合
      if (isJsps && awardNum && !kakenResult) {
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
- JSPS判定: `funderDoi === '10.13039/501100001691'`（`CiNii_API_KEY` 設定不要）
- JGN優先: award が `/^JP/i` にマッチする場合はまず `fetchJgn()` を試みる
- KAKENフォールバック: JSPS かつ JGN未登録（`kakenResult === null`）の場合のみ実行
- 取得失敗時は `console.warn` のみで Crossref データを保持
- 各 funder の API リクエストを並列実行

### Step 5: mapToItemType() の async化（~L1290-）

`buildFunders` が async になったため、`mapToItemType` も async 化する。変更は2箇所のみ:
1. `function` → `async function`
2. `buildFunders(crJson.funder)` → `await buildFunders(crJson.funder)`

### Step 6: fetchCrossrefData() の mapToItemType 呼び出し修正（~L1077）

`mapToItemType` が async になったため `await` を追加:

```js
const metadata = await mapToItemType(crJson, oaJson, rorMap);
```

### Step 7: APIキー未設定警告の変更（~L2806-2808）

`CONFIG.API_KEY` → `CONFIG.OpenAlex_API_KEY` に変更:

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
       └→ mapToItemType(crJson, oaJson, rorMap)    ← async
            └→ buildFunders(crJson.funder)          ← async
                 ├→ award /^JP/ → fetchJgn()        ← JGN優先（Issue #14）
                 │    └→ 成功 → { titles, kakenUrl: "https://doi.org/10.52926/..." }
                 │
                 ├→ JGN失敗 かつ JSPS → fetchKaken() ← KAKENフォールバック
                 │    ├→ CiNii API (langなし)  ─┐
                 │    └→ CiNii API (lang=en)   ─┤ 並列
                 │                               ↓
                 │    └→ { titles, kakenUrl: "https://kaken.nii.ac.jp/..." }
                 │
                 └→ subitem_award_titles / subitem_award_uri にセット
```

---

## エラーハンドリング方針

| シナリオ | 挙動 |
|---------|------|
| JSPS以外の funder | JGN・KAKEN連携をスキップ（従来通り） |
| award番号が空 | JGN・KAKEN連携をスキップ |
| award番号が JP 始まりでない | JGN連携をスキップ（JP始まりのみJGN対象） |
| JGN API がエラー/404 | `null` を返し KAKEN fallback へ |
| CiNii API がエラー応答 | `console.warn` で警告、Crossref データを保持 |
| `items` が空配列 | CiNii由来フィールドを空のまま |
| 日英タイトルが同一 | 英語タイトルを除外（日本語のみ） |
| CiNii_API_KEY 未設定 | appid なしで KAKEN API を呼び出す（匿名アクセス） |

---

## テスト計画

| テストケース | 入力DOI | 期待結果 |
|---|---|---|
| JSPS助成あり（JGN登録済み） | `10.1016/j.advnut.2025.100480` | JGN経由で課題名・URIが入力される |
| JSPS助成あり（JGN未登録） | JSPS funderで JGN未登録 DOI | KAKEN経由で課題名・URLが入力される |
| JSPS助成なし | 任意の非JSPS DOI | 従来通りの動作（助成情報にCiNiiフィールドなし） |
| CiNii_API_KEY未設定 | 任意 | appidなしでKAKEN API呼び出し、正常動作 |
| 存在しない課題番号 | JSPS funderで無効な番号 | CiNii由来フィールドが空のまま |
| 空フィールド表示 | 「空の入力フィールド」ボタン | エラーなく表示される |
