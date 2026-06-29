# CORS回避：Chrome拡張化 引き継ぎメモ

> **注記（履歴メモ）**: 本ドキュメントは CORS 回避のための Chrome 拡張化を検討していた当時の引き継ぎメモです。以降の本文に登場する manifest 例（`"version": "1.0"` / `"name": "JC Import File Maker"` / 入口 `funder_lookup.html` など）は当時の検討内容であり、**現行の実装とは異なります**。現行は manifest `version` が `1.14.2`、`name` が「JAIRO Cloud インポート支援ツール」、入口は `panel.html`（`funder_panel.html` / `openalex_panel.html` / `opensearch_panel.html` のタブ構成）です。最新の構成は `chrome-extension/manifest.json` を参照してください。

## 背景・目的

`jc-import-file-maker` リポジトリの `funder_lookup.html`（単体HTMLファイル）から、以下の3つのAPIを呼び出す際にCORSエラーが発生している。Chrome拡張の `background.js`（Service Worker）経由でこれを回避することを検討している。

---

## 問題のAPIと状況

| API | URL | 運営 | 認証 | CORSの問題 |
|---|---|---|---|---|
| KAKEN API | `https://kaken.nii.ac.jp/opensearch/` | NII | 不要 | CORS非対応 |
| Open Policy Finder | `https://openpolicyfinder.jisc.ac.uk/api/v1/` | Jisc (UK) | 不要 | CORS非対応 |
| JaLC API | `https://api.japanlinkcenter.org/` | ジャパンリンクセンター | 一部要認証 | 対応状況不明確 |

---

## 解決策：Chrome拡張化（サイドパネル方式）

### なぜ background.js で回避できるのか

| 環境 | CORSの適用 |
|---|---|
| 通常のWebページ内JS | ブラウザがCORSを強制する |
| Content Script | 通常のWebページと同じ扱い（CORSあり） |
| **background.js / Service Worker** | **CORSチェックなし（拡張権限で動く）** |

`manifest.json` で対象ドメインへの `host_permissions` を宣言することで、background.js から任意のAPIに `fetch()` できる。

### アーキテクチャ

```
funder_lookup.html
    ↓ chrome.runtime.sendMessage()
background.js（Service Worker）
    ↓ fetch()（CORSなし）
KAKEN / Open Policy Finder / JaLC API
    ↓ レスポンスを返す
funder_lookup.html（受け取って表示）
```

---

## 採用する実装パターン：サイドパネル方式（推奨）

Chrome 114以降の `chrome.sidePanel` APIを使い、`funder_lookup.html` をサイドパネルとして動かす。フルサイズで表示でき、background.js へのメッセージングが使える。

### ディレクトリ構成

```
jc-import-file-maker/
├── manifest.json       ← 新規作成
├── background.js       ← 新規作成
└── funder_lookup.html  ← 既存ファイル（先頭にfetchラッパーを追加）
```

---

## 実装コード

### manifest.json（新規作成）

```json
{
  "manifest_version": 3,
  "name": "JC Import File Maker",
  "version": "1.0",
  "permissions": [
    "sidePanel"
  ],
  "host_permissions": [
    "https://kaken.nii.ac.jp/*",
    "https://openpolicyfinder.jisc.ac.uk/*",
    "https://api.japanlinkcenter.org/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "funder_lookup.html"
  },
  "action": {
    "default_title": "JC Import File Maker"
  }
}
```

### background.js（新規作成）

```javascript
// サイドパネルを開く
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// CORSを回避するfetchプロキシ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "fetchAPI") return;

  const { url, method = "GET", headers = {}, body } = request;

  fetch(url, { method, headers, body })
    .then(async (res) => {
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("json")
        ? await res.json()
        : await res.text();
      sendResponse({ ok: true, status: res.status, data });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });

  return true; // 非同期応答に必須
});
```

### funder_lookup.html への追加（先頭の `<script>` に追記）

既存の `fetch()` 呼び出しをそのまま使えるよう、`window.fetch` をラップする。**既存コードの変更は不要。**

