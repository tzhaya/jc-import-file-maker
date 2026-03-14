# WEKO3 TSVインポート仕様

WEKO3 ソースコード（[RCOSDP/weko](https://github.com/RCOSDP/weko)）から調査したTSVインポート処理の仕様をまとめる。

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

## 2. TSVファイル構造 — 5行のヘッダー + データ行

| 行 | 用途 | 内容 |
|----|------|------|
| **1行目** | アイテムタイプ宣言 | `#ItemType`, アイテムタイプ名, スキーマURL（例: `https://host/.../items/jsonschema/30002`）。URLの末尾セグメントからアイテムタイプIDを抽出 |
| **2行目** | カラムキーパス | ドット記法のパス（例: `#.id`, `.uri`, `.metadata.item_30002_title0[0].subitem_title`） |
| **3行目** | カラムラベル | 人間可読な名前（例: `#ID`, `URI`, `タイトル.タイトル`） |
| **4行目** | コメント/オプション | `#` で始まる場合スキップ |
| **5行目** | コメント/オプション | `#` で始まる場合スキップ |
| **6行目以降** | データ行 | 2行目のカラムパスに対応する値 |

- 1行目は最低3カラム必要
- アイテムタイプIDは数値で、既存アイテムタイプの最新バージョンを参照する必要がある

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
| `.researchmap_linkage` | `.RESEAECHMAP_LINKAGE` | （空） | researchmap CRIS連携フラグ |
| `.cnri` | `.CNRI` | （空） | CNRI（Handle）識別子。形式: `prefix/suffix`。最大290文字。プレフィックスはシステムのHandleプレフィックスと一致する必要がある |
| `.doi_ra` | `.DOI_RA` | （空） | DOI登録機関。有効値: `"JaLC"`, `"Crossref"`, `"DataCite"`, `"NDL JaLC"` |
| `.doi` | `.DOI` | （空） | DOI値（prefix/suffix）。プレフィックスは指定RAのシステムDOIプレフィックスと一致する必要がある |
| `.edit_mode` | `Keep/Upgrade Version` | `Required` | **更新時必須。** `"Keep"` または `"Upgrade"`。`Keep` = 最終バージョンを上書き更新。`Upgrade` = `newversion()` で新バージョン作成。空の場合は `"Keep"` がデフォルト |

### 追加のシステムカラム（テンプレート外）

| キーパス | 説明 |
|---|---|
| `.file_path[0]`, `.file_path[1]`, ... | ZIP内 `data/` ディレクトリからの相対パスでコンテンツファイルを参照 |
| `.thumbnail_path[0]` | サムネイル画像のパス（対応形式: gif, jpg, jpe, jpeg, png, bmp, tiff, tif） |
| `.metadata_replace`（`wk:metadataReplace`） | `True` の場合、メタデータのみ更新しアップロードファイルは無視。新規アイテムには使用不可 |

## 4. `.metadata.*` カラムの解析

`parse_to_json_form()` 関数がカラムヘッダーパスをネストしたJSONに変換する。

### パス変換の流れ

1. `handle_generate_key_path(key)` がドット記法を変換:
   - `#.` と `#` を `.` に、`[` を `.` に、`]` を空に置換
   - `.` で分割し、先頭の空文字列を除去
   - 例:
     - `.metadata.item_30002_funding_reference21[0].subitem_funder_identifiers.subitem_funder_identifier`
     - → `["metadata", "item_30002_funding_reference21", "0", "subitem_funder_identifiers", "subitem_funder_identifier"]`

2. `set_nested_item()` がネストされたパスに値を設定（`DefaultOrderedDict` 使用）

3. `convert_data()` が後処理: dictの全キーが数値文字列（`"0"`, `"1"`, ...）の場合、リストに変換

### 空値の扱い

空値は **スキップ** される。ただし以下の場合は例外:
- キーが `file_path` または `thumbnail_path` で始まる場合
- キーの最後のセグメントが `filename` の場合
- `include_empty=True` が指定された場合

## 5. インポート処理パイプライン

### バリデーション段階（`check_tsv_import_items()`）

以下の順序で実行:

1. **ZIP展開** — 一時ディレクトリ（`/tmp/weko_import_YYYYMMDDHHMMSS/data/`）に展開
2. **TSV/CSV読み込み** — `read_stats_file()` → `unpackage_import_file()`
3. **識別子変更フラグ設定** — `handle_set_change_identifier_flag`
4. **システムアイテム自動補完** — `handle_fill_system_item`（後述）
5. **JSONスキーマバリデーション** — `handle_validate_item_import`（アイテムタイプスキーマに対して検証）
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
16. **ファイルメタデータチェック** — `handle_check_file_metadata`（file_path, thumbnail_pathがZIP内に存在するか）
17. **制限付きアクセスプロパティチェック** — `handle_check_restricted_access_property`
18. **共有IDチェック** — `handle_shared_ids`
19. **著者プレフィックスチェック** — `handle_check_authors_prefix`（nameIdentifierSchemeがAuthorsPrefixSettingsに登録されているか）
20. **著者所属チェック** — `handle_check_authors_affiliation`
21. **CNRIチェック** — `handle_check_cnri`
22. **DOIインデックスチェック** — `handle_check_doi_indexes`（DOIアイテムは公開インデックス+公開ハーベストが必要）
23. **DOI RAチェック** — `handle_check_doi_ra`
24. **DOIチェック** — `handle_check_doi`

### 実行段階（`import_items_to_system()`）

1. **デポジット作成/取得** — 新規アイテムは `create_deposit()`、既存アイテムはPIDで取得
2. **メタデータ登録** — `register_item_metadata()`（ファイルアップロード、デポジットレコード更新）
3. **CNRI Handle登録** — `register_item_handle()`（CNRIシステム有効時）
4. **DOI登録** — `register_item_doi()`
5. **公開ステータス更新** — `"public"` = インデックス0、`"private"` = インデックス1
6. **データベースコミット**
7. **外部システム呼び出し**
8. **未使用ファイルクリーンアップ**

## 6. ファイル処理

- `.file_path[N]` カラムがZIP内の `data/` ディレクトリからの相対パスでファイルを参照
- `up_load_file()` でアイテムのストレージバケットにアップロード
- メタデータ内のファイル名（`.metadata.*` 内の `filename`）と file_path の参照は整合している必要がある
- **新規アイテム**: ZIP内にファイルが存在しない場合はエラー
- **更新アイテム**: ZIP内にファイルが存在しない場合は警告（メタデータのみ更新）
- ファイルサイズは自動計算され、フォーマット済み文字列（B/KB/MB/GB/TB）として格納
- メタデータ文字列中の `<br/>` は `\n` に変換（`escape_newline()`）

## 7. サムネイル処理

- `.thumbnail_path` カラムがZIP内の画像ファイルを参照
- 対応形式: `gif, jpg, jpe, jpeg, png, bmp, tiff, tif`
- `is_thumbnail=True` フラグ付きで格納
- サムネイルメタデータ（ラベル、URL）は `autofill_thumbnail_metadata()` で自動補完

## 8. バージョン処理（Keep vs Upgrade）

| モード | 動作 |
|--------|------|
| `Keep` | `merge_data_to_record_without_version(keep_version=True)` で最終バージョンを上書き |
| `Upgrade` / `new` | `deposit.newversion(pid)` → `publish_without_commit()` で新バージョン作成 |

## 9. DOI登録の詳細

- `doi_ra` の有効値: `"JaLC"`, `"Crossref"`, `"DataCite"`, `"NDL JaLC"`
- `doi` を指定して `doi_ra` が未指定の場合はエラー
- DOIプレフィックスは指定RAのシステム設定プレフィックスと一致する必要がある
- JaLC/Crossref/DataCite（NDL JaLC以外）: サフィックス未指定の場合は `{item_id:010d}` で自動生成
- NDL JaLC: 完全なDOI（prefix/suffix）をユーザーが指定する必要がある
- DOI重複・取り下げチェックが登録前に実行される
- DOI付きアイテムは `"private"` に設定不可
- DOI付きアイテムは公開ステータス+公開ハーベストのインデックスに登録されている必要がある

## 10. CNRI登録の詳細

- 形式: `prefix/suffix`（最大290文字）
- プレフィックスはシステムのHandleプレフィックス（`Handle().get_prefix()`）と一致する必要がある
- サフィックス未指定の場合は `{item_id:010d}` で自動生成
- 識別子変更モード: CNRIは必須
- 通常モード: 新規アイテムにCNRIは設定不可。既存アイテムは既存CNRIと一致する必要がある

## 11. システムアイテム自動補完（`handle_fill_system_item`）

JPCOARマッピングを使用して3つのシステムアイテムタイプのURI値を自動補完する（`WEKO_IMPORT_SYSTEM_ITEMS`）:

| アイテムタイプ | 動作 |
|---|---|
| `resource_type` | タイプ値からCOAR URI（`rdf:resource`）を自動設定（例: "journal article" → COAR URI） |
| `version_type` | バージョンタイプURIを自動設定 |
| `access_right` | アクセス権URIを自動設定 |

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
| ファイルパス | 新規アイテムの場合ZIP内に存在すること |
| サムネイル | 対応形式: gif, jpg, jpe, jpeg, png, bmp, tiff, tif |
| 著者識別子スキーム | `nameIdentifierScheme` が AuthorsPrefixSettings に登録されていること |
| 著者所属スキーム | AuthorsAffiliationSettings に登録されていること |
| DOI + private | DOI付きアイテムは private 不可 |
| DOI + インデックス | DOI付きアイテムは公開インデックス+公開ハーベスト必須 |

## 参考資料

### WEKO3 ソースコード

- [weko_search_ui/utils.py](https://github.com/RCOSDP/weko/blob/main/modules/weko-search-ui/weko_search_ui/utils.py) — インポート処理メインロジック
- [weko_search_ui/config.py](https://github.com/RCOSDP/weko/blob/main/modules/weko-search-ui/weko_search_ui/config.py) — 設定定数（`WEKO_EXPORT_TEMPLATE_BASIC_ID`, `WEKO_IMPORT_SYSTEM_ITEMS` 等）
- [weko_items_ui/utils.py](https://github.com/RCOSDP/weko/blob/main/modules/weko-items-ui/weko_items_ui/utils.py) — アイテムUI関連ユーティリティ
