# Chrome拡張化（CORS回避・APIキー管理）実装記録（Issue #70 + PR #61）

> **ステータス: 実装完了（2026-03-10）**

## Context

以下の3つのAPIがCORS非対応のためブラウザから直接アクセスできず、機能が無効化・コメントアウトされていた。

| API | エンドポイント | 影響 |
|-----|--------------|------|
| KAKEN XML API | `https://kaken.nii.ac.jp/opensearch/` | `fetchKakenXml()` が3箇所でコメントアウト済み |
| JaLC API | `https://api.japanlinkcenter.org/` | `fetchJaLCData()` が呼ばれずエラーメッセージ表示のみ |
| Open Policy Finder API | `https://api.openpolicyfinder.jisc.ac.uk/` | PR #61 の実装対象（単体では動作不可） |

また、OpenAlex・CiNii の APIキーが HTML ソースにハードコードされており、Git管理上の課題があった（キーを直接コミットしないために毎回書き換えが必要）。

**PR #61 との関係:** OPF API（CORS非対応）の連携実装（Issue #50）が Draft PRとして存在していたが、Chrome拡張による CORS 回避と同時実装することで有効化。

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `manifest.json` | **新規作成**（Manifest V3 設定） |
| `background.js` | **新規作成**（Service Worker fetch プロキシ） |
| `options.html` | **新規作成**（APIキー管理 UI） |
| `make_jc_importer.html` | **修正**（extensionFetch・loadConfig追加、OPF連携、KAKEN/JaLC有効化） |
| `funder_lookup.html` | **修正**（extensionFetch・loadConfig追加、KAKEN有効化） |

---

## 変更箇所の概要

```
manifest.json（新規）
├── manifest_version: 3
├── permissions: ["storage", "sidePanel"]
├── host_permissions: [kaken.nii.ac.jp, api.japanlinkcenter.org, api.openpolicyfinder.jisc.ac.uk]
├── background.service_worker: "background.js"
├── side_panel.default_path: "make_jc_importer.html"
└── options_page: "options.html"

background.js（新規）
├── chrome.sidePanel.setPanelBehavior()  … ツールバーボタンでサイドパネルを開く
└── chrome.runtime.onMessage             … { type:'FETCH', url, options } → fetch → sendResponse

options.html（新規）
├── <input> × 3（OpenAlex_API_KEY / CiNii_API_KEY / OPF_API_KEY）
├── chrome.storage.local.get()           … 既存値の読み込み
└── chrome.storage.local.set()           … 保存ボタン

make_jc_importer.html
├── CONFIG定数                           … OPF_API_KEY を追加
├── 新規: loadConfig()                   … chrome.storage.local から APIキーを非同期読み込み
├── 新規: extensionFetch(url, options)   … 拡張あり: sendMessage プロキシ / 拡張なし: fetch()
├── 新規: lastOpfData / lastOpfStatus    … OPF グローバル状態変数
├── 新規: fetchOpenPolicyFinder(issns)   … extensionFetch() でOPF APIを ISSN 順次試行
├── 新規: updateOpfStatus(issns)         … OPF取得・info-bar バッジ更新
├── 新規: openOpfModal() / closeOpfModal() / renderOpfModal()  … OPFモーダル制御
├── fetchKakenXml()                      … fetch() → extensionFetch() に変更
├── fetchJaLC()                          … fetch() → extensionFetch() に変更
├── fetchCrossrefData()                  … updateOpfStatus() 呼び出しを追加
├── fetchJaLCData()                      … updateOpfStatus() 呼び出しを追加
├── fetchData()                          … loadConfig() 呼び出し、JaLC 分岐を有効化
├── buildFunders() ×2                   … KAKEN XML API コメントアウト解除
├── HTML: #opf-modal                     … OPFポリシーモーダル HTML 要素
├── HTML: #opf-badge                     … info-bar に OAポリシーバッジを追加
└── keydown ハンドラ                      … closeOpfModal() も対象に追加

funder_lookup.html
├── 新規: loadConfig()                   … chrome.storage.local から CiNii_API_KEY を読み込み
├── 新規: extensionFetch(url, options)   … make_jc_importer.html と同実装
├── fetchKakenXml()                      … fetch() → extensionFetch() に変更
├── lookupOne()                          … KAKEN XML API コメントアウト解除
└── doSearch()                           … loadConfig() 呼び出しを追加
```