```javascript
// このブロックをHTMLの先頭 <script> タグ内に追加するだけ
const _originalFetch = window.fetch.bind(window);
window.fetch = function(url, options = {}) {
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "fetchAPI",
          url,
          method: options.method,
          headers: options.headers,
          body: options.body
        },
        (response) => {
          if (!response || !response.ok) {
            reject(new Error(response?.error || "fetch failed"));
            return;
          }
          resolve({
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            json: () => Promise.resolve(response.data),
            text: () => Promise.resolve(
              typeof response.data === "string"
                ? response.data
                : JSON.stringify(response.data)
            )
          });
        }
      );
    });
  }
  // 拡張外（通常ブラウザ）では元のfetchを使用
  return _originalFetch(url, options);
};
```

---

## ローカルでの動作確認手順

1. VSCodeでファイルを作成後、Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」でリポジトリのフォルダを選択
4. Chromeツールバーに拡張アイコンが表示されたらクリック → サイドパネルが開く
5. 各APIへのfetchが成功するか確認する

---

## APIキーの格納方法

### 現状の課題

現在、APIキーはHTMLファイル内の `CONFIG` 定数にハードコードされている。

| ファイル | APIキー | 用途 |
|---|---|---|
| `make_jc_importer.html` | `OpenAlex_API_KEY` | OpenAlex API（メタデータ取得） |
| `make_jc_importer.html` | `CiNii_API_KEY` | KAKEN XML API / CiNii Research OpenSearch |
| `funder_lookup.html` | `CiNii_API_KEY` | 同上 |

ユーザーはHTMLソースを直接編集してキーを貼り付ける必要があり、Git管理との相性が悪い（コミットに含めてしまうリスク、更新時の上書きリスク）。

### Chrome拡張での推奨方式：`chrome.storage.local` + オプションページ

#### 方式の比較

| 方式 | メリット | デメリット |
|---|---|---|
| **A. `chrome.storage.local`** | 永続保存・拡張内で共有可能・Git管理外 | オプションページの実装が必要 |
| B. `chrome.storage.sync` | Googleアカウント間で同期 | APIキーを同期するのはセキュリティ上望ましくない |
| C. HTMLソース直書き（現状維持） | 実装変更不要 | Git混入リスク・更新時に再設定が必要 |
| D. 環境変数/外部ファイル | 一般的なベストプラクティス | ブラウザ拡張では使えない |

**→ 方式A（`chrome.storage.local`）を推奨。** ローカル端末内に保存され、Git管理外・同期対象外で安全。

#### アーキテクチャ

```
options.html（オプションページ）
    ↓ chrome.storage.local.set()
chrome.storage.local（ブラウザ内部ストレージ）
    ↑ chrome.storage.local.get()
funder_lookup.html / make_jc_importer.html
```

#### ディレクトリ構成（更新）

```
jc-import-file-maker/
├── manifest.json       ← 新規作成（options_page 追加）
├── background.js       ← 新規作成
├── options.html        ← 新規作成（APIキー設定画面）
├── funder_lookup.html  ← 既存（CONFIG定数をstorage読み取りに変更）
└── make_jc_importer.html ← 既存（同上）
```

#### manifest.json への追加

```json
{
  "permissions": [
    "sidePanel",
    "storage"
  ],
  "options_page": "options.html"
}
```

