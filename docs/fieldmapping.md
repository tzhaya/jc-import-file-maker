# フィールドマッピング一覧

Crossref / JaLC / OpenAlex / ROR API から取得したデータを、JPCOARスキーマの各フィールドにどのようにマッピングしているかの一覧です。Crossrefパス（`mapToItemType`）とJaLCパス（`mapToItemTypeJaLC`）の2系統があり、DOIのRA（Registration Agency）に応じて自動分岐します。

本ドキュメントではCrossrefパスを中心に記載し、JaLCパス固有の差異は「JaLCパスの差異」セクションにまとめています。

## メインデータソース

| # | JPCOARフィールド | Crossref | OpenAlex | 備考 |
|---|---|---|---|---|
| 1 | **タイトル** (title) | `title[0]` | — | 言語は'en'固定（要確認フラグ付き） |
| 2 | **その他のタイトル** (alternative_title) | — | — | 空（未実装） |
| 3 | **作成者** (creator) | `author[].family`, `author[].given`, `author[].ORCID` | `authorships[].author.display_name`, `authorships[].author.orcid`, `authorships[].institutions[]` | 下記詳細参照 |
| 4 | **寄与者** (contributor) | — | — | 空（未実装） |
| 5 | **アクセス権** (access_rights) | — | `open_access.oa_status` + OPFエンバーゴ | `determineAccessRights()` で動的判定。下記詳細参照 |
| 6 | **権利情報** (rights) | `license[].URL` (VoR優先), `assertion[]` (Copyright) | — | VoRライセンスを優先取得 |
| 7 | **権利者情報** (rights_holder) | — | — | 空（未実装） |
| 8 | **主題** (subject) | — | — | 空（編集可能フィールド） |
| 9 | **内容記述** (description) | `abstract` | — | JATS XMLをクリーニング処理 |
| 10 | **出版者** (publisher) | `publisher` | — | 言語は'en'固定 |
| 11 | **出版者情報** (publisherDetail) | `publisher` | — | JPCOAR 2.0新規（#32）。`item_1698624005`。下記詳細参照 |
| 12 | **日付** (date) | `published-online` → `published-print` → `published` の優先順 | — | ISO 8601形式に変換、タイプ='Issued' |
| 13 | **日付（リテラル）** (dateLiteral) | — | — | JPCOAR 2.0新規（#33）。`item_1698624008`。手動入力用。下記詳細参照 |
| 14 | **言語** (language) | — | — | 'eng'にハードコード |
| 15 | **資源タイプ** (resource_type) | `type` | — | COAR語彙URIにマッピング（74種） |
| 16 | **バージョン情報** (version) | — | — | 空（未実装） |
| 17 | **出版タイプ** (version_type) | — | `open_access.oa_status`, `locations[].version` | `determineVersionInfo()` で判定。`peer_reviewed` サブフィールド追加（#108）。下記詳細参照 |
| 18 | **識別子** (identifier) | — | — | 空（未実装） |
| 19 | **ID登録** (identifier_registration) | — | — | 空（未実装） |
| 20 | **関連情報** (relation) | `DOI` → relationType（OAステータスで判定） | `ids` (ARXIV, PMIDなど、DOI・OPENALEX除外) | 19種の識別子タイプに対応。relationTypeは `determineVersionInfo()` で決定 |
| 21 | **時間的範囲** (temporal) | — | — | 空（未実装） |
| 22 | **位置情報** (geolocation) | — | — | 空（未実装） |
| 23 | **助成情報** (funding_reference) | `funder[].name`, `funder[].DOI`, `funder[].award[]` | — | DOIはURL形式に変換。JGN/KAKEN連携で課題名・URI・プログラム情報を補完（#14, #52）。`funderIdentifierTypeURI` 自動設定（#107） |
| 24 | **収録物識別子** (source_identifier) | `issn-type[].value` / `ISSN[]` | — | electronic→EISSN, print→PISSN |
| 25 | **収録物名** (source_title) | `container-title[0]` | — | 言語は'en'固定 |
| 26 | **巻** (volume) | `volume` | — | 直接マッピング |
| 27 | **号** (issue) | `issue` | — | 直接マッピング |
| 28 | **ページ数** (number_of_pages) | — | — | 空（未実装） |
| 29 | **開始ページ** (page_start) | `page` ('-'で分割、前半) | — | |
| 30 | **終了ページ** (page_end) | `page` ('-'で分割、後半) | — | |
| 31 | **書誌情報** (bibliographic_info) | `container-title`, `volume`, `issue`, `page`, 日付 | — | container-titleがある場合のみ生成 |

