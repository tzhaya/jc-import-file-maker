# `JAIRO Cloud インポート用TSV生成ツール` 作成要件

## ファイル名

make_jc_importer.html

## このツールの目的

このドキュメントは、`JAIRO Cloud インポート用TSV生成ツール`  を作成するための要件を記述します。本ツールは、DOI (Digital Object Identifier) を入力として受け取り、CrossrefおよびOpenAlex APIから書誌情報を取得し、JAIRO Cloudへのインポートに適した表形式で表示することと、TSV形式のデータを生成することを目的としています。

## 技術詳細と依存関係

**フロントエンド技術**: HTML5, CSS3, JavaScript
**外部API**:
    -   DOI RA判定 API (`https://doi.org/doiRA/`)
    -   Crossref API (`https://api.crossref.org/works/`)
    -   OpenAlex API (`https://api.openalex.org/works/`)
    -   ROR API (`https://api.ror.org/v2/organizations/`)
    -   CiNii Research Projects API (`https://cir.nii.ac.jp/opensearch/v2/projects`)
    -   CiNii Research Books API (`https://cir.nii.ac.jp/opensearch/v2/books`)
       
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

**JPCOARスキーマ 項目別説明リンク一覧**
    - `JPCOARschme_guide.md`

**アクセス権 統制語彙**
    - `accessrights.md`

**関連識別子 統制語彙**
    - `relatedIdentifier.md`

### JAIRO Cloud関係データ

**データマッピングサンプルデータ**
    `sample.json` 

**TSVヘッダー定義**
    - `tsv_headers.json`
    - TSVヘッダーは特定のJAIRO Cloudアイテムタイプ（国際農研デフォルトアイテムタイプ）に対応するように構成されます。

### 外部API サンプルデータ

**サンプルデータ crossref データ**
    `j.advnut.2025.100480.json`

**サンプルデータ DOI**
    `https://doi.org/10.1016/j.advnut.2025.100480`

**OpenAlex API 論文(Work)サンプルデータ**
    - `openalex.org_W4412424744.json`

**OpenAlex API 著者(author)サンプルデータ**
    - `openalex.org_a5000546253.json`

**ROR サンプルデータ**
    - `ror.org_005pdtr14.json`

## 主要機能

-   **DOIからのデータ取得**:
    -   入力されたDOIに基づき、まず `https://doi.org/doiRA/{DOI}` APIでDOIの登録機関（Registration Authority）を判定します。
        -   DOIが存在しない場合はエラーメッセージを表示し、処理を中断します。
        -   登録機関が **Crossref** の場合：Crossref および OpenAlex APIから論文のメタデータを取得します。
        -   登録機関が **JaLC** の場合：未対応メッセージを表示します（今後対応予定）。
        -   その他の登録機関（DataCite等）の場合：サポート外メッセージを表示します。
    -   Crossref APIで得られる内容（例：`j.advnut.2025.100480.json`）を`ItemType.json`の構造に変更します。マッピングの例は  `sample.json` です。
-   **ROR/ISNI情報との連携**
    -   OpenAlexから取得したROR IDを基に、ROR v2 APIを介してISNI情報を取得し、所属機関の識別子として活用します。
    -   所属機関名として、ROR v2 APIから得られる情報のうち "types" が ["ror_display"] に該当する要素のlabelを使用します。 
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
  
-   **入力支援**: 
    -   `fields.md` で列titleMapが「あり」のフィールドは、選択肢が用意されているフィールドです。
    -   選択肢は `ItemType.json` のうち"key" に対するtitleMapの配列の name と value で定義されています。
    -   選択式の項目は select メニューで選択できます。
    -   フィールド：資源タイプは「資源タイプ語彙別表」に基づき資源タイプを選択すると、該当する資源タイプURIが自動設定されます。
    -   フィールド：アクセス権は「アクセス権 統制語彙」に基づきアクセス権を選択すると、該当するアクセス権URIが自動設定されます。
      
-   **TSVダウンロード**: 
    -   編集されたメタデータをUTF-8 BOM付きのTSVファイルとしてダウンロードします。TSVヘッダーは特定のJAIRO Cloudアイテムタイプ（国際農研デフォルトアイテムタイプ）に対応するように構成されます。

-   **Open Accessステータスの表示**: 
    -   OpenAlexから取得した論文のOpen Accessステータスをバッジ形式で表示します。

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
| 日付（リテラル） | `item_1698624008` |
| 所蔵機関 | `item_1698624009` |
| 物理的形態 | `item_1698624010` |
| 版 | `item_1698624006` |
| 部編名 | `item_1698624007` |
| 出版者情報 | `item_1698624005` |

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
            -   Crossref APIで取得したmessage.type の value の値と、"key": "item_30002_resource_type13.resourcetype" の titleMap に定義されたいずれかの value と一致する場合にその値。ハイフンは空白に置き換えてかまわない。一致しない場合は空値
        -   資源タイプ識別子："key": "item_30002_resource_type13.resourceuri"
            -   資源タイプ語彙別表で一致するURLの値。一致しない場合は空値

- **アクセス権の設定**
    - アクセス権（"key": "item_30002_access_rights4"）は以下のように設定します。
        - アクセス権（"key": "item_30002_access_rights4.subitem_access_right"）
            - 常に "open access"
        - アクセス権URI（"key": "item_30002_access_rights4.subitem_access_right_uri"）
            - 常に "http://purl.org/coar/access_right/c_abf2"

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
  - `subitem_funder_identifiers` - 助成機関識別子 (単一)
  - `subitem_funding_streams[]` - 複数プログラム名
  - `subitem_award_titles[]` - 複数言語による研究課題名

**要件**:
- 複数言語バージョンの助成機関名・課題名をサポート
- アコーディオンUIで複数プログラム情報を管理

**KAKEN連携（CiNii Research Projects API）**:
- Crossref の funder 情報に JSPS（日本学術振興会、funder DOI: `10.13039/501100001691`）が含まれる場合、CiNii Research Projects API を使って科研費の課題名と KAKEN 課題ページ URL を自動取得する
- CiNii APIキー（`CONFIG.CiNii_API_KEY`）が設定されている場合のみ有効
- award番号から `JP` プレフィックスを除去して CiNii API の `projectId` パラメータに使用
- 日本語・英語の課題名を並列取得し、`subitem_award_titles[]` に設定
  - 日英タイトルが同一の場合は日本語のみ設定
- KAKEN 課題ページ URL を `subitem_award_uri` に設定
- CiNii API がエラーの場合は警告のみ出力し、Crossref データを保持（フォールバック）
- CiNii APIキー未設定、JSPS以外の funder、award番号が空の場合はKAKEN連携をスキップ

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