---

## 実装内容

### Step 1: manifest.json の作成

Manifest V3 の Chrome拡張設定ファイル。

```json
{
  "manifest_version": 3,
  "name": "JAIRO Cloud インポート支援ツール",
  "version": "1.0",
  "permissions": ["storage", "sidePanel"],
  "host_permissions": [
    "https://kaken.nii.ac.jp/*",
    "https://api.japanlinkcenter.org/*",
    "https://api.openpolicyfinder.jisc.ac.uk/*"
  ],
  "background": { "service_worker": "background.js" },
  "side_panel": { "default_path": "make_jc_importer.html" },
  "action": { "default_title": "JAIRO Cloud インポートツール" },
  "options_page": "options.html"
}
```

`host_permissions` に CORS 非対応の3APIのエンドポイントを列挙することで、Service Worker からのアクセスが許可される。

---

### Step 2: background.js の作成（Service Worker）

```js
// サイドパネルをツールバーボタンクリックで開く設定
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// fetch プロキシ
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type !== 'FETCH') return false;
  fetch(req.url, req.options || {})
    .then(async (r) => {
      const text = await r.text();
      sendResponse({ ok: r.ok, status: r.status, text });
    })
    .catch((e) => sendResponse({ error: e.message }));
  return true; // 非同期レスポンス
});
```

HTML側から `chrome.runtime.sendMessage({ type: 'FETCH', url, options })` を呼ぶと、Service Worker が CORS制約なしで fetch を実行してレスポンスを返す。`return true` が非同期レスポンスに必要。

---

### Step 3: options.html の作成（APIキー管理 UI）

- OpenAlex API Key / CiNii API Key / OPF API Key の3項目を入力フォームで設定
- `chrome.storage.local.set()` で保存（外部に送信されない）
- `chrome.storage.local.get()` で既存値を読み込み・表示
- 保存時に「保存しました」フィードバック（2秒後に消える）

---

### Step 4: extensionFetch() と loadConfig() の追加（両HTML共通）

#### extensionFetch()

```js
async function extensionFetch(url, options = {}) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    const result = await chrome.runtime.sendMessage({ type: 'FETCH', url, options });
    if (result.error) throw new Error(result.error);
    return {
      ok: result.ok,
      status: result.status,
      text: () => Promise.resolve(result.text),
      json: () => Promise.resolve(JSON.parse(result.text)),
    };
  }
  return fetch(url, options);  // 拡張なし環境では通常の fetch
}
```

**ポイント:** 戻り値を `fetch()` の戻り値（Response）と互換の形（`.text()` / `.json()` メソッドを持つ）にしているため、呼び出し側のコードを変更不要。

#### loadConfig()

```js
async function loadConfig() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  try {
    const stored = await chrome.storage.local.get([...]);
    if (stored.OpenAlex_API_KEY) CONFIG.OpenAlex_API_KEY = stored.OpenAlex_API_KEY;
    ...
  } catch { /* 拡張外環境では無視 */ }
}
```

`fetchData()` / `doSearch()` の先頭で `await loadConfig()` を呼び出す。通常ブラウザでは try/catch 内の `chrome.storage` 参照が失敗するため no-op。

---

### Step 5: KAKEN XML API の有効化

`fetchKakenXml()` 内の `await fetch(url)` を `await extensionFetch(url)` に変更。

コメントアウトされていた3箇所を解除:

- `buildFunders()` Crossref側（`isJsps && awardNum` 条件）
- `buildFunders()` JaLC側（`isJsps && awardNum` 条件）
- `renderOneFunder()` の「助成機関を検索」ボタンハンドラ内（補助金番号の正規化）

