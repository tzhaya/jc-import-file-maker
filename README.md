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
| Chrome拡張機能版 | 2026-07-26 | ver. 1.25.1 | Open Policy Finder APIのエラーハンドリングを改善（[#229](https://github.com/tzhaya/jc-import-file-maker/issues/229)）。401/403/429等の実エラーを「情報なし」と区別して表示し、OPF取得エラー時のアクセス権判定を安全側（`embargoed access`）に修正 |
| 通常ブラウザ版 | 2026-07-20 | — | 導入手順を現在のJS単一ソース構成に合わせ、必要ファイルに `make_jc_importer.js` を追加 |
| 開発基盤 | 2026-07-19 | — | 標準版とChrome拡張機能版で正本JSを共有する構成へ移行。`npm run build` による反映とCIの同期検査を導入 |
| ドキュメント | 2026-07-17 | — | [docs/README.md](docs/README.md) を新設し、`docs/` 以下の文書を用途別に一覧化 |
| OpenAlex機関別著作検索 | 2026-07-17 | ver. 1.25.0 | 登録済み照合で `DOI` と `selfDOI` を順に検索し、候補DOIの完全一致を検出した場合は登録済み可能性大と確定。通信・解析エラーは未登録扱いにせず照合不可と表示（[#241](https://github.com/tzhaya/jc-import-file-maker/issues/241)） |

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

インストールせずに試したい場合は、4つのファイルを同じフォルダへ保存して使用します（[リポジトリのZIP](https://github.com/tzhaya/jc-import-file-maker/archive/refs/heads/master.zip)を展開しても同じ構成が得られます）。

1. [make_jc_importer.html](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/make_jc_importer.html)を右クリックし、「名前を付けてリンク先を保存」で保存します
2. [shared.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/shared.js)を同じフォルダへ保存します
3. [tsv_headers_template.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/tsv_headers_template.js)も同じフォルダへ保存します
4. [make_jc_importer.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/make_jc_importer.js)も同じフォルダへ保存します
5. 必要に応じて、`shared.js`をメモ帳などで開き、APIキーや初期値を設定します
6. `make_jc_importer.html`をブラウザで開きます

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
  - 動作には [shared.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/shared.js) と [funder_lookup.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/funder_lookup.js) も必要です。同じフォルダに保存してください（`shared.js` はインポート用TSV生成ツールの導入時に保存済みであれば共用できます）。

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
  - 動作には [shared.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/shared.js)・[weko3_opensearch_core.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/weko3_opensearch_core.js)・[openalex_lookup.js](https://github.com/tzhaya/jc-import-file-maker/raw/refs/heads/master/openalex_lookup.js) も必要です。同じフォルダに保存してください（`shared.js` はインポート用TSV生成ツールの導入時に保存済みであれば共用できます）。

利用手順と「未登録かどうか」の判定ロジックは [使い方ガイド](docs/user_guide.md#openalex機関別著作検索からのインポート) を参照してください。

### 設定（APIキー・初期値）

APIキー（OpenAlex・CiNii・Open Policy Finder）と初期値（リポジトリURL・管理フィールド・自機関ROR・OpenAlex検索対象期間）は、いずれも **Chrome拡張機能版は設定ページ**、**通常ブラウザ版は `shared.js` の `CONFIG` 定数** で設定します。**APIキー・初期値ともすべて任意です**（未設定でも動作します。APIキー未設定時はレート制限が厳しくなる等の制約があります）。

設定できる項目（すべて任意）:

- **APIキー**: `OpenAlex_API_KEY` ／ `CiNii_API_KEY`（KAKEN XML API利用時は必須）／ `OPF_API_KEY`（Chrome拡張機能版のみ）
- **初期値**: リポジトリURL（`DEFAULT_REPOSITORY_URL`）／ 登録先インデックスID（`DEFAULT_INDEX_ID`）／ インデックス名パス（`DEFAULT_POS_INDEX`）／ 自機関ROR ID（`DEFAULT_ROR_ID`）／ OpenAlex検索対象期間（`DEFAULT_OPENALEX_DAYS`）

各項目の詳細な説明・反映先・設定手順（拡張機能版の設定ページ／通常ブラウザ版の `CONFIG` コード例）は **[設定ガイド](docs/settings.md)** を参照してください。

## ディレクトリ構成

```
├── make_jc_importer.html      # メインツール（通常ブラウザ版・マークアップのみ）
├── funder_lookup.html         # 助成情報検索ツール（通常ブラウザ版・マークアップのみ）
├── openalex_lookup.html       # OpenAlex機関別著作検索ツール（通常ブラウザ版・マークアップのみ）
├── shared.js                  # 共通設定（CONFIG定数・APIキー）と通信処理（各HTML・Chrome拡張で共有）
├── tsv_headers_template.js    # TSVヘッダーテンプレート定義（メインツールで使用）
├── make_jc_importer.js        # メインツール ロジック（正本。標準版・Chrome拡張版で共有）
├── funder_lookup.js           # 助成情報検索 ロジック（正本。標準版・Chrome拡張版で共有）
├── openalex_lookup.js         # OpenAlex機関別著作検索 ロジック（正本。拡張版では openalex_panel.js）
├── weko3_opensearch_core.js   # WEKO3 OpenSearch 共通コア（正本。標準版・Chrome拡張版で共有）
├── scripts/build.js           # 正本JS → chrome-extension/ への同期コピー（npm run build）
├── chrome-extension/          # Chrome拡張機能版（このフォルダを読み込んで使用）
│   ├── manifest.json          #   Manifest V3 定義
│   ├── background.js          #   Service Worker（CORS プロキシ）
│   ├── panel.html             #   サイドパネル（メインツール）
│   ├── funder_panel.html      #   サイドパネル（助成情報検索）
│   ├── opensearch_panel.html  #   サイドパネル（リポジトリコンテンツ検索／OpenSearch）
│   ├── opensearch_panel.js    #   リポジトリコンテンツ検索 ロジック（拡張専用）
│   ├── openalex_panel.html    #   サイドパネル（OpenAlex機関別著作検索）
│   ├── options.html           #   設定ページ（APIキー管理 UI）
│   ├── options.js             #   設定ページ ロジック
│   ├── *.js                   #   ルート正本の同期コピー（npm run build が生成。直接編集しない）
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

- [ドキュメント一覧](docs/README.md) `docs/` 以下の資料を目的別に案内します。
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
| 2026-08-02 | JISC Open Policy Finder API の v1リリース（2026-07-30に延期）後、実APIへクエリを送信して挙動を検証（[#229](https://github.com/tzhaya/jc-import-file-maker/issues/229) フォローアップ）。タイトル識別子が400で拒否されること・`format` 省略で正常応答が返ることからv1適用済みと確認し、v1で廃止された `format` パラメータの送信を削除。レスポンス構造はリリース前のサンプルとキー集合が完全一致で、`items` ラッパーを含め変化なし。未収録ISSNは404ではなく `200` + 空配列で返るため該当コメントを実態に合わせて修正（挙動は従来どおり「情報なし」で正しく動作）。機能・使い方の変更はなし |
| 2026-07-26 | Chrome拡張 ver. 1.25.1：JISCの Open Policy Finder API "full v1" リリース（2026-07-29）通知を受け、OPF連携のエラーハンドリングを改善（[#229](https://github.com/tzhaya/jc-import-file-maker/issues/229)）：404（未収録）とそれ以外のAPIエラー（401/403/429等）を分岐し、従来「情報なし」と誤表示されていたAPIエラーを専用バッジ・モーダル文言で区別。OPF取得エラー時にアクセス権が無条件で `open access` になっていた問題も修正し、安全側の `embargoed access` を返すよう変更。廃止予定の `format` パラメータは、現行APIでは省略すると全件エラーになることを実測で確認したため削除を見送り。詳細は [docs/changelog.md](docs/changelog.md) 参照 |
| 2026-07-20 | 通常ブラウザ版の導入案内をJS単一ソース化後の構成へ追随させ、必要ファイルに `make_jc_importer.js` を追加。あわせてリリース作業を標準化する `/release` Skillを追加し、リリースPR準備・version判定・テスト・タグとmanifestの整合確認・GitHub Release確認を手順化。ドキュメントと開発フローのみの変更で、manifest versionは更新しない |
| 2026-07-19 | 開発基盤の簡素化：標準版HTMLのインラインJSとChrome拡張版JSの手動同期を廃止し、リポジトリ直下の正本JSを両版で共有する構成に変更（`npm run build` が `chrome-extension/` へコピーし、CIが反映漏れを検出）。**通常ブラウザ版の必要ファイルが変わりました**（メインツールは `make_jc_importer.js`、助成情報検索は `funder_lookup.js`、OpenAlex検索は `weko3_opensearch_core.js`・`openalex_lookup.js` も同じフォルダに必要）。機能・使い方の変更はありません |
| 2026-07-17 | `docs/README.md` を新設し、利用者向けガイド、開発・運用資料、仕様書、調査資料、ポリシー、実装履歴を目的別に一覧化。現行ファイルへのリンクと将来的なフォルダ分け案を記載。あわせて `docs/roadmap_2026-07-05.md` を登録・推敲し、少数実機での取り込み成功と検証完了を区別。ドキュメントのみの変更（E2E対象外・manifest更新不要） |

全履歴は [docs/changelog.md](docs/changelog.md) を参照してください。

## 作者
- Takanori Hayashi
