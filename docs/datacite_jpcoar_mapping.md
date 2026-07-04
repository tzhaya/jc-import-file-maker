# DataCite → JPCOAR マッピング表

作成日: 2026-07-03（#197）

DataCite REST API のメタデータを JPCOAR スキーマ／本ツールのフィールドへ対応付けるための設計文書です。コード実装（#208）の仕様書として機能します。表形式は [fieldmapping.md](fieldmapping.md)・[crossref_type_mapping.md](crossref_type_mapping.md) に準拠しています。

- 語彙・値一覧は **DataCite Metadata Schema 4.7** を基準とする（レスポンスには登録時スキーマの混在があるため、旧値も受ける前提で設計）
- 対応先は本ツールの `TITLE_MAPS`（make_jc_importer.html）に存在する語に限定する

## 1. API 仕様（実測確認済み）

| 項目 | 内容 |
|---|---|
| エンドポイント | `https://api.datacite.org/dois/{doi}` |
| **取得 URL 基本形（#208）** | `https://api.datacite.org/dois/{DOI}?publisher=true&affiliation=true` |
| 認証 | 不要（Public API） |
| CORS | **対応**（`Access-Control-Allow-Origin` が Origin をエコーバックすることを実測確認）。標準版・Chrome拡張版とも `extensionFetch()` 不要で直接 fetch 可能 |
| レスポンス形式 | JSON:API。メタデータ本体は `data.attributes` |
| 404 | DOI 未登録時。`errors` 配列が返る |

クエリパラメータの効果（実測）:

- `publisher=true`: `publisher` が文字列 → `{ name, lang?, publisherIdentifier? }` のオブジェクトに変わる
- `affiliation=true`: `creators[].affiliation` が文字列配列 → `{ name, affiliationIdentifier?, affiliationIdentifierScheme? }` のオブジェクト配列に変わる

## 2. 国内機関リポジトリ由来 DOI の切り分け（調査結果）

JaLC 準会員（NII/IRDB 経由）・JaLC コンソーシアム（`jalcco`）経由で **DataCite に登録された国内 DOI が実在**する。いずれも `doi.org/doiRA` は **"DataCite"** を返すため、本ツールでは DataCite 分岐で処理でき、JaLC 分岐と競合しない。

| 経路 | プレフィックス例 | DataCite client | 件数（2026-07 時点） |
|---|---|---|---|
| NII 準会員（IRDB経由） | `10.57723` | kyotou.kyotou（京都大学） | 97 |
| NII 準会員（IRDB経由） | `10.48708` | kyushuu.kyushuu（九州大学） | 240 |
| NII 準会員（IRDB経由） | `10.60574` | osakau.osakau（大阪大学） | 105 |
| jalcco コンソーシアム | `10.17596` | jamstec.jamstec（JAMSTEC） | 4,238 |
| jalcco コンソーシアム | `10.57746` 等 | jaxa 等 | 1,259（JAXA） |

- コンソーシアム `jalcco` 配下は京大・九大・阪大・産総研・極地研・国環研・筑波大CCS・DIAS・JAXA・JAMSTEC の10機関。探索は `providers?consortium-id=jalcco` → 各 `provider-id` で可能
- IRDB 経由のレコードは `identifiers` に `oai:irdb.nii.ac.jp:...`（identifierType: OAIPMH）を持つ
- 国内レコードの特徴: `nameIdentifiers` に **`e-Rad_Researcher` / `NRID`** が入る（本ツールの `nameIdentifierScheme` select に両方とも収載済みでそのまま対応可能）

## 3. テスト用 DOI 一覧（#208 の E2E テスト用）

