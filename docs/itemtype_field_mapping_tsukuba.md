# アイテムタイプ間フィールドマッピング対応表

## 概要

WEKO3 のアイテムタイプはリポジトリごとにカスタマイズされており、同一の JPCOAR スキーマ要素であっても property key（TSVヘッダーの row1）が異なる。本ドキュメントでは、つくばリポジトリ「アイテムタイプJ(5)」と NII デフォルト「デフォルトアイテムタイプ（フル）(30002)」のフィールド構造を比較し、差異のパターンを整理する。

### データソース

| アイテムタイプ | ファイル | 列数 |
|---------------|---------|------|
| つくばリポジトリ アイテムタイプJ(5) | `samples/export_tsukuba/data/アイテムタイプJ(5).tsv` | 345 |
| デフォルトアイテムタイプ（フル）(30002) | `data/tsv_headers.json` | 232 |

---

## ItemType 行（row0）

| 項目 | つくば (5) | デフォルト (30002) |
|------|-----------|-------------------|
| アイテムタイプ名 | アイテムタイプJ(5) | デフォルトアイテムタイプ（フル） |
| スキーマURL | `https://tsukuba.repo.nii.ac.jp/items/jsonschema/5` | `https://localhost/items/jsonschema/30002` |

---

## Property Key のプレフィックスパターン

両アイテムタイプで使用されるプレフィックスのパターンを分類する。

### パターン A: 番号付きプレフィックス（`item_XXXXX_fieldname##`）

デフォルト30002 の主要パターン。ItemType ID + フィールド名 + 通し番号。

```
item_30002_title0, item_30002_creator2, item_30002_description9, ...
```

つくばリポジトリには `item_5_` プレフィックスのフィールドが存在するが、フィールド名・番号が異なる。

```
item_5_alternative_title_18, item_5_description_4, item_5_creator_3, ...
```

### パターン B: WEKO3 組み込みフィールド（プレフィックスなし）

WEKO3 が内部的に使用する一部のフィールドは、ItemType ID を含まない共通キーを使用する。つくばリポジトリではこのパターンが多い。

```
item_titles, item_creator, item_language, item_resource_type,
item_access_right, item_keyword, item_files
```

### パターン C: タイムスタンプ ID（`item_XXXXXXXXXXXXX`）

WEKO3 のアイテムタイプ編集画面でフィールドを追加した際に自動生成される Unix タイムスタンプベースの ID。

```
item_1742562522665 (見出し), item_1708699025255 (助成情報),
item_1644910766877 (出版タイプ), item_1749480806048 (出版者情報), ...
```

### パターン D: JPCOAR 2.0 共通フィールド（`item_1698624XXX`）

JPCOAR 2.0 で追加されたフィールドは、NII 公式テンプレートで統一された ID を使用する。

```
item_1698624001 (データセットシリーズ), item_1698624005 (出版者情報),
item_1698624008 (日付リテラル), ...
```

---

## フィールド対応表

### システム・共通フィールド（完全一致）

以下のフィールドは全アイテムタイプで property key が同一。

| JPCOAR要素 | Property Key | 備考 |
|-----------|-------------|------|
| ID | `.id` | — |
| URI | `.uri` | — |
| インデックス | `.metadata.path[0]` | — |
| 公開日 | `.metadata.pubdate` | — |
| DOI RA | `.doi_ra` | — |
| DOI | `.doi` | — |
| ファイルパス | `.file_path[0]` | — |
| researchmap連携 | `.researchmap_linkage` | — |
| サムネイルパス | `.thumbnail_path` | つくばには存在しない |

### メタデータフィールド対応表

凡例:
- **サブフィールド一致**: property key のプレフィックスは異なるが、サブフィールド構造（`.` 以降の部分）は同一
- **サブフィールド相違**: サブフィールド名も異なり、単純な置換では対応不可
- **該当なし**: 対応するフィールドが存在しない

#### タイトル

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| タイトル | `item_30002_title0` | `item_titles` | **一致** (`subitem_title`, `subitem_title_language`) |
| タイトル（その他の言語） | — | `item_1742562651586` | つくば独自。サブフィールドは `subitem_title`, `subitem_title_language` |
| その他のタイトル | `item_30002_alternative_title1` | `item_5_alternative_title_18` | **一致** (`subitem_alternative_title`, `subitem_alternative_title_language`) |
| その他のタイトル（2） | — | `item_5_alternative_title_19` | つくば独自 |

