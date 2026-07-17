# JAIRO Cloud インポート支援ツール

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/jknijceijdmdglahkopllhlgnikapmfn?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/jairo-cloud-%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E6%94%AF%E6%8F%B4%E3%83%84%E3%83%BC%E3%83%AB/jknijceijdmdglahkopllhlgnikapmfn)
[![Users](https://img.shields.io/chrome-web-store/users/jknijceijdmdglahkopllhlgnikapmfn?label=users)](https://chromewebstore.google.com/detail/jairo-cloud-%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E6%94%AF%E6%8F%B4%E3%83%84%E3%83%BC%E3%83%AB/jknijceijdmdglahkopllhlgnikapmfn)
[![Rating](https://img.shields.io/chrome-web-store/rating/jknijceijdmdglahkopllhlgnikapmfn?label=rating)](https://chromewebstore.google.com/detail/jairo-cloud-%E3%82%A4%E3%83%B3%E3%83%9D%E3%83%BC%E3%83%88%E6%94%AF%E6%8F%B4%E3%83%84%E3%83%BC%E3%83%AB/jknijceijdmdglahkopllhlgnikapmfn)

## 概要

DOIから書誌情報を取得できても、JAIRO Cloudへの登録には識別子の確認、メタデータの補完、TSV形式への変換が残ります。
このツールは、Crossref、DataCite、OpenAlexなどのAPIから情報を集め、[JAIRO Cloud](https://jpcoar.org/support/jairo-cloud/)へのインポート用TSVファイルを生成します。
Chrome拡張機能版では、閲覧中の電子ジャーナルページからDOIを取得するところから始められます。

主な用途は次の5つです。

1. 識別子（ORCID、ROR、KAKENなど）の検索時間の短縮
2. メタデータ入力候補の取得と編集
3. オープンアクセスポリシーの確認
4. [JAIRO Cloud](https://jpcoar.org/support/jairo-cloud/)用インポートファイル（import.zip）作成の支援
5. 自機関所属の研究者が発表した論文メタデータの調査と取得

利用方法は、通常ブラウザ版とChrome拡張機能版の2つです。
HTMLファイルを直接開いて使うなら通常ブラウザ版、JaLC、KAKEN、Open Policy Finder、機関リポジトリ検索まで一つのサイドパネルで扱うならChrome拡張機能版が適しています。

- 通常ブラウザ版
  - Crossref、DataCite DOIからのメタデータ取り込み
  - 複数DOIの一括取り込み
  - [Research Organization Registry（ROR）](https://ror.org/)によるISNIの補完
  - [OpenAlex](https://openalex.org/)によるORCIDの補完とOA状況の表示
  - [CiNii Research](https://cir.nii.ac.jp/)によるNCID、科研費課題名の補完
  - [JPCOARスキーマ](https://schema.irdb.nii.ac.jp/ja/schema)2.0対応のメタデータ入力
  - 入力メタデータのプレビュー表示
  - [Open Policy Finder](https://openpolicyfinder.jisc.ac.uk/)へのリンク表示
  - インポート用TSVファイル生成
  - 作業中データの自動保存と復元
  - OpenAlexで自機関所属研究者の最新発表論文の検索と一覧表示
    - 既定値では過去90日に発表された論文を検索します。
    - DOIを出力し、[make_jc_importer.html](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/make_jc_importer.html)のインポート対象にできます

- Chrome拡張機能版
  - 通常ブラウザ版の全機能
  - 4つのツールを切り替えるサイドパネル
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

両版の差は、ブラウザのCORS制約を越える必要がある機能に現れます。
JaLC、KAKEN XML、Open Policy Finder API、機関リポジトリとの照合が必要なら、Chrome拡張機能版を選んでください。

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
| DataCite DOI からのメタデータ取得 | ✅ | ✅ | CORS対応・認証不要のため両版で動作。[制限事項](docs/user_guide.md#datacite-doi-の制限事項)あり |
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
| Chrome拡張機能版 | 2026-07-17 | ver. 1.25.0 | OpenAlex機関別著作検索の登録済み照合を `DOI` → `selfDOI` → タイトル検索の三段構成に改善（[#241](https://github.com/tzhaya/jc-import-file-maker/issues/241)）。識別子検索の完全一致を早期に検出し、両方が正常に0件／不一致の場合は従来のタイトル検索へフォールバック |
| インポート用TSV生成ツール | 2026-07-10 | — | 研究課題番号タイプ（JPCOAR 2.0 `awardNumberType`）に対応（[#222](https://github.com/tzhaya/jc-import-file-maker/issues/222)）。JGN連携で取得した体系的番号には `JGN` を自動設定し、助成情報の編集フォームでも選択可能に |
| 助成情報検索ツール | 2026-07-10 | — | 研究課題番号タイプ列に対応（[#222](https://github.com/tzhaya/jc-import-file-maker/issues/222)）。JGN課題番号で検索した場合、TSV出力の「研究課題番号タイプ」列に `JGN` を出力 |
| OpenAlex機関別著作検索 | 2026-07-17 | ver. 1.25.0 | 登録済み照合で `DOI` と `selfDOI` を順に検索し、返戻JPCOAR内の候補DOI完全一致を検出した場合は登録済み可能性大と確定。両方が正常に0件／不一致ならタイトル検索へ進み、通信・解析エラーは未登録扱いにせず照合不可と表示（[#241](https://github.com/tzhaya/jc-import-file-maker/issues/241)） |

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

インストールせずに試したい場合は、3つのファイルを同じフォルダへ保存して使用します。

1. [make_jc_importer.html](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/make_jc_importer.html)を右クリックし、「名前を付けてリンク先を保存」で保存します
2. [shared.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/shared.js)を同じフォルダへ保存します
3. [tsv_headers_template.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/tsv_headers_template.js)も同じフォルダへ保存します
4. 必要に応じて、`shared.js`をメモ帳などで開き、APIキーや初期値を設定します
5. `make_jc_importer.html`をブラウザで開きます

## 使い方

> **注意**
> このツールはベータ版です。
> 生成できるのは、アイテムタイプ「デフォルトアイテムタイプ（フル）」形式のインポート用TSVファイルです。
> インポート結果は未検証のため、JAIRO Cloudへ登録する前に内容を確認してください。

基本操作は、DOIの取得、メタデータの確認、TSV出力の3段階です。

1. DOIを「DOI」の入力欄に入力します。
   - （Chrome拡張機能版のみ）電子ジャーナルの論文ページを開いた状態で「ページからDOI取得」ボタンを押すと、ページのmetaタグからDOIを自動入力できます。
   - 「DOIリスト一括取得」では、複数のDOIをまとめて入力して取得できます。
2. 「データ取得」ボタンを押します
3. 取得したメタデータを「メタデータ確認・編集」で確認し、必要な項目を修正します
4. 「プレビュー表示」ボタンで出力前の内容を確認します
5. （Chrome拡張機能版のみ）外国雑誌等でOpen Policy Finderに登録されている雑誌にはDOIの隣に「OAポリシー」のボタンが表示されます。クリックすると、Open Policy Finderから取得したオープンアクセスにできる版や掲載場所の情報を表示します。
6. 「TSV出力」からファイルをダウンロードします。複数のDOIを取得した場合は、1つのTSVファイルにまとめて出力できます

各フィールドの扱い、バッチ処理、DataCite DOIの制限事項は[使い方ガイド](docs/user_guide.md)を参照してください。

### 助成情報検索ツール

謝辞に課題番号が書かれていても、助成機関名やプログラム情報までそろっているとは限りません。
助成情報検索ツールは、科研費課題番号やJGN課題番号から、助成機関識別子、助成機関名、プログラム情報、研究課題名を検索します。

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

登録しようとしているアイテムが、すでに機関リポジトリで公開されている場合があります。
OpenSearch検索ツールは、公開済みアイテムを複数の条件で検索し、重複確認に使える情報を表示します。

- Chrome拡張機能版のサイドパネルから「リポジトリコンテンツ検索」に切り替えて利用できます。
- キーワード・タイトル・作成者・内容記述・資源タイプ・IDを標準条件として検索できます。詳細検索では主題・出版者・言語・収録物名・作成者名識別子を指定できます。
- 資源タイプはJPCOAR 1.0のみの語彙を含む全78件から選択できます。ID検索の対応種別はリポジトリ設定により異なります。
- 作成日時の昇順・降順で並べ替えられます。作成日時やIssued / Availableの日付範囲検索には対応していません。
- 検索結果はタイトル・著者・書誌情報・ファイルリンクとともに一覧表示され、クリックで詳細フィールドを展開できます。
- 設定ページでデフォルトのリポジトリURLを登録しておくと、タブを開いた際に自動入力されます。

### OpenAlex機関別著作検索

DOIを一件ずつ探す運用では、自機関研究者の新しい論文を見落としたかどうかがわかりません。
OpenAlex機関別著作検索ツールは、自機関のROR ID、検索対象期間（過去N日、**出版日ベース**、既定90日）、資源タイプを指定し、登録候補となる論文を検索します。

- Chrome拡張機能版ではサイドパネルのタブから「OpenAlex機関別著作検索」に切り替えて利用できます。
- 検索結果のうち登録対象とするDOIを選び、インポート支援ツールの「DOIリスト一括取得」へ渡せます。
  - 「選択DOIをコピー」で改行区切りのDOIリストをコピーできます。
  - Chrome拡張機能版では「インポートタブへ送る」ボタンから直接送信できます。
- Chrome拡張機能版では、各候補に自機関リポジトリでの登録状況バッジ（⚪ 登録済みの可能性大／🟡 要確認／🟢 未登録の可能性）を表示します。`DOI` と `selfDOI` の識別子検索で完全一致を確認できない場合はタイトル検索へフォールバックします。
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

Chrome拡張機能版は、ページからのDOI取得と外部APIへの接続のために権限を使用します。
ページ本文や閲覧履歴を常時収集するための権限ではありません。

| 権限 | 理由 |
|---|---|
| `storage` | APIキー・設定をブラウザのローカルストレージに保存 |
| `sidePanel` | サイドパネル UI の表示 |
| `scripting` | 「ページから DOI 取得」でページの DOI meta タグ・JSON-LD identifier を読み取る（ボタン押下時のみ実行） |
| `optional_host_permissions`（`https://*/*`, `http://*/*`） | 電子ジャーナルのドメインは出版社ごとに異なり事前列挙不可のため、ユーザー操作時に実行時要求 |
| `host_permissions`（学術 API・機関リポジトリ） | KAKEN・JaLC・OPF・WEKO3 リポジトリへの CORS 制約なしアクセス |

**広いホスト権限（`https://*/*`, `http://*/*`）について**：電子ジャーナルの掲載ページからDOIを抽出する機能のために必要です。
インストール時には要求せず、「ページからDOI取得」ボタンを押したときにのみ許可を求めます。
読み取るのはDOIを示すmetaタグとJSON-LDのidentifierだけで、ページ本文や閲覧履歴は読みません。
許可はブラウザの設定からいつでも取り消せます。

Service Worker の fetch proxy は `ALLOWED_HOSTS`（KAKEN・JaLC・OPF の3ホスト）のみを対象とし、それ以外のホストへの proxy は拒否します。

詳細は [プライバシーポリシー](docs/privacy-policy.md) および [Chrome Web Store 権限の正当化](docs/chrome_store_permissions.md) を参照してください。

## AIの利用

このアプリケーションの作成は、生成AIによるコーディング支援を受けています。

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-07-17 | Chrome拡張 ver. 1.25.0：OpenAlex機関別著作検索の登録済み照合に `DOI`／`selfDOI`検索を追加（[#241](https://github.com/tzhaya/jc-import-file-maker/issues/241) 改善2）。筑波大学・JIRCAS・国立国語研究所で実測し、外部DOIを `DOI`、自リポジトリ登録DOIを `selfDOI` で取得できる例を確認。両方の返戻JPCOAR内で候補DOIの完全一致を調べ、正常な0件・不一致は従来のタイトル検索へフォールバック。通信・HTTP・XML解析エラーは障害を未登録に見せず `⚠ 照合不可` として停止。URLは `URL` / `URLSearchParams` で構築し、DOI中の `/` を保持。標準版は照合非実行だがinline parityを反映 |
| 2026-07-17 | OpenAlex 機関別著作検索の「資源タイプ」を複数選択可能にし、既定を「論文 (article)」に変更（[#241](https://github.com/tzhaya/jc-import-file-maker/issues/241)）：`<select multiple>` 化し `init()` で `article` を既定選択。`buildWorksUrl` は複数タイプを OpenAlex の OR 記法（`type:article\|review`、1フィルタ内 `\|` 区切り）で組み立て、未選択なら type フィルタを付けない。作業中データの保存 `type` を配列化し、旧形式（単一文字列）の復元にも後方互換対応。あわせて登録済み照合バッジ（[#156](https://github.com/tzhaya/jc-import-file-maker/issues/156)）を `weko3-opensearch-client-spec` の知見で改善（先行分）：(1) 🟡「要確認」の代表リンクが JPCOAR ページ内逆順のため最後のヒットを指していた不具合を、`normalizeJpcoarItemOrder`（spec §4.1）で API 指定順へ補正し先頭ヒットに修正。(2) 照合先を許可ホスト（HTTPS の `*.repo.nii.ac.jp` ＋登録済みリポジトリ、spec §2/§7）に限定し、許可外は fetch せず `—` 表示。(3) `openalex_panel.js` と `opensearch_panel.js` に重複していた共通純粋関数・定数（`isAllowedHost`／`normalizeJpcoarItemOrder`／`NS_RDF`／`bareDoi`）を新規コア `chrome-extension/weko3_opensearch_core.js` へ集約（ブラウザは名前空間 `globalThis.Weko3OpenSearchCore`、Node は `require`。素の const 再宣言によるブラウザクラッシュを回避）。`tests/openalex-match.test.js` を新設し `parseRepoSearch` はパーサー注入で DOM 非依存にテスト（`npm test` 計87件）。標準版 `openalex_lookup.html` は CORS 制約で照合を実行しないためコア非読込・inline 維持でロジック parity を反映。DOI 直接 ID 検索（spec §8）は実機確認を要するため後続対応。manifest version `1.23.0` → `1.24.0` |
| 2026-07-14 | Chrome拡張 ver. 1.23.0：WEKO3 OpenSearch検索を拡充（[#237](https://github.com/tzhaya/jc-import-file-maker/issues/237)）。標準・詳細検索、ID値＋ID種別、作成日時ソート、資源タイプ全78件に対応。JPCOAR出力のページ内逆順を補正し、ページング中は初回のリポジトリ・条件・ソートを保持 |
| 2026-07-10 | 研究課題番号タイプ（JPCOAR 2.0 `awardNumberType`）に対応（[#222](https://github.com/tzhaya/jc-import-file-maker/issues/222)）：TSVテンプレートに列は存在するが常に空欄だった `subitem_award_numbers.subitem_award_number_type` を、JGN（Japan Grant Number）連携（`fetchJgn()` 成功）で取得した体系的番号のとき `JGN` に自動設定するよう変更。`fetchJgn()` の戻り値に `source: 'JGN'` マーカーを追加し、Crossref/JaLC/DataCiteのマッピング3パスで判定。助成情報の編集フォーム（`renderOneFunder()`）に「研究課題番号タイプ」select（「（未設定）/ JGN」、許容値はWEKO ItemTypeスキーマの `null / JGN`）を追加し、`collectFundingField()` で収集。「助成機関を検索」ボタンでもJGN由来のとき自動設定・それ以外はリセット。助成情報検索ツール（`funder_lookup`）はJGN分岐の戻り値に `awardNumberType: 'JGN'` を追加し `FUNDING_COLUMNS` extractorを修正しTSV出力に反映。`generateTsv()` の単体テストを1件追加（`npm test` 計55件）。標準版・Chrome拡張版・両テスト用HTMLに同一実装。`docs/fieldmapping.md`・`docs/user_guide.md` を更新。manifest version `1.21.2` → `1.22.0` |
| 2026-07-09 | DataCite API 404時のエラーメッセージを改善（[#211](https://github.com/tzhaya/jc-import-file-maker/issues/211)）：`fetchDataCite()` は404時に「DOIが見つかりません（DataCite 404）」とだけ表示していたため、DOI Registration Agency判定はDataCiteだがDataCite API側でメタデータを取得できない（削除・非公開・Gone状態等の）DOI（例: `10.5281/zenodo.19493734`、doi.org/Zenodoで410 Gone）でも入力ミスのように見えていた。エラー文言を「DOIメタデータを取得できません（DataCite 404）。削除・非公開・Gone状態の可能性があります。」に変更し、原因の可能性がわかるようにした。取得可能なDataCite DOIの正常系は変更なし。標準版・Chrome拡張版に同一実装。`docs/user_guide.md` のDataCite DOI制限事項節に補足を追記。manifest version `1.21.1` → `1.21.2` |
| 2026-07-08 | `calcEmbargoEndDate()` のタイムゾーン依存バグを修正（PR #233 コードレビュー指摘、P2）：`new Date('YYYY-MM-DD')`（UTC深夜0時としてパース）と `setMonth()`/`setFullYear()`/`setDate()`（ローカル時刻メソッド）・`toISOString()`（UTC出力）を混在させていたため、UTCより遅れたタイムゾーン（例: America/New_York）で実行すると満了日が1日ずれていた（`2020-01-15 + 6ヶ月` が本来の `2020-07-15` ではなく `2020-07-14` になる等）。`determineAccessRights()` のアクセス権判定（open access / embargoed access）の根拠になっているため、表示ヒントだけでなく実データに影響し得た。パース・演算・出力をUTC系メソッド（`setUTCMonth`/`setUTCFullYear`/`setUTCDate`）に統一して解消。修正前コードで実際にバグを再現し、5タイムゾーン（America/New_York・Asia/Tokyo・UTC・Pacific/Kiritimati・Pacific/Midway）で一致することを確認。`tests/access-rights.test.js` に `process.env.TZ` を切り替える回帰テストを追加（修正前コードに対して実行しバグを検出できることも確認済み）。標準版・Chrome拡張版に同一実装。manifest version `1.21.0` → `1.21.1` |
| 2026-07-08 | アクセス権判定にエンバーゴ満了日の判定を追加（[#225](https://github.com/tzhaya/jc-import-file-maker/issues/225)）：`determineAccessRights()` はOPFエンバーゴが1件でもあれば発行からの経過期間を問わず無条件で `embargoed access` を返しており、出版から年月が経ちエンバーゴが既に満了している論文（機関リポジトリ登録の典型ケース）でも `embargoed access` になっていた不具合を修正。第3引数に発行日 `pubDate` を追加し、既存の `calcEmbargoEndDate()` で各エンバーゴの公開可能日を算出。全エンバーゴの満了日が今日以前なら `open access`、1つでも未来または算出不能なら安全側で `embargoed access` を返す。発行日が取得できない場合も従来どおり安全側（`embargoed access`）。Crossref/JaLC/DataCiteの呼び出し3箇所すべてに各パスの発行日変数を渡すよう変更。単体テスト（`tests/access-rights.test.js`）を22件新規追加（`npm test` 計53件）。標準版・Chrome拡張版に同一実装。manifest version `1.20.0` → `1.21.0` |
| 2026-07-08 | Crossrefパスの本文言語を実データから設定するよう修正（[#223](https://github.com/tzhaya/jc-import-file-maker/issues/223)）：`mapToItemType()`（Crossrefパス）が本文言語を無条件で `[{ subitem_language: 'eng' }]` にハードコードしており、Crossref API応答の `message.language`（ISO 639-1）を参照していなかった不具合を修正。DataCiteパスで既に使われていた `mapDataCiteLanguageToSubitemLanguage()`（639-1→639-2/T変換、地域タグは先頭部分のみ使用）をCrossrefパスからも呼び出す形に変更。変換不能・language未提供時は従来どおり `eng` にフォールバックしつつ、`item_30002_title0` で使われていた `_warnLang` バッジ機構を `item_30002_language12` にも適用し、UI上で要確認を促す。JaLC・DataCiteパスの言語処理は変更なし。標準版・Chrome拡張版に同一実装。manifest version `1.19.3` → `1.20.0` |
| 2026-07-08 | サイドパネルの外部リンククリックでパネルが「DOIインポート」に戻る不具合を再修正（[#228](https://github.com/tzhaya/jc-import-file-maker/issues/228)）：#201（`chrome.tabs.create({url})`導入）で一度対応したはずが、`active`未指定（既定true）のため新規タブがフォアグラウンド化しタブ切り替えでパネルがリセットされる問題が再発していた。`chrome.tabs.update({url})`で現在のアクティブタブ内にリンク先を遷移させる方式に変更（タブの新規作成・切り替えが発生しないためパネルの表示状態を保持）。遷移できない特殊タブは背面タブにフォールバック。`openalex_panel.js`・`funder_lookup.js`・両スタンドアロン版HTMLの4ファイルに同一修正を適用。あわせて`funder_lookup.html`の`parseTsvTemplate()`のHTML/拡張JS間の実装揺れ（`row3`宣言位置）を解消（[#227](https://github.com/tzhaya/jc-import-file-maker/issues/227)）。manifest version `1.19.2` → `1.19.3` |
| 2026-07-08 | バッチ操作・助成情報検索UI・TSVエクスポートの不具合3件を修正（[#221](https://github.com/tzhaya/jc-import-file-maker/issues/221)/[#224](https://github.com/tzhaya/jc-import-file-maker/issues/224)/[#226](https://github.com/tzhaya/jc-import-file-maker/issues/226)）：(1) `removeBatchItem()`/`clearBatch()` が存在しないDOM要素 `fields-container` を参照しTypeErrorになり、`persistDraft()` が呼ばれず全件クリアしても下書きが復活する不具合を修正（正しい要素 `metadata-fields` を参照するよう変更）。(2) `renderOneFunder()` の「助成機関を検索」成功後、アコーディオンヘッダーのラベル更新が誤ったセレクタ（存在しない `.nested-item-header`）でno-opになっていた不具合を修正（`.item-label` を参照するよう変更）。(3) TSVエクスポートのファイル名サニタイズが `/` のみで、DOI由来のWindows禁止文字（`< > : " | ? *`）が残り得た問題を修正。標準版・Chrome拡張版に同一実装。manifest version `1.19.1` → `1.19.2` |
| 2026-07-05 | `function.md` にDataCite対応（[#197](https://github.com/tzhaya/jc-import-file-maker/issues/197)/[#208](https://github.com/tzhaya/jc-import-file-maker/issues/208)/[#212](https://github.com/tzhaya/jc-import-file-maker/issues/212)/[#214](https://github.com/tzhaya/jc-import-file-maker/issues/214)）の記載漏れを追記：技術スタックの外部APIリストにDataCite追加、「Phase 2以降の機能強化」節にDataCite対応の概要（OpenAlex補完・OPF連動）と著者所属ROR識別子の充足率制約（[#215](https://github.com/tzhaya/jc-import-file-maker/issues/215)フォローアップ）を追加、フィールド・語彙リファレンス節に `datacite_jpcoar_mapping.md` へのリンクを追加。README.md・`docs/user_guide.md` 等は各PR時点で既に反映済みと確認（変更なし）。ドキュメントのみの変更（本番HTML・共有JS・Chrome拡張コードの変更なし、E2E対象外・manifest更新不要、#184/#181と同型） |
| 2026-07-05 | 純粋関数の単体テストを追加（[#192](https://github.com/tzhaya/jc-import-file-maker/issues/192)）：依存ゼロの Node 組み込み `node:test` で、DOM に依存しない純粋関数（`normalizeDoi`/`isValidDoi`/`processAbstract`/`generateTsv`/`detectAffMisattribution` 等）の単体テストを `tests/` に整備し、`npm test`（CI含む）に組み込み。テストから `require` できるよう `chrome-extension/make_jc_importer.js`・`openalex_panel.js` に `typeof window`／`typeof document`／`module.exports` ガードを追加（ブラウザ動作は不変）。あわせて `make_jc_importer` の DOI 正規化を `funder_lookup` に合わせ `https://dx.doi.org/…` 対応へ統一（実挙動変更）。標準版・Chrome拡張版に同一実装。manifest version `1.19.0` → `1.19.1` |
| 2026-07-05 | Codexによる現状レビュー（進捗・実用性・将来拡張可能性・課題）を [`docs/current_review_2026-07-05.md`](docs/current_review_2026-07-05.md) として保存。新規ドキュメント追加ルールに従い、`scripts/check.js` の UTF-8 チェック対象と `docs/developer_docs.md` のドキュメント一覧にも登録。ドキュメント中心の変更（本番HTML・共有JS・Chrome拡張コードの変更なし、E2E対象外・manifest更新不要） |
| 2026-07-05 | 開発者向けドキュメント（[`docs/developer_docs.md`](docs/developer_docs.md)）に「テストの限界と教訓」節（Nodeサンドボックス検証はDOM描画を見ない・標準版E2Eでは拡張版限定機能を検出できない・仕様書の除外規則は実装チェックリスト化する、の3点を実例付きで整理）と「テスト用DOIカタログ」節（回帰・E2Eで使う代表DOIと各々の検証観点）を追加。保守者向けドキュメントのみの変更（本番HTML・共有JS・Chrome拡張コードの変更なし） |
| 2026-07-04 | DataCite DOIパスにOPF連動によるアクセス権エンバーゴ判定を追加（[#214](https://github.com/tzhaya/jc-import-file-maker/issues/214)）：#212のフォローアップ。処理順を「ISSN早期抽出（新設 `extractDataCiteIssnsFromRaw`／`findDataCiteSourceIdentifier`、`extractDataCiteBibliographicInfo`と抽出優先順位を共通化）→OPF取得→マッピング」に変更し、Crossref/JaLCパスと同じ `determineAccessRights(oaStatus, lastOpfData)` をDataCiteパスでも呼び出すことで、従来固定していた `open access` をOAステータスがclosed/未収録の場合にOPFエンバーゴの有無で `embargoed access`/`open access` に判定するよう変更。効果はOPF照会が有効なChrome拡張版のみ（標準版はOPF無効のため無回帰）。標準版・Chrome拡張版に同一実装。manifest version `1.18.0` → `1.19.0` |
| 2026-07-04 | DataCite DOIパスにOpenAlex補完を追加（[#212](https://github.com/tzhaya/jc-import-file-maker/issues/212)）：DOIがOpenAlexに収録されている場合、OAステータスに基づきOAバッジを表示し、資源タイプが「論文相当」（journal article/article/conference paper 等の許可リスト）のときのみ出版タイプ・関連情報（`isIdenticalTo`/`isVersionOf`）を判定。データセット・ソフトウェア等は対象外とし既定値のまま（green判定時に版フォールバックでAMが誤混入することを実測で確認したため）。アクセス権はOPF連動が無いため引き続き `open access` 固定（実質不変）。OpenAlex未収録（404）は既定値挙動を維持、409等の障害はエラーとして伝播（黙って既定値で通さない）。あわせて、ブラウザE2Eで発見した既存バグ（`<select>`未設定時に表示値が先頭要素にフォールバックしTSVエクスポートに誤値が出る問題、#208から潜在）を修正。標準版・Chrome拡張版に同一実装。manifest version `1.17.0` → `1.18.0` |
| 2026-07-04 | DataCite DOI メタデータ取得・マッピングを実装（[#208](https://github.com/tzhaya/jc-import-file-maker/issues/208)）：[`docs/datacite_jpcoar_mapping.md`](docs/datacite_jpcoar_mapping.md)（#197）を仕様書として標準版・Chrome拡張版の両方に実装。CORS対応・認証不要のため環境分岐なしで両版とも直接fetchで動作。アクセス権・出版タイプはOpenAlex連携なしのため既定値固定。詳細は [変更履歴](docs/changelog.md) 参照。manifest version `1.16.1` → `1.17.0` |
| 2026-07-03 | DataCite → JPCOAR マッピング表を作成（[#197](https://github.com/tzhaya/jc-import-file-maker/issues/197)）：DataCite DOI 対応の実装（[#208](https://github.com/tzhaya/jc-import-file-maker/issues/208)）に先立つ設計文書 [`docs/datacite_jpcoar_mapping.md`](docs/datacite_jpcoar_mapping.md) を新規作成。API仕様（CORS対応・`?publisher=true&affiliation=true`）の実測確認、国内機関リポジトリ由来DOI（NII準会員・jalccoコンソーシアム、いずれも doiRA=DataCite）の切り分け調査、resourceTypeGeneral 全34値（Schema 4.7）／relationType 全39値／relatedIdentifierType 全23値の対応表、E2E用テストDOI 7件を収載。ドキュメントのみの変更（本番HTML・拡張コードの変更なし） |
| 2026-07-03 | OpenAlex機関別著作検索の検索結果外部リンクをクリックするとタブが「DOIインポート」に戻る不具合を修正（[#201](https://github.com/tzhaya/jc-import-file-maker/issues/201)）：`funder_lookup.js`（#150）と同じ委譲クリックハンドラを `openalex_panel.js`／`openalex_lookup.html` に追加し、`chrome.tabs.create` で外部リンクを新しいタブに開くよう修正。manifest version `1.16.0` → `1.16.1` |
| 2026-07-03 | `make_jc_importer_test.html`（ローカル専用・`.gitignore`対象）のCONFIGブロックが `shared.js` 分離（#111）以前の構造のまま未更新だった問題を修正（[#203](https://github.com/tzhaya/jc-import-file-maker/issues/203)）：`shared.js` に #156 で追加済みの `DEFAULT_ROR_ID`・`DEFAULT_OPENALEX_DAYS` をインラインCONFIGブロックと `loadConfig()` に追記。`.claude/skills/sync-test/SKILL.md` の同期手順に「APIキーだけでなく `shared.js` 側で追加された初期値項目の有無も確認する」旨を追記し再発を防止 |
| 2026-07-02 | DOIリスト一括取得に「中断」ボタンを追加（[#194](https://github.com/tzhaya/jc-import-file-maker/issues/194)）：一括取得中に「中断」ボタンを表示し、押下で次のDOI着手前（またはfetch完了直後・レート待機に入る前）にループを停止。中断前までの成功分は蓄積アイテムに保持され下書き保存も維持。標準版（`make_jc_importer.html`）・Chrome拡張版（`chrome-extension/make_jc_importer.js`・`panel.html`）に同一実装。manifest version `1.15.0` → `1.16.0` |

全履歴は [docs/changelog.md](docs/changelog.md) を参照してください。

## 作者
- Takanori Hayashi
