# フィールドマッピング一覧

Crossref / OpenAlex / ROR API から取得したデータを、JPCOARスキーマの各フィールドにどのようにマッピングしているかの一覧です。

## メインデータソース

| # | JPCOARフィールド | Crossref | OpenAlex | 備考 |
|---|---|---|---|---|
| 1 | **タイトル** (title) | `title[0]` | — | 言語は'en'固定（要確認フラグ付き） |
| 2 | **その他のタイトル** (alternative_title) | — | — | 空（未実装） |
| 3 | **作成者** (creator) | `author[].family`, `author[].given`, `author[].ORCID` | `authorships[].author.display_name`, `authorships[].author.orcid`, `authorships[].institutions[]` | 下記詳細参照 |
| 4 | **寄与者** (contributor) | — | — | 空（未実装） |
| 5 | **アクセス権** (access_rights) | — | — | 'open access'にハードコード |
| 6 | **権利情報** (rights) | `license[].URL` (VoR優先), `assertion[]` (Copyright) | — | VoRライセンスを優先取得 |
| 7 | **権利者情報** (rights_holder) | — | — | 空（未実装） |
| 8 | **主題** (subject) | — | — | 空（編集可能フィールド） |
| 9 | **内容記述** (description) | `abstract` | — | JATS XMLをクリーニング処理 |
| 10 | **出版者** (publisher) | `publisher` | — | 言語は'en'固定 |
| 11 | **日付** (date) | `published-online` → `published-print` → `published` の優先順 | — | ISO 8601形式に変換、タイプ='Issued' |
| 12 | **言語** (language) | — | — | 'eng'にハードコード |
| 13 | **資源タイプ** (resource_type) | `type` | — | COAR語彙URIにマッピング（50種以上） |
| 14 | **バージョン情報** (version) | — | — | 空（未実装） |
| 15 | **出版タイプ** (version_type) | — | `open_access.is_oa`, `open_access.oa_status` | Gold/Hybrid→VoR、それ以外→AM |
| 16 | **識別子** (identifier) | — | — | 空（未実装） |
| 17 | **ID登録** (identifier_registration) | — | — | 空（未実装） |
| 18 | **関連情報** (relation) | `DOI` → 'isIdenticalTo' | `ids` (ARXIV, PMIDなど、DOI・OPENALEX除外) | 19種の識別子タイプに対応 |
| 19 | **時間的範囲** (temporal) | — | — | 空（未実装） |
| 20 | **位置情報** (geolocation) | — | — | 空（未実装） |
| 21 | **助成情報** (funding_reference) | `funder[].name`, `funder[].DOI`, `funder[].award[]` | — | DOIはURL形式に変換 |
| 22 | **収録物識別子** (source_identifier) | `issn-type[].value` / `ISSN[]` | — | electronic→EISSN, print→PISSN |
| 23 | **収録物名** (source_title) | `container-title[0]` | — | 言語は'en'固定 |
| 24 | **巻** (volume) | `volume` | — | 直接マッピング |
| 25 | **号** (issue) | `issue` | — | 直接マッピング |
| 26 | **ページ数** (number_of_pages) | — | — | 空（未実装） |
| 27 | **開始ページ** (page_start) | `page` ('-'で分割、前半) | — | |
| 28 | **終了ページ** (page_end) | `page` ('-'で分割、後半) | — | |
| 29 | **書誌情報** (bibliographic_info) | `container-title`, `volume`, `issue`, `page`, 日付 | — | container-titleがある場合のみ生成 |

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

## 助成情報 (Funding Reference) フィールドの詳細マッピング

Crossrefの `funder[]` 配列から助成情報を構築します。1つのfunderに複数のawardがある場合、各awardごとに同一funder情報を持つエントリを生成します（`flatMap`で展開）。

### 助成情報マッピング

| サブフィールド | WEKOキー | Crossref | 備考 |
|---|---|---|---|
| **助成機関名** | `subitem_funder_names[].subitem_funder_name` | `funder[].name` | 言語は'en'固定 |
| **助成機関名 言語** | `subitem_funder_names[].subitem_funder_name_language` | — | 'en'にハードコード |
| **助成機関識別子** | `subitem_funder_identifiers.subitem_funder_identifier` | `funder[].DOI` | `https://doi.org/{DOI}` 形式に変換 |
| **助成機関識別子タイプ** | `subitem_funder_identifiers.subitem_funder_identifier_type` | — | DOIがある場合 'Crossref Funder'、なければ空 |
| **助成機関識別子タイプURI** | `subitem_funder_identifiers.subitem_funder_identifier_type_uri` | — | 空（未使用） |
| **研究課題番号** | `subitem_award_numbers.subitem_award_number` | `funder[].award[]` | 各awardごとに1エントリ生成 |
| **研究課題番号タイプ** | `subitem_award_numbers.subitem_award_number_type` | — | 空（未使用） |
| **研究課題番号URI** | `subitem_award_numbers.subitem_award_uri` | — | 空（未使用） |
| **プログラム情報** | `subitem_funding_streams` | — | 空（未実装） |
| **プログラム情報識別子** | `subitem_funding_stream_identifiers` | — | 空（未実装） |
| **研究課題名** | `subitem_award_titles.subitem_award_title` | — | 空（Crossrefに課題名なし） |
| **研究課題名 言語** | `subitem_award_titles.subitem_award_title_language` | — | 空（Crossrefに課題名なし） |

### 助成機関識別子の変換ロジック

| 条件 | 識別子値 | 識別子タイプ |
|---|---|---|
| `funder[].DOI` が存在する | `https://doi.org/{funder.DOI}` | `Crossref Funder` |
| `funder[].DOI` が存在しない | 空文字 | 空文字 |

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

OpenAlexの `open_access` フィールドを使用して判定します。

| 条件 | 出版タイプ | COAR URI |
|---|---|---|
| `is_oa === true` かつ `oa_status === 'gold'` または `'hybrid'` | VoR (Version of Record) | `http://purl.org/coar/version/c_970fb48d4fbd8a85` |
| 上記以外 | AM (Accepted Manuscript) | `http://purl.org/coar/version/c_ab4af688f83e57aa` |

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

| API | エンドポイント | 用途 |
|---|---|---|
| **Crossref** | `https://api.crossref.org/works/{DOI}` | 書誌データの主要ソース |
| **OpenAlex** | `https://api.openalex.org/works/doi:{DOI}` | 著者所属・OA情報の補完 |
| **ROR v2** | `https://api.ror.org/v2/organizations/{ror_id}` | 機関名・ISNI情報の取得（並列フェッチ） |
