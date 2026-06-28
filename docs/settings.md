# 設定ガイド（APIキー・初期値）

JAIRO Cloud インポート支援ツールで設定できる **APIキー** と **初期値**（管理フィールド・リポジトリURL・OpenAlex機関検索）の一覧と設定手順をまとめています。

- **Chrome拡張機能版** は設定ページ（オプション）でGUIから設定し、ブラウザのローカルストレージに保存します。ソースコードの編集は不要です。
- **通常ブラウザ版** は `shared.js` の `CONFIG` 定数を直接編集します。設定は `make_jc_importer.html`・`funder_lookup.html`・`openalex_lookup.html` に共通で反映されます。

**APIキー・初期値ともすべて任意です。** 未設定でもツールは動作します（APIキー未設定時はレート制限が厳しくなる等の制約があります）。

---

## APIキー

| キー（`CONFIG`） | 用途 | 必須／任意 | 未設定時の動作 | 取得先 | 対応版 |
|---|---|---|---|---|---|
| `OpenAlex_API_KEY` | OpenAlex API へのアクセス（OA状況・ORCID補完・機関別著作検索・課題番号抽出） | 任意（継続利用は推奨） | 利用可能だがレート制限が厳しくなる。画面上部に警告を表示 | [OpenAlex API設定ページ](https://openalex.org/settings/api) | 両版 |
| `CiNii_API_KEY` | CiNii Research API（KAKEN XML API・NCID取得・科研費課題名取得） | KAKEN XML API利用時は必須／その他は任意 | KAKEN XML API（科研費課題検索）が利用不可。NCID取得・科研費課題名取得はレート制限ありで動作 | [CiNiiウェブAPI 利用登録](https://support.nii.ac.jp/ja/cinii/api/developer) | 両版（KAKEN XMLはChrome拡張版のみ） |
| `OPF_API_KEY` | Open Policy Finder API（OAポリシー表示・エンバーゴ自動設定） | 任意 | OAポリシー表示とエンバーゴ自動設定が利用不可 | [Open Policy Finder](https://openpolicyfinder.jisc.ac.uk/) | Chrome拡張機能版のみ（CORS制約のため） |

> **OpenAlex API Key（推奨）**: OpenAlex API はキーなしでの利用回数に制限があります。継続的に利用する場合は設定を推奨します。未設定の場合、ページ上部に警告メッセージが表示され、利用回数の制限を超えるとデータ取得時にエラーが表示されます。

> **CiNii API Key 未設定でも動く機能**: JSPS（日本学術振興会）が助成機関に含まれる場合の CiNii Research Projects API 経由での科研費課題名（日英）・KAKEN課題ページURL取得、ISSN からの CiNii Research OpenSearch API 経由での NCID（NACSIS-CAT書誌ID）取得は、CiNii APIキー未設定でも動作します。

---

## 初期値（任意）

よく使う登録先インデックスやリポジトリURL・自機関RORを設定しておくと、フォームの初期値として自動入力され、入力の手間を省けます。

| 項目（`CONFIG`） | 説明 | 例 | 反映先 |
|---|---|---|---|
| `DEFAULT_REPOSITORY_URL`<br>（リポジトリURL） | リポジトリのURL | `https://example.repo.nii.ac.jp/` | ① TSV出力時にスキーマURLの `https://localhost/` を置換<br>② OpenAlex機関別著作検索の **登録状況照合（#156）** の対象リポジトリ<br>③ Chrome拡張版では OpenSearch検索タブの「デフォルトリポジトリ URL」と共用 |
| `DEFAULT_INDEX_ID`<br>（`.IndexID[0]`） | アイテムの登録先インデックスID | `1697430475875` | TSV生成ツールの管理フィールド初期値 |
| `DEFAULT_POS_INDEX`<br>（`.POS_INDEX[0]`） | インデックス名パス（人間可読） | `学術雑誌論文` | TSV生成ツールの管理フィールド初期値 |
| `DEFAULT_ROR_ID`<br>（ROR ID） | 自機関の ROR ID（フルURL または ID） | `https://ror.org/057zh3y96` | OpenAlex機関別著作検索パネルの ROR ID 初期値 |
| `DEFAULT_OPENALEX_DAYS`<br>（検索対象期間） | OpenAlex機関別著作検索の対象期間（過去N日・**出版日ベース**） | `90`（既定） | OpenAlex機関別著作検索パネルの対象期間初期値 |

`DEFAULT_*` に設定した値は、「データ取得」後や「空値で全フィールド表示」時に管理フィールドの初期値として入力され、リポジトリURLは入力欄が空のときに自動入力されます。

> **`DEFAULT_OPENALEX_DAYS` の注意**: 出版日（`from_publication_date`）ベースのため、最近 OpenAlex に収録された旧出版論文を取りこぼす場合は大きめの値を指定してください。

> 自機関の ROR ID は [ROR](https://ror.org/) で機関名から検索できます。

---

## Chrome拡張機能版での設定（推奨）

Chrome拡張機能版では設定ページでAPIキー・初期値をまとめて設定できます。設定値はブラウザのローカルストレージ（`chrome.storage.local`）に保存され、各API提供元への認証以外の目的で送信されることはありません（詳細は[プライバシーポリシー](privacy-policy.md)を参照）。

1. 拡張機能の「JAIRO Cloud インポート支援ツール」の ︙ → オプション を開きます。

   <img src="images/config.png" alt="拡張機能の設定メニュー" width="300">

2. 各項目を入力して「保存」を押してください。

設定ページの構成は次のとおりです。

| セクション | 設定項目 |
|---|---|
| JAIRO Cloud OpenSearch | デフォルトリポジトリ URL（`DEFAULT_REPOSITORY_URL` と共用） |
| OpenAlex 機関検索 | デフォルト ROR ID（`DEFAULT_ROR_ID`）／検索対象期間 過去N日（`DEFAULT_OPENALEX_DAYS`） |
| TSV 管理フィールドの初期値 | `.IndexID[0]`（`DEFAULT_INDEX_ID`）／`.POS_INDEX[0]`（`DEFAULT_POS_INDEX`） |
| OpenAlex API | API Key（`OpenAlex_API_KEY`） |
| CiNii Research API | API Key（`CiNii_API_KEY`） |
| Open Policy Finder (OPF) API | API Key（`OPF_API_KEY`） |

リポジトリURLは「JAIRO Cloud OpenSearch」の「デフォルトリポジトリ URL」で設定し、OpenSearch検索タブとTSV生成ツール・OpenAlex機関別著作検索の照合の両方に反映されます。

CORS非対応のAPI（KAKEN XML API・JaLC API・Open Policy Finder API）は、Chrome拡張機能のService Worker経由でのみ利用可能になります。

---

## 通常ブラウザ版での設定

`shared.js` をテキストエディタで開き、`CONFIG` 定数にAPIキーと初期値をまとめて設定してください。この設定は `make_jc_importer.html`・`funder_lookup.html`・`openalex_lookup.html` のすべてに反映されます。初期値（`DEFAULT_*`）は空欄のままでも動作します。

```js
const CONFIG = {
    // OpenAlex APIキー（任意）
    // https://openalex.org/settings/api からご自身のキーを取得して貼り付けてください
    OpenAlex_API_KEY: "YOUR_OpenAlex_API_KEY",

    // CiNii APIキー（任意）
    // CiNiiウェブAPI 利用登録 https://support.nii.ac.jp/ja/cinii/api/developer で取得したキーを貼り付けてください
    CiNii_API_KEY: "YOUR_CiNii_API_KEY",

    // Open Policy Finder APIキー（任意・Chrome拡張機能版のみ有効）
    OPF_API_KEY: "YOUR_OPF_API_KEY",

    // ===== システム（管理フィールド）・リポジトリURLの初期値（任意） =====
    // よく使う登録先インデックスやリポジトリURLを設定すると、フォームに初期値として入力されます。

    // リポジトリURL（repo-host）。TSVのスキーマURL置換・OpenAlex機関検索の登録状況照合に使用
    DEFAULT_REPOSITORY_URL: "",

    // .IndexID[0]（.metadata.path[0]）アイテムの登録先インデックスID  例: 1697430475875
    DEFAULT_INDEX_ID: "",

    // .POS_INDEX[0]（.pos_index[0]）インデックス名パス（人間可読）  例: 学術雑誌論文
    DEFAULT_POS_INDEX: "",

    // ===== OpenAlex 機関検索の初期値 =====
    // 自機関の ROR ID（フルURL or ID）。OpenAlex機関別著作検索パネルの初期値に使用
    // 例: https://ror.org/057zh3y96
    DEFAULT_ROR_ID: "",

    // OpenAlex機関別著作検索の対象期間（過去N日、from_publication_date ベース）。既定 90 日
    DEFAULT_OPENALEX_DAYS: 90,
};
```

---

## 関連ドキュメント

- [使い方ガイド](user_guide.md) — 各ツールの操作手順
- [README](../README.md) — 概要・導入方法・機能比較
- [開発者向けドキュメント](developer_docs.md) — 品質チェック・文字コード確認
