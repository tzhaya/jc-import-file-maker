# Issue #44: Open Policy Finder 連携対応 — 実装計画

## Context

機関リポジトリで論文を公開する際、出版社のOAポリシー（公開可能な版・エンバーゴ・ライセンス等）を確認する必要がある。Open Policy Finder (OPF) APIからISSNベースで雑誌のポリシーを取得し、日本語で表示する機能を追加する。

参考実装: `tzhaya/metadata_fetcher_by_DOI` の Power Query カスタム関数 `getOpenpolicyfinder`（ISSN → `system_metadata.uri` を返す）。

**制約:**
- Crossrefパスのみ対応（JaLCパスは非対応 — OPF収録が期待できないため）
- APIキーはユーザーが保有済み
- 認証方式: `x-api-key` HTTPリクエストヘッダー
- CORSの可否は未確認 → Step 1 で検証

## Issue 分割

### Issue #44a: OPF API連携基盤 + ポリシー表示UI（Steps 1-2）
### Issue #44b: OA情報統合 + 日本語化（Steps 3-4）

---

## Step 1: OPF詳細URLの取得・表示（CORSテスト兼用）

**目的:** `getOpenpolicyfinder` と同等の動作を実装し、CORSの可否を検証する。

### 変更箇所

#### 1-1. CONFIG に APIキー追加
**ファイル:** `make_jc_importer.html` ~L558

```js
const CONFIG = {
    OpenAlex_API_KEY: "YOUR_OpenAlex_API_KEY",
    CiNii_API_KEY:    "YOUR_CiNii_API_KEY",
    OPF_API_KEY:      "YOUR_OPF_API_KEY",       // 追加
};
```

#### 1-2. OPF連携 ON/OFF チェックボックス + 状態表示
**ファイル:** `make_jc_importer.html` — `#input-area` 内（DOI入力行の近く）

- `<label><input type="checkbox" id="opf-enabled"> OPF連携</label>` を追加
- **初期状態: OFF（未チェック）** — ユーザーが明示的にONにする
- APIキー未設定時: チェックボックス disabled + 「APIキー未設定」表示
- チェックボックスの状態で `fetchOpenPolicyFinder` の呼び出しを制御

#### 1-3. fetchOpenPolicyFinder() — 最小版
**ファイル:** `make_jc_importer.html` — API取得層（~L1330付近）

```js
async function fetchOpenPolicyFinder(issns) {
    const apiKey = CONFIG.OPF_API_KEY;
    if (!apiKey || apiKey === 'YOUR_OPF_API_KEY') return null;

    for (const issn of issns) {
        try {
            const params = new URLSearchParams({
                'item-type': 'publication',
                'format': 'Json',
                'identifier': issn
            });
            const resp = await fetch(
                `https://api.openpolicyfinder.jisc.ac.uk/retrieve_by_id?${params}`,
                { headers: { 'x-api-key': apiKey } }
            );
            if (resp.status === 404) continue;
            if (!resp.ok) continue;
            const data = await resp.json();
            if (data.items && data.items.length > 0) return data;  // 全データを返す（Step 2で使用）
        } catch (e) { continue; }
    }
    return null;
}
```

- `fetchNcid` パターンに準拠（ISSN配列を順に試行）
- Step 2 で `permitted_oa` 等を使うため、`items[0]` 全体を返す（URIだけでなく）

#### 1-4. mapToItemType() 内で呼び出し
**ファイル:** `make_jc_importer.html` — ISSN抽出後（~L1830付近）

```js
// 既存: const ncid = await fetchNcid(allIssns);
// 変更: OPF連携チェック時は並行実行
const opfEnabled = document.getElementById('opf-enabled')?.checked;
const [ncid, opfData] = await Promise.all([
    fetchNcid(allIssns),
    opfEnabled ? fetchOpenPolicyFinder(allIssns) : Promise.resolve(null)
]);
```

- `opfData` を `metadata` オブジェクトに格納（`_opfData` として、TSVエクスポート対象外のプライベートフィールド）

#### 1-5. info-bar に OPFリンク表示
**ファイル:** `make_jc_importer.html` — `#info-bar` 内

- OPF連携ON + データ取得成功 → `system_metadata.uri` へのリンクを表示（例: 「📋 OAポリシー」）
- OPF連携ON + ISSNなし → 「ISSNが不明のためOPF利用不可」
- OPF連携ON + 0件 → 「OPFに収録なし」
- OPF連携OFF → 何も表示しない