### システムフィールド

| フィールド | 初期値 | 備考 |
|---|---|---|
| `publish_status` | `'private'` | |
| `edit_mode` | `'Keep'` | |
| `pubdate` | 当日日付（JST） | |
| `researchmap_linkage` | 空 | WEKO3 v2追加（#108）。手動入力用 |
| その他 (`id`, `uri`, `path` 等) | 空 | |

## 作成者 (Creator) フィールドの詳細マッピング

| サブフィールド | Crossref | OpenAlex | 備考 |
|---|---|---|---|
| **姓** (familyName) | `author[].family` | — | |
| **名** (givenName) | `author[].given` | — | |
| **フルネーム** (creatorName) | family + given から生成 | `authorships[].author.display_name` | |
| **ORCID** | `author[].ORCID` (優先) | `authorships[].author.orcid` (フォールバック) | Crossref優先、なければOpenAlexを使用 |
| **所属機関名** | — | `authorships[].institutions[].display_name` | |
| **ROR ID** | — | `authorships[].institutions[].ror` | ROR v2 APIで詳細取得 |
| **ISNI** | — | — (ROR APIから間接取得) | ROR APIの`external_ids`から抽出 |

### 著者マッチングロジック

Crossrefの著者とOpenAlexの著者の突合は、以下の手順で行われます。

1. Crossrefの`family`名を小文字化し、OpenAlexの`display_name`と比較
2. 一致しない場合はインデックス順でフォールバック

### ORCID取得の優先順位

1. **Crossref** の `author[].ORCID` を優先的に使用
2. Crossrefに存在しない場合、**OpenAlex** の `authorships[].author.orcid` をフォールバックとして使用（警告フラグ `_warnOrcid` 付き）

## アクセス権 (Access Rights) の判定ロジック

`determineAccessRights()` 関数により、OAステータスとOPFエンバーゴ情報から動的に判定します。

| OAステータス | OPFエンバーゴ | アクセス権 |
|---|---|---|
| diamond / gold / hybrid / bronze / green | — | `open access` |
| closed / 不明 | あり（`embargo.amount > 0`） | `embargoed access` |
| closed / 不明 | なし / OPFデータなし | `open access`（IR登録用途を想定） |

## 出版者情報 (Publisher Detail) フィールドの詳細マッピング

JPCOAR 2.0で追加されたフィールド（#32）。プロパティキー: `item_1698624005`。

Crossrefの `publisher` フィールドから出版者名を取得し、4つのサブ配列を持つ構造で格納します。

| サブフィールド | WEKOキー | Crossref | 備考 |
|---|---|---|---|
| **出版者名** | `publisher_names[].publisher_name` | `publisher` | |
| **出版者名 言語** | `publisher_names[].publisher_name_language` | — | 'en'にハードコード |
| **出版者所在地** | `publisher_locations[]` | — | 空（手動入力用） |
| **出版地** | `publication_places[]` | — | 空（手動入力用） |
| **出版者注記** | `publisher_descriptions[]` | — | 空（手動入力用） |

## 日付（リテラル）(Date Literal) フィールドの詳細マッピング

JPCOAR 2.0で追加されたフィールド（#33）。プロパティキー: `item_1698624008`。

ISO 8601形式以外の日付文字列を記録するためのフィールドです。APIからは自動取得されず、手動入力用です。

| サブフィールド | WEKOキー | 備考 |
|---|---|---|
| **日付（リテラル）** | `subitem_dcterms_date` | 自由形式の日付文字列 |
| **言語** | `subitem_dcterms_date_language` | 言語選択 |