#### 作成者

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 作成者 | `item_30002_creator2` | `item_creator` | **一致** (`creatorNames`, `familyNames`, `givenNames`, `nameIdentifiers`, `creatorAffiliations`, `creatorAlternatives`, `creatorType`) |
| 作成者（2） | — | `item_5_creator_3` | つくば独自。サブフィールドは同一構造（`creatorMails` 追加あり） |

#### 寄与者

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 寄与者 | `item_30002_contributor3` | `item_1742564186654` | **一致** (`contributorNames`, `familyNames`, `givenNames`, `nameIdentifiers`, `contributorAffiliations`, `contributorAlternatives`, `contributorType`) |

#### アクセス権

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| アクセス権 | `item_30002_access_rights4` | `item_access_right` | **一致** (`subitem_access_right`, `subitem_access_right_uri`) |

#### 権利情報

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 権利情報 | `item_30002_rights6` | `item_5_rights_12` | **一致** (`subitem_rights`, `subitem_rights_language`, `subitem_rights_resource`) |
| 権利情報（2） | — | `item_1742563285404` | つくば独自。サブフィールドは同一 |

#### 権利者情報

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 権利者情報 | `item_30002_rights_holder7` | `item_1742563409210` | **一致** (`nameIdentifiers`, `rightHolderNames`) |

#### 主題

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 主題 | `item_30002_subject8` | `item_keyword` | **一致** (`subitem_subject`, `subitem_subject_language`, `subitem_subject_scheme`, `subitem_subject_uri`) |
| 主題（2〜8） | — | `item_5_subject_16`, `_20`, `_21`, `_22`, `_23`, `_24` | つくば独自（6個）。サブフィールドは同一 |

#### 内容記述

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 内容記述 | `item_30002_description9` | `item_5_description_4` | **一致** (`subitem_description`, `subitem_description_language`, `subitem_description_type`) |
| 内容記述（2〜7） | — | `item_5_description_5`, `_8`, `_14`, `_25`, `_26`, `_33` + `item_1742563688122`, `item_1708935522374` | つくば独自（8個）。サブフィールドは同一 |

#### 出版者

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 出版者 | `item_30002_publisher10` | `item_5_publisher_27` | **一致** (`subitem_publisher`, `subitem_publisher_language`) |
| 出版者（2） | — | `item_5_publisher_28` | つくば独自。サブフィールドは同一 |

#### 日付

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 日付 | `item_30002_date11` | `item_1708706470629` | **一致** (`subitem_date_issued_datetime`, `subitem_date_issued_type`) |

#### 言語

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 言語 | `item_30002_language12` | `item_language` | **一致** (`subitem_language`) |

#### 資源タイプ

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 資源タイプ | `item_30002_resource_type13` | `item_resource_type` | **一致** (`resourcetype`, `resourceuri`) |

#### バージョン情報

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| バージョン情報 | `item_30002_version14` | — | つくばには該当なし |
| 出版タイプ | `item_30002_version_type15` | `item_1644910766877` | **一致** (`subitem_peer_reviewed`, `subitem_version_resource`, `subitem_version_type`) |

#### 識別子

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 識別子 | `item_30002_identifier16` | `item_1742564250525` | **一致** (`subitem_identifier_type`, `subitem_identifier_uri`) |
| ID登録 | `item_30002_identifier_registration17` | `item_5_identifier_registration` | **一致** (`subitem_identifier_reg_text`, `subitem_identifier_reg_type`) |

#### 関連情報

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 関連情報 | `item_30002_relation18` | `item_5_relation_11` | **一致** (`subitem_relation_type`, `subitem_relation_name`, `subitem_relation_type_id`) |
| 関連情報（2〜11） | — | `item_5_relation_10`, `_13`, `_36`, `_37`, `_38`, `_39`, `_40`, `_41`, `_42` + `item_1742572008253`, `item_1743954860477` | つくば独自（11個）。サブフィールドは同一 |

#### 書誌情報

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 書誌情報 | `item_30002_bibliographic_information29` | `item_5_biblio_info_6` | **一致** (`bibliographic_titles`, `bibliographicIssueDates`, `bibliographicIssueNumber`, `bibliographicVolumeNumber`, `bibliographicPageStart`, `bibliographicPageEnd`, `bibliographicNumberOfPages`) |
| 巻 | `item_30002_volume_number24` | — | 30002独自（書誌情報に統合されていない単独フィールド） |
| 号 | `item_30002_issue_number25` | — | 同上 |
| ページ数 | `item_30002_number_of_pages26` | — | 同上 |
| 開始ページ | `item_30002_page_start27` | — | 同上 |
| 終了ページ | `item_30002_page_end28` | — | 同上 |