#### options.html（新規作成）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>JC Import File Maker - 設定</title>
<style>
  body { font-family: 'Segoe UI', 'Meiryo', sans-serif; padding: 20px; max-width: 500px; }
  h1 { font-size: 1.2em; color: #1b5e20; }
  label { display: block; font-weight: bold; margin-top: 16px; font-size: 0.9em; }
  input[type="text"] {
    width: 100%; padding: 8px; margin-top: 4px;
    border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;
    font-family: 'Consolas', monospace;
  }
  .hint { font-size: 0.8em; color: #666; margin-top: 2px; }
  .hint a { color: #1976d2; }
  button {
    margin-top: 20px; padding: 8px 24px;
    background: #4caf50; color: #fff; border: none;
    border-radius: 4px; cursor: pointer; font-size: 0.95em;
  }
  button:hover { background: #388e3c; }
  #status { margin-top: 12px; color: #1b5e20; font-weight: bold; }
</style>
</head>
<body>
  <h1>APIキー設定</h1>

  <label for="openAlexKey">OpenAlex API Key</label>
  <input type="text" id="openAlexKey" placeholder="未設定">
  <div class="hint">
    <a href="https://openalex.org/settings/api" target="_blank">openalex.org</a> で取得
  </div>

  <label for="ciniiKey">CiNii API Key</label>
  <input type="text" id="ciniiKey" placeholder="未設定">
  <div class="hint">
    <a href="https://support.nii.ac.jp/ja/cinii/api/developer" target="_blank">CiNiiウェブAPI 利用登録</a> で取得
  </div>

  <button id="save">保存</button>
  <div id="status"></div>

  <script>
    // 保存済みのキーを読み込み
    chrome.storage.local.get(['OpenAlex_API_KEY', 'CiNii_API_KEY'], (data) => {
      document.getElementById('openAlexKey').value = data.OpenAlex_API_KEY || '';
      document.getElementById('ciniiKey').value = data.CiNii_API_KEY || '';
    });

    // 保存
    document.getElementById('save').addEventListener('click', () => {
      chrome.storage.local.set({
        OpenAlex_API_KEY: document.getElementById('openAlexKey').value.trim(),
        CiNii_API_KEY: document.getElementById('ciniiKey').value.trim()
      }, () => {
        document.getElementById('status').textContent = '保存しました';
        setTimeout(() => { document.getElementById('status').textContent = ''; }, 2000);
      });
    });
  </script>
</body>
</html>
```

#### HTML側の CONFIG 読み込み変更

既存の `CONFIG` 定数を `chrome.storage.local` から動的に読み込む形に変更する。拡張外（通常ブラウザ）ではフォールバックとして従来のハードコード値を使用。

```javascript
// 既存の CONFIG 定数定義の直後に追加
(async function loadApiKeys() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const data = await chrome.storage.local.get(['OpenAlex_API_KEY', 'CiNii_API_KEY']);
    if (data.OpenAlex_API_KEY) CONFIG.OpenAlex_API_KEY = data.OpenAlex_API_KEY;
    if (data.CiNii_API_KEY) CONFIG.CiNii_API_KEY = data.CiNii_API_KEY;
  }
})();
```

この方式により：
- **拡張として利用時**: オプションページで設定したキーが `chrome.storage.local` から読み込まれる
- **通常ブラウザで利用時**: 従来通り `CONFIG` 定数のハードコード値を使用（後方互換）

#### セキュリティ上の注意

- `chrome.storage.local` はブラウザのプロファイルディレクトリ内に平文で保存される（暗号化なし）
- ただし本プロジェクトのAPIキーは公開API用の識別キー（rate limit管理用）であり、課金やアカウント操作に使われるものではないため、この保護レベルで十分
- Chrome Web Storeに公開しない（unpacked拡張としてローカル利用）ため、サードパーティによるアクセスリスクも低い

---

## 未確認事項・次のステップ

- [ ] JaLC APIの認証が必要なエンドポイントへの対応（Authorizationヘッダーの扱い）
- [ ] Open Policy Finder の正確なエンドポイントURLの確認
- [ ] 既存の `funder_lookup.html` のfetch呼び出し箇所の洗い出し（ラッパーで全部カバーされるか確認）
- [ ] 別リポジトリのJaLC用ファイルへの同様の対応検討
- [ ] `make_jc_importer.html` の CONFIG 読み込みを `chrome.storage.local` 対応に変更
- [ ] `funder_lookup.html` の CONFIG 読み込みを同様に変更
- [ ] `loadApiKeys()` の非同期完了を待ってからUI初期化する制御の実装（DOMContentLoaded との順序保証）

---

## 開発環境

- ローカル：VSCode
- 対象ブラウザ：Chrome（Manifest V3）
- 配布方法：Chrome Web Store公開不要、unpacked拡張としてローカル利用