## 助成情報 (Funding Reference) フィールドの詳細マッピング

Crossrefの `funder[]` 配列から助成情報を構築します。1つのfunderに複数のawardがある場合、各awardごとに同一funder情報を持つエントリを生成します（`flatMap`で展開）。

### 助成情報マッピング

| サブフィールド | WEKOキー | Crossref | 備考 |
|---|---|---|---|
| **助成機関名** | `subitem_funder_names[].subitem_funder_name` | `funder[].name` | 言語は'en'固定 |
| **助成機関名 言語** | `subitem_funder_names[].subitem_funder_name_language` | — | 'en'にハードコード |
| **助成機関識別子** | `subitem_funder_identifiers.subitem_funder_identifier` | `funder[].DOI` | `https://doi.org/{DOI}` 形式に変換 |
| **助成機関識別子タイプ** | `subitem_funder_identifiers.subitem_funder_identifier_type` | — | DOIがある場合 'Crossref Funder'、なければ空 |
| **助成機関識別子タイプURI** | `subitem_funder_identifiers.subitem_funder_identifier_type_uri` | — | `FUNDER_ID_TYPE_URI_MAP` で自動設定（#107）。下記参照 |
| **研究課題番号** | `subitem_award_numbers.subitem_award_number` | `funder[].award[]` | 各awardごとに1エントリ生成 |
| **研究課題番号タイプ** | `subitem_award_numbers.subitem_award_number_type` | — | 空（未使用） |
| **研究課題番号URI** | `subitem_award_numbers.subitem_award_uri` | JGN: `https://doi.org/10.52926/{番号}` / KAKEN: CiNii Research URL | JGN/KAKEN連携で設定（#14, #2） |
| **プログラム情報** | `subitem_funding_streams[].subitem_funding_stream` | JGN: `funding.scheme` / KAKEN: 科学研究費助成事業（定数、日英） | JGN/KAKEN連携で取得（#14, #52） |
| **プログラム情報 言語** | `subitem_funding_streams[].subitem_funding_stream_language` | JGN: 空 / KAKEN: ja/en | JPCOAR 2.0（#34） |
| **プログラム情報識別子** | `subitem_funding_stream_identifiers.subitem_funding_stream_identifier` | JGN: 課題番号から自動抽出 | `/^JP([A-Z]+)\d/i` で JGN_fundingStream コード抽出（#56） |
| **プログラム情報識別子タイプ** | `subitem_funding_stream_identifiers.subitem_funding_stream_identifier_type` | JGN: `JGN_fundingStream` | fundingStreamId が存在する場合に設定 |
| **プログラム情報識別子タイプURI** | `subitem_funding_stream_identifiers.subitem_funding_stream_identifier_type_uri` | — | 空（未実装） |
| **研究課題名** | `subitem_award_titles[].subitem_award_title` | JGN: `project-title` / KAKEN: CiNii Research API | JGN/KAKEN連携で取得（#14, #2） |
| **研究課題名 言語** | `subitem_award_titles[].subitem_award_title_language` | JGN/KAKEN: 空 | 言語自動判定なし |

### 助成機関識別子の変換ロジック

| 条件 | 識別子値 | 識別子タイプ | 識別子タイプURI |
|---|---|---|---|
| `funder[].DOI` が存在する | `https://doi.org/{funder.DOI}` | `Crossref Funder` | `https://www.crossref.org/services/funder-registry/` |
| `funder[].DOI` が存在しない | 空文字 | 空文字 | 空文字 |

### 助成機関識別子タイプURI マッピング（JPCOAR 2.0）

`FUNDER_ID_TYPE_URI_MAP` 定数により、識別子タイプからURIを自動設定します（#107）。

| 識別子タイプ | URI |
|---|---|
| `Crossref Funder` | `https://www.crossref.org/services/funder-registry/` |
| `e-Rad_funder` | `https://www.e-rad.go.jp/datasets/files/haibunkikan.csv` |
| `ISNI` | `https://isni.org/` |
| `ROR` | `https://ror.org/` |