| DOI | カテゴリ | 検証ポイント |
|---|---|---|
| `10.57723/kds622523` | 国内・Dataset（京大） | publisher オブジェクト（lang付き）・rightsList 4件（日英・SPDX/CC）・subjects lang付き・Issued+Submitted 複数日付 |
| `10.48708/7432637` | 国内・Dataset（九大） | フランス語（`language: "fr"`・title/subjects lang="fr"）・e-Rad_Researcher 識別子 |
| `10.60574/104682` | 国内・Dataset（阪大） | 年のみの Issued（`"2026"`）・Available との複数日付・publisher が個人名・NRID+ORCID |
| `10.17596/0004197` | 国内・Text（JAMSTEC） | `dates` が空（publicationYear フォールバック必須）・resourceType 自由記述 "Cruise report"・geoLocations あり・IsPartOf 関連 |
| `10.5281/zenodo.3242074` | Software（Zenodo） | titles/descriptions に lang なし・language null・IsVersionOf/IsSourceOf 関連 |
| `10.48550/arXiv.2212.04356` | Preprint（arXiv） | 日付4種（Submitted/Updated/Available/Issued）・タイムスタンプ形式（`2022-12-06T18:46:04Z`）・alternateIdentifier arXiv |
| `10.25656/01:35728` | JournalArticle（独・機関リポジトリ） | **relatedItems に雑誌書誌**（誌名/ISSN/巻/号/頁）・container に ISSN/巻号頁（誌名なし）・ORCID が bare 形式 |

実レスポンスの保存例: [samples/DataCite/](../samples/DataCite/)

## 4. フィールドマッピング表（`data.attributes` → JPCOAR）

`—` は対象外（右端に理由）。行番号は [fieldmapping.md](fieldmapping.md) の JPCOAR フィールド番号に対応。

