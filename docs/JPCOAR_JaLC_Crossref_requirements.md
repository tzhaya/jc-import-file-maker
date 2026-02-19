# JPCOAR / JaLC DOI / Crossref DOI 必須項目マッピング

出典: JPCOAR/JaLC対照表 付録 ver.1.5（2025年11月）

凡例:
- **必須**: 必ず入力が必要
- **条件付必須**: 特定条件下で必須
- **任意**: 任意入力（0以上 or 0～1）
- **―**: 該当表に項目なし（対象外）
- WEKO key は `デフォルトアイテムタイプ（フル）(30002)` のフィールド名

---

## 別表2-1 / 3-1: ジャーナルアーティクル

対象 dc:type: conference paper, departmental bulletin paper, journal article, periodical, review article, data paper, editorial, article, newspaper (v1.0.2), software paper (v1.0.2), other (Preprintのみ)

| 通番 | JPCOAR項目名 | 要素名 | 属性 | WEKO key (30002) | JaLC DOI 必須 | JaLC DOI 繰返し | Crossref DOI 必須 | Crossref DOI 繰返し | 備考 |
|------|-------------|--------|------|------------------|--------------|----------------|-------------------|---------------------|------|
| 1 | タイトル | dc:title | | item_30002_title0 | 必須 | 1以上 | 必須 | 1以上 | Crossref: xml:lang必須 |
| 3.1 | 作成者識別子 | jpcoar:nameIdentifier | nameIdentifierScheme | item_30002_creator2[].nameIdentifiers[].nameIdentifier | 任意 | 0以上 | 任意 | 0以上 | Crossref: ORCID限定 |
| 3.2 | 作成者姓名 | jpcoar:creatorName | | item_30002_creator2[].creatorNames[].creatorName | 条件付必須 | 0以上 | 条件付必須 | 0以上 | 作成者がある場合必須。Crossref: xml:lang必須 |
| 3.3 | 作成者姓 | jpcoar:familyName | | item_30002_creator2[].familyNames[].familyName | 任意 | 0以上 | 任意 | 0以上 | Crossref: xml:lang必須 |
| 3.4 | 作成者名 | jpcoar:givenName | | item_30002_creator2[].givenNames[].givenName | 任意 | 0以上 | 任意 | 0以上 | Crossref: xml:lang必須 |
| 3.6.2 | 所属機関名 | jpcoar:affiliationName | | item_30002_creator2[].creatorAffiliations[].affiliationNames[].affiliationName | 任意 | 0以上 | 任意 | 0以上 | 複数の場合xml:lang必須 |
| 9 | 主題 | jpcoar:subject | subjectScheme | item_30002_subject8 | 任意 | 0以上 | ― | ― | |
| 10 | 内容記述 | datacite:description | descriptionType="Abstract" | item_30002_description9 | 任意 | 0以上 | ― | ― | Abstract以外はJaLC登録されない。4000文字まで |
| 11 | 出版者 | dc:publisher | | item_30002_publisher10 | 必須 | 1以上 | 必須 | 1以上 | ない場合「出版社不明」。Crossref: xml:lang="en"必須 |
| 12 | 日付 | datacite:date | dateType | item_30002_date11 | 必須 | 1 | 必須 | 1 | 優先順: Issued > dateGranted > Created > Updated。ない場合 Issued="9999-01-01" |
| 13 | 言語 | dc:language | | item_30002_language12 | 任意 | 0～1 | 任意 | 0～1 | |
| 14 | 資源タイプ | dc:type | | item_30002_resource_type13 | 必須 | 1 | 必須 | 1 | |
| 15 | バージョン | datacite:version | | item_30002_version14 | 任意 | 0～1 | ― | ― | |
| 16 | 出版タイプ | oaire:version | | item_30002_version_type15 | 任意 | 0～1 | ― | ― | |
| 17 | 識別子 | jpcoar:identifier | identifierType="HDL"/"URI" | item_30002_identifier16 | 必須 | 1 | 必須 | 1 | 優先順: HDL > URI |
| 18 | ID登録 | jpcoar:identifierRegistration | identifierType="JaLC"/"Crossref" | item_30002_identifier_registration17 | 必須 | 1 | 必須 | 1 | |
| 19 | 関連情報 | jpcoar:relation | relationType | item_30002_relation18 | 任意 | 0以上 | 任意 | 0以上 | relatedIdentifierがある場合relationType必須 |
| 19.1 | 関連識別子 | jpcoar:relatedIdentifier | identifierType | item_30002_relation18[].subitem_relation_type_id | 任意 | 0以上 | 任意 | 0以上 | |
| 22.1 | 助成機関識別子 | datacite:funderIdentifier | funderIdentifierType | item_30002_funding_reference21[].subitem_funder_identifiers | 任意 | 0以上 | 任意 | 0以上 | |
| 22.2 | 助成機関名 | jpcoar:funderName | | item_30002_funding_reference21[].subitem_funder_names | 任意 | 0以上 | 任意 | 0以上 | Crossref: xml:lang="en"必須、200文字まで |
| 22.3 | 研究課題番号 | datacite:awardNumber | | item_30002_funding_reference21[].subitem_award_numbers | 任意 | 0以上 | 任意 | 0以上 | |
| 23 | 収録物識別子 | jpcoar:sourceIdentifier | identifierType | item_30002_source_identifier22 | 任意 | 0～1 | 必須 | 1以上 | Crossrefでは必須 |
| 24 | 収録物名 | jpcoar:sourceTitle | | item_30002_source_title23 | 任意 | 0～1 | 必須 | 1以上 | Crossref: xml:lang="en"必須 |
| 25 | 巻 | jpcoar:volume | | item_30002_volume_number24 | 必須 | 1 | 必須 | 1 | |
| 26 | 号 | jpcoar:issue | | item_30002_issue_number25 | 任意 | 0～1 | 任意 | 0～1 | |
| 28 | 開始ページ | jpcoar:pageStart | | item_30002_page_start27 | 必須 | 1 | 必須 | 1 | ない場合「none」 |
| 29 | 終了ページ | jpcoar:pageEnd | | item_30002_page_end28 | 任意 | 0～1 | 任意 | 0～1 | |
| 34.1 | 会議名 | jpcoar:conferenceName | | item_30002_conference34[].subitem_conference_names | 任意 | 0～1 | ― | ― | |
| 34.2 | 回次 | jpcoar:conferenceSequence | | item_30002_conference34[].subitem_conference_sequence | 任意 | 0～1 | ― | ― | |
| 34.3 | 開催地 | jpcoar:conferencePlace | | item_30002_conference34[].subitem_conference_places | 任意 | 0～1 | ― | ― | |
| 35.1 | 本文URL | jpcoar:URI | | item_30002_file35[].url.url | 必須 | 1以上 | 必須 | 1以上 | |
| 35.2 | フォーマット | jpcoar:mimeType | | item_30002_file35[].format | 任意 | 0～1 | 任意 | 0～1 | |

