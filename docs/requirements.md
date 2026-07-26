# `JAIRO Cloud インポート用TSV生成ツール` 作成要件

## ファイル名

make_jc_importer.html

## このツールの目的

このドキュメントは、`JAIRO Cloud インポート用TSV生成ツール`  を作成するための要件を記述します。本ツールは、DOI (Digital Object Identifier) を入力として受け取り、Crossref・JaLC・OpenAlex APIから書誌情報を取得し、JAIRO Cloudへのインポートに適した表形式で表示することと、TSV形式のデータを生成することを目的としています。

## 技術詳細と依存関係

**フロントエンド技術**: HTML5, CSS3, JavaScript
**共通ファイル構成**（#111）:
    -   `shared.js` — CONFIG定数（APIキー）、`loadConfig()`（Chrome拡張用ストレージ読込）、`extensionFetch()`（CORS プロキシ）を定義。`make_jc_importer.html`・`funder_lookup.html`・Chrome拡張で `<script src>` により共有
    -   `tsv_headers_template.js` — TSV_HEADERS_TEMPLATE定数（`data/tsv_headers.json` と同一内容、232列）を定義。`make_jc_importer.html`・Chrome拡張のみ使用
    -   スタンドアロン版のAPIキー設定は `shared.js` の CONFIG定数を直接編集
**外部API**:
    -   DOI RA判定 API (`https://doi.org/doiRA/`)
    -   Crossref API (`https://api.crossref.org/works/`)
    -   OpenAlex API (`https://api.openalex.org/works/`)
    -   ROR API (`https://api.ror.org/v2/organizations/`)
    -   CiNii Research Projects API (`https://cir.nii.ac.jp/opensearch/v2/projects`)
    -   CiNii Research Books API (`https://cir.nii.ac.jp/opensearch/v2/books`)
    -   JaLC REST API (`https://api.japanlinkcenter.org/v2/dois/`)
    -   Crossref Works API - JGN（Japan Grant Number）(`https://api.crossref.org/works/10.52926/{award}`)
    -   GitHub API - Commits（更新チェック用）(`https://api.github.com/repos/tzhaya/jc-import-file-maker/commits`)
    -   Open Policy Finder 検索（参照リンク）(`https://openpolicyfinder.jisc.ac.uk/search?search={ISSN}`)
       
**メタデータ構造定義**
- `ItemType.json` ただし、要素から `title_i18n_temp` は除く。 
- `fields.md` にフィールドの概要を書き出してあります。
  - トップレベルフィールド: 42個（pubdate, item_30002_title0 ~ item_1698624010, system_* 系）
  - ネスト構造: 最大4階層まで（例: item_30002_creator2 → creatorAffiliations → affiliationNameIdentifiers → affiliationNameIdentifier）
  - └ 記号とインデントで親子関係を表現
  - titleMapありのフィールドは主に language, type, scheme 等の選択肢フィールド
  - title_i18n_temp は除外

**ネスト構造の処理について**
- `attribute_value_mlt.md` を参照ください。

**HTMLページレイアウトサンプル**
-    `make_tsv.html`

### JPCOAR関係データ

**資源タイプ語彙別表**
    -　`resource_type_vocabulary.md`
    - JPCOAR スキーマ 2.0 の語彙に対応（全74タイプ）
    - v1.0のみの廃止語彙（`internal report`・`report part`・`periodical`・`interview`・`conference object`）は `RESOURCE_TYPE_MAP` に後方互換として残すが、UI選択肢（`TITLE_MAPS.resourcetype`）からは除外
    - 出典: v1.0 https://schema.irdb.nii.ac.jp/ja/resource_type_vocabulary / v2.0 https://schema.irdb.nii.ac.jp/ja/2.0/resource_type_vocabulary

**JPCOARスキーマ 項目別説明リンク一覧**
    - `JPCOARschema_guide.md`（1.0.2/2.0併記、下位項目含む）
    - セクションヘッダー: `JPCOAR_LINKS` 定数でフィールドキー→スキーマ2.0 URLをマッピング、`createSection()` でリンク化
    - サブフィールドヘッダー: `JPCOAR_SUBFIELD_LINKS` 定数でサブフィールドキー→スキーマ2.0 URLをマッピング、`createNestedSectionHeader()` の第4引数でリンク化

**アクセス権 統制語彙**
    - `accessrights.md`

**関連識別子 統制語彙**
    - `relatedIdentifier.md`

### JAIRO Cloud関係データ

**データマッピングサンプルデータ**
    `sample.json`

**TSVヘッダー定義**
    - `data/tsv_headers.json`（232列、5行: ItemType行・プロパティキー行・日本語ラベル行・System印行・制約行）
    - デフォルトアイテムタイプ（フル）(30002) の WEKO3 v2 テンプレートに準拠
    - `make_jc_importer.html` 内の `TSV_HEADERS_TEMPLATE` インライン定数と同期すること

**WEKO3 TSVインポート仕様**
    - `docs/weko3_tsv_import_spec.md`
    - WEKO3ソースコードから調査したTSVインポート処理の全仕様（ZIP構造、5行ヘッダー、システムカラム、バリデーションルール、ファイル処理、DOI/CNRI登録等）

### 外部API サンプルデータ

サンプルデータは `samples/` ディレクトリにAPIソース別のサブディレクトリで整理されています。

**Crossref APIサンプルデータ**
    - `samples/Crossref/j.advnut.2025.100480.json`
    - `samples/Crossref/10.1038_s41467-023-40773-1.json`

**サンプルデータ DOI**
    `https://doi.org/10.1016/j.advnut.2025.100480`

**OpenAlex API 論文(Work)サンプルデータ**
    - `samples/OpenAlex/openalex.org_W4412424744.json`

**OpenAlex API 著者(author)サンプルデータ**
    - `samples/OpenAlex/openalex.org_a5000546253.json`

**JaLC APIサンプルデータ**
    - `samples/JaLC/10.34556%252F0002000089.json`
    - `samples/JaLC/10.34556%252F0002000787.json`

**CiNii Research APIサンプルデータ**
    - `samples/CiNii/cir.nii.ac.jp_19KK0341_en.json`
    - `samples/CiNii/cir.nii.ac.jp_19KK0341_ja.json`

**OpenPolicyFinder (SHERPA/RoMEO) サンプルデータ**
    - `samples/OpenPolicyFinder/`

**ROR サンプルデータ**
    - `samples/ror.org_005pdtr14.json`

## 主要機能