| # | JPCOARフィールド | DataCite (attributes) | 備考（Crossref/JaLC パスとの差異・設計判断） |
|---|---|---|---|
| 1 | **タイトル** (title) | `titles[]`（`titleType` なしの要素） | `lang` 付き多言語（JaLC 同様）。`lang` なしは 'en' 既定＋要確認フラグ（Crossref 同様） |
| 2 | **その他のタイトル** (alternative_title) | `titles[]`（`titleType` あり: AlternativeTitle / Subtitle / TranslatedTitle / Other） | Crossref/JaLC パスでは未実装。DataCite パスで新規に対応 |
| 3 | **作成者** (creator) | `creators[]` | 詳細は §5。`nameType: "Organizational"` は `creatorNameType` の 'Organizational' へ（姓名分離せず） |
| 4 | 寄与者 (contributor) | — `contributors[]` | **自動マッピング対象外**（初期実装のスコープ限定）。ツール UI には寄与者フィールドの定義・レンダラーが存在する（make_jc_importer.html L3473 付近。fieldmapping.md #4 の「空（未実装）」は「API からの自動設定が無い」の意）。DataCite では HostingInstitution 等が埋まる例があり拡張は可能。その際 contributorType 22値中 RegistrationAgency / RegistrationAuthority / RightsHolder / Translator の4値がツール select に無い点に注意 |
| 5 | アクセス権 (access_rights) | —（既定値） | OpenAlex 連携なしのため自動判定しない（JaLC パス同様）。`open access` を既定とし手動修正 |
| 6 | **権利情報** (rights) | `rightsList[]` | 詳細は §9。`rightsUri` → 既存 `detectLicenseType()` を再利用（CC の deed.ja / legalcode 付き URI も前方一致で判定可能なことを実データで確認） |
| 8 | **主題** (subject) | `subjects[]` | `subject` + `lang`。`subjectScheme` はツール上 'Other' 扱い（arXiv 等の独自 scheme があるため） |
| 9 | **内容記述** (description) | `descriptions[]` | `descriptionType`: Abstract / Methods / TableOfContents / TechnicalInfo / Other は同名で対応。**SeriesInformation は破棄**（書誌情報であり内容記述でない）。JATS クリーニング不要（プレーンテキスト） |
| 10 | **出版者** (publisher) | `publisher.name`（`?publisher=true` 時） | `lang` があれば言語に使用（実測: 京大 'en'）。なければ 'en' 既定。**個人名が入るケースあり**（実測: 阪大）— そのまま取り込み手動修正に委ねる |
| 11 | **出版者情報** (publisherDetail) | `publisher.name` | Crossref パス同様に出版者名のみ設定 |
| 12 | **日付** (date) | `dates[]` + `publicationYear` | **複数エントリ保持**。詳細は §8 |
| 14 | **言語** (language) | `language` | xs:language → 639-2/T へ正規化。詳細は §10 |
| 15 | **資源タイプ** (resource_type) | `types.resourceTypeGeneral` | **全34値の対応表は §6**。PascalCase → 小文字スペース区切りの正規化 |
| 16 | **バージョン情報** (version) | `version` | Crossref/JaLC パスは未実装だが DataCite では頻出（実測: Zenodo "v1.0.0"）。文字列をそのまま設定 |
| 17 | 出版タイプ (version_type) | —（既定値） | OpenAlex 連携なしのため自動判定しない（JaLC パス同様） |
| 20 | **関連情報** (relation) | 自DOI + `relatedIdentifiers[]` | 自DOI は isIdenticalTo で登録（既存パス同様）。`relationType` 対応は §7-1、`relatedIdentifierType` 対応は §7-2 |
| 23 | **助成情報** (funding_reference) | `fundingReferences[]` | 詳細は §11。JGN/KAKEN 連携を再利用 |
| 24 | **収録物識別子** (source_identifier) | `relatedItems[].relatedItemIdentifier`（ISSN/EISSN/PISSN）、補助的に `container.identifier` | 詳細は §12 |
| 25 | **収録物名** (source_title) | `relatedItems[].titles.title` | **container.title は実データでほぼ空**（§12）。relatedItems を主ソースとする |
| 26-30 | **巻・号・開始/終了ページ** | `relatedItems[]`（volume / issue / firstPage / lastPage）→ フォールバック `container` | 詳細は §12 |
| 31 | **書誌情報** (bibliographic_info) | relatedItems / container から生成 | 収録物名が取れた場合のみ生成（Crossref パス同様） |
| — | 識別子 (identifier) | — `url` | **対象外**。`url` はランディングページ（hdl.handle.net 等）で DOI リンクと重複。手動入力に委ねる |
| — | 位置情報 (geolocation) | — `geoLocations[]` | **自動マッピング対象外**（初期実装のスコープ限定）。ツール UI には位置情報フィールドの定義・レンダラーが存在する（make_jc_importer.html L3564 付近。fieldmapping.md #22 の「空（未実装）」は「API からの自動設定が無い」の意）。JAMSTEC 等で値あり、将来拡張候補 |
| — | （その他） | — `alternateIdentifiers[]` / `identifiers[]` | **対象外**。実データは OAIPMH（IRDB 内部ID）・oai（Zenodo）等の内部識別子が主。arXiv ID が入る例（arXiv preprint）は将来の関連情報取り込み候補として注記のみ |
| — | （その他） | — `sizes[]` / `formats[]` | **対象外**。対応する JPCOAR 自動設定先なし（ファイル情報はファイル実体を伴うため対象外） |
| — | （その他） | — `container.type` 等の書誌以外 / `relatedItems` の Journal 以外 | **対象外**。§12 の書誌情報生成にのみ使用 |

## 5. 作成者 (creators[]) の詳細マッピング