---

## 別表2-3 / 3-2: 書籍

JaLC DOI 対象 dc:type: book, book part, technical report, research report, report
Crossref DOI 対象 dc:type: book, book part, technical report, research report, report, thesis, bachelor thesis, master thesis, doctoral thesis

| 通番 | JPCOAR項目名 | 要素名 | 属性 | WEKO key (30002) | JaLC DOI 必須 | JaLC DOI 繰返し | Crossref DOI 必須 | Crossref DOI 繰返し | 備考 |
|------|-------------|--------|------|------------------|--------------|----------------|-------------------|---------------------|------|
| 1 | タイトル | dc:title | | item_30002_title0 | 必須 | 1以上 | 必須 | 1以上 | Crossref: xml:lang必須、"en"必須 |
| 3.1 | 作成者識別子 | jpcoar:nameIdentifier | nameIdentifierScheme | item_30002_creator2[].nameIdentifiers[].nameIdentifier | 任意 | 0以上 | 任意 | 0以上 | Crossref: ORCID限定 |
| 3.2 | 作成者姓名 | jpcoar:creatorName | | item_30002_creator2[].creatorNames[].creatorName | 条件付必須 | 0以上 | 条件付必須 | 0以上 | 作成者がある場合必須。Crossref: xml:lang必須 |
| 3.3 | 作成者姓 | jpcoar:familyName | | item_30002_creator2[].familyNames[].familyName | 任意 | 0以上 | 任意 | 0以上 | Crossref: xml:lang必須 |
| 3.4 | 作成者名 | jpcoar:givenName | | item_30002_creator2[].givenNames[].givenName | 任意 | 0以上 | 任意 | 0以上 | Crossref: xml:lang必須 |
| 3.6.2 | 所属機関名 | jpcoar:affiliationName | | item_30002_creator2[].creatorAffiliations[].affiliationNames[].affiliationName | 任意 | 0以上 | 任意 | 0以上 | 複数の場合xml:lang必須 |
| 11 | 出版者 | dc:publisher | | item_30002_publisher10 | 必須 | 1 | 必須 | 1 | ない場合「出版社不明」。Crossref: xml:lang="en"必須 |
| 12 | 日付 | datacite:date | dateType | item_30002_date11 | 必須 | 1 | 必須 | 1 | 優先順: Issued > dateGranted > Created > Updated。ない場合 Issued="9999-01-01" |
| 13 | 言語 | dc:language | | item_30002_language12 | 任意 | 0～1 | 任意 | 0～1 | |
| 14 | 資源タイプ | dc:type | | item_30002_resource_type13 | 必須 | 1 | 必須 | 1 | |
| 15 | バージョン | datacite:version | | item_30002_version14 | 任意 | 0～1 | ― | ― | |
| 16 | 出版タイプ | oaire:version | | item_30002_version_type15 | 任意 | 0～1 | 任意 | 0～1 | |
| 17 | 識別子 | jpcoar:identifier | identifierType="HDL"/"URI" | item_30002_identifier16 | 必須 | 1 | 必須 | 1 | 優先順: HDL > URI |
| 18 | ID登録 | jpcoar:identifierRegistration | identifierType="JaLC"/"Crossref" | item_30002_identifier_registration17 | 必須 | 1 | 必須 | 1 | |
| 19 | 関連情報 | jpcoar:relation | relationType | item_30002_relation18 | 任意 | 0以上 | 任意 | 0以上 | relatedIdentifierがある場合relationType必須 |
| 19.1 | 関連識別子 | jpcoar:relatedIdentifier | identifierType (ISBN含む) | item_30002_relation18[].subitem_relation_type_id | 任意 | 0以上 | 任意 | 0以上 | |
| 19.1 | 関連識別子(ISBN) | jpcoar:relatedIdentifier | identifierType="ISBN" | item_30002_relation18[].subitem_relation_type_id | 任意 | 0～1 | 必須 | 1 | Crossrefでは必須。relationType="isIdenticalTo" |
| 19.2 | 関連名称 | jpcoar:relationTitle | | item_30002_relation18[].subitem_relation_name | 任意 | 0以上 | 任意 | 0以上 | シリーズタイトル。relationType="isPartOf" |
| 22.1 | 助成機関識別子 | datacite:funderIdentifier | funderIdentifierType | item_30002_funding_reference21[].subitem_funder_identifiers | 任意 | 0以上 | 任意 | 0以上 | |
| 22.2 | 助成機関名 | jpcoar:funderName | | item_30002_funding_reference21[].subitem_funder_names | 任意 | 0以上 | 任意 | 0以上 | Crossref: xml:lang="en"必須、200文字まで |
| 22.3 | 研究課題番号 | datacite:awardNumber | | item_30002_funding_reference21[].subitem_award_numbers | 任意 | 0以上 | 任意 | 0以上 | |
| 35.1 | 本文URL | jpcoar:URI | | item_30002_file35[].url.url | 必須 | 1以上 | 必須 | 1以上 | |
| 35.2 | フォーマット | jpcoar:mimeType | | item_30002_file35[].format | 任意 | 0～1 | 任意 | 0～1 | |