### 研究課題番号の取得

- Crossrefの `funder[].award` は配列形式（1つの助成機関に複数の課題番号がある場合がある）
- `flatMap` により各awardごとに同一funder情報（名前・DOI）を持つエントリを展開
- awardが0件の場合は空awardで1エントリを生成

### Crossref APIレスポンス例

```json
{
  "funder": [
    {
      "DOI": "10.13039/100000002",
      "name": "National Institutes of Health",
      "doi-asserted-by": "publisher",
      "award": ["R01DK123456"],
      "id": [{"id": "10.13039/100000002", "id-type": "DOI", "asserted-by": "publisher"}]
    }
  ]
}
```

### 生成されるWEKOデータ構造例

```json
{
  "subitem_funder_names": [
    { "subitem_funder_name": "National Institutes of Health", "subitem_funder_name_language": "en" }
  ],
  "subitem_funder_identifiers": {
    "subitem_funder_identifier": "https://doi.org/10.13039/100000002",
    "subitem_funder_identifier_type": "Crossref Funder"
  },
  "subitem_award_numbers": {
    "subitem_award_number": "R01DK123456",
    "subitem_award_number_type": "",
    "subitem_award_uri": ""
  },
  "subitem_award_titles": []
}
```

## 出版タイプ (Version Type) の判定ロジック

`determineVersionInfo()` 関数により、OpenAlexのOAステータスとlocation情報から出版タイプとrelationTypeを判定します。

### OAステータス別判定

| OAステータス | 出版タイプ | relationType | COAR URI |
|---|---|---|---|
| diamond / gold / hybrid / bronze | VoR (Version of Record) | isIdenticalTo | `http://purl.org/coar/version/c_970fb48d4fbd8a85` |
| green / closed | OpenAlexの `locations[].version` で判定（下表参照） | — | — |

### Green/Closed時のversion判定

| OpenAlex `version` | 出版タイプ | relationType |
|---|---|---|
| `publishedVersion` | VoR | isIdenticalTo |
| `acceptedVersion` | AM (Accepted Manuscript) | isVersionOf |
| `submittedVersion` | SMUR (Submitted Manuscript Under Review) | isVersionOf |
| その他 / 不明 | AM（デフォルト） | isVersionOf |

### peer_reviewed サブフィールド（JPCOAR 2.0 / #108）

出版タイプフィールドに `subitem_peer_reviewed` サブフィールドが追加されています。APIからは自動設定されず、手動で以下の値を選択します。

| 選択肢 |
|---|
| （空） |
| `Peer reviewed` |
| `Not peer reviewed` |

## 関連情報 (Relation) の対応識別子タイプ

OpenAlexの `ids` オブジェクトから取得する際、以下の識別子タイプが有効として認識されます（DOIとOPENALEXは除外）。

| 識別子タイプ |
|---|
| ARK, ARXIV, DOI, HDL, ICHUSHI, ISBN, J-GLOBAL, LOCAL, PISSN, EISSN, ISSN, NAID, NCID, PMID, PURL, SCOPUS, URI, WOS |

## 特殊な変換処理

### JATS Abstract クリーニング（内容記述）

Crossrefの `abstract` フィールドに含まれるJATS XMLを以下の手順でプレーンテキストに変換します。

1. 改行を除去
2. HTMLエンティティをアンエスケープ (`&lt;`, `&gt;`, `&amp;`, `&apos;`, `&quot;`)
3. 先頭の `<jats:title>...</jats:title>` を除去
4. `<jats:sec>` 内の `<jats:title>` を "TITLE: " 形式に変換
5. 残りのXMLタグをすべて除去
6. 連続する空白を1つに集約し、前後の空白をトリム

### 日付変換（日付フィールド）

Crossrefの `date-parts` 配列をISO 8601形式に変換します。取得優先順位:

1. `published-online.date-parts[0]`
2. `published-print.date-parts[0]`
3. `published.date-parts[0]`