-   **DOIからのデータ取得**:
    -   入力されたDOIに基づき、まず `https://doi.org/doiRA/{DOI}` APIでDOIの登録機関（Registration Authority）を判定します。
        -   DOIが存在しない場合はエラーメッセージを表示し、処理を中断します。
        -   登録機関が **Crossref** の場合：Crossref および OpenAlex APIから論文のメタデータを取得します。
        -   登録機関が **JaLC** の場合：JaLC REST API（`https://api.japanlinkcenter.org/v2/dois/`）からメタデータを取得します（CORS 非対応のため Chrome 拡張版のみ。標準版ではスキップ報告）。
        -   登録機関が **DataCite** の場合：DataCite REST API（`https://api.datacite.org/dois/`）からメタデータを取得します（CORS 対応・認証不要のため標準版・Chrome 拡張版とも動作。マッピング仕様は [docs/datacite_jpcoar_mapping.md](datacite_jpcoar_mapping.md) を参照）。あわせて OpenAlex API から補完取得を試み（[issue #212](https://github.com/tzhaya/jc-import-file-maker/issues/212)）、DOI が収録されている場合は OA ステータスに基づき OA バッジを表示し、資源タイプが「論文相当」（journal article/article/conference paper 等）のときのみ出版タイプ・関連情報（`isIdenticalTo`/`isVersionOf`）を判定します。データセット・ソフトウェア等の資源タイプ、および OpenAlex 未収録の場合は出版タイプは空欄のままです。アクセス権は Crossref/JaLC パスと同様に `determineAccessRights()` で OA ステータス + OPF エンバーゴ情報に基づき動的に設定されます（[issue #214](https://github.com/tzhaya/jc-import-file-maker/issues/214)。OPF照会が有効な Chrome 拡張版のみ実効、標準版は常に `open access`）。
        -   その他の登録機関の場合：サポート外メッセージを表示します。
    -   Crossref APIで得られる内容（例：`j.advnut.2025.100480.json`）を`ItemType.json`の構造に変更します。マッピングの例は  `sample.json` です。
-   **DOIリスト一括取得**（[issue #154](https://github.com/tzhaya/jc-import-file-maker/issues/154)）:
    -   複数のDOIを改行/カンマ/空白区切りでまとめて投入し、正規化・重複除去のうえ1件ずつ順次取得して既存のバッチに蓄積します。各取得間に待機を挟み（レート制御）、失敗したDOIはスキップして処理を継続し、完了後に成功/失敗件数と失敗DOI一覧を表示します。
    -   取得中は「中断」ボタンを表示し（[issue #194](https://github.com/tzhaya/jc-import-file-maker/issues/194)）、押下するとループを安全に停止します。中断前までに成功したDOIは蓄積バッチと作業中データ（下書き）に保持され、サマリには処理済み件数から算出した残り件数を表示します。
    -   各DOIのRA判定・取得・マッピングは単一DOI取得と同一の処理経路（`fetchAndAccumulate()`）を通ります。JaLC DOIはChrome拡張版のみ対応（標準版ではスキップ報告）。
-   **OpenAlex機関別著作検索**（[issue #155](https://github.com/tzhaya/jc-import-file-maker/issues/155)・[#156](https://github.com/tzhaya/jc-import-file-maker/issues/156)・Phase 3 [#157](https://github.com/tzhaya/jc-import-file-maker/issues/157)）:
    -   自機関の ROR ID と過去N日（出版日ベース、既定90日）を指定して OpenAlex Works API（`authorships.institutions.ror` フィルタ）を cursor paging で全件取得し、タイトル・掲載誌・出版日・OAステータスバッジ・DOI＋チェックボックスの候補一覧を表示します。OpenAlex は CORS 対応のため標準版（`openalex_lookup.html`）・Chrome拡張版（タブ）の両方で動作します。
    -   選択したDOIを改行区切りでコピーでき、Chrome拡張版では `chrome.storage.local` 経由でインポートタブのDOIリスト一括取得欄へ直接受け渡します。検索条件・結果・照合結果・選択状態は作業中データとして自動保存し（[#162](https://github.com/tzhaya/jc-import-file-maker/issues/162) と同基盤、キー `openAlexSearch`）、次回起動時に既定表示、再検索で入れ替えます。
    -   **登録済み照合バッジ**（Chrome拡張版限定）: 候補DOIを `DOI`、`selfDOI` の順で検索し、返戻 JPCOAR 内の識別子（`identifier`/`relatedIdentifier`/`identifierRegistration`）との完全一致を確認します。両方が正常に0件または不一致の場合は、候補タイトルを正規化（タグ除去＋先頭N語）して検索する従来方式へフォールバックします。判定は3値で、🔴 登録済みの可能性大（DOI一致・既定チェックOFF）／🟡 要確認（タイトルヒット＋DOI不一致・OFF＋ヒットしたレコードへのリンク）／🟢 未登録の可能性（タイトルヒットなし・ON）を表示します。通信・HTTP・XML解析エラーは `⚠ 照合不可` とし、最終判断はユーザーが行います。
    -   **所属誤判定の可視化**（[issue #186](https://github.com/tzhaya/jc-import-file-maker/issues/186)・標準版／Chrome拡張版共通）: `authorships.institutions.ror` フィルタは OpenAlex 側の機関同定エラー（[#165](https://github.com/tzhaya/jc-import-file-maker/issues/165) と同型）により検索対象機関に実際は所属しない論文を含みうるため、結果テーブルに独立した「所属確認」列を設け、誤判定が疑われる論文に `⚠ 要確認` バッジを表示します。各論文の `authorships[].institutions[]` から検索対象 ROR に一致する機関を特定し、その機関 ID にマップされた `affiliations[].raw_affiliation_string` が機関を裏付けるか（機関名の識別的トークン＝汎用語・地名・`international` 等の弱語を除いた語、または頭字語が表記に現れるか）で判定します。裏付ける所属表記を持つ著者が 1 人も居ない論文のみをフラグし、tooltip に疑い著者名・元の所属表記（または affiliations 欠落の別）を、サマリに疑い件数を表示します。**自動除外は行わず注意喚起のみ**（既定チェックは ON のまま・除外はユーザー判断）で、検出は不完全な人間向けシグナルです。ROR 比較は末尾スラッシュ・大小文字・bare ID 差を正規化し、#156 登録済み照合列とは別列で描画します。
-   **ROR/ISNI情報との連携**
    -   OpenAlexから取得したROR IDを基に、ROR v2 APIを介してISNI情報を取得し、所属機関の識別子として活用します。
    -   所属機関名として、ROR v2 APIから得られる情報のうち "types" が ["ror_display"] に該当する要素のlabelを使用します。 
    -   **OpenAlex由来RORの注意喚起と誤同定検出**（[issue #165](https://github.com/tzhaya/jc-import-file-maker/issues/165)）:
        -   OpenAlexが機械同定したROR（`authorships[].institutions[].ror`）由来の所属機関識別子URIには、ORCID同様に`⚠ 要確認`を表示します。titleは`OpenAlex が機械同定した ROR です。正確か確認してください`とします。
        -   OpenAlexが同定した機関名（`institutions[].display_name`）と、同定元のCrossref所属表記（`affiliations[].institution_ids` で対応付く `raw_affiliation_string`）を、汎用語（university/college/institute 等）と3文字未満を除いた有意トークンで照合します。判定は2段階です。(1) 機関名トークンの過半数が所属表記に出現すれば整合とみなします（住所・メールアドレス等を含む実データでも、機関名が綴られていれば誤検出しません）。(2) 過半数に満たない場合のみ、所属表記の最上位組織名（末尾カンマセグメント。末尾の国・地域名は除外）とトークンを共有するか確認し、共有しない場合に誤同定の疑いありと判定します。
        -   誤同定の疑いがある場合は ROR/ISNI を所属機関識別子として設定せず、所属機関名にはCrossref所属表記をそのまま採用したうえで、所属機関名欄に`⚠ 要確認`を表示します。titleは`OpenAlex が同定した機関が Crossref の所属表記と一致しないため ROR を設定していません。記入は機関名までです。部局名など下位階層がある場合は編集してください。`とし、JPCOARスキーマガイドライン（記入は機関名までとし、部局名など下位階層の所属は記入しない）への対応も促します。
        -   判定材料（対応付くCrossref所属表記）が無い場合は誤同定と判定せず、ROR を維持したうえで上記の`⚠ 要確認`表示のみ行います。
-   **ORCIDの取得**
    -   ORCIDは次の優先順位で取得します。
        + Crossref APIから取得
        + (Crossref APIでORCIDが取得できない、あるいは空値の場合) OpenAlexから取得
          + OpenAlexから取得した場合は、`⚠ 要確認`と表示します。この箇所のtitleを`OpenAlexから取得した値です。正確か確認してください`として、利用者に注意を喚起します。
-   **取得データのプレビューと編集**
    -   取得したメタデータをHTMLテーブル形式で表示し、ユーザーがTSV出力前に内容を確認および編集できるインターフェースを提供します。
-   **動的な項目追加・削除**: 
    - 入力するデータはネスト構造を持っています。
    - ネスト構造の中では、階層ごとに繰り返しが可能です。
    - 繰り返し可能なセクションに対して、アコーディオンUIで動的に項目を追加・削除する機能を提供します。
    - 項目名の右に、追加・削除のボタンを配置します。
    - 追加の場合は、同じフィールドのまとまりごとに直下に追加します。
    - 「書誌情報」内の「雑誌名」（`bibliographic_titles`）は配列フィールドであり、他の配列フィールドと同様に追加・削除ボタンを提供します（issue #75）。
  
-   **DOI必須項目バッジ表示**:
    -   各フィールドセクションのヘッダーに JaLC DOI / Crossref DOI の必須項目情報を色付きタグ（バッジ）で表示する
    -   バッジ種別: 必須（実線ボーダー）、条件付必須（破線ボーダー）
    -   JaLC: 青系（`#e3f2fd` 背景）、Crossref: 赤系（`#fce4ec` 背景）
    -   バッジにマウスホバーするとツールチップで備考（例: `Crossref: xml:lang必須`）を確認可能
    -   資源タイプ（`item_30002_resource_type13.resourcetype`）の選択値に応じて動的に切り替える
        -   ジャーナルアーティクル系（`journal article`, `conference paper`, `departmental bulletin paper`, `journal`, `other periodical`, `commentary`, `peer review` 等）: 別表2-1/3-1 に基づくバッジを表示
        -   書籍系（`book`, `book part`, `technical report`, `policy report`, `working paper`, `thesis` 等）: 別表2-3/3-2 に基づくバッジを表示
        -   対象外の資源タイプ（`image`, `dataset` 等）: バッジ非表示
    -   資源タイプ変更時および初期表示時（`renderAll()` 完了後）にバッジを自動更新する
    -   根拠: `docs/JPCOAR_JaLC_Crossref_requirements.md`（JPCOAR/JaLC対照表 付録 ver.1.5）

-   **入力支援**:
    -   `fields.md` で列titleMapが「あり」のフィールドは、選択肢が用意されているフィールドです。
    -   選択肢は `ItemType.json` のうち"key" に対するtitleMapの配列の name と value で定義されています。
    -   選択式の項目は select メニューで選択できます。
    -   フィールド：資源タイプは「資源タイプ語彙別表」に基づき資源タイプを選択すると、該当する資源タイプURIが自動設定されます。
    -   フィールド：アクセス権は「アクセス権 統制語彙」に基づきアクセス権を選択すると、該当するアクセス権URIが自動設定されます。
      
-   **TSVダウンロード**: 
    -   編集されたメタデータをUTF-8 BOM付きのTSVファイルとしてダウンロードします。TSVヘッダーは特定のJAIRO Cloudアイテムタイプ（国際農研デフォルトアイテムタイプ）に対応するように構成されます。

-   **OA情報統合**（[issue #51](https://github.com/tzhaya/jc-import-file-maker/issues/51)）:
    -   OpenAlexから取得した論文のOpen Accessステータスをバッジ形式で表示します。
    -   **OAステータスバッジ**: 全6値（diamond/gold/green/hybrid/bronze/closed）に対応し、各ステータスに固有の色・アイコンでinfo-barに表示する
    -   **OAサマリー表示**: info-barにOPFバッジ横でOAステータスの概要（OA Fee有無、エンバーゴ情報など）を日本語で表示する
    -   **出版タイプ・relationTypeの自動設定**（`determineVersionInfo()`関数）:
        -   OAステータスに基づいて出版タイプ（Version of Record / Author's Accepted Manuscript）とrelationType（isIdenticalTo / isVersionOf）を自動判定する
        -   gold/diamond/hybrid: VoR + isIdenticalTo（出版者版）
        -   green: AAM + isVersionOf（著者最終稿）
        -   bronze/closed: VoR + isIdenticalTo（出版者版、アクセス制限あり）
    -   **アクセス権の動的設定**（`determineAccessRights()`関数）:
        -   OAステータスとOPFエンバーゴ情報に基づいてアクセス権を自動設定する
        -   open access: diamond/gold/hybrid/bronze/green（OA系ステータス）
        -   embargoed access: closed/unknown かつ OPFにエンバーゴ情報がある場合
        -   open access（デフォルト）: closed/unknown でエンバーゴなし（機関リポジトリ登録用途を想定）
        -   OPFデータはmapToItemType/mapToItemTypeJaLC/mapToItemTypeDataCiteの前に取得される（ISSN早期抽出による。DataCiteパスは[#214](https://github.com/tzhaya/jc-import-file-maker/issues/214)で対応）
    -   **OpenAlexリポジトリ情報の関連情報追加**:
        -   OpenAlex の `any_repository_has_fulltext` が true の場合、`locations[]` からリポジトリ（source.type = "repository"）の landing_page_url を抽出し、関連情報（relationType: isIdenticalTo, identifierType: URI）として追加する
    -   **OPFモーダルのOAステータス連動**:
        -   OPFモーダル表示時に、論文のOAステータスに該当するポリシーをハイライトし「★ この論文に該当」ラベルを付与する
        -   IR（機関リポジトリ）向けポリシーを優先的に上部に配置する
    -   **エンバーゴヒント表示**:
        -   OPF APIからエンバーゴ期間を取得した場合、日付セクションとファイル情報セクションに公開可能日の候補を表示する
        -   エンバーゴ単位（months/years）に対応した日本語表示を行う
    -   **UIラベル日本語化**: OA Fee表示の日本語化、エンバーゴ期間の単位表示対応

-   **プレビュー表示機能**:
    -   データ入力後、「プレビュー表示」ボタンにより入力内容をモーダルで確認表示する
    -   表示形式は JAIRO Cloud のアイテム詳細画面に準じたコンパクトなテーブル形式
    -   フィールド名を左列、値を右列とする2列テーブル。言語は `値 (en)` のように後置かっこ表記
    -   URLはクリック可能なリンクを形成する
    -   空フィールドは省略する（JAIRO Cloud同様）
    -   作成者・寄与者は内側テーブル（#/姓名/姓・名/識別子/所属）でコンパクト表示
    -   助成情報は内側テーブル（#/助成機関名/識別子/課題番号/課題名）でコンパクト表示
    -   書誌情報は3行に集約（雑誌名/巻号ページ/発行日）
    -   モーダルは Esc キー、閉じるボタン、オーバーレイクリックで閉じる
    -   データ収集は `collectFromDOM()` で DOM の現在値を構造化 JSON に変換する（TSVエクスポートの共通基盤）

-   **ファイル情報入力UI**（[issue #84](https://github.com/tzhaya/jc-import-file-maker/issues/84)）:
    -   `item_30002_file35` フィールドの入力UIを提供する
    -   `<input type="file">` でファイルを選択すると、ファイル名・サイズ・MIMEタイプを自動取得する（ファイル本体はアップロードしない）
    -   アクセス権・公開日・表示タイプ・ライセンス等のサブフィールドを手動入力可能
    -   権利情報（rights12）のCC URIから`licensetype`を自動設定（`startsWith()`前方一致）
    -   `licensetype`が`license_free`の場合のみ`licensefree`テキストエリアを表示
    -   複数ファイルの追加・削除に対応
    -   **ファイルパス自動判定**（[issue #90](https://github.com/tzhaya/jc-import-file-maker/issues/90)）:
        -   `file_path`（トップレベル）を`data/`以下の相対パスから自動生成する
        -   `showDirectoryPicker()` API によるフォルダ選択で、フォルダ直下のPDF・画像ファイルを一括追加
        -   `data/` フォルダ選択時: `file_path` = ファイル名のみ（例: `paper.pdf`）
        -   `data/` 以下のサブフォルダ選択時: `file_path` = `サブフォルダ名/ファイル名`（例: `rec_1/paper.pdf`）
        -   PDF → オブジェクトタイプ `fulltext`、画像 → `thumbnail` を既定値に自動設定
        -   個別ファイル選択時はファイル名を `file_path` に設定（手動編集可能）
        -   プレビューテーブルに「パス」列を追加
    -   TSVエクスポート・プレビュー表示に対応

-   **TSVエクスポート機能**（Phase 2）:
    -   `collectFromDOM()` で収集した構造化JSONから WEKO3 インポート用TSVを生成してダウンロードする
    -   `TSV_HEADERS_TEMPLATE` テンプレート駆動方式: `data/tsv_headers.json` の内容をインライン定数として保持し、フィールドグループ化・配列展開を行う
    -   プロパティキープレフィックス自動検出: ユーザがリポジトリのTSVヘッダーを貼り付けると `item_XXXXX_` パターンを自動検出し、出力キーを置換する（デフォルト: `item_30002_`）
    -   カスタムテンプレート完全パース（Phase 2-B）: ユーザが5行ヘッダー（ItemType行・キー行・ラベル行・System行・制約行）を貼り付けた場合、`TSV_HEADERS_TEMPLATE` を丸ごと上書きしてTSV出力に反映する。不足行はデフォルトから補完。`parseCustomTemplate()` がパースを担当し、`groupTsvColumns()` / `buildTsvColumnDefs()` に template 引数として渡す
    -   ItemType行の自動設定（Phase 2-D）: TSV 1行目のアイテムタイプ名・スキーマURLをデフォルト値（「デフォルトアイテムタイプ（フル）(30002)」/ `https://localhost/items/jsonschema/30002`）で自動設定。カスタムテンプレート使用時はその row0 をそのまま使用
    -   複数DOI一括TSV出力（Phase 2-C）: DOIを連続取得して `allMetadata[]` 配列に蓄積し、ヘッダー5行 + データN行の一括TSVを出力する。列数は全metadataの配列フィールド最大長で展開（`buildMaxSizeMetadata()`）。バッチ管理パネルで蓄積件数表示・個別削除・全クリア・アイテム切替が可能
    -   作業中データの自動保存・復元（[issue #162](https://github.com/tzhaya/jc-import-file-maker/issues/162)）: 入力中・蓄積中のメタデータ（`allMetadata[]` と現在のフォーム編集）をブラウザのローカルストレージへ自動保存し、タブ／サイドパネルを閉じても次回起動時に復元できる。保存先は Chrome拡張版が `chrome.storage.local`、スタンドアロン版が `localStorage`（`shared.js` の `saveDraft`/`loadDraft`/`clearDraft`、キー `wipDraft`）。各バッチ操作後・フォーム編集のデバウンス（約1秒）・`visibilitychange`（タブ非表示）で自動保存する。起動時に下書きがあれば非ブロッキングのバナーで「復元／破棄」を提示し、バッチパネルの「下書き削除」で明示的に破棄できる。エクスポート後も下書きは保持する。下書きはローカルのみに保存し外部送信しない
    -   リポジトリURL入力: `#repo-host` 入力欄でスキーマURLの `https://localhost/` を実際のリポジトリホスト名に置換。初期値は設定で定義可能（[issue #148](https://github.com/tzhaya/jc-import-file-maker/issues/148)、後述「管理フィールド・リポジトリURLの初期値設定」）
    -   ファイル名: 単一DOIは `{DOI}.tsv`、複数DOIは `import_YYYYMMDD_HHMMSS.tsv`
    -   空フィールド省略: 値が存在しないフィールドの列群はTSVに出力しない
    -   除外フィールド: apc5, heading36, dissertation30〜degree33, item_1698624001〜010 は常に除外
    -   TSV形式: 5行ヘッダー（ItemType行・プロパティキー行・日本語ラベル行・System印行・制約行）+ データN行、UTF-8 BOM付き・LF改行

-   **電子ジャーナルページからのDOI自動取り込み**（Chrome拡張版のみ、[issue #73](https://github.com/tzhaya/jc-import-file-maker/issues/73)）:
    -   DOIインポートタブに「ページからDOI取得」ボタンを追加し、現在表示中のページのmetaタグからDOIを自動検出してDOI入力欄にセットする
    -   metaタグの優先順位: `meta[name="citation_doi"]` → `meta[name="prism.doi"]` → `meta[name="DOI"]` → `meta[name="dc.identifier"]`（DOI形式のみ）。`name` 属性は大文字小文字を区別しない（CSSセレクタの `i` フラグ）
    -   `dc.identifier` は `doi:` / `https://doi.org/` / `https://dx.doi.org/` / 素の `10.xxxx/` で始まる場合のみ採用（ISBN・ISSN等との混在対策）
    -   JSON-LDフォールバック（[issue #159](https://github.com/tzhaya/jc-import-file-maker/issues/159)）: 上記metaタグでDOIを取得できない場合、`<script type="application/ld+json">` 内の `@context` が schema.org（`http(s)://schema.org`）かつ `@type` に `ScholarlyArticle` を含むノードの `identifier` をDOIとして採用する。`@graph` 入れ子・トップレベル配列を平坦化して走査し、`identifier` は文字列・schema.org `PropertyValue`（`{ value: ... }`）形式・それらの配列に対応。採用は `dc.identifier` と同じDOI形式ガードを通過した値のみ（Taylor & Francis 等、metaタグにDOIを持たないページへの対応）
    -   取得したDOIは `normalizeDoi()` で正規化（`https://(dx.)doi.org/` プレフィックス・`doi:` プレフィックスを除去）し、`isValidDoi()`（`^10.\d{4,9}/\S+$`・256文字以内）で形式検証してから入力欄にセット。検証に失敗した場合はエラーメッセージを表示
    -   `chrome.scripting.executeScript()` を使用。`chrome://` 等の特権ページでは実行不可のためtry-catchでエラーを吸収し、`console.warn()` でログ出力
    -   権限: `scripting` + `optional_host_permissions`（`http(s)://*/*`）。`activeTab` はサイドパネル内ボタンからの遷移後に失効するため使用しない。ボタン押下時の**最初の `await`** で `chrome.permissions.request({ origins: ['https://*/*','http://*/*'] })` を呼び、ウェブサイトへのアクセス許可を1回だけ要求する（初回のみ許可ダイアログ、許可後は再確認不要・全サイトで動作）。この設計により、(1) ユーザージェスチャーが失効しない、(2) 権限付与後に `chrome.tabs.query()` が `tab.url` を返すようになる（未付与時は `tabs`/host 権限がないため `tab.url` が `undefined` になる仕様）の2点を同時に解決する

-   **助成情報検索タブのDOI入力欄とCrossref/OpenAlex連携**（Chrome拡張版・スタンドアロン版、[issue #73](https://github.com/tzhaya/jc-import-file-maker/issues/73)）:
    -   助成情報検索タブ（`funder_panel.html` / `funder_lookup.html`）にDOI入力欄を追加する
    -   Chrome拡張版では「ページから取得」ボタンで現在ページのDOIを自動取得する機能も提供
    -   「課題番号を取得」ボタンで入力されたDOIに基づき Crossref `funder[].award[]` と OpenAlex `grants[].award_id` から課題番号を収集し、既存の課題番号テキストエリアに追記する（テキストエリア既存値と重複する番号は追記しない）
    -   入力DOIは `normalizeDoi()` + `isValidDoi()` で正規化・検証してから送信する
    -   OpenAlex 呼び出しには設定済みのAPIキー（`CONFIG.OpenAlex_API_KEY`）を付与し、API エラー（OpenAlex 409 レート制限等）と「課題番号なし」を区別してメッセージ表示する
    -   取得処理中はボタンを `disabled` にして二重送信・重複追記を防ぐ
    -   Crossref・OpenAlexはCORSを許可しているため background.js プロキシ不要、直接 `fetch()` で呼び出す
    -   取得した課題番号はそのまま既存の検索フロー（KAKEN/JGN連携）に渡す

-   **課題番号入力の自動解析**（Chrome拡張版・スタンドアロン版、`extractAwardNumbers()`）:
    -   入力テキストエリアを行単位で解析し、各行を3つのモードで判定する
        -   (A) 行全体が課題番号として妥当な文字（`^[A-Za-z0-9._-]+$`）のみの場合: その行をそのまま1つの課題番号として扱う
        -   (B) 区切り文字（半角 `;` `,` ／ 全角 `、` `，` `；`）で分割した全トークンが課題番号として妥当な文字のみの場合: 課題番号リストとして各トークンを抽出する
        -   (C) それ以外（謝辞テキスト等）: `JP[A-Za-z0-9]+`・科研費パターン（`KAKENHI_RE`）・AMEDパターン（`AMED_RE`）に一致する文字列を抽出する
    -   日本語等のマルチバイト文字を含む行は (A) に該当しないため (B)/(C) の判定へ回し、`...「タイトル」JPMJMI22I2` のような行から課題番号のみを正しく抽出する（[issue #149](https://github.com/tzhaya/jc-import-file-maker/issues/149)）

-   **検索結果の外部リンクのタブ表示**（Chrome拡張版、[issue #150](https://github.com/tzhaya/jc-import-file-maker/issues/150)）:
    -   助成情報検索の結果に表示される外部リンク（`http(s)://` で始まる `<a>`）をクリックした際、サイドパネル内で遷移せず新しいタブで開く
    -   サイドパネルでは `target="_blank"` のリンクをクリックするとパネルが既定ページ（`panel.html`）にリセットされてしまうため、クリックを `document` レベルで委譲補足し `chrome.tabs.create()` で開く
    -   `chrome` が未定義のスタンドアロン版では本ハンドラを登録せず、`target="_blank"` の既定動作に委ねる

-   **OpenSearch検索機能**（Chrome拡張版のみ、[issue #72](https://github.com/tzhaya/jc-import-file-maker/issues/72)）:
    -   サイドパネルに「OpenSearch検索」タブを追加し、JAIRO Cloud機関リポジトリの OpenSearch API を用いた文献検索を提供する
    -   標準検索条件: キーワード・タイトル（完全一致指定可）・作成者・内容記述・資源タイプ（既存語彙全78種）・ID値＋ID種別
    -   詳細検索条件: 主題・出版者・言語・収録物名・作成者名識別子。`version` と日付範囲・その他の検索項目は機関差が大きいため対象外
    -   並べ替え: 既定順・作成日時の昇順（`createdate`）・降順（`-createdate`）。作成日時の範囲検索は非対応
    -   対応リポジトリ: `*.repo.nii.ac.jp` および個別許可ホスト（ALLOWED_HOSTS_EXTRA）
    -   結果一覧: タイトル・著者・書誌情報（雑誌名・巻・号・ページ・発行日）・ファイルリンク・アイテムURL
    -   詳細展開: タイトルクリックで JPCOAR 要素の詳細テーブルを展開表示
    -   ページング: 1ページ20件固定、前へ/次へボタンで移動
    -   初回検索時のリポジトリorigin・検索条件・並べ替えを保持し、ページングではフォームを再取得しない
    -   「入力をクリア」は検索条件・完全一致指定・ID種別・並べ替えだけを初期化し、リポジトリURL・検索結果・ページングstateを維持する。検索中は操作不可
    -   Chrome拡張のhost permissionsを使用し、サイドパネルから直接fetchする
    -   `options.html` にデフォルトリポジトリURL設定欄を追加。`chrome.storage.local` の `defaultRepositoryUrl` に保存し、タブ開放時に自動入力する

-   **管理フィールド・リポジトリURLの初期値設定**（[issue #148](https://github.com/tzhaya/jc-import-file-maker/issues/148)）:
    -   TSV管理（システム）フィールド `.IndexID[0]`（`.metadata.path[0]`、登録先インデックスID）・`.POS_INDEX[0]`（`.pos_index[0]`、インデックス名パス）、およびリポジトリURL（`#repo-host`）の初期値を定義できる
    -   スタンドアロン版: `shared.js` の `CONFIG`（`DEFAULT_INDEX_ID` / `DEFAULT_POS_INDEX` / `DEFAULT_REPOSITORY_URL`）を編集して定義
    -   Chrome拡張版: `options.html` の設定画面で定義し `chrome.storage.local`（`defaultIndexId` / `defaultPosIndex`）に保存。リポジトリURLは OpenSearch 検索のデフォルト値（`defaultRepositoryUrl`）と共用する
    -   `loadConfig()` が `chrome.storage.local` から `CONFIG` へ反映し、`renderSystemFields()`（管理フィールドの初期表示値）・`buildEmptyMetadata()` / `mapToItemType()` / `mapToItemTypeJaLC()`（メタデータ初期値）・`init()`（`#repo-host` のプリフィル、未入力時のみ）に適用する

-   **更新チェック機能**:
    -   ページ読み込み時に GitHub API で `make_jc_importer.html` の最新コミット日を取得し、HTML内の最終更新日（`LOCAL_VERSION`）と比較する
    -   GitHub上の日付が新しい場合、version-info div 内に「更新版があります（日付）」リンクを表示する
    -   オフライン環境やAPI制限時はエラーを表示せず静かに無視する

## フィールドに関する要件

### 取り込み対象外のフィールド

`ItemType.json` のうち以下およびこのKeyを含む下位のフィールドはデータの取り込みや編集の対象としません。

| 表示名（日本語） | key |
|---|---|
| APC | `item_30002_apc5` |
| 学位授与番号 | `item_30002_dissertation_number30` |
| 学位名 | `item_30002_degree_name31` |
| 学位授与機関 | `item_30002_degree_grantor33` |
| 見出し | `item_30002_heading36` |
| 永続識別子（DOI） | `system_identifier_doi` |
| 永続識別子（HDL） | `system_identifier_hdl` |
| 永続識別子（URI） | `system_identifier_uri` |
| ファイル情報 | `system_file` |
| カタログ | `item_1698624004` |
| データセットシリーズ | `item_1698624001` |
| 原文の言語 | `item_1698624002` |
| 大きさ | `item_1698624003` |
| 所蔵機関 | `item_1698624009` |
| 物理的形態 | `item_1698624010` |
| 版 | `item_1698624006` |
| 部編名 | `item_1698624007` |

### 表示しないUIコンポーネント

| 表示名（日本語） | key |
|---|---|
| 著者DBから入力 | `item_30002_creator2[].authorInputButton` / `item_30002_contributor3[].authorInputButton` |

### フィールドごとの要件

-   **権利情報の取り込み**
    -  権利情報（"key": "item_30002_rights6"）は以下のように設定します。
       -   権利情報Resource："key": "item_30002_rights6[].subitem_rights_resource"
           -   Crossref APIから取得した情報のうち、以下を使用します。
           -   JSONpath `message.license[*]["content-version"]` の値が `vor` の場合に、`message.license[*].URL` の値を `ItemType.json`の`item_30002_rights6[].subitem_rights_resource`の値として使用します。
       -   権利情報："key": "item_30002_rights6[].subitem_rights"
           -   Crossref APIから取得した情報のうち、以下を使用します。
           -    `message.assertion[*].label`が"Copyright"の場合は、`ItemType.json`の "item_30002_rights6[].subitem_rights"の値として使用します。
           -    複数ある場合は"item_30002_rights6[].subitem_rights"を繰り返します。
      -    言語："key": "item_30002_rights6[].subitem_rights_language"
           -    常に "en"

-   **関連情報の設定**
    -   関連情報（"key": "item_30002_relation18"）は以下のように設定します。
        -   まずCrossref APIからDOIを取得します。
            -   関連タイプ："key": "item_30002_relation18[].subitem_relation_type"
                -   "value": "isIdenticalTo"
            -   識別子タイプ："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_select"
                -   "value": "DOI"
            -   関連識別子："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_id_text"
                -   https://doi.org/ + message.DOI のvalue (例：https://doi.org/10.1016/j.advnut.2025.100480)
        -   OpenAlex のJSONPATH `ids` に含まれるkeyを確認する。
            -   keyと「関連識別子 統制語彙」の列：識別子とを照合し、一致するデータがある場合に以下の処理を行う。英大文字小文字は大文字に正規化して照合する。key が`DOI` `OpenAlex` は無視して処理しない。以下は `ids.pmid` が存在した場合の例。
            -   関連タイプ："key": "item_30002_relation18[].subitem_relation_type"
                -   "value": "isIdenticalTo"
            -   識別子タイプ："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_select"
                -   "value": `key` と大文字とした値
                -   例：PMID
            -   関連識別子："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_id_text"
                -   `key`に対する `value` の値
                -   例：https://pubmed.ncbi.nlm.nih.gov/40653270
                -   ただし `identifierType` が `PMID` の場合、IRDBは8桁までの数字のみを受け付けるため、PubMed URL プレフィックス（`https://pubmed.ncbi.nlm.nih.gov/`）を除去して番号のみ出力する
        -   Crossref APIの `isbn-type` / `ISBN` フィールドに含まれるISBNを関連情報に追加する（book 系資源タイプ固有）。`isbn-type` が存在する場合は優先し、なければ `ISBN` 配列にフォールバック。
            -   関連タイプ："key": "item_30002_relation18[].subitem_relation_type"
                -   "value": "isIdenticalTo"
            -   識別子タイプ："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_select"
                -   "value": "ISBN"
            -   関連識別子："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_id_text"
                -   ISBN 値
        -   Crossref APIの `relation` フィールドに含まれる関連情報を関連情報に追加する（全資源タイプ共通）。`CROSSREF_RELATION_TYPE_MAP` および `CROSSREF_RELATION_ID_TYPE_MAP` を使用してマッピング。マッピング対象外のrelation type / id-type はスキップする。
            -   関連タイプ："key": "item_30002_relation18[].subitem_relation_type"
                -   `CROSSREF_RELATION_TYPE_MAP` でマッピングした JPCOAR relation type 値
            -   識別子タイプ："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_select"
                -   `CROSSREF_RELATION_ID_TYPE_MAP` でマッピングした JPCOAR identifierType 値
            -   関連識別子："key": "item_30002_relation18[].subitem_relation_type_id.subitem_relation_type_id_text"
                -   Crossref `relation[*][*].id` の値。`id-type` が DOI の場合は `https://doi.org/` プレフィックスを付与してURL形式に統一する。`id-type` が PMID の場合は PubMed URL プレフィックスを除去して番号のみ出力する
            -   関連名称："key": "item_30002_relation18[].subitem_relation_name[]"
                -   `isIdenticalTo` 以外の DOI タイプの関連エントリについて、Crossref API（Crossref DOI の場合）または JaLC API（JaLC DOI の場合）から関連DOIのタイトルを自動取得し設定する
                -   取得失敗時は空配列のまま（silent fail）

**Crossref `relation` フィールドの例**
```json
{
  "relation": {
    "has-preprint": [
      { "id-type": "doi", "id": "10.1101/2025.01.01.000001", "asserted-by": "object" }
    ]
  }
}
```

**OpenAlex のJSONPATH `ids` の例**
```
  "ids": {
    "openalex": "https://openalex.org/W4412424744",
    "doi": "https://doi.org/10.1016/j.advnut.2025.100480",
    "pmid": "https://pubmed.ncbi.nlm.nih.gov/40653270"
  },
```


-   **資源タイプの設定**
    -   資源タイプ（"key": "item_30002_resource_type13"）は以下のように設定します。
        -   資源タイプ："key": "item_30002_resource_type13.resourcetype"
            -   Crossref APIで取得したmessage.type の値を以下の優先順位でJPCOAR 資源タイプに変換する。一致しない場合は空値。
                1. ハイフンをスペースに変換した値が titleMap に一致する場合、その値を使用（例: `journal-article` → `journal article`）
                2. 上記で一致しない場合、`CROSSREF_TYPE_MAP`（`docs/crossref_type_mapping.md` 参照）でルックアップして対応するJPCOAR資源タイプを使用（例: `edited-book` → `book`）
        -   資源タイプ識別子："key": "item_30002_resource_type13.resourceuri"
            -   資源タイプ語彙別表で一致するURLの値。一致しない場合は空値

- **アクセス権の設定**
    - アクセス権（"key": "item_30002_access_rights4"）は以下のように設定します。
        - アクセス権（"key": "item_30002_access_rights4.subitem_access_right"）
            - OAステータスとOPFエンバーゴ情報に基づき `determineAccessRights()` で動的に設定（[#51](https://github.com/tzhaya/jc-import-file-maker/issues/51)）
            - diamond/gold/hybrid/bronze/green: "open access"
            - closed/unknown + OPFエンバーゴあり: "embargoed access"
            - closed/unknown + エンバーゴなし/OPFデータなし: "open access"（機関リポジトリ登録用途を想定）
            - closed/unknown + OPF取得エラー（401/403/429等）: "embargoed access"（エンバーゴの有無を確認できていないため安全側。#229）
            - JaLCパスでも `determineAccessRights()` を使用（OAステータスは空文字）
        - アクセス権URI（"key": "item_30002_access_rights4.subitem_access_right_uri"）
            - アクセス権の値に応じて `ACCESS_RIGHTS_MAP` から自動設定

- **主題の設定**
    - 主題（"key": "item_30002_subject8"）はCrossref API, OpenAlex APIからの取り込みを行いません。
      - OpenAlex APIのkeywordsは独自に付与されたもので、論文に記載された著者キーワードではないためです。
    - ただし、担当者が追加・編集が可能なよう、空のフィールドを準備してください。

- **内容記述の取り込み**
  - 内容記述 ("key": "item_30002_description9") でXMLタグがエスケープされ実体参照がある場合、以下の処理を行ってください。JATSのタグが入っている場合が多いです。
    - 改行コードがある場合は削除する
    - エスケープされた実体参照を解除する
    - 先頭の <jats:title>*</jats:title>は削除して取り込まない
    - <jats:sec>の内側に<jats:title>*</jats:title>がある場合は $1: のような名称+ `: ` に置き換え
      - 例：<jats:title>IMPORTANT</jats:title> → `IMPORTANT: `
    - <jats:sec>の内側にある<jats:p>*</jats:p>を取り込む
    - タグそのものは除去し、取り込み対象としない
    - 半角スペースが連続する場合は一つに置換する

### HTMLページの実装要件

- DOIの入力窓を設けること。DOIは以下のいずれの形式も許容し、`prefix/suffix` の形式に変換して処理すること。
  - `prefix/suffix`
  - `doi:prefix/suffix`
  - `https://doi.org/prefix/suffix`
- `https://doi.org/prefix/suffix` 形式でのリンクを表示し、利用者が参照可能とすること。

### HTMLテーブル の実装要件

- **視覚的階層構造**: インデント、アイコン、左ボーダーで入れ子レベルを表現
- **動的追加・削除**: 各レベルで [ + 追加] / [ − 削除] ボタンを配置
- **展開・折りたたみ**: ユーザーが任意にセクションを展開できる
- **親要素の概要表示**: 親レベルが折りたたまれた時、主要要素の概要を表示（例：著者名、所属機関名）
- **入力参考情報へのリンク**: フィールド名から、JPCOARの説明ページへリンクしてブラウザの別タブで参照可能
  - フィールド名とリンク先URLの対応は `JPCOARスキーマ 項目別説明リンク一覧` を参照してください。
- **システムフィールドの表示と入力**: 以下のシステムフィールドを表示し、設定可能とします。

| フィールド名 | 候補値（参照用）| 値（編集可能）|
|---|---|---|
| **システム（管理フィールド）** | | |
| .id | 新規登録時は空欄 | |
| .uri | 新規登録時は空欄 | |
| .IndexID[0]（.metadata.path[0]）| | |
| .POS_INDEX[0]（.pos_index[0]）| 1718256617194 | 1718256617194 |
| .PUBLISH_STATUS | private（非公開）または public（公開） | private |
| .FEEDBACK_MAIL[0] | | |
| .RESEAECHMAP_LINKAGE | | |
| .CNRI | | |
| .DOI_RA | JaLC または Crossref | |
| .DOI| | |
| Keep/Upgrade Version | Keep または Upgrade  | Keep |
| 公開日（.metadata.pubdate）| YYYY-MM-DD形式の日付 | （実行日の日付を自動設定）|

- **参照用列（ヒントセル）**: APIから取得したデータの元値を、編集可能な入力欄の横に参照情報として表示します。
  - 表示位置: フィールドラベルと入力欄の間（入力欄の左横）
  - 表示対象: APIデータ取得時のテキスト・テキストエリアフィールドで、値が非空のもの
  - 非表示対象: selectフィールド（ドロップダウン自体が値を表示するため）、readonlyフィールド（URI自動連動等）、空値フィールド
  - 長いテキストは省略表示（ellipsis）し、マウスホバーで全文確認可能
  - URL含有時はクリック可能なリンクとして表示
  - 「空値で全フィールド表示」時および [+ 追加] で新規追加した項目には参照値を表示しない
  - 旧ツール（`make_tsv.html`）の「候補値（参照用）」列に相当する機能

### 言語対応

- 多くの名前系フィールド (`affiliationNames[]`, `subitem_funder_names[]` 等) では複数言語対応が必須
- 言語選択ドロップダウンと共に入力可能にする
- API取得時に複数言語バージョンを検出・活用
- 取り込んだデータで言語の情報がない場合は、英語 "en" とみなして言語を設定する。
  - フィールドの値(text)がないのに言語を設定することはありません。この場合は言語を設定しません。
    - 例：サンプルデータでは `item_30002_relation18[0].subitem_relation_name[0].subitem_relation_name_text`がないのに`metadata.item_30002_relation18.attribute_value_mlt[0].subitem_relation_name[0].subitem_relation_name_language`のみ設定されています。この場合は言語の設定を行いません。
    - sample.json にも同パターンがあります。これは誤った入力例です。
  - 自動で設定した場合は、`⚠ 要確認`と表示します。この箇所のtitleを`仮に英語として設定しています。正確か確認してください`として、利用者に注意を喚起します。

### 複数識別子対応

- 所属機関の識別子は複数タイプをサポート (ISNI, ROR, GRID等)
- 識別子タイプがドロップダウンで選択可能
- URI も併せて保存

### 作成者識別子のCiNii対応

- 作成者識別子スキーマで「CiNii」を選択した場合、URIフィールドに `https://ci.nii.ac.jp/nrid/` を自動セットする
- CiNii選択時に「CiNiiで検索」ボタンを表示し、クリックで CiNii Researchers（`https://cir.nii.ac.jp/researchers?q={姓}%20{名}`）を新しいタブで開く
  - 姓名が取得できない場合は著者名（creatorName / contributorName）にフォールバック
- 他のScheme（ORCID等）選択時は検索ボタンを非表示にする

## 複雑な入れ子構造の処理要件

> 記法・データ構造のルールは `attribute_value_mlt.md` を参照。
> このセクションでは各フィールドの具体的なUI実装要件を定義する。

ItemType.json には複数レベルのネスト構造を持つフィールドが存在します。以下のフィールドは最大4段階のネスト構造を実装する必要があります：

### 1. 作成者・寄与者フィールド

**フィールド: `item_30002_creator2[]` / `item_30002_contributor3[]`**

- **Level 1**: 複数作成者 (配列)
- **Level 2**: 
  - `creatorAffiliations[]` - 複数所属機関 (配列) 
- **Level 3**: 
  - `affiliationNames[]` - 複数言語による所属機関名
- **Level 4**: 
 - `affiliationNameIdentifiers[]` - 複数識別子 (ISNI, GRID, ROR等) 
 
**要件**:
- 同一著者の複数所属機関をすべて表示する必要があります
- 所属機関ごとに、複数の識別子と言語別名前をサポートします
- アコーディオンUIにより、著者 → 所属 → 識別子/名前 の階層構造を視覚的に表現します

**実装例**:
```
📦 作成者[0] John Smith [− Delete][+ Add] 
 └─ 📍 作成者所属[0]  [− Delete] [+ Add] 
     ├─📍所属機関名[0][− Delete] [+ Add] 
      　├─ 所属機関名: Massachusetts Institute of Technology ※ror_display名を表示
   　   └─ 言語: en 
     ├─📍所属機関識別子[0][− Delete] [+ Add] 
      　├─ 所属機関識別子Schema: ISNI
   　   └─ 所属機関識別子URI: ISNI IDをURL形式で 
     └─📍所属機関識別子[1][− Delete] [+ Add] 
      　├─ 所属機関識別子Schema: ROR
 　     └─ 所属機関識別子URI: ROR ID 
 └─ 📍 作成者所属[1] Stanford [− Delete] [+ Add]
     ├─📍所属機関名[0][− Delete] [+ Add] 
      　├─ 所属機関名: Stanford University ※ror_display名を表示
   　   └─ 言語: en 
     └─📍所属機関識別子[0][− Delete] [+ Add] 
      　├─ 所属機関識別子Schema: ISNI
 　     └─ 所属機関識別子URI: ISNI IDをURL形式で 
```

### 2. 助成情報フィールド

**フィールド: `item_30002_funding_reference21[]`**

- **Level 1**: 複数助成情報 (配列)
- **Level 2**:
  - `subitem_funder_names[]` - 複数言語による助成機関名
  - `subitem_funder_identifiers` - 助成機関識別子 (単一、`subitem_funder_identifier` / `subitem_funder_identifier_type` / `subitem_funder_identifier_type_uri`)
  - `subitem_funding_stream_identifiers` - プログラム情報識別子（JPCOAR 2.0、単一）
  - `subitem_funding_streams[]` - 複数言語によるプログラム情報（JPCOAR 2.0）
  - `subitem_award_numbers` - 研究課題番号（単一）
  - `subitem_award_titles[]` - 複数言語による研究課題名

**表示順序**: 助成機関識別子 → 助成機関名 → プログラム情報識別子 → プログラム情報 → 研究課題番号 → 研究課題名

**要件**:
- 複数言語バージョンの助成機関名・課題名・プログラム情報をサポート
- アコーディオンUIで複数プログラム情報を管理

**助成機関識別子タイプURI（JPCOAR 2.0 funderIdentifierTypeURI）**（[issue #107](https://github.com/tzhaya/jc-import-file-maker/issues/107)）:
- `subitem_funder_identifier_type_uri`: 識別子タイプに対応するURIを自動設定（読み取り専用テキストフィールド）
- `FUNDER_ID_TYPE_URI_MAP` 定数によるマッピング:
  - `Crossref Funder` → `https://www.crossref.org/services/funder-registry/`
  - `e-Rad_funder` → `https://www.e-rad.go.jp/datasets/files/haibunkikan.csv`
  - `ISNI` → `https://isni.org/`
  - `ROR` → `https://ror.org/`
- 識別子タイプ選択変更時、KAKEN/JGN連携成功時にURIを自動更新
- JPCOAR 2.0 スキーマ: 記入レベルMA（funderIdentifierType設定時は必須）

**プログラム情報（JPCOAR 2.0 fundingStream / fundingStreamIdentifier）**（[issue #34](https://github.com/tzhaya/jc-import-file-maker/issues/34)）:
- `subitem_funding_stream_identifiers`: プログラム情報識別子（単一オブジェクト）
  - `subitem_funding_stream_identifier`: 識別子値
  - `subitem_funding_stream_identifier_type`: 識別子タイプ（`Crossref Funder` / `JGN_fundingStream`）。選択肢の先頭は空項目（未設定）とし、識別子値が空のときは識別子タイプも空のままTSV出力する（既定値 `Crossref Funder` の誤出力を防止、[issue #161](https://github.com/tzhaya/jc-import-file-maker/issues/161)）
  - `subitem_funding_stream_identifier_type_uri`: 識別子タイプURI
- `subitem_funding_streams[]`: プログラム情報（配列、複数言語対応）
  - `subitem_funding_stream`: プログラム情報テキスト
  - `subitem_funding_stream_language`: 言語
- JGN連携成功時: `funding.scheme` からプログラム情報を取得し、課題番号から `JGN_fundingStream` コードを自動抽出して識別子に設定
- KAKENHI課題（`isKakenhi()` 合致）の場合: `KAKENHI_FUNDING_STREAM` 定数（「科学研究費助成事業」(ja) / 「Grants-in-Aid for Scientific Research (KAKENHI)」(en)）を自動設定、識別子は空
- 上記以外: 空配列・空オブジェクトを設定（ユーザーが手動入力可能）

**JGN連携（Crossref JGN API）**:
- award番号が `JP` で始まる場合、Crossref の JGN（Japan Grant Number）API（`https://api.crossref.org/works/10.52926/{award}`）を照会する
- レスポンスが `type: "grant"` の場合のみ処理実行
- `project[0].project-title[].title` を課題名、`.language` を言語として `subitem_award_titles[]` に設定
- `project[0].funding[0].funder` から助成機関名（`.name`）・助成機関識別子（`.id[]` の DOI タイプ）を取得（助成機関名・識別子が空の場合に補完）
- `project[0].funding[0].scheme` からプログラム情報を取得し `subitem_funding_streams[]` に設定
- 課題番号から JGN_fundingStream コードを自動抽出し `subitem_funding_stream_identifiers` に設定
- `https://doi.org/10.52926/{award}` を `subitem_award_uri` に設定
- 404（JGN未登録）の場合は null を返し、KAKEN連携にフォールバック
- JGN連携が成功した場合、KAKEN連携はスキップ
- JSTの体系的番号（`JPMJXXXXXXXX` 形式）が主な対象（JSPS科研費はJGN未登録のためKAKENにフォールバック）

**KAKEN連携（KAKEN XML API + CiNii Research Projects API）**:
- CiNii APIキー設定時: KAKEN XML API（`kaken.nii.ac.jp/opensearch/`）を優先使用
  - 「補助金の研究課題番号」（例: `23H03160`）でも検索可能
  - `normalizedValue` で正規番号（例: `JP23K27850`）に自動解決
  - 補助金番号検出時は警告表示 + 番号を自動修正
- CiNii APIキー未設定時: CiNii Research OpenSearch API（`cir.nii.ac.jp`）にフォールバック（APIキー不要、補助金番号検索は不可）
- 以下のいずれかの条件で KAKEN/CiNii 連携を実行:
  - Crossref の funder DOI が JSPS（`10.13039/501100001691`）
  - 課題番号が科研費パターンに合致（`isKakenhi()`: 2桁年度 + 1〜2桁アルファベット種目コード + 4〜5桁連番、例: `23KF0079`, `21H01234`）
- award番号から `JP` プレフィックスを除去して検索
- 日本語・英語の課題名を取得し、`subitem_award_titles[]` に設定
  - 日英タイトルが同一の場合は日本語のみ設定
- KAKEN 課題ページ URL を `subitem_award_uri` に設定
- KAKEN成功時、助成機関名・識別子が空の場合はJSPS定数で補完
- JSPS以外の funder かつ科研費パターン非該当、award番号が空、またはJGN連携成功済みの場合はKAKEN連携をスキップ

**研究課題番号からの助成機関検索（UI）**:
- 助成情報の研究課題番号入力欄に「助成機関を検索」ボタンを表示
- クリック時: KAKEN XML API → JGN → CiNii Research OpenSearchの順に検索
- 成功時: 助成機関名・助成機関識別子・研究課題名・研究課題番号URIを一括設定
- KAKEN XML/JGN成功時はレスポンス情報、CiNii Research OpenSearch成功時はJSPS固定値を使用
- 補助金番号検出時: 番号を自動修正し警告表示

**識別子からの機関名逆引き（ROR / Crossref Funders API）**:
- 所属機関識別子セクション: Scheme が「ROR」の場合に「名称を確認」ボタンを表示し、URI フィールドの値を使って ROR v2 API から機関名（`ror_display` + `label` タイプ）を取得
- 助成機関識別子セクション: 識別子タイプが「ROR」または「Crossref Funder」の場合に「名称を確認」ボタンを表示し、識別子フィールドの値を使って対応 API から機関名を取得
  - ROR: `https://api.ror.org/v2/organizations/{rorId}` → `ror_display` + `label` タイプの全名称
  - Crossref Funder: `https://api.crossref.org/funders/{doi}` → `name`（`alt-names` は参考表示のみ、上書き対象外）
- 取得結果と現在入力済みの名称を比較し、一致の場合は緑色で「✓ 一致確認」、不一致の場合はオレンジ色で「⚠ 取得:」と名称を表示
- 不一致時は「上書き」ボタンを表示し、クリックすると既存の名称エントリを取得名称で置換（言語タグ付き）
- Scheme / 識別子タイプの変更時にボタン表示を動的更新（ROR/Crossref Funder 以外では非表示）

**NCID自動取得（CiNii Research Books API）**:
- Crossref APIから取得したISSN（PISSN/EISSN）をもとに、CiNii Research OpenSearch API（books）を呼び出してNCID（NACSIS-CAT書誌ID）を自動取得する
- CiNii APIキーは任意（未設定でもAPI呼び出し可能、設定時はレート制限緩和）
- ISSNを順番に試行し、最初にNCIDが見つかった時点で取得完了
- 取得したNCIDを `source_identifier22` に `subitem_source_identifier_type: 'NCID'` として追加
- NCIDの参照欄（ヒントセル）に `https://ci.nii.ac.jp/ncid/{ncid}` へのクリック可能なリンクを表示
- ISSNが存在しない場合やNCIDが見つからない場合はスキップ

### 3. 会議記述フィールド

**フィールド: `item_30002_conference34[]`**

- **Level 1**: 複数会議 (配列)
- **Level 2**:
  - `subitem_conference_names[]` - 複数言語による会議名
  - `subitem_conference_sponsors[]` - 複数主催機関
  - `subitem_conference_venues[]` - 複数開催会場
  - `subitem_conference_places[]` - 複数開催地
