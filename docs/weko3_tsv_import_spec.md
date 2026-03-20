# WEKO3 TSVインポート仕様

WEKO3 ソースコード（[RCOSDP/weko](https://github.com/RCOSDP/weko)）から調査したTSVインポート処理の仕様をまとめる。

- 最終確認日: 2026-03-20
- 確認対象: `main` ブランチ

主要ソースファイル:
- [`modules/weko-search-ui/weko_search_ui/utils.py`](https://github.com/RCOSDP/weko/blob/main/modules/weko-search-ui/weko_search_ui/utils.py) — インポート処理のメインロジック
- [`modules/weko-search-ui/weko_search_ui/config.py`](https://github.com/RCOSDP/weko/blob/main/modules/weko-search-ui/weko_search_ui/config.py) — 設定定数

---

## 1. 入力形式

インポートは **ZIPファイル** で行う。ZIP内に `data/` ディレクトリを含み、TSV/CSVファイルとコンテンツファイルを格納する。

```
import.zip
  └── data/
       ├── items.tsv          （メタデータファイル）
       ├── file1.pdf          （.file_path で参照するコンテンツファイル）
       └── thumb.jpg          （.thumbnail_path で参照するサムネイル画像）
```

- `data/` ディレクトリ内に複数のTSV/CSVファイルを含めることが可能（すべて読み込まれる）
- ZIPファイル名のエンコーディング: `chardet` で検出し、`cp437` の場合は `cp932` にデコード（日本語ファイル名対応）
- 一時ディレクトリ: `/tmp/weko_import_YYYYMMDDHHMMSSfff/data/` に展開

## 2. TSVファイル構造 — 5行のヘッダー + データ行

| 行 | 用途 | 内容 |
|----|------|------|
| **1行目** | アイテムタイプ宣言 | `#ItemType`, アイテムタイプ名, スキーマURL（例: `https://host/.../items/jsonschema/30002`）。URLの末尾セグメントからアイテムタイプIDを抽出 |
| **2行目** | カラムキーパス | ドット記法のパス（例: `#.id`, `.uri`, `.metadata.item_30002_title0[0].subitem_title`） |
| **3行目** | カラムラベル | 人間可読な名前（例: `#ID`, `URI`, `タイトル.タイトル`）。読み込まれるが処理には使用されない |
| **4行目** | コメント/オプション | `#` で始まる場合スキップ。それ以外でも処理されない |
| **5行目** | コメント/オプション | `#` で始まる場合スキップ。それ以外でも処理されない |
| **6行目以降** | データ行 | 2行目のカラムパスに対応する値 |

- 1行目は最低3カラム必要
- アイテムタイプIDは数値で、既存アイテムタイプの最新バージョンを参照する必要がある
- ファイルエンコーディング: `chardet` でエンコーディングを自動検出（UTF-8推奨）

### ヘッダー読み込み時のバリデーション（`read_stats_file()`）

2行目のカラムキーパスに対して以下のバリデーションが実行される:

1. **重複カラムチェック** — `handle_check_duplication_item_id()`: 同一キーパスが複数存在する場合はエラー
2. **アイテムタイプマッピング整合性チェック** — `handle_check_consistence_with_mapping()`: カラムパスがアイテムタイプのマッピング定義と整合しているか検証
3. **存在しないメタデータキーの検出** — `handle_check_metadata_not_existed()`: アイテムタイプに存在しないメタデータキーがある場合、データは登録されず警告を付与

## 3. システムカラム

`WEKO_EXPORT_TEMPLATE_BASIC_ID` で定義されるシステムカラム:

| キーパス（2行目） | ラベル（3行目） | オプション（4行目） | 説明 |
|---|---|---|---|
| `#.id` | `#ID` | `#` | レコードID。空 = 新規作成、既存ID = 更新 |
| `.uri` | `URI` | （空） | システムURI（`https://host/records/{id}`）。更新時はシステム生成URIと一致する必要がある |
| `.metadata.path[0]` | `.IndexID[0]` | `Allow Multiple` | アイテムの登録先インデックスID |
| `.pos_index[0]` | `.POS_INDEX[0]` | `Allow Multiple` | インデックス名パス（人間可読） |
| `.publish_status` | `.PUBLISH_STATUS` | `Required` | **必須。** `"public"` または `"private"` |
| `.feedback_mail[0]` | `.FEEDBACK_MAIL[0]` | `Allow Multiple` | フィードバックメールアドレス。正規表現 `^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$` でバリデーション |
| `.researchmap_linkage` | `.RESEAECHMAP_LINKAGE` | （空） | researchmap CRIS連携フラグ。インポート成功後、値が真の場合 `cris_researchmap_linkage_request` シグナルを送信 |
| `.cnri` | `.CNRI` | （空） | CNRI（Handle）識別子。形式: `prefix/suffix`。最大290文字。プレフィックスはシステムのHandleプレフィックスと一致する必要がある |
| `.doi_ra` | `.DOI_RA` | （空） | DOI登録機関。有効値: `"JaLC"`, `"Crossref"`, `"DataCite"`, `"NDL JaLC"` |
| `.doi` | `.DOI` | （空） | DOI値（prefix/suffix）。プレフィックスは指定RAのシステムDOIプレフィックスと一致する必要がある |
| `.edit_mode` | `Keep/Upgrade Version` | `Required` | **更新時必須。** `"Keep"` または `"Upgrade"`。`Keep` = 最終バージョンを上書き更新。`Upgrade` = `newversion()` で新バージョン作成。空の場合は `"Keep"` がデフォルト |

> **注:** `.RESEAECHMAP_LINKAGE` のスペルはWEKO3ソースコード内のタイポ（正しくは `RESEARCHMAP`）

### 追加のシステムカラム（テンプレート外）

| キーパス | 説明 |
|---|---|
| `.file_path[0]`, `.file_path[1]`, ... | ZIP内 `data/` ディレクトリからの相対パスでコンテンツファイルを参照 |
| `.thumbnail_path[0]` | サムネイル画像のパス（対応形式: gif, jpg, jpe, jpeg, png, bmp, tiff, tif） |
| `.metadata_replace`（`wk:metadataReplace`） | `True` の場合、メタデータのみ更新しアップロードファイルは無視。新規アイテムには使用不可。TSVインポートでは未使用（JSON-LD/BagItインポート専用） |

## 4. `.metadata.*` カラムの解析

`parse_to_json_form()` 関数がカラムヘッダーパスをネストしたJSONに変換する。

### パス変換の流れ

1. `handle_generate_key_path(key)` がドット記法を変換:
   - `#.` と `#` を `.` に、`[` を `.` に、`]` を空に置換
   - `.` で分割し、先頭の空文字列を除去
   - 例:
     - `.metadata.item_30002_funding_reference21[0].subitem_funder_identifiers.subitem_funder_identifier`
     - → `["metadata", "item_30002_funding_reference21", "0", "subitem_funder_identifiers", "subitem_funder_identifier"]`

2. `set_nested_item()` がネストされたパスに値を設定（`functools.reduce` + `getitem` で辿り、末端に値を設定）

3. `convert_data()` が後処理: dictの全キーが数値文字列（`"0"`, `"1"`, ...）の場合、`convert_nested_item_to_list()` でリストに変換

4. 最終的に `json.loads(json.dumps(result))` で `defaultdict` ラッパーを除去し、標準dictに変換

### 空値の扱い

空値は **スキップ** される。ただし以下の場合は例外:
- キーが `file_path` または `thumbnail_path` で始まる場合
- キーの最後のセグメントが `filename` の場合
- `include_empty=True` が指定された場合

## 5. インポート処理パイプライン

### バリデーション段階（`check_tsv_import_items()`）

以下の順序で実行。手順2〜5は `unpackage_import_file()` 内でファイル単位に実行され、手順6以降は全ファイル読み込み後に一括実行される:

**ファイル単位の処理（`unpackage_import_file()` 内）:**

1. **ZIP展開** — 一時ディレクトリに展開（cp437/cp932エンコーディング対応）
2. **TSV/CSV読み込み** — `read_stats_file()` でヘッダー解析+データ行パース
3. **識別子変更フラグ設定** — `handle_set_change_identifier_flag`
4. **システムアイテム自動補完** — `handle_fill_system_item`（後述）
5. **JSONスキーマバリデーション** — `handle_validate_item_import`（アイテムタイプスキーマに対して検証）

**全レコード一括バリデーション:**

6. **重複レコードチェック** — `handle_check_duplicate_record`
7. **レコード存在チェック** — `handle_check_exist_record`（ステータス判定: `new`, `keep`, `upgrade`）
8. **タイトル抽出** — `handle_item_title`（必須フィールド）
9. **日付バリデーション** — `handle_check_date`（ISO形式: yyyy-MM-dd, yyyy-MM, yyyy）
10. **IDバリデーション** — `handle_check_id`
11. **インデックスツリーバリデーション** — `handle_check_and_prepare_index_tree`
12. **公開ステータスバリデーション** — `handle_check_and_prepare_publish_status`
13. **フィードバックメールバリデーション** — `handle_check_and_prepare_feedback_mail`
14. **リクエストメールバリデーション** — `handle_check_and_prepare_request_mail`
15. **アイテム申請バリデーション** — `handle_check_and_prepare_item_application`
16. **ファイルメタデータチェック** — `handle_check_file_metadata`（file_path/filename整合性チェック + ZIP内存在チェック + サムネイル形式チェック）
17. **制限付きアクセスプロパティチェック** — `handle_check_restricted_access_property`
18. **共有IDチェック** — `handle_shared_ids`
19. **著者プレフィックスチェック** — `handle_check_authors_prefix`（nameIdentifierSchemeがAuthorsPrefixSettingsに登録されているか）
20. **著者所属チェック** — `handle_check_authors_affiliation`
21. **CNRIチェック** — `handle_check_cnri` ※GakuNin RDMモード時はスキップ
22. **DOIインデックスチェック** — `handle_check_doi_indexes`（DOIアイテムは公開インデックス+公開ハーベストが必要） ※GakuNin RDMモード時はスキップ
23. **DOI RAチェック** — `handle_check_doi_ra` ※GakuNin RDMモード時はスキップ
24. **DOIチェック** — `handle_check_doi` ※GakuNin RDMモード時はスキップ

### 実行段階（`import_items_to_system()`）

1. **オーナー決定** — `request_info` からユーザーIDを取得
2. **デポジット作成/取得** — 新規アイテムは `create_deposit()`、既存アイテムは `handle_check_item_is_locked()` でロック確認後にPIDで取得。既存アイテムのESメタデータをロールバック用にキャッシュ
3. **アイテムリンク取得** — `ItemReference.get_src_references()` で既存リンクを取得
4. **メタデータ登録** — `register_item_metadata()`（ファイルアップロード、デポジットレコード更新、バージョン処理）
5. **CNRI Handle登録** — `register_item_handle()`（`WEKO_HANDLE_ALLOW_REGISTER_CNRI` 設定が有効時のみ） ※GakuNin RDMモード時はスキップ
6. **DOI登録** — `register_item_doi()` ※GakuNin RDMモード時はスキップ
7. **公開ステータス更新** — `register_item_update_publish_status()` ※GakuNin RDMモード時はスキップ
8. **ES通知** — 新規アイテムの場合 `send_item_created_event_to_es()` ※GakuNin RDMモード時はスキップ
9. **データベースコミット** — `db.session.commit()`
10. **外部システム呼び出し** — `call_external_system()`（旧/新レコード・リンクの比較を渡す）
11. **操作ログ記録** — `UserActivityLogger.info()`（`ITEM_CREATE` or `ITEM_UPDATE`）
12. **未使用ファイルクリーンアップ** — Keepモードでインポート成功時、キャッシュされた未使用ファイルを削除
13. **researchmap CRIS連携** — `researchmap_linkage` が真の場合、`cris_researchmap_linkage_request` シグナルを送信

**エラーハンドリング:**
- SQLAlchemyError, ConnectionError, ElasticsearchException, Redis エラーをそれぞれ個別にキャッチ
- DB ロールバック + ES メタデータ復元（`handle_remove_es_metadata`）
- `UserActivityLogger.error()` でエラーログ記録

## 6. ファイル処理

- `.file_path[N]` カラムがZIP内の `data/` ディレクトリからの相対パスでファイルを参照
- `up_load_file()` でアイテムのストレージバケットにアップロード（サムネイル → 通常ファイルの順）
- **ファイル名整合性チェック** — `handle_check_filename_consistence()`: メタデータ内の `filename` と `.file_path[N]` のファイル名が一致する必要がある
- **新規アイテム**: ZIP内にファイルが存在しない場合はエラー
- **更新アイテム**: ZIP内にファイルが存在しない場合は警告（メタデータのみ更新）
- ファイルサイズは自動計算され、フォーマット済み文字列（B/KB/MB/GB/TB）として格納
- 既存ファイルの更新時: `root_file_id` を引き継いで `ObjectVersion.create()` で新バージョンを作成
- 古いファイルの削除: ファイル名が変更された場合、古い `ObjectVersion` を `remove()`
- メタデータ文字列中の `<br/>` は `\n` に変換（`escape_newline()`）
- `clean_file_metadata()`: ファイルメタデータが空の場合、`deleted_items` に追加

## 7. サムネイル処理

- `.thumbnail_path` カラムがZIP内の画像ファイルを参照
- 対応形式（`WEKO_IMPORT_THUMBNAIL_FILE_TYPE`）: `gif, jpg, jpe, jpeg, png, bmp, tiff, tif`
- `is_thumbnail=True` フラグ付きで格納
- サムネイルメタデータ（ラベル、URL）は `autofill_thumbnail_metadata()` で自動補完
- サムネイルファイルタイプのバリデーション: `handle_check_thumbnail_file_type()` で対応形式を検証

## 8. バージョン処理（Keep vs Upgrade）

`register_item_metadata()` 内で実行:

| モード | 動作 |
|--------|------|
| `Keep` | `PIDVersioning(child=pid).last_child` で最終バージョンを取得し、`merge_data_to_record_without_version(pid, keep_version=True, is_import=True)` で上書き → `publish_without_commit()` |
| `Upgrade` / `new` | `deposit.newversion(pid)` で新バージョン作成 → `publish_without_commit()` |

- 両モードとも最終的に `publish_without_commit()` を呼び出す
- 下書きバージョン（`{item_id}.0`）が存在する場合、そちらも `merge_data_to_record_without_version()` で同期
- フィードバックメール、リクエストメール、アイテム申請は最新バージョンにもコピー
- `ItemLink` は下書き・最新・バージョンなしPIDの3つに対して更新

## 9. DOI登録の詳細

- `doi_ra` の有効値（`WEKO_IMPORT_DOI_TYPE`）: `"JaLC"`, `"Crossref"`, `"DataCite"`, `"NDL JaLC"`
- `doi` を指定して `doi_ra` が未指定の場合はエラー
- DOIプレフィックスは指定RAのシステム設定プレフィックスと一致する必要がある
- **識別子変更モード:** TSVのDOI/DOI_RAをそのまま使用。既存DOIと異なる場合は既存を削除して再登録
- **通常モード:**
  - JaLC/Crossref/DataCite（NDL JaLC以外）: サフィックス未指定の場合は `prepare_doi_link()` で自動生成
  - NDL JaLC: 完全なDOI（prefix/suffix）をユーザーが指定する必要がある
- DOI重複・取り下げチェック（`check_existed_doi()`）が登録前に実行される
- DOI付きアイテムは `"private"` に設定不可
- DOI付きアイテムは公開ステータス+公開ハーベストのインデックスに登録されている必要がある
- DOI登録後、バージョンなし・最新バージョン両方のデポジットを `commit()` + `publish_without_commit()`

## 10. CNRI登録の詳細

- 形式: `prefix/suffix`（最大290文字）
- プレフィックスはシステムのHandleプレフィックス（`Handle().get_prefix()`）と一致する必要がある
- サフィックス未指定の場合は `{item_id:010d}` で自動生成
- **識別子変更モード:** CNRIは必須。サフィックス未指定時は自動生成。`register_hdl_by_handle()` で登録
- **通常モード:** 新規アイテムは `register_hdl_by_item_id()` で自動登録。既存アイテムで既存CNRIと不一致の場合はエラー

## 11. システムアイテム自動補完（`handle_fill_system_item`）

JPCOARマッピングを使用して3つのシステムアイテムタイプのURI値を自動補完する（`WEKO_IMPORT_SYSTEM_ITEMS`）:

| アイテムタイプ | 動作 | URI定数 |
|---|---|---|
| `resource_type` | タイプ値からCOAR URI（`rdf:resource`）を自動設定（例: "journal article" → COAR URI） | `RESOURCE_TYPE_URI`（80エントリ） |
| `version_type` | バージョンタイプURIを自動設定（AO, SMUR, AM, P, VoR, CVoR, EVoR, NA） | `VERSION_TYPE_URI`（8エントリ） |
| `access_right` | アクセス権URIを自動設定 | `ACCESS_RIGHT_TYPE_URI`（4エントリ） |

`recursive_sub()` 内部関数がネストされたメタデータ構造を走査し、値に対応するURIを設定する。

### DOI識別子登録の処理

`handle_fill_system_item` では上記3つのURI自動補完に加えて、DOI識別子登録（`identifierRegistration`）に関する以下の処理も行う:

- JPCOARマッピングから `identifierRegistration.@attributes.identifierType` のキーを取得
- TSVのDOI/DOI_RAと、既存レコードに登録済みのDOI/DOI_RAを比較
- **識別子変更モード:** TSVの値を優先
- **通常モード:** 登録済みの値を優先し、不整合がある場合はTSVの値を自動修正して警告を付与
- DOIプレフィックスをシステム設定と照合し、不一致の場合はエラー
- メタデータ内の `subitem_identifier_reg_type` / `subitem_identifier_reg_text` を自動設定

## 12. バリデーションルールまとめ

| フィールド | ルール |
|---|---|
| `.publish_status` | 必須。`"public"` または `"private"` |
| `.edit_mode` | 更新時必須。`"Keep"` または `"Upgrade"` |
| タイトル | 必須（メタデータからJPCOARマッピング経由で抽出） |
| `.uri` | 既存アイテムの場合 `{host}/records/{id}` と一致 |
| `.id` | 指定時、レコードが存在し削除されていないこと |
| 日付 | ISO形式: yyyy-MM-dd, yyyy-MM, yyyy |
| `.feedback_mail` | メールアドレス正規表現パターンに一致 |
| `.doi_ra` | 指定時は4つの有効値のいずれか |
| `.doi` | プレフィックスがRAのシステムDOIプレフィックスと一致 |
| `.cnri` | 最大290文字、プレフィックスがシステムHandleプレフィックスと一致 |
| ファイルパス | 新規アイテムの場合ZIP内に存在すること。ファイル名がメタデータ内の `filename` と一致すること |
| サムネイル | 対応形式: gif, jpg, jpe, jpeg, png, bmp, tiff, tif |
| 著者識別子スキーム | `nameIdentifierScheme` が AuthorsPrefixSettings に登録されていること |
| 著者所属スキーム | AuthorsAffiliationSettings に登録されていること |
| DOI + private | DOI付きアイテムは private 不可 |
| DOI + インデックス | DOI付きアイテムは公開インデックス+公開ハーベスト必須 |
| カラムキーパス | 重複不可。アイテムタイプのマッピング定義と整合が必要 |

## 13. GakuNin RDM API モード

`is_gakuninrdm=True` でAPIから呼び出される場合の特殊動作:

- 一時ディレクトリのプレフィックスが `deposit_activity_` に変更
- 読み込むレコードは **先頭1件のみ** に制限
- バリデーション段階で以下をスキップ:
  - `handle_check_cnri`
  - `handle_check_doi_indexes`
  - `handle_check_doi_ra`
  - `handle_check_doi`
- 実行段階で以下をスキップ:
  - CNRI Handle登録
  - DOI登録
  - 公開ステータス更新
  - ES通知（`send_item_created_event_to_es`）

## 14. その他のインポートモード

TSVインポート以外に、以下のインポートモードが存在する:

### JPCOAR XML インポート（`generate_metadata_from_jpcoar()`）

- JPCOAR v2 形式のXMLファイルからメタデータを読み込み
- `JPCOARV2Mapper` クラスでXML→アイテムタイプメタデータへのマッピングを実行
- `handle_fill_system_item` は呼ばれない（コメントアウト）
- `handle_validate_item_import` でJSONスキーマバリデーションは実行

### RO-Crate/BagIt インポート（`check_jsonld_import_items()`）

TSVパイプラインにはない追加のバリデーション手順:

| 関数 | 説明 |
|---|---|
| `handle_save_bagit()` | BagItマニフェストの検証・保存 |
| `handle_metadata_amend_by_doi()` | DOIからメタデータを補完 |
| `handle_flatten_data_encode_filename()` | ネストデータの平坦化・ファイル名エンコード |
| `handle_check_operation_flags()` | `wk:metadataReplace` フラグの処理 |
| `handle_check_item_link()` | アイテムリンクURLとタイプの検証 |
| `handle_check_duplicate_item_link()` | 重複・自己参照アイテムリンクのチェック |

### ファイル差替インポート（`check_replace_file_import_items()`）

ファイルのみを差し替える簡略化されたバリデーションパイプライン。TSVパイプラインから以下が省略される:
- `handle_check_duplicate_record`
- `handle_check_and_prepare_item_application`
- `handle_check_restricted_access_property`
- `handle_shared_ids`

## 参考資料

### WEKO3 ソースコード

- [weko_search_ui/utils.py](https://github.com/RCOSDP/weko/blob/main/modules/weko-search-ui/weko_search_ui/utils.py) — インポート処理メインロジック
- [weko_search_ui/config.py](https://github.com/RCOSDP/weko/blob/main/modules/weko-search-ui/weko_search_ui/config.py) — 設定定数（`WEKO_EXPORT_TEMPLATE_BASIC_ID`, `WEKO_IMPORT_SYSTEM_ITEMS` 等）
- [weko_items_ui/utils.py](https://github.com/RCOSDP/weko/blob/main/modules/weko-items-ui/weko_items_ui/utils.py) — アイテムUI関連ユーティリティ

### 主要設定定数（config.py）

| 定数 | 値 | 説明 |
|---|---|---|
| `WEKO_IMPORT_PUBLISH_STATUS` | `["public", "private"]` | 公開ステータスの有効値 |
| `WEKO_IMPORT_DOI_TYPE` | `["JaLC", "Crossref", "DataCite", "NDL JaLC"]` | DOI RAの有効値 |
| `WEKO_IMPORT_EMAIL_PATTERN` | `r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"` | メールアドレス検証パターン |
| `WEKO_IMPORT_THUMBNAIL_FILE_TYPE` | `["gif", "jpg", "jpe", "jpeg", "png", "bmp", "tiff", "tif"]` | サムネイル対応形式 |
| `WEKO_SEARCH_UI_IMPORT_TMP_PREFIX` | `"weko_import_"` | インポート一時ディレクトリプレフィックス |
| `WEKO_SEARCH_UI_ROCRATE_IMPORT_TMP_PREFIX` | `"weko_rocrate_import_"` | RO-Crateインポート一時ディレクトリプレフィックス |
| `RESOURCE_TYPE_URI` | 80エントリ | 資源タイプ→COAR URI マッピング |
| `VERSION_TYPE_URI` | 8エントリ | バージョンタイプ→COAR URI マッピング |
| `ACCESS_RIGHT_TYPE_URI` | 4エントリ | アクセス権→COAR URI マッピング |