| date-parts要素数 | 出力例 |
|---|---|
| 3要素 (年, 月, 日) | `2024-03-15` |
| 2要素 (年, 月) | `2024-03` |
| 1要素 (年) | `2024` |

### 収録物識別子のタイプ変換

| Crossref `issn-type[].type` | JPCOARタイプ |
|---|---|
| `electronic` | EISSN |
| `print` | PISSN |
| その他 | ISSN |

## 外部API連携

| API | エンドポイント | 用途 | CORS制約 |
|---|---|---|---|
| **DOI RA** | `https://doi.org/doiRA/{DOI}` | Registration Agency判定（Crossref/JaLC分岐） | なし |
| **Crossref** | `https://api.crossref.org/works/{DOI}` | 書誌データの主要ソース | なし |
| **OpenAlex** | `https://api.openalex.org/works/doi:{DOI}` | 著者所属・OA情報の補完 | なし |
| **ROR v2** | `https://api.ror.org/v2/organizations/{ror_id}` | 機関名・ISNI情報の取得（並列フェッチ） | なし |
| **JaLC** | `https://api.japanlinkcenter.org/v2/dois/{DOI}` | JaLC DOIの書誌データ取得 | あり（拡張のみ） |
| **KAKEN XML** | `https://kaken.nii.ac.jp/opensearch/` | 科研費情報取得（補助金番号→正規番号解決） | あり（拡張のみ） |
| **CiNii Research** | `https://cir.nii.ac.jp/opensearch/v2/projects` | KAKEN情報フォールバック・NCID取得 | なし |
| **Crossref JGN** | `https://api.crossref.org/works/10.52926/{award}` | Japan Grant Number連携（課題名・URI・プログラム情報） | なし |
| **OPF** | Open Policy Finder API | SHERPA/RoMEO OAポリシー・エンバーゴ情報 | あり（拡張のみ） |
| **GitHub** | `https://api.github.com/repos/.../commits` | 更新チェック | なし |

※ CORS制約「あり」のAPIはChrome拡張版でのみ利用可能（HTML版では非対応）。

## JaLCパスの差異

RA判定でJaLCと判定されたDOIは、`mapToItemTypeJaLC()` / `buildJaLCAuthors()` / `buildJaLCFunders()` で処理されます。Crossrefパスとの主な差異は以下の通りです。

### 作成者 (buildJaLCAuthors vs buildAuthors)

| 観点 | Crossrefパス | JaLCパス |
|---|---|---|
| **名前** | 単一言語（family + given） | 多言語（`names[]` 配列、`lang` フィールド） |
| **言語** | 'en'固定（`_warnLang` フラグ付き） | JaLC `names[].lang` をそのまま使用 |
| **所属** | OpenAlex `institutions[]` → ROR API並列フェッチ | JaLC `affiliation_list` から直接取得 |
| **ROR/ISNI** | ROR API経由で取得 | `affiliation_identifier_list` から type で判別（ROR/ISNI/GRID/WIKIDATA） |
| **識別子** | ORCIDのみ | ORCID + e-Rad（researcher ID） |

### 助成情報 (buildJaLCFunders vs buildFunders)

| 観点 | Crossrefパス | JaLCパス |
|---|---|---|
| **助成機関名** | 単一言語（'en'） | 多言語（`funder_name[]` の `lang` を使用） |
| **助成機関識別子** | `funder[].DOI` から直接取得 | `funder_identifier_list` から FundRef タイプのDOIを正規表現抽出 |
| **研究課題番号** | 各awardを個別処理 | カンマ区切り（`,` / `、`）を分割して個別処理 |

## TSVプロパティキーの命名規則

助成情報フィールドのTSVキー構造（`subitem_award_numbers`, `subitem_funder_identifiers` 等）の詳細は [weko3_property_key_naming.md](weko3_property_key_naming.md) を参照。

- 2行目（プロパティキー）と3行目（日本語ラベル）の全14列の対応表
- 配列フィールドとオブジェクトフィールドの区別
- リポジトリ間でのプレフィックスの違い（`item_30002_funding_reference21` vs `item_1708699025255` 等）