| サブフィールド | DataCite | 備考 |
|---|---|---|
| 姓 (familyName) | `creators[].familyName` | |
| 名 (givenName) | `creators[].givenName` | |
| フルネーム (creatorName) | family + given から生成。無ければ `name` | `nameType: "Organizational"` は `name` をそのまま使用し `creatorNameType` = 'Organizational' |
| ORCID 等 | `nameIdentifiers[]`（`nameIdentifierScheme`） | 実測の scheme 表記 **'ORCID' / 'e-Rad_Researcher' / 'NRID'** はツールの `nameIdentifierScheme` select と完全一致。ORCID 値は URL 形（`https://orcid.org/0000-...`）と bare 形（`0009-...`）が混在 → **URL 形に正規化**（`schemeUri` + 値で組立） |
| 所属機関名 | `creators[].affiliation[].name`（`?affiliation=true` 時） | |
| 所属機関識別子 | `affiliation[].affiliationIdentifier`（`affiliationIdentifierScheme`: ROR / ISNI / Ringgold / GRID） | ツールの `affiliationNameIdentifierScheme` select と一致。**充足率は低い**: ランダム40件中、所属あり9件・識別子あり8件。国内3機関のサンプルは識別子なし（name のみ） |

## 6. 資源タイプ対応表（resourceTypeGeneral 全34値・Schema 4.7）

正規化ルール: **PascalCase を大文字境界で分割 → 小文字化**（例: `JournalArticle` → `journal article`）。Crossref のハイフン変換（[crossref_type_mapping.md](crossref_type_mapping.md)）とは別処理。

### 正規化のみで TITLE_MAPS.resourcetype に一致（14値）

| DataCite | JPCOAR 資源タイプ |
|---|---|
| `Book` | book |
| `ConferencePaper` | conference paper |
| `DataPaper` | data paper |
| `Dataset` | dataset |
| `Image` | image |
| `InteractiveResource` | interactive resource |
| `Journal` | journal |
| `JournalArticle` | journal article |
| `PeerReview` | peer review |
| `Report` | report |
| `Software` | software |
| `Sound` | sound |
| `Workflow` | workflow |
| `Other` | other |

### 個別マッピング（20値）

| DataCite | JPCOAR 資源タイプ | 備考 |
|---|---|---|
| `Audiovisual` | video | 映像資料。JPCOAR 'video' が最近接 |
| `Award` | other | 助成・表彰（4.6追加）。対応語なし |
| `BookChapter` | book part | Crossref `book-chapter` と同じ対応 |
| `Collection` | other | 内容不定の集合。データ集合なら手動で dataset へ |
| `ComputationalNotebook` | software | source code も候補だが実行環境込みのため software |
| `ConferenceProceeding` | conference proceedings | 単複差の補正（DataCite は単数形） |
| `Dissertation` | thesis | 学位種別（bachelor/master/doctoral）は判別不能のため上位語 thesis |
| `Event` | other | 対応語なし |
| `Instrument` | other | 観測機器（4.6追加）。対応語なし |
| `Model` | other | 対応語なし |
| `OutputManagementPlan` | data management plan | OMP は DMP の上位概念。実質 DMP |
| `PhysicalObject` | other | 対応語なし |
| `Poster` | conference poster | **4.7 追加**。会議由来と限らないが最近接 |
| `Preprint` | article | Crossref `posted-content` → article の前例に整合（JPCOAR に preprint なし） |
| `Presentation` | conference presentation | **4.7 追加**。会議由来と限らないが最近接 |
| `Project` | other | 対応語なし |
| `Service` | other | 対応語なし |
| `Standard` | other | Crossref `standard` → other の前例に整合 |
| `StudyRegistration` | research protocol | 研究事前登録は研究計画書に相当 |
| `Text` | other | ワイルドカード的に使われる（実測: JAMSTEC は Text + resourceType "Cruise report"）。機械判定は other とし、`types.resourceType`（自由記述）の参照は将来検討 |

**未知値のフォールバック**: 空文字（ユーザーが手動選択）。JaLC パスと同方針。

## 7. 関連情報の対応表

### 7-1. relationType（DataCite 全39値 → ツール select 20値）

そのまま対応（先頭小文字化のみ・15値）:

`IsCitedBy`→isCitedBy, `Cites`→Cites, `IsSupplementTo`→isSupplementTo, `IsSupplementedBy`→isSupplementedBy, `HasVersion`→hasVersion, `IsVersionOf`→isVersionOf, `IsPartOf`→isPartOf, `HasPart`→hasPart, `IsReferencedBy`→isReferencedBy, `References`→references, `IsIdenticalTo`→isIdenticalTo, `IsDerivedFrom`→isDerivedFrom, `IsSourceOf`→isSourceOf, `IsRequiredBy`→isRequiredBy, `Requires`→requires

意味変換（7値）:

| DataCite | ツール relationType | 根拠 |
|---|---|---|
| `IsNewVersionOf` | isVersionOf | 新版→旧版参照は「〜の一版である」 |
| `IsPreviousVersionOf` | hasVersion | 旧版→新版参照は「版を持つ」 |
| `IsVariantFormOf` | isFormatOf | 異形版 |
| `IsOriginalFormOf` | hasFormat | 原形版 |
| `Obsoletes` | replaces | 廃止する→置き換える |
| `IsObsoletedBy` | isReplacedBy | 廃止される→置き換えられる |
| `IsPublishedIn` | isPartOf | 掲載誌への収録関係（書誌情報生成 §12 と併用） |

破棄（対応なし・17値）: `IsContinuedBy`, `Continues`, `Describes`, `IsDescribedBy`, `HasMetadata`, `IsMetadataFor`, `IsDocumentedBy`, `Documents`, `IsCompiledBy`, `Compiles`, `IsReviewedBy`, `Reviews`, `IsCollectedBy`, `Collects`, `IsTranslationOf`, `HasTranslation`, `Other`

**未知値のフォールバック**: 破棄（当該 relatedIdentifier エントリごとスキップ）。

### 7-2. relatedIdentifierType（DataCite 全23値 → ツール select 19値）

| 分類 | DataCite → ツール |
|---|---|
| そのまま対応（8値） | `ARK`→ARK, `arXiv`→arXiv, `DOI`→DOI, `EISSN`→EISSN, `ISBN`→ISBN, `ISSN`→ISSN（JPCOAR 上は非推奨。PISSN/EISSN の判別情報が無いためやむを得ず）, `PMID`→PMID, `PURL`→PURL |
| 表記変換（2値） | `Handle`→HDL, `URL`→URI |
| URI 丸めまたは破棄（13値） | `bibcode`, `CSTR`, `EAN13`, `IGSN`, `ISTC`, `LISSN`, `LSID`, `RAiD`, `RRID`, `SWHID`, `UPC`, `URN`, `w3id` → **値が `http(s)://` で始まる場合は URI として登録、それ以外は破棄** |

注意: ツールの関連識別子 select は実装上 **CRID を含む19値**（make_jc_importer.html `TITLE_MAPS.subitem_relation_type_select`）。[relatedIdentifier.md](relatedIdentifier.md) の18種には CRID が未記載（JPCOAR 2.0 追加分）。

## 8. 日付（dates[]）の設計判断

- **複数エントリを保持**する（単一優先順に潰さない）。既存 Crossref パスが Issued / Accepted / Submitted を別エントリで保持するのと同型
- `dateType` がツールの日付タイプ select（Accepted / Available / Collected / Copyrighted / Created / Issued / Submitted / Updated / Valid の9値）に含まれるものはそのまま登録。**DataCite 側にのみ存在する `Coverage` / `Withdrawn` / `Other` は破棄**（12値中3値）
- 値の正規化:
  - タイムスタンプ（`2022-12-06T18:46:04Z`）→ 日付部分 `2022-12-06` を採用（実測: arXiv）
  - 範囲（RKMS-ISO8601 `start/end`）→ **開始側**を採用。開始が空（`/end`）の場合は終了側
  - `YYYY` / `YYYY-MM` の部分日付はそのまま許容（実測: 阪大 Issued "2026"）
- **Issued が無い場合**は `publicationYear` から Issued（`YYYY`）を生成（実測: JAMSTEC は `dates` が空配列）
- 書誌発行日（bibliographicIssueDates）には Issued を使用