---

## JaLC DOI vs Crossref DOI 主な差分まとめ

### ジャーナルアーティクル

| 項目 | JaLC DOI | Crossref DOI |
|------|----------|-------------|
| タイトル xml:lang | 任意 | **必須** |
| 作成者識別子 Scheme | 制限なし | **ORCID限定** |
| 作成者姓名/姓/名 xml:lang | 推奨 | **必須** |
| 出版者 xml:lang | 任意 | **"en"必須** |
| 収録物識別子 | 任意 (0～1) | **必須 (1以上)** |
| 収録物名 | 任意 (0～1) | **必須 (1以上), "en"必須** |
| 助成機関名 xml:lang | 任意 | **"en"必須**, 200文字制限 |
| 主題 | 任意 | 対象外 |
| 内容記述 | 任意 (Abstract, 4000字) | 対象外 |
| バージョン/出版タイプ | 任意 | 対象外 |
| 会議名/回次/開催地 | 任意 | 対象外 |
| ID登録タイプ | JaLC | Crossref |

### 書籍

| 項目 | JaLC DOI | Crossref DOI |
|------|----------|-------------|
| 対象dc:type | book系5種 | book系5種 + **thesis系4種** |
| タイトル xml:lang | 任意 | **必須, "en"必須** |
| 作成者識別子 Scheme | 制限なし | **ORCID限定** |
| 出版者 xml:lang | 任意 | **"en"必須** |
| 関連識別子(ISBN) | 任意 (0～1) | **必須 (1)** |
| 助成機関名 xml:lang | 任意 | **"en"必須**, 200文字制限 |
| バージョン | 任意 | 対象外 |
| ID登録タイプ | JaLC | Crossref |