### 検証方法（Step 1）
1. `CONFIG.OPF_API_KEY` にAPIキーを設定
2. OPF連携チェックボックスをON
3. テスト DOI `10.1016/j.advnut.2025.100480`（Advances in Nutrition, ISSN: 2156-5376）で取得
4. info-bar に `https://v2.sherpa.ac.uk/id/publication/25273` へのリンクが表示されることを確認
5. **CORSエラーが出た場合**: コンソールで確認し、Issue に報告して方針検討

---

## Step 2: fetchOpenPolicyFinder() 完全版 + 表示UIモーダル

**目的:** OPF APIレスポンスの `permitted_oa` 詳細をモーダルで表示する。

### 変更箇所

#### 2-1. OPFモーダル HTML/CSS 追加
**ファイル:** `make_jc_importer.html`

- `#opf-modal` を新規追加（プレビューモーダルと同じパターン）
- ヘッダー色は青系（プレビューの緑と区別）
- info-bar の OPF リンクをクリック → モーダル表示

#### 2-2. モーダル表示内容

`permitted_oa[]` を `article_version` ごとにグループ化して表示:

```
┌─────────────────────────────────────────┐
│ 📋 OAポリシー: Nature Biotechnology    ✕│
├─────────────────────────────────────────┤
│ 出版社: Nature Research                 │
│ 雑誌サイト: https://www.nature.com/nbt/ │
│ DOAJ収録: いいえ                        │
│ OPF詳細: https://v2.sherpa.ac.uk/...    │
├─────────────────────────────────────────┤
│ ■ 出版社版 (Published)                  │
│ ┌─────────────────────────────────────┐ │
│ │ ライセンス: CC BY                   │ │
│ │ OA Fee: あり                        │ │
│ │ 公開場所: Any Website, Journal...   │ │
│ │ 条件: Publisher source must be...   │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ライセンス: CC BY-NC-ND            │ │
│ │ OA Fee: あり                        │ │
│ │ 公開場所: Non-Commercial Website... │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ■ 著者最終稿 (Accepted)                │
│ ┌─────────────────────────────────────┐ │
│ │ ライセンス: Publisher's Bespoke...  │ │
│ │ OA Fee: なし                        │ │
│ │ エンバーゴ: 6ヶ月                   │ │
│ │ 公開場所: Institutional Repository..│ │
│ │ 条件:                               │ │
│ │  - Must link to publisher version   │ │
│ │  - Non-commercial use only          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ■ 投稿原稿 (Submitted)                 │
│ ┌─────────────────────────────────────┐ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ポリシー参考URL:                        │
│  - Publishing options (example)         │
│  - Self archiving and license to publish│
└─────────────────────────────────────────┘
```

#### 2-3. モーダル制御関数
- `showOpfModal()` / `closeOpfModal()` — 既存 `showPreview()`/`closePreview()` パターン準拠
- Esc キー / オーバーレイクリックで閉じる
- 既存の Esc ハンドラを拡張（両モーダル対応）

#### 2-4. ポリシー参考URL表示
- `publisher_policy[].urls[]` の `url` + `description` をリンクリストで表示

---

## Step 3: 既存OA情報との統合

**目的:** 論文のOAステータス（OpenAlex由来）と雑誌のOAポリシー（OPF由来）を組み合わせて、機関リポジトリ担当者に有用な情報を優先表示する。

### OpenAlex `open_access.oa_status` の定義