`funder_lookup.html` の `lookupOne()` でも同様に解除。

---

### Step 6: JaLC API の有効化

`fetchJaLC()` 内の `await fetch(...)` を `await extensionFetch(...)` に変更。

`fetchData()` の JaLC 分岐を変更:

```js
// 変更前
} else if (ra === 'JaLC') {
  showError('JaLC DOI のインポートは現在未対応です...');

// 変更後
} else if (ra === 'JaLC') {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    await fetchJaLCData(doi);
  } else {
    showError('JaLC DOI のインポートはChrome拡張版のみ対応しています...');
  }
```

通常ブラウザでは明確に「拡張版のみ対応」と案内。

---

### Step 7: OPF API 連携（PR #61 対応）

#### fetchOpenPolicyFinder(issns)

```js
async function fetchOpenPolicyFinder(issns) {
  if (!CONFIG.OPF_API_KEY || CONFIG.OPF_API_KEY === 'YOUR_OPF_API_KEY') return null;
  for (const issn of issns) {
    try {
      const resp = await extensionFetch(
        `https://api.openpolicyfinder.jisc.ac.uk/retrieve_by_id?type=issn&id=${encodeURIComponent(issn)}`,
        { headers: { 'x-api-key': CONFIG.OPF_API_KEY } }
      );
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data && (data.publisher || data.policies?.length)) return data;
    } catch { continue; }
  }
  return null;
}
```

`fetchNcid()` と同じパターン（ISSNを順次試行）。`extensionFetch()` を使用するため Chrome拡張なし環境では CORS エラーになるが、`updateOpfStatus()` で拡張の有無を事前チェックするため実際には呼ばれない。

#### updateOpfStatus(issns)

OPF取得を実行してinfo-barのバッジを更新する関数。Chrome拡張 + OPF_API_KEY 設定の両方が満たされない場合はバッジを非表示にする。

`fetchCrossrefData()` と `fetchJaLCData()` の末尾で呼び出される。

#### OPFモーダル

- `#opf-modal`: HTML要素（`#preview-modal` の直前に追加）
- `openOpfModal()`: バッジクリック時に呼び出し
- `renderOpfModal(data, status)`: 出版社名・ライセンス・エンバーゴ・パブリックノートをカード形式でレンダリング
- Esc キーハンドラ: `closeOpfModal()` を追加

---

## 拡張なし環境での動作保証

| API | 拡張あり | 拡張なし |
|-----|---------|---------|
| Crossref / OpenAlex / ROR / CiNii OpenSearch | ○（元々CORS対応） | ○（従来通り） |
| KAKEN XML API | ○（有効化） | △（hasCiNiiKey の条件でスキップ・CiNii OpenSearchにフォールバック） |
| JaLC API | ○（有効化） | ×（「拡張版のみ対応」メッセージ） |
| OPF API | ○（OPF_API_KEY設定時） | ×（バッジ非表示・呼び出しなし） |

---

## Chrome拡張のインストール方法

1. リポジトリを `git clone` またはダウンロードしてローカルに展開
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化（右上のトグル）
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. リポジトリのルートディレクトリを選択
6. 拡張のアイコンをクリックして options.html を開き、APIキーを設定・保存
7. 拡張アイコンをクリックするとサイドパネルで `make_jc_importer.html` が開く

---

## 参照

- [Issue #70](https://github.com/tzhaya/jc-import-file-maker/issues/70): Chrome拡張化（CORS回避・APIキー管理）
- [Issue #50](https://github.com/tzhaya/jc-import-file-maker/issues/50) / [PR #61](https://github.com/tzhaya/jc-import-file-maker/pull/61): OPF API連携基盤 + ポリシー表示UIモーダル
- [Chrome Extensions: Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome Extensions: Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Implementation_OPF.md](Implementation_OPF.md): OPF連携の設計背景
- [Implementation_KAKEN.md](Implementation_KAKEN.md): KAKEN連携の実装詳細
- [Implementation_JaLC.md](Implementation_JaLC.md): JaLC API対応の実装詳細