## 9. 権利情報（rightsList[]）の設計判断

- 複数エントリを保持（実測: 京大は日英×ポリシー/ライセンスの4件）
- `rightsUri` → 既存 `detectLicenseType()`（CC URI 前方一致）でライセンス種別を判定。`.../deed.ja` や `.../legalcode` 付きの URI も前方一致で判定できることを実データで確認
- `rightsIdentifierScheme: "SPDX"` の `rightsIdentifier`（例: `cc-by-nc-nd-4.0`, `mit`）は判定の補助に使える（CC 系は rightsUri で足りるため #208 では必須としない）
- `info:eu-repo/semantics/openAccess` のような OA 表明エントリ（実測: Zenodo）は権利情報でなくアクセス権の示唆 → 権利情報には取り込まない

## 10. 言語（language）の設計判断

ツール側の言語 select は **2系統ある**点に注意（取り違えると選択肢外の値になる）:

| 対象 | ツール側 select | 形式 |
|---|---|---|
| 本文言語（`item_30002_language12`） | `TITLE_MAPS.subitem_language` | **639-2/T**（`jpn`, `eng`, `fra`, `deu`, `zho`…） |
| サブフィールド言語（`subitem_title_language` / `subitem_subject_language` 等） | `TITLE_MAPS.language` | **639-1 系**（`ja`, `en`, `fr`, `de`, `es`, `it`, `ru`, `ar`, `el`, `ko`, `la`, `ms`, `eo`, `zh-cn`, `zh-tw`, `ja-Kana`, `ja-Latn`） |

### 本文言語（attributes.language → item_30002_language12）

DataCite の `language` は xs:language（BCP 47。`en`, `fr`, `de` のほか `cmn` など3文字・地域タグもあり得る。`null` も頻出）。

1. 値の `-` 以降（地域タグ）を除去し主言語部を取り出す
2. 2文字 → ISO 639-1 → 639-2/T 変換
3. 3文字 → 639-2/B の場合は /T へ変換（`fre`→`fra`, `ger`→`deu`, `chi`→`zho` 等）し、`TITLE_MAPS.subitem_language` 照合
4. 未収載・`null` → 空（既定 'eng' にはしない。実測で `fr` / `de` / `null` を確認しており誤設定リスクが高いため）

JaLC パスの `content_language` → 639-2 変換（`'ja'`→`'jpn'`）と同型。

### サブフィールド言語（titles[].lang / subjects[].lang / descriptions[].lang 等）

**639-2/T へ変換しない**。DataCite の `lang` 属性値（`en`, `fr` など 639-1 系）を、`TITLE_MAPS.language` に含まれる場合は**そのまま**設定し、含まれない場合（`zh` 単独・3文字コード等）は空にして手動選択に委ねる。JaLC パスの `subitem_title_language: t.lang || ''`（make_jc_importer.html L3220）と同型。

## 11. 助成情報（fundingReferences[]）の詳細マッピング

実測例: `{"funderIdentifierType":"Crossref Funder ID","funderName":"National Institutes of Health","funderIdentifier":"10.13039/100000002","awardTitle":"...","awardNumber":"5R24GM137787"}`

| サブフィールド | DataCite | 備考 |
|---|---|---|
| 助成機関名 | `funderName` | 言語 'en' 既定 |
| 助成機関識別子 | `funderIdentifier` | `funderIdentifierType` が Crossref Funder ID の場合、bare DOI（`10.13039/...`）を `https://doi.org/...` 形に変換（Crossref パスと同処理） |
| 助成機関識別子タイプ | `funderIdentifierType` | `Crossref Funder ID`→'Crossref Funder', `ROR`→'ROR', `ISNI`→'ISNI', `GRID`→'Other'（select に GRID なし）, `Other`→'Other' |
| 研究課題番号 | `awardNumber` | JSPS/JST 判定 → 既存 `fetchJgn()` / `fetchKaken()` 連携を再利用（JaLC パスと同型） |
| 研究課題名 | `awardTitle` | DataCite はスキーマ上 awardTitle を持つ（Crossref に無い利点） |
| 研究課題番号 URI | `awardUri` | 存在する場合のみ |