ref: [Issue #51 comment](https://github.com/tzhaya/jc-import-file-maker/issues/51#issuecomment-4101903606)、[OpenAlex docs - Work object: open_access](https://docs.openalex.org/api-entities/works/work-object#open_access)

| 値 | 定義 | 判定条件 |
|---|---|---|
| **`diamond`** | DOAJに収録された、またはOAと判定された完全OAジャーナルに掲載。**APC（論文処理費用）なし**（読者・著者ともに無料） | 完全OAジャーナル + APC = 0 |
| **`gold`** | 完全OAジャーナルに掲載 | 完全OAジャーナル（APCありの場合を含む） |
| **`green`** | 出版社のランディングページでは有料（toll-access）だが、OAリポジトリに無料コピーがある | 出版社版は有料 + リポジトリに無料版あり |
| **`hybrid`** | 購読型（toll-access）ジャーナルにおいて、オープンライセンスのもとで無料公開 | 購読型ジャーナル + オープンライセンスあり |
| **`bronze`** | 出版社のランディングページで無料で読めるが、**識別可能なライセンスがない** | 出版社で無料公開 + ライセンス不明 |
| **`closed`** | 上記いずれにも該当しないすべての論文 | OAではない |

**注意点:**
- `diamond` は `gold` のサブセットで、APCゼロが追加条件
- `green` は出版社版が有料（toll-access）であることが前提条件。出版社で無料公開されていれば green にはならない
- `hybrid` と `bronze` の違いはオープンライセンスの有無
- **Shadowed Green:** 出版社でOA公開されている場合（bronze/hybrid/gold/diamond）、そのステータスが優先されリポジトリにもコピーがあっても `green` にはならない。検出には `any_repository_has_fulltext` フィールドを参照する必要がある

### OAステータスに基づく JPCOAR relationtype / 出版タイプの設定

ref: [Issue #51 comment](https://github.com/tzhaya/jc-import-file-maker/issues/51#issuecomment-4101967021)、[JPCOARスキーマ 2.0 関連情報](https://schema.irdb.nii.ac.jp/ja/schema/2.0/20)

JPCOARスキーマでは、出版社版との関係を関連情報（`jpcoar:relation`）の `relationtype` に記述する:
- **出版社版を掲載:** `relationtype` = `isIdenticalTo`、出版タイプ = `VoR`
- **著者最終稿を掲載:** `relationtype` = `isVersionOf`、出版タイプ = `AM`

| oa_status | relationtype | 出版タイプ |
|---|---|---|
| **`diamond`** | `isIdenticalTo` | VoR |
| **`gold`** | `isIdenticalTo` | VoR |
| **`green`** | `version` フィールドにより判定（下記参照） | `version` フィールドにより判定 |
| **`hybrid`** | `isIdenticalTo` | VoR |
| **`bronze`** | `isIdenticalTo` | VoR |
| **`closed`** | `version` フィールドにより判定（下記参照） | `version` フィールドにより判定 |

#### `green` / `closed` の出版タイプ判定

`green` および `closed`（機関リポジトリに新規掲載するケース）では、OpenAlex `locations[]` の `version` フィールドを参照して出版タイプを切り替える。

| `version` の値 | 出版タイプ | relationtype |
|---|---|---|
| `publishedVersion` | VoR (Version of Record) | `isIdenticalTo` |
| `acceptedVersion` | AM (Accepted Manuscript) | `isVersionOf` |
| `submittedVersion` | SMUR (Submitted Manuscript Under Review) | `isVersionOf` |

※ `closed` の場合、現時点では `any_repository_has_fulltext: false` だが、本ツールで機関リポジトリ（例: 国際農研）に掲載するためのインポートファイルを作成するユースケースを想定している。

#### リポジトリ情報の取得

`any_repository_has_fulltext: true` の場合、`locations` 配列内に `source.type === "repository"` のエントリが含まれる。

この場合は、関連情報 `jpcoar:relation` の `relationtype` に `isVersionOf` として `landing_page_url` の値を `jpcoar:relatedIdentifier` に設定する。`identifierType` は以下の通り:
- DOIと判定できる場合は `DOI`
- handleなら `HDL`
- それ以外のURLは `PURL` とする

各 location オブジェクトの主要フィールド:

| フィールド | 内容 |
|---|---|
| `landing_page_url` | リポジトリのページURL |
| `pdf_url` | 直接PDFリンク（ない場合は `null`） |
| `source.type` | `"repository"` / `"journal"` で出版社とリポジトリを区別 |
| `source.display_name` | リポジトリ名（例: "Europe PMC", "DASH (Harvard)"） |
| `version` | `submittedVersion`（プレプリント） / `acceptedVersion`（著者最終稿） / `publishedVersion`（出版版） |
| `license` | そのロケーションでのライセンス（例: `cc-by`） |
| `is_oa` | そのロケーションでOAアクセス可能か（`true` / `false`） |

### OPFモーダルでの表示ロジック

| OAステータス | 優先表示 |
|-------------|---------|
| `diamond` / `gold` | 「出版社版が公開可能」→ Published の permitted_oa を強調 |
| `green` | 「著者最終稿/投稿原稿が公開可能」→ Accepted/Submitted を強調 |
| `hybrid` | diamond/gold と同様（APC支払い済み） |
| `bronze` | diamond/gold と同様（ただしライセンス不明の旨を注記） |
| `closed` | 「著者最終稿のリポジトリ公開条件」→ Accepted (fee=no, location=institutional_repository) を強調 |

### 変更箇所
- info-bar の OPF リンク横に、最も関連性の高いポリシーのサマリーを1行で表示
- モーダル内で **`institutional_repository` を含む `permitted_oa` エントリを視覚的にハイライト**（背景色変更等）し、モーダル上部に配置
- OAステータスに応じて最も関連性の高いエントリにラベル（例:「★ この論文に該当」）を付与
- OAステータスに基づく `relationtype` / 出版タイプの自動設定（`mapToItemType()` 内の関連情報マッピングに反映）

---

## Step 4: ~~日本語化~~ → UIラベル日本語 + データ値は原文表示

**変更理由:** OPFデータは **CC BY-NC-ND** ライセンスで提供されており、翻訳は「翻案（derivative work）」に該当し ND 条項に抵触する可能性がある。そのため翻訳マップによるデータ値の日本語化は行わない。

### 方針

- **UIラベル（自作テキスト）:** 日本語で記述（例: 「公開可能な版:」「公開場所:」「ライセンス:」）
- **データ値:** APIレスポンスの `_phrases` フィールド（英語）をそのまま表示
  - `article_version_phrases[].phrase` → "Published", "Accepted", "Submitted"
  - `location.location_phrases[].phrase` → "Institutional Repository", "Any Website" 等
  - `license[].license_phrases[].phrase` → "CC BY", "CC BY-NC-ND" 等
  - `conditions[]` → 原文のまま
  - `embargo` → `{amount} {units}` をそのまま表示（例: "6 months"）
- **帰属表示:** モーダルフッターに CC BY-NC-ND ライセンス表記とOPFへのリンクを記載

---

## 対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `make_jc_importer.html` | 主要実装（CONFIG, fetch, UI, モーダル） |
| `README.md` | 変更履歴追記 |
| `docs/requirements.md` | OPF連携の要件追記 |
| `docs/worklog.md` | 実装ログ追記 |
| `MEMORY.md` | 行番号目安等更新 |

## 実装順序

1. **Step 1** を実装 → CORSテスト → 成否を確認
2. CORSが通れば Steps 2-3 を順次実装、Step 4 はUIラベルのみ日本語化
3. CORSが通らなければ Issue にて代替策（プロキシ等）を検討

---

## 2026-07-29 JISC API v1 full リリース対応（Issue #229）

JISCから2026-07-29に Open Policy Finder API の "full v1" リリース通知があった。影響範囲を調査し、予防的対応とエラーハンドリング改善を実施した（`fetchOpenPolicyFinder()` / `updateOpfStatus()` / `renderOpfModal()`、`make_jc_importer.js` に一本化）。

### 影響評価

本ツールは `retrieve_by_id` エンドポイントのみを `item-type=publication` / `identifier=<ISSN>` の2パラメータで呼び出しており、ページネーション（`retrieve` / `object_ids` エンドポイント）は未使用のため、JISC通知の変更の大部分は影響なし。対応が必要だったのは以下の2点。

- **`format` パラメータの廃止**: `retrieve_by_id` で `format` パラメータのサポートが終了するとの通知のため、送信していた `format: 'Json'` を削除した（レスポンスは常にJSON化される）
- **エラーレスポンスが常にJSONオブジェクトになる**: 従来 `!resp.ok` を一律 `continue`（次のISSNへ）していたため、401/403/429等の実エラーが「未収録」と誤表示される構造的な問題があった（#211/PR #235と同種）。404（未収録）とそれ以外のエラーを分岐し、後者は例外として呼び出し元に伝える形に変更した

### 変更内容

- `fetchOpenPolicyFinder()`: `format` パラメータを削除。404以外の `!resp.ok` はエラー詳細（JSONボディ）を `console.warn` に出力した上で、ループ終了後に例外を送出する
- `updateOpfStatus()`: `lastOpfStatus` に `'error'` を追加（従来は例外時も `'not-found'` と同じ値で、バッジ文言のみ異なっていた）。エラー時はバッジを赤系配色（`#ffebee` / `#c62828`）にして「情報なし」と区別
- `renderOpfModal()`: `status === 'error'` 時に専用メッセージを表示

### 未検証事項（フォローアップ）

- `retrieve_by_id` のレスポンス構造（`items` ラップの有無等）の実際の変化は2026-07-29以降でないと確認できない。JISC公式ヘルプページは自動アクセスがボット対策とみられる403でブロックされ、事前の裏付けは取れなかった
- リリース後、テストISSN（`2156-5376`, `1546-1696`）で実APIを再実行し、`samples/OpenPolicyFinder/*.json` との差分を確認する（別Issue化を検討）