#### 収録物識別子・収録物名

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 収録物識別子 | `item_30002_source_identifier22` | `item_5_source_id_7` | **一致** (`subitem_source_identifier`, `subitem_source_identifier_type`) |
| 収録物識別子（2） | — | `item_1742563133420` | つくば独自。サブフィールドは同一 |
| 収録物識別子（3） | — | `item_5_source_id_9` | つくば独自。サブフィールドは同一 |
| 収録物名 | `item_30002_source_title23` | `item_1742563020978` | **一致** (`subitem_source_title`, `subitem_source_title_language`) |

#### 助成情報

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 助成情報 | `item_30002_funding_reference21` | `item_1708699025255` | **一致** (`subitem_award_numbers`, `subitem_award_titles`, `subitem_funder_identifiers`, `subitem_funder_names`, `subitem_funding_stream_identifiers`, `subitem_funding_streams`) |

#### 会議記述

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 会議記述 | `item_30002_conference34` | `item_1742564138768` | **一致** (`subitem_conference_names`, `subitem_conference_date`, `subitem_conference_places`, `subitem_conference_venues`, `subitem_conference_sponsors`, `subitem_conference_country`, `subitem_conference_sequence`) |

#### 学位論文関連

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 学位授与番号 | `item_30002_dissertation_number30` | `item_1742564095360` | **一致** (`subitem_dissertationnumber`) |
| 学位名 | `item_30002_degree_name31` | `item_1742563910257` | **一致** (`subitem_degreename`, `subitem_degreename_language`) |
| 学位授与年月日 | `item_30002_date_granted32` | `item_1742564064538` | **一致** (`subitem_dategranted`) |
| 学位授与機関 | `item_30002_degree_grantor33` | `item_1742563957976` | **一致** (`subitem_degreegrantor_identifier`, `subitem_degreegrantor`) |

#### ファイル情報

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| ファイル情報 | `item_30002_file35` | `item_files` | **一致** (`accessrole`, `date`, `displaytype`, `fileDate`, `filename`, `filesize`, `format`, `groups`, `licensefree`, `licensetype`, `url`, `version`) |

#### 見出し

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 見出し | `item_30002_heading36` | `item_1742562522665` | **一致** (`subitem_heading_banner_headline`, `subitem_heading_headline`, `subitem_heading_language`) |

#### 出版者情報（JPCOAR 2.0）

| JPCOAR要素 | デフォルト (30002) | つくば (5) | サブフィールド |
|-----------|-------------------|-----------|-------------|
| 出版者情報 | `item_1698624005` | `item_1749480806048` | **一致** (`publisher_names`, `publisher_locations`, `publication_places`, `publisher_descriptions`) |

#### テキスト・リンク（つくば独自フィールド）

つくばリポジトリには、30002 に存在しないテキスト・リンク系のカスタムフィールドが多数ある。

| プロパティキー | サブフィールド | 用途（推定） |
|--------------|-------------|------------|
| `item_1742562843478` | `subitem_text_value`, `subitem_text_language` | テキスト |
| `item_1743954822288` | `subitem_text_value`, `subitem_text_language` | テキスト |
| `item_1722645890011` | `subitem_text_value`, `subitem_text_language` | テキスト |
| `item_5_text_29`, `_30`, `_31`, `_32` | `subitem_text_value`, `subitem_text_language` | テキスト |
| `item_1722561470159` | `subitem_link_url`, `subitem_link_text`, `subitem_link_language` | リンク |
| `item_1746808770687` | `subitem_link_url`, `subitem_link_text`, `subitem_link_language` | リンク |
| `item_1746808771889` | `subitem_link_url`, `subitem_link_text`, `subitem_link_language` | リンク |
| `item_1743954882989` | `subtml_link_url`, `subitem_link_text`, `subitem_link_language` | リンク |
| `item_5_select_15` | `subitem_select_item`, `subitem_select_language` | 選択項目 |
| `item_1742564014315` | `subitem_description`, `subitem_description_language`, `subitem_description_type` | 内容記述（学位論文関連） |