## 12. 書誌情報（収録物）の設計判断 — relatedItems を主ソースに

**実測事実**: JournalArticle 50件サンプルで `container.title` の充足は **0件**。一方 `relatedItems`（relatedItemType: Journal, relationType: IsPublishedIn）を持つレコードは全体で約22.7万件あり、誌名・ISSN・巻・号・頁が構造化されて入る。`container` は ISSN・巻号頁を持つ場合も**誌名を持たない**（実測: `10.25656/01:35728`）。

優先順:

1. `relatedItems[]` から `relatedItemType: "Journal"`（または relationType: IsPublishedIn）のエントリを探す → `titles.title`（収録物名）、`relatedItemIdentifier`（ISSN → 収録物識別子。identifierType: ISSN/EISSN/PISSN）、`volume` / `issue` / `firstPage` / `lastPage`
2. relatedItems に無い項目は `container` で補完（identifier/identifierType, volume, issue, firstPage, lastPage）
3. どちらも無ければ書誌情報は生成しない（Crossref パスの「container-title がある場合のみ生成」と同方針）

ISSN が取れた場合は既存 `fetchNcid()`（NCID 取得）・OPF 照会の再利用可否を #208 で判断する。

## 13. #208（実装）への引き継ぎ事項

1. fetch URL は `?publisher=true&affiliation=true` を必須とする（付け忘れると所属・出版者の識別子情報が落ちる）
2. `Accept: application/vnd.api+json`（`application/json` でも動作するが公式推奨に合わせる）
3. resourceTypeGeneral の正規化は「大文字境界分割→小文字化→§6 の個別マップ」の順で実装（個別マップに無く正規化一致もしない場合は空文字）
4. 語彙対応表（§6・§7）は定数オブジェクトとして実装し、本ドキュメントと同期を保つ
5. ORCID の URL 形/bare 形正規化を忘れない（§5）
6. 言語は2系統を取り違えない（§10）: 本文言語のみ 639-2/T 変換、タイトル・主題等のサブフィールド言語は `TITLE_MAPS.language`（639-1系）にそのまま照合
7. `dates` 空配列時の `publicationYear` フォールバック（§8）はテスト用 DOI `10.17596/0004197` で必ず検証
8. スキーマ混在: `schemaVersion` は `kernel-4` 表記で細番号が取れないため、バージョン判定はせず未知値フォールバックで吸収する

## 14. 出典（一次情報）

- DataCite REST API: https://support.datacite.org/docs/api / https://support.datacite.org/docs/api-get-doi
- affiliation 詳細取得: https://support.datacite.org/docs/can-i-see-more-detailed-affiliation-information-in-the-rest-api
- Metadata Schema 4.7 語彙:
  - resourceTypeGeneral（34値）: https://datacite-metadata-schema.readthedocs.io/en/4.7/appendices/appendix-1/resourceTypeGeneral/
  - relationType（39値）: https://datacite-metadata-schema.readthedocs.io/en/4.7/appendices/appendix-1/relationType/
  - relatedIdentifierType（23値）: https://datacite-metadata-schema.readthedocs.io/en/4.7/appendices/appendix-1/relatedIdentifierType/
  - dateType（12値）: https://datacite-metadata-schema.readthedocs.io/en/4.7/appendices/appendix-1/dateType/
  - contributorType（22値）: https://datacite-metadata-schema.readthedocs.io/en/4.7/appendices/appendix-1/contributorType/
- JaLC 準会員一覧（DOI プレフィックス）: https://japanlinkcenter.org/top/doc/listofmembers.pdf
- 実測データ: 本文 §3 のテスト用 DOI（2026-07-03 取得）
