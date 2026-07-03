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
| Chrome拡張機能版 | 2026-07-02 | ver. 1.16.0 | DOIリスト一括取得の実行中に「中断」ボタンを表示し、押下でループを安全に停止できるように（中断前までの成功分は蓄積アイテムに保持）（[#194](https://github.com/tzhaya/jc-import-file-maker/issues/194)） |
| インポート用TSV生成ツール | 2026-07-02 | — | DOIリスト一括取得に「中断」ボタンを追加し、途中で処理を止められるように（[#194](https://github.com/tzhaya/jc-import-file-maker/issues/194)） |
| 助成情報検索ツール | 2026-06-11 | — | マルチバイト文字列（日本語）を含む行から課題番号を抽出できないバグを修正（[#149](https://github.com/tzhaya/jc-import-file-maker/issues/149)）。検索結果の外部リンクをクリックするとツールがリロードされる不具合を修正（[#150](https://github.com/tzhaya/jc-import-file-maker/issues/150)） |
| OpenAlex機関別著作検索 | 2026-06-30 | — | 所属の誤判定が疑われる候補に「⚠ 要確認」バッジを表示（[#186](https://github.com/tzhaya/jc-import-file-maker/issues/186)）。OpenAlex の `affiliations`／`raw_affiliation_string` を照合し、検索対象機関を裏付ける所属表記が無い論文を独立列で可視化（自動除外はせず注意喚起。略称は頭字語照合で誤検出を抑制） |

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

APIキー（OpenAlex・CiNii・Open Policy Finder）と初期値（リポジトリURL・管理フィールド・自機関ROR・OpenAlex検索対象期間）は、いずれも **Chrome拡張機能版は設定ページ**、**通常ブラウザ版は `shared.js` の `CONFIG` 定数** で設定します。**APIキー・初期値ともすべて任意です**（未設定でも動作します。APIキー未設定時はレート制限が厳しくなる等の制約があります）。

設定できる項目（すべて任意）:

- **APIキー**: `OpenAlex_API_KEY` ／ `CiNii_API_KEY`（KAKEN XML API利用時は必須）／ `OPF_API_KEY`（Chrome拡張機能版のみ）
- **初期値**: リポジトリURL（`DEFAULT_REPOSITORY_URL`）／ 登録先インデックスID（`DEFAULT_INDEX_ID`）／ インデックス名パス（`DEFAULT_POS_INDEX`）／ 自機関ROR ID（`DEFAULT_ROR_ID`）／ OpenAlex検索対象期間（`DEFAULT_OPENALEX_DAYS`）

各項目の詳細な説明・反映先・設定手順（拡張機能版の設定ページ／通常ブラウザ版の `CONFIG` コード例）は **[設定ガイド](docs/settings.md)** を参照してください。

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
- [設定ガイド](docs/settings.md) APIキー・初期値の一覧と設定手順。
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
| 2026-07-03 | `make_jc_importer_test.html`（ローカル専用・`.gitignore`対象）のCONFIGブロックが `shared.js` 分離（#111）以前の構造のまま未更新だった問題を修正（[#203](https://github.com/tzhaya/jc-import-file-maker/issues/203)）：`shared.js` に #156 で追加済みの `DEFAULT_ROR_ID`・`DEFAULT_OPENALEX_DAYS` をインラインCONFIGブロックと `loadConfig()` に追記。`.claude/skills/sync-test/SKILL.md` の同期手順に「APIキーだけでなく `shared.js` 側で追加された初期値項目の有無も確認する」旨を追記し再発を防止 |
| 2026-07-02 | DOIリスト一括取得に「中断」ボタンを追加（[#194](https://github.com/tzhaya/jc-import-file-maker/issues/194)）：一括取得中に「中断」ボタンを表示し、押下で次のDOI着手前（またはfetch完了直後・レート待機に入る前）にループを停止。中断前までの成功分は蓄積アイテムに保持され下書き保存も維持。標準版（`make_jc_importer.html`）・Chrome拡張版（`chrome-extension/make_jc_importer.js`・`panel.html`）に同一実装。manifest version `1.15.0` → `1.16.0` |
| 2026-07-02 | `package.json`／`package-lock.json` のメタデータ整備（[#196](https://github.com/tzhaya/jc-import-file-maker/issues/196)）：`license` を実態（`LICENSE`＝CC0 1.0 Universal）に合わせて `ISC` → `CC0-1.0` に修正、`author`／`keywords` を記入、実体のない `main: "index.js"` を削除。`devDependencies` の `playwright` はE2Eテスト（`.claude/skills/e2e-test`）用に維持し用途を `docs/developer_docs.md` に明記。`scripts/check.js` の `JSON_FILES` に `package-lock.json` を追加 |
| 2026-06-30 | OpenAlex機関検索で所属の誤判定が疑われる候補を可視化（[#186](https://github.com/tzhaya/jc-import-file-maker/issues/186)）：機関検索（`openalex_lookup.html`／Chrome拡張タブ）の結果に「所属確認」列を追加し、検索対象機関を裏付ける所属表記を持つ著者が居ない論文に「⚠ 要確認」バッジ＋詳細ツールチップ（疑い著者・元の所属表記）を表示。OpenAlex の `authorships[].affiliations[].institution_ids`／`raw_affiliation_string` を機関の識別的トークンと頭字語で照合（略称表記の誤検出を抑制）。自動除外はせず注意喚起のみ（既定チェックはON維持）。#156 照合列とは別列で描画し競合を回避。manifest version `1.14.2` → `1.15.0` |
| 2026-06-29 | 現行実装が未反映のドキュメントを修正（[#184](https://github.com/tzhaya/jc-import-file-maker/issues/184)）：`docs/requirements.md` のJaLC「未対応」記述を実態（Chrome拡張版でJaLC REST API取得・標準版スキップ）に修正、`docs/fields.md` のTSVヘッダーキー不一致6件を `tsv_headers_template.js`/`data/tsv_headers.json` に合わせて修正（言語行2件の追記含む）、`function.md` の `api-flow.md` リンク切れ修正、`docs/developer_docs.md` のドキュメント一覧追補、`docs/handover_cors_extension.md` に履歴メモ注記・`docs/Implementation_JaLC.md` の解決済み課題を状態更新、`scripts/check.js` のUTF-8チェック対象に該当docを追加 |

全履歴は [docs/changelog.md](docs/changelog.md) を参照してください。

## 作者
- Takanori Hayashi
