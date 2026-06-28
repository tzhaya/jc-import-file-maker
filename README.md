# JAIRO Cloud インポート支援ツール

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/jknijceijdmdglahkopllhlgnikapmfn?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/jairo-cloud-%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E6%94%AF%E6%8F%B4%E3%83%84%E3%83%BC%E3%83%AB/jknijceijdmdglahkopllhlgnikapmfn)
[![Users](https://img.shields.io/chrome-web-store/users/jknijceijdmdglahkopllhlgnikapmfn?label=users)](https://chromewebstore.google.com/detail/jairo-cloud-%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E6%94%AF%E6%8F%B4%E3%83%84%E3%83%BC%E3%83%AB/jknijceijdmdglahkopllhlgnikapmfn)
[![Rating](https://img.shields.io/chrome-web-store/rating/jknijceijdmdglahkopllhlgnikapmfn?label=rating)](https://chromewebstore.google.com/detail/jairo-cloud-%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E6%94%AF%E6%8F%B4%E3%83%84%E3%83%BC%E3%83%AB/jknijceijdmdglahkopllhlgnikapmfn)

## 概要

DOIを入力してCrossref・OpenAlex APIから書誌情報を取得し、[JAIRO Cloud](https://jpcoar.org/support/jairo-cloud/)へのインポート用TSVファイルを生成するツールです。Chrome拡張機能版では、閲覧中の電子ジャーナルページからDOIを自動取得することもできます。

特に、以下の課題の解決を目指しています。

1. 識別子（ORCID、ROR、KAKENなど）の検索時間の短縮
2. メタデータ入力のサンプルの提示
3. オープンアクセスポリシーの容易な参照
4. [JAIRO Cloud](https://jpcoar.org/support/jairo-cloud/)用インポートファイル（import.zip）作成の支援
5. 自機関所属の研究者が発表した論文メタデータの調査と取得

通常ブラウザ版とChrome拡張機能版の2つの利用方法があります。

- 通常ブラウザ版では、以下の機能が利用できます。
  - Crossref DOIからのメタデータ取り込みと以下のAPIによるデータ補完
    - 複数のDOIを指定して一括してメタデータを取り込めます。
    - [Research Organization Registry (ROR)](https://ror.org/)(ISNI)
    - [OpenAlex](https://openalex.org/)(ORCID)
    - [CiNii Research](https://cir.nii.ac.jp/)(NCID、科研費課題名)
  - [OpenAlex](https://openalex.org/) によるOA状況の表示
  - [JPCOARスキーマ](https://schema.irdb.nii.ac.jp/ja/schema)2.0対応のメタデータ入力
  - 入力メタデータのプレビュー表示
  - [Open Policy Finder](https://openpolicyfinder.jisc.ac.uk/)へのリンク表示
  - インポート用TSVファイル生成
  - 作業中データの自動保存・復元（タブ／サイドパネルを閉じても次回起動時に復元）
  - OpenAlexで自機関所属研究者の最新発表論文の検索と一覧表示
    - 既定値では過去90日に発表された論文を検索します。
    - DOIを出力し、[make_jc_importer.html](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/make_jc_importer.html)のインポート対象にできます

- Chrome拡張機能版では、通常ブラウザ版に加えて以下の機能が利用できます。APIキーが必要ですが、こちらが高機能です。
  - 以下の4ツールのタブ切替
    - JAIRO Cloud インポート用TSV生成ツール
    - 助成情報検索ツール
    - 機関リポジトリのメタデータ検索（OpenSearch）
    - OpenAlex機関別著作検索
  - 閲覧中の電子ジャーナルページからのDOI自動取得（「ページからDOI取得」ボタン）
  - JaLC DOIからのメタデータ取り込み
  - KAKEN APIによる科研費課題番号の検索と取り込み
  - Open Policy Finderから取得したOAポリシーの表示とエンバーゴの設定
  - OpenAlexで自機関所属研究者の最新発表論文の検索と一覧表示
    - 通常ブラウザ版の機能に加え、自機関の機関リポジトリでの登録有無を確認できます
    - 「インポートタブへ送る」ボタンから登録対象とするDOIを「JAIRO Cloud インポート用TSV生成ツール」に送信できます

### 機能比較

| 機能 | Chrome拡張機能版 | 通常ブラウザ版 | 備考 |
|------|:---:|:---:|------|
| **導入** | | | |
| インストール不要（HTMLファイルを開くだけ） | ❌ | ✅ | |
| ブラウザの拡張機能から導入 | ✅ | ❌ | サイドパネルAPI対応のためChrome 114以降が必要 |
| **OAポリシー参照** | | | |
| OpenAlex によるOA状況の表示 | ✅ | ✅ | Crossref DOIがある論文で表示 |
| Open Policy Finder への参照リンク生成 | ✅ | ✅ | ISSN付き雑誌論文で表示 |
| Open Policy Finder API によるOAポリシー表示 | ✅ | ❌ | CORS制約のためChrome拡張機能版のみ |
| Open Policy Finder API の情報によるエンバーゴ有無と期間の設定 | ✅ | ❌ | CORS制約のためChrome拡張機能版のみ |
| **メタデータ取得** | | | |
| 閲覧中ページからのDOI自動取得 | ✅ | ❌ | 電子ジャーナルページのmetaタグから取得（ボタン押下時のみ） |
| Crossref DOI からのメタデータ取得 | ✅ | ✅ | |
| JaLC DOI からのメタデータ取得 | ✅ | ❌ | CORS制約のためChrome拡張機能のService Worker経由が必要 |
| DataCite DOI からのメタデータ取得 | ❌ | ❌ | 未対応です |
| 自機関研究者の著作の取得（OpenAlex機関別著作検索） | ✅ | ✅ | 自機関RORで発表論文を検索 |
| 自機関リポジトリでの登録有無の確認 | ✅ | ❌ | CORS制約のためChrome拡張機能版のみ（OpenSearchで照合） |
| **メタデータ編集・出力** | | | |
| メタデータ確認・編集UI | ✅ | ✅ | JPCOARスキーマ2.0準拠 |
| ファイル名、サイズの自動入力 | ✅ | ✅ | |
| プレビュー表示 | ✅ | ✅ | |
| TSV エクスポート | ✅ | ✅ | |
| **著者・所属情報補完** | | | |
| OpenAlex によるORCID補完 | ✅ | ✅ | |
| **収録物識別子補完** | | | |
| NCID 自動取得 | ✅ | ✅ | ISSNからCiNii Researchを検索 |
| **助成情報補完** | | | |
| DOIからの課題番号自動取得（助成情報検索ツール） | ✅ | ✅ | Crossref/OpenAlex APIから課題番号を抽出 |
| JGN（科学技術振興機構）課題番号検索 | ✅ | ✅ |  |
| CiNii Research API による科研費課題名取得 | ✅ | ✅ |  |
| KAKEN XML API による科研費課題検索 | ✅ | ❌ | CORS制約のためChrome拡張機能版のみ |
| **設定・運用** | | | |
| 作業中データの自動保存・復元 | ✅ | ✅ | タブ／サイドパネルを閉じても次回起動時に復元（ローカル保存のみ） |
| 更新チェック | ✅ | ✅ | 更新がある場合はその旨表示されます |
| APIキー設定（GUI） | ✅ | ❌ | Chrome拡張機能版は設定ページで管理 |
| APIキー設定（ソースコード編集） | ❌ | ✅ | `shared.js` のCONFIG定数を編集 |
| APIキーの永続保存 | ✅ | ❌ | Chrome拡張機能版は `chrome.storage.local` に保存 |
| **関連ツール** | | | |
| 助成情報検索ツール | ✅ | ✅ | Chrome拡張機能版はタブ切替、ブラウザ版は別HTMLファイル |
| JAIRO Cloud リポジトリ検索ツール | ✅ | ❌ | Chrome拡張機能版のみ（OpenSearchで検索） |
| OpenAlex機関別著作検索 | ✅ | ✅ |  |

## 最新の更新

| ツール | 日付 | バージョン | 更新概要 |
|--------|------|-----------|----------|
| Chrome拡張機能版 | 2026-06-28 | ver. 1.14.1 | 広いホスト権限の必要性と安全策を明文化（[#176](https://github.com/tzhaya/jc-import-file-maker/issues/176)）。background.js のproxyコメント修正・getDoiFromCurrentTab に権限理由コメント追記・README「権限とセキュリティ」セクション追加・docs/chrome_store_permissions.md 新規作成・プライバシーポリシー8章補強 |
| インポート用TSV生成ツール | 2026-06-28 | — | DOIリストの一括取得を追加（複数DOIをまとめて取得→一括TSV出力）（[#154](https://github.com/tzhaya/jc-import-file-maker/issues/154)）。OpenAlex機関別著作検索（`openalex_lookup.html`）を追加（[#155](https://github.com/tzhaya/jc-import-file-maker/issues/155)）。タイトルのタグ片・改行を除去しTSVの行崩れを防止 |
| 助成情報検索ツール | 2026-06-11 | — | マルチバイト文字列（日本語）を含む行から課題番号を抽出できないバグを修正（[#149](https://github.com/tzhaya/jc-import-file-maker/issues/149)）。検索結果の外部リンクをクリックするとツールがリロードされる不具合を修正（[#150](https://github.com/tzhaya/jc-import-file-maker/issues/150)） |

## 導入方法

### Chrome拡張機能版（推奨）

**[👉 Chromeウェブストアからインストール](https://chromewebstore.google.com/detail/jairo-cloud-%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E6%94%AF%E6%8F%B4%E3%83%84%E3%83%BC%E3%83%AB/jknijceijdmdglahkopllhlgnikapmfn)**

1. 上記リンクからChromeウェブストアを開きます
2. 「**Chromeに追加**」をクリックしてインストールします
3. ツールバーの拡張機能アイコンをクリックすると、サイドパネルで起動します
4. 拡張機能の設定ページ（`chrome://extensions` → 詳細 → 拡張機能のオプション）で必要に応じてAPIキーを設定してください

**動作要件**: Chrome 114以降（サイドパネルAPI対応）

<details>
<summary>開発版（リポジトリから直接読み込み）</summary>

最新の開発版を試したい場合や、ローカルで改造したい場合は以下の手順で読み込めます。

1. このリポジトリをダウンロードします
   - `git clone https://github.com/tzhaya/jc-import-file-maker.git`、または
   - [ZIPダウンロード](https://github.com/tzhaya/jc-import-file-maker/archive/refs/heads/master.zip) して展開
2. Chromeで `chrome://extensions` を開きます
3. 右上の「**デベロッパーモード**」を有効にします
4. 「**パッケージ化されていない拡張機能を読み込む**」をクリックし、`chrome-extension` フォルダを選択します

</details>

### 通常ブラウザ版

HTMLファイルを直接ブラウザで開いて使用します。

1. [make_jc_importer.html](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/make_jc_importer.html) ←右クリック→「名前をつけてリンク(先)を保存」で保存
2. [shared.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/shared.js)←右クリック→「名前をつけてリンク(先)を保存」で保存
3. [tsv_headers_template.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/tsv_headers_template.js)←右クリック→「名前をつけてリンク(先)を保存」で保存
4. 「メモ帳」などで shared.js を開き、APIキーを入力して保存します。 
5. make_jc_importer.htmlをブラウザで開きます

## 使い方

**このツールはベータ版です。**
**アイテムタイプ「デフォルトアイテムタイプ（フル）」の形式でのインポート用TSVファイルのみ生成できます。なお、インポートは未検証です。正しく取り込まれないことがあります。**

APIからのデータ取得・マッピング・編集UI・プレビュー・TSV出力（複数DOIの一括出力を含む）が実装されています。

1. DOIを「DOI」の入力欄に入力します。
   - （Chrome拡張機能版のみ）電子ジャーナルの論文ページを開いた状態で「ページからDOI取得」ボタンを押すと、ページのmetaタグからDOIを自動入力できます。
   - 「DOIリスト一括取得」から、複数のDOIをまとめて入植して取得できます。
2. 「データ取得」ボタンを押します
3. Crossrefなどから必要なメタデータを取得して、「メタデータ確認・編集」として表示します。編集も可能です。
4. 「プレビュー表示」ボタンでプレビューができます。
5. （Chrome拡張機能版のみ）外国雑誌等でOpen Policy Finderに登録されている雑誌にはDOIの隣に「OAポリシー」のボタンが表示されます。クリックすると、Open Policy Finderから取得したオープンアクセスにできる版や掲載場所の情報を表示します。
6. TSVファイルとしてダウンロードができます（β版提供中：未検証です）。複数のDOIを連続取得して1つのTSVファイルにまとめて出力することもできます。

詳しい使い方と取得したデータの取り扱いは[使い方ガイド](docs/user_guide.md)を参照ください。

### 助成情報検索ツール

- 付属ツールとして、助成情報検索ツールを同梱しています。
- 科研費課題番号やJGN課題番号から、助成機関識別子・助成機関名・プログラム情報・研究課題名を検索します。
- Chrome拡張機能版ではサイドパネルのタブから「助成情報検索」に切り替えて利用できます。
- 通常ブラウザ版では [funder_lookup.html](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/funder_lookup.html) を右クリック→「名前をつけてリンク(先)を保存」で保存してご利用ください。
  - 動作には [shared.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/shared.js) も必要です。同じフォルダに保存してください（インポート用TSV生成ツールの導入時に保存済みであれば共用できます）。

#### 利用方法

1. 科研費課題番号やJGN課題番号、論文の謝辞（Acknowledgement）をコピー＆ペーストして「検索」を押します。
     - 論文のDOIがわかっている場合は、「DOI（任意）」欄にDOIを入力して「課題番号を取得」を押すと、Crossref/OpenAlex APIから課題番号を自動取得して入力欄に追加できます。
2. JPCOAR 2.0 準拠の助成情報（助成機関識別子・助成機関名・プログラム情報・研究課題名）を検索できます。
     - ヒットしない場合は、以下の参照用リンクを表示します。
       - [体系的番号](https://www.nistep.go.jp/taikei/)（NISTEP）
       - [AMED finder](https://amedfind.amed.go.jp/amed/)（日本医療研究開発機構）
       - [厚生労働科学研究成果データベース](https://mhlw-grants.niph.go.jp/)（国立保健医療科学院）
     - Chrome機能拡張のみ：[KAKEN](https://kaken.nii.ac.jp/ja/)で「補助金の研究課題番号」から「研究課題/領域番号」を検索します
3. 検索結果の助成情報を、インポート用のTSV形式で貼り付けできる形式に変換します。
4. お使いのインポート用TSVファイルのヘッダ部分（先頭5行）またはファイル全体を貼り付けると、その形式に準じて出力します。
      - 出力形式は JPCOARスキーマ 1.0/2.0 を選択できます。2.0では「プログラム情報」を出力します。
5. 開始インデックスの初期値を指定できます。すでに助成情報があり、2番目以降を入力したい場合は '1' 以降の数字に変更します。
6. 「TSV生成」ボタンを押すとTSV形式で表示されます。
7. 「クリップボードにコピー」を押すとクリップボードに結果がコピーされます。Excel、TSVファイルなどに貼り付けてご利用ください。

### OpenSearch検索ツール（Chrome拡張機能版のみ）

- Chrome拡張機能版のサイドパネルのタブから「OpenSearch検索」に切り替えて利用できます。
- JAIRO Cloud利用機関のリポジトリURL・タイトル・内容記述・資源タイプを条件に文献を検索できます。
- 検索結果はタイトル・著者・書誌情報・ファイルリンクとともに一覧表示され、クリックで詳細フィールドを展開できます。
- 設定ページでデフォルトのリポジトリURLを登録しておくと、タブを開いた際に自動入力されます。

### OpenAlex機関別著作検索

- 付属ツールとして、OpenAlex機関別著作検索ツールを同梱しています。
- 自機関の ROR ID と、検索対象期間（過去n日・**出版日ベース**、既定90日）、任意で資源タイプを指定して、自機関所属研究者が発表した論文のメタデータを検索します。
- Chrome拡張機能版ではサイドパネルのタブから「OpenAlex機関別著作検索」に切り替えて利用できます。
- 検索結果のうち登録対象とするDOIを選び、インポート支援ツールの「DOIリスト一括取得」へ渡せます。
  - 「選択DOIをコピー」で改行区切りのDOIリストをコピーできます。
  - Chrome拡張機能版では「インポートタブへ送る」ボタンから直接送信できます。
- Chrome拡張機能版では、各候補に自機関リポジトリでの登録状況バッジ（⚪ 登録済みの可能性大／🟡 要確認／🟢 未登録の可能性）を表示します。
- 通常ブラウザ版では [openalex_lookup.html](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/openalex_lookup.html) を右クリック→「名前をつけてリンク(先)を保存」で保存してご利用ください。
  - 動作には [shared.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/shared.js) も必要です。同じフォルダに保存してください（インポート用TSV生成ツールの導入時に保存済みであれば共用できます）。

利用手順と「未登録かどうか」の判定ロジックは [使い方ガイド](docs/user_guide.md#openalex機関別著作検索からのインポート) を参照してください。

### 設定（APIキー・初期値）

APIキーと、TSV出力時の管理（システム）フィールド・リポジトリURLの初期値は、いずれも **Chrome拡張機能版は設定ページ**、**通常ブラウザ版は `shared.js` の `CONFIG` 定数** で設定します。APIキー・初期値ともすべて任意です（未設定でも動作します）。

設定できる初期値（任意）:

| 項目 | 説明 |
|------|------|
| `.IndexID[0]`（登録先インデックスID） | アイテムの登録先インデックスID（例: `1697430475875`） |
| `.POS_INDEX[0]`（インデックス名パス） | 人間可読のインデックス名パス（例: `学術雑誌論文`） |
| リポジトリURL | TSV出力時にスキーマURLの `https://localhost/` を置換するリポジトリのURL |

#### Chrome拡張機能版（推奨）

Chrome拡張機能版では設定ページでAPIキーをまとめて設定できます。設定値はブラウザのローカルストレージに保存され、ソースコードに書き込む必要がありません。

1. 拡張機能の「JAIRO Cloud インポート支援ツール」の ︙ → オプション を開きます。

   <img src="docs/images/config.png" alt="拡張機能の設定メニュー" width="300">

2. APIキーを入力して「保存」を押してください。

CORS非対応のAPI（KAKEN XML API・JaLC API・Open Policy Finder API）が Chrome拡張機能のService Worker経由で利用可能になります。

管理フィールド・リポジトリURLの初期値も同じ設定ページで指定できます。`.IndexID[0]` と `.POS_INDEX[0]` は「TSV 管理フィールドの初期値」で設定し、リポジトリURLは「JAIRO Cloud OpenSearch」の「デフォルトリポジトリ URL」と共用されます（OpenSearch検索タブとTSV生成ツールの両方に反映されます）。

#### 通常ブラウザ版

`shared.js` をテキストエディタで開き、`CONFIG` 定数にAPIキーと初期値をまとめて設定してください。この設定は `make_jc_importer.html` と `funder_lookup.html` の両方に反映されます。初期値（`DEFAULT_*`）は空欄のままでも動作します。

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

    // リポジトリURL（repo-host）。TSVのスキーマURL置換に使用
    DEFAULT_REPOSITORY_URL: "",

    // .IndexID[0]（.metadata.path[0]）アイテムの登録先インデックスID  例: 1697430475875
    DEFAULT_INDEX_ID: "",

    // .POS_INDEX[0]（.pos_index[0]）インデックス名パス（人間可読）  例: 学術雑誌論文
    DEFAULT_POS_INDEX: "",

    // ===== OpenAlex 機関検索（#155 機能A）の初期値 =====
    // 自機関の ROR ID（フルURL or ID）。OpenAlex機関別著作検索パネルの初期値に使用
    // 例: https://ror.org/057zh3y96
    DEFAULT_ROR_ID: "",

    // OpenAlex機関別著作検索の対象期間（過去N日、from_publication_date ベース）。既定 90 日
    DEFAULT_OPENALEX_DAYS: 90,
};
```

`DEFAULT_*` に設定した値は、「データ取得」後や「空値で全フィールド表示」時に管理フィールドの初期値として入力され、リポジトリURLは入力欄が空のときに自動入力されます。

#### OpenAlex API Key（推奨）

OpenAlex APIは、APIキーなしでの利用回数に制限があります。継続的に利用する場合は、APIキーの設定を推奨します。

- [OpenAlex API設定ページ](https://openalex.org/settings/api) からAPIキーを取得してください。
- 未設定の場合、ページ上部に警告メッセージが表示されます。未設定でも利用可能ですが、利用回数の制限を超えるとデータ取得時にエラーが表示されます。

#### CiNii API Key（KAKEN API利用時は必須）

- KAKEN APIは利用にあたり CiNii API Key が必要です。
- [CiNiiウェブAPI 利用登録](https://support.nii.ac.jp/ja/cinii/api/developer) からAPIキーを取得してください。

CiNii APIキー未設定でも、以下の機能が動作します：

- JSPS（日本学術振興会）が助成機関に含まれる場合に、CiNii Research Projects API を通じて科研費の課題名（日英）とKAKEN課題ページURLを自動取得
- ISSNをもとにCiNii Research OpenSearch APIからNCID（NACSIS-CAT書誌ID）を自動取得

## ディレクトリ構成

```
├── make_jc_importer.html      # メインツール（通常ブラウザ版）
├── funder_lookup.html         # 助成情報検索ツール（通常ブラウザ版）
├── openalex_lookup.html       # OpenAlex機関別著作検索ツール（通常ブラウザ版・検索ロジックをHTMLに内蔵）
├── shared.js                  # 共通設定（CONFIG定数・APIキー）と通信処理（各HTML・Chrome拡張で共有）
├── tsv_headers_template.js    # TSVヘッダーテンプレート定義（メインツールで使用）
├── chrome-extension/          # Chrome拡張機能版（このフォルダを読み込んで使用）
│   ├── manifest.json          #   Manifest V3 定義
│   ├── background.js          #   Service Worker（CORS プロキシ）
│   ├── panel.html             #   サイドパネル（メインツール）
│   ├── make_jc_importer.js    #   メインツール ロジック
│   ├── funder_panel.html      #   サイドパネル（助成情報検索）
│   ├── funder_lookup.js       #   助成情報検索 ロジック
│   ├── opensearch_panel.html  #   サイドパネル（リポジトリコンテンツ検索／OpenSearch）
│   ├── opensearch_panel.js    #   リポジトリコンテンツ検索 ロジック
│   ├── openalex_panel.html    #   サイドパネル（OpenAlex機関別著作検索）
│   ├── openalex_panel.js      #   OpenAlex機関別著作検索 ロジック
│   ├── options.html           #   設定ページ（APIキー管理 UI）
│   ├── options.js             #   設定ページ ロジック
│   ├── shared.js              #   ルートの shared.js の同期コピー
│   ├── tsv_headers_template.js#   ルートの tsv_headers_template.js の同期コピー
│   └── icons/                 #   拡張機能アイコン（16/48/128 PNG + SVG）
├── api-flow.md                # APIフロー整理（Crossref/OpenAlex等の取得順・JPCOARマッピング）
├── data/                      # 参照・設定データ
│   ├── ItemType.json          # JAIRO Cloud アイテムタイプ定義
│   ├── tsv_headers.json       # TSVヘッダー定義
│   └── crossref_fields.json   # Crossrefフィールド定義
├── docs/                      # 仕様・設計ドキュメント（GitHub Pages 公開元）
│   ├── index.html              # 紹介ページ（https://tzhaya.github.io/jc-import-file-maker/）
│   ├── requirements.md         # 要件定義
│   ├── user_guide.md           # 使い方ガイド
│   ├── worklog.md              # 作業ログ
│   └── ...                     # 実装計画・フィールドリファレンス等
└── samples/                   # サンプルデータ（API レスポンス等）
```

## ドキュメント

- [要件定義](docs/requirements.md)
- [使い方ガイド](docs/user_guide.md)
- [開発者向けドキュメント](docs/developer_docs.md) 品質チェック・文字コード確認・ドキュメント一覧。
- [作業ログ](docs/worklog.md) 実装作業時のログです。
- [APIフロー整理](api-flow.md) Crossref/OpenAlex等の取得順・JPCOARマッピングの概要です。
- [機能と技術](function.md) 機能と技術、実装に関するドキュメントです。

## ライセンス

このプロジェクトは [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/) の下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

外部APIから得られたデータの利用については、それぞれの利用規約に従ってください。

  -  [Crossref](https://api.crossref.org/)
  -  [JaLC](https://api.japanlinkcenter.org/api-docs/index.html)
  -  [OpenAlex](https://api.openalex.org/)
  -  [ROR](https://ror.org/about/terms/),
  -  [CiNii Research、KAKEN API](https://support.nii.ac.jp/ja/cinii/terms)

## プライバシーポリシー

- [プライバシーポリシー](docs/privacy-policy.md)をご参照ください。

## 権限とセキュリティについて（Chrome拡張機能版）

| 権限 | 理由 |
|---|---|
| `storage` | APIキー・設定をブラウザのローカルストレージに保存 |
| `sidePanel` | サイドパネル UI の表示 |
| `scripting` | 「ページから DOI 取得」でページの DOI meta タグ・JSON-LD identifier を読み取る（ボタン押下時のみ実行） |
| `optional_host_permissions`（`https://*/*`, `http://*/*`） | 電子ジャーナルのドメインは出版社ごとに異なり事前列挙不可のため、ユーザー操作時に実行時要求 |
| `host_permissions`（学術 API・機関リポジトリ） | KAKEN・JaLC・OPF・WEKO3 リポジトリへの CORS 制約なしアクセス |

**広いホスト権限（`https://*/*`, `http://*/*`）について**: 電子ジャーナルの掲載ページから DOI を抽出する機能のために必要です。インストール時には要求せず、「ページから DOI 取得」ボタンを押したときにのみ許可を求めます。読み取るのは DOI を示す meta タグ・JSON-LD の identifier のみで、ページ本文・閲覧履歴は読みません。ブラウザの設定からいつでも取り消せます。

Service Worker の fetch proxy は `ALLOWED_HOSTS`（KAKEN・JaLC・OPF の3ホスト）のみを対象とし、それ以外のホストへの proxy は拒否します。

詳細は [プライバシーポリシー](docs/privacy-policy.md) および [Chrome Web Store 権限の正当化](docs/chrome_store_permissions.md) を参照してください。

## AIの利用

このアプリケーションの作成は、生成AIによるコーディング支援を受けています。

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-06-28 | 初心者向けドキュメント整理（[#177](https://github.com/tzhaya/jc-import-file-maker/issues/177)）：`docs/changelog.md` 新規作成（変更履歴全量をREADMEから移設）、README変更履歴を最新5件に短縮、`docs/user_guide.md` を再構成（STEP 2の基本操作を前に・詳細を補足節へ）、`docs/index.html` 使い方ガイドへの導線追加・ドキュメントセクション整理 |
| 2026-06-28 | Chrome拡張のホスト権限明文化（[#176](https://github.com/tzhaya/jc-import-file-maker/issues/176)）：広いホスト権限（`optional_host_permissions`）の必要性と安全策をコード・ドキュメントに明記。`background.js` のproxyコメント修正、`getDoiFromCurrentTab` に権限理由コメント追記、README「権限とセキュリティ」セクション追加、[`docs/chrome_store_permissions.md`](docs/chrome_store_permissions.md)（Web Store審査向け権限正当化文書）新規作成、プライバシーポリシー補強。manifest version `1.14.0` → `1.14.1` |
| 2026-06-28 | CI品質チェック・文字コード明文化：`npm test` で JSON parse・JS構文・UTF-8妥当性を検証する `scripts/check.js` を追加。GitHub Actions の PR/push 時品質チェック（[`.github/workflows/ci.yml`](.github/workflows/ci.yml)）を追加。`.editorconfig`（`charset=utf-8`）・`.gitattributes` を追加。PowerShellでの文字化け確認手順・開発者向けドキュメント一覧（[`docs/developer_docs.md`](docs/developer_docs.md)）を整備（[#174](https://github.com/tzhaya/jc-import-file-maker/issues/174)・[#175](https://github.com/tzhaya/jc-import-file-maker/issues/175)） |
| 2026-06-28 | ドキュメント整備：残存Issue一覧（[`docs/remaining_issues.md`](docs/remaining_issues.md)）を棚卸しし現状に同期（[#172](https://github.com/tzhaya/jc-import-file-maker/issues/172)） |
| 2026-06-28 | OpenAlex 起点 JAIRO Cloud 登録パイプラインの前段階（手動運用版・Phase 3）を実装（[#157](https://github.com/tzhaya/jc-import-file-maker/issues/157)）。DOIリスト一括取得（[#154](https://github.com/tzhaya/jc-import-file-maker/issues/154)）・OpenAlex機関別著作検索（[#155](https://github.com/tzhaya/jc-import-file-maker/issues/155)）・登録済み照合バッジ（[#156](https://github.com/tzhaya/jc-import-file-maker/issues/156)）。manifest version `1.13.0` → `1.14.0` |
| 2026-06-27 | 作業中データの自動保存・復元を追加（[#162](https://github.com/tzhaya/jc-import-file-maker/issues/162)）。manifest version `1.12.0` → `1.13.0` |

全履歴は [docs/changelog.md](docs/changelog.md) を参照してください。

## 作者
- Takanori Hayashi