#### 30002 にのみ存在するフィールド

| JPCOAR要素 | プロパティキー | 備考 |
|-----------|-------------|------|
| APC | `item_30002_apc5` | JPCOAR 2.0 で廃止 |
| 時間的範囲 | `item_30002_temporal19` | — |
| 位置情報 | `item_30002_geolocation20` | — |
| データセットシリーズ | `item_1698624001` | JPCOAR 2.0 新規 |
| 原本の言語 | `item_1698624002` | JPCOAR 2.0 新規 |
| 大きさ | `item_1698624003` | JPCOAR 2.0 新規 |
| カタログ | `item_1698624004` | JPCOAR 2.0 新規 |
| 版 | `item_1698624006` | JPCOAR 2.0 新規 |
| 巻次名 | `item_1698624007` | JPCOAR 2.0 新規 |
| 日付（リテラル） | `item_1698624008` | JPCOAR 2.0 新規 |
| 所蔵機関 | `item_1698624009` | JPCOAR 2.0 新規 |
| 物理的形態 | `item_1698624010` | JPCOAR 2.0 新規 |

---

## 構造差異のパターン分析

### 1. サブフィールド構造は高い互換性を持つ

全 28 カテゴリ中、サブフィールド構造（property key のドット以降の部分）が一致するものは **27 カテゴリ**。つまり、WEKO3 のアイテムタイプ設計において、JPCOAR スキーマに準拠したサブフィールド構造は共通仕様として維持されている。

### 2. プレフィックス差異の 3 パターン

| パターン | 30002 の例 | つくば の例 | 自動変換の難易度 |
|---------|-----------|-----------|---------------|
| 番号付き → 組み込み | `item_30002_title0` | `item_titles` | 高（命名規則が異なる） |
| 番号付き → 番号付き（異ID） | `item_30002_alternative_title1` | `item_5_alternative_title_18` | 中（サフィックス番号が異なる） |
| 番号付き → タイムスタンプ | `item_30002_contributor3` | `item_1742564186654` | 高（規則性なし） |

### 3. つくばリポジトリの特徴: フィールドの多重定義

つくばリポジトリでは、同一スキーマ要素（例: 関連情報、主題、内容記述）に対して複数のプロパティが定義されている。これは WEKO3 のアイテムタイプ設計で「同じ要素を異なる用途で使い分ける」ことが可能な仕様に基づく。

| スキーマ要素 | 30002 のプロパティ数 | つくばのプロパティ数 |
|------------|-------------------|------------------|
| 関連情報 (relation) | 1 | 12 |
| 主題 (subject) | 1 | 7 |
| 内容記述 (description) | 1 | 9 |
| 出版者 (publisher) | 1 | 2 |
| 収録物識別子 (source_identifier) | 1 | 3 |
| 作成者 (creator) | 1 | 2 |
| 権利情報 (rights) | 1 | 2 |

---

## 将来の対応方針

### サブフィールド名ベースの照合アプローチ

サブフィールド構造の高い互換性を活用し、以下のステップで異なるアイテムタイプ間のマッピングを実現できる可能性がある。

1. **テンプレートの row1 からプロパティキーを解析** — `.metadata.` 以降の最初のドットまでをプレフィックスとして抽出
2. **サブフィールドパスを正規化** — プレフィックスを除去し、サブフィールドパス（例: `creatorNames[0].creatorName`）を取得
3. **metadata のキーとサブフィールドパスで照合** — `item_30002_creator2[0].creatorNames[0].creatorName` のサブフィールドパスが、テンプレート側の `item_creator[0].creatorNames[0].creatorName` と一致することを検出
4. **データを対応する列に配置** — 照合結果に基づき TSV 出力時に正しい列にデータを配置

### 課題

- 多重定義フィールド（つくばの関連情報×12など）では、どのプロパティにデータを配置すべきか判断が必要
- 30002 にのみ存在するフィールド（時間的範囲、位置情報など）は出力不可
- テンプレートにのみ存在するフィールド（つくば独自のテキスト・リンク系）はデータ供給元がない

---

## 参考

- Issue #120: カスタムテンプレート完全パース + ItemType行自動設定（既知の制約セクション）
- `docs/Implementation_phase2.md`: Phase 2 実装計画
- `docs/weko3_tsv_import_spec.md`: WEKO3 TSV インポート仕様
