# WEKO3 メタデータプロパティキーの命名規則

TSVインポート/エクスポートファイルの2行目（ヘッダー行）に使用されるプロパティキーの命名規則をまとめる。

## 概要

WEKO3のメタデータプロパティキーには3つのパターンが存在する。

| パターン | 形式 | 例 | 生成元 |
|----------|------|-----|--------|
| 1 | `item_{item_type_id}_{property_name}{index}` | `item_30002_title0` | 既存アイテムタイプからのコピー |
| 2 | `item_{timestamp}` | `item_1701999865909` | Web UIからの新規プロパティ追加 |
| 3 | `item_{standard_name}` | `item_creator` | WEKO2からの移行（JuNii2マッピング経由）？ |

## パターン1: `item_{item_type_id}_{property_name}{index}`

### 形式

```
item_{ベースアイテムタイプID}_{プロパティ名}{連番}
```

### 構成要素

| 部分 | 説明 | 例 |
|------|------|-----|
| `item_` | 固定プレフィックス | - |
| `{item_type_id}` | コピー元（ベース）のアイテムタイプID | `30002` |
| `_{property_name}` | JPCOAR メタデータ要素に対応するプロパティ名 | `_title`, `_creator`, `_funding_reference` |
| `{index}` | アイテムタイプ定義内でのプロパティの並び順（0始まり） | `0`, `2`, `21` |

### 国際農研リポジトリの例

アイテムタイプ「国際農研デフォルトアイテムタイプ（フル）」(ID: 40039) は、「デフォルトアイテムタイプ（フル）」(ID: 30002) をコピーして作成されている。そのため、プロパティキーには元のID `30002` が残っている。

```
item_30002_title0                    → タイトル（0番目のプロパティ）
item_30002_alternative_title1        → その他のタイトル（1番目）
item_30002_creator2                  → 作成者（2番目）
item_30002_contributor3              → 寄与者（3番目）
item_30002_access_rights4            → アクセス権（4番目）
item_30002_apc5                      → APC（5番目）
item_30002_rights6                   → 権利情報（6番目）
item_30002_rights_holder7            → 権利者情報（7番目）
item_30002_subject8                  → 主題（8番目）
item_30002_description9              → 内容記述（9番目）
item_30002_publisher10               → 出版者（10番目）
item_30002_date11                    → 日付（11番目）
item_30002_language12                → 言語（12番目）
item_30002_resource_type13           → 資源タイプ（13番目）
item_30002_version14                 → バージョン情報（14番目）
item_30002_version_type15            → 出版タイプ（15番目）
item_30002_identifier16              → 識別子（16番目）
item_30002_identifier_registration17 → ID登録（17番目）
item_30002_relation18                → 関連情報（18番目）
item_30002_temporal19                → 時間的範囲（19番目）
item_30002_geolocation20             → 位置情報（20番目）
item_30002_funding_reference21       → 助成情報（21番目）
item_30002_source_identifier22       → 収録物識別子（22番目）
item_30002_source_title23            → 収録物名（23番目）
item_30002_volume_number24           → 巻（24番目）
item_30002_issue_number25            → 号（25番目）
item_30002_number_of_pages26         → ページ数（26番目）
item_30002_page_start27              → 開始ページ（27番目）
item_30002_page_end28                → 終了ページ（28番目）
item_30002_bibliographic_information29 → 書誌情報（29番目）
item_30002_dissertation_number30     → 学位授与番号（30番目）
item_30002_degree_name31             → 学位名（31番目）
item_30002_date_granted32            → 学位授与年月日（32番目）
item_30002_degree_grantor33          → 学位授与機関（33番目）
item_30002_conference34              → 会議記述（34番目）
item_30002_file35                    → ファイル情報（35番目）
item_30002_heading36                 → 見出し（36番目）
```

### キー生成のソースコード

WEKO3ソースコード [register_item_types.py](https://github.com/RCOSDP/weko/blob/main/scripts/demo/register_item_types.py) にて、デフォルトアイテムタイプの登録時にキーが生成される:

```python
for idx, property in enumerate(item_type_def.property_list):
    property.add_func(
        post_data=item_type,
        key='item_{}'.format(item_type_id) + str(idx),
        ...
    )
```

- `item_type_id`: [item_type_config.py](https://github.com/RCOSDP/weko/blob/main/scripts/demo/item_types/item_type_config.py) で定義（例: `DEFAULT_ITEM_TYPE_FULL = "30002"`）
- `property_list`: [default_item_type_full.py](https://github.com/RCOSDP/weko/blob/main/scripts/demo/item_types/default_item_type_full.py) 等で定義されるプロパティの配列
- `idx`: `property_list` の `enumerate` インデックス（0始まり）
- プロパティ名部分（`_title`, `_creator`等）: 各プロパティの `.py` ファイル（[properties/](https://github.com/RCOSDP/weko/tree/main/scripts/demo/properties) 配下）の `add()` 関数内で組み込まれる

### item_type_config.py の主要ID

| 定数名 | ID | 用途 |
|--------|-----|------|
| `DEFAULT_ITEM_TYPE_SIMPLE` | 30001 | デフォルトアイテムタイプ（シンプル） |
| `DEFAULT_ITEM_TYPE_FULL` | 30002 | デフォルトアイテムタイプ（フル） |
| `DEFAULT_JOURNAL_ARTICLE` | 10001 | 雑誌論文 |
| ハーベスト用 | 1〜13 | ハーベスト用アイテムタイプ |

### JPCOAR 2.0 追加プロパティ

デフォルトアイテムタイプ（フル）(30002) には、JPCOAR 2.0 で追加されたプロパティも含まれる。これらはシステム管理者によって追加されたもので、タイムスタンプベースのキーを持つ:

```
item_1698624001  → データセットシリーズ
item_1698624002  → 原文の言語
item_1698624003  → 大きさ
item_1698624004  → カタログ
item_1698624005  → 出版者情報
item_1698624006  → 版
item_1698624007  → 部編名
item_1698624008  → 日付（リテラル）
item_1698624009  → 所蔵機関
item_1698624010  → 物理的形態
```

これらは連番のタイムスタンプ（`1698624001`〜`1698624010`）であり、一括でシステム的に追加されたことを示す。

## パターン2: `item_{timestamp}`

### 形式

```
item_{ミリ秒UNIXタイムスタンプ}
```

### 説明

Web UIの「アイテムタイプ管理」画面からプロパティを新規追加した場合に生成される。

[create_itemtype.js](https://github.com/RCOSDP/weko/blob/main/modules/weko-itemtypes-ui/weko_itemtypes_ui/static/js/weko_itemtypes_ui/create_itemtype.js):

```javascript
$('#btn_new_itemtype_meta').on('click', function(){
    new_meta_row('item_' + $.now(), propertyOptions);
});
```

`$.now()` は jQueryのメソッドで、現在時刻のミリ秒UNIXタイムスタンプを返す。

### 国際農研リポジトリの例

ID 30002 からコピーした ID 40039 に、Web UIから独自プロパティを追加した例:

```
item_1701993965635  → 中長期計画の期（セレクト）
item_1701999865909  → 研究プログラム（チェックボックス）
item_1701999941521  → 研究プロジェクト（チェックボックス）
item_1701999986904  → 課題コード（テキスト）
item_1706682892131  → マニュアル等番号（テキスト）
item_1706849566516  → サムネイル
item_1718601498132  → JIRCAS受付番号（テキスト）
```

## パターン3: `item_{standard_name}`（item_type_idなし）

### 形式

```
item_{プロパティ名}
```

item_type_id や連番を含まない形式。

### 説明

つくばリポジトリ（アイテムタイプJ(5)）のTSVに見られるパターン。つくばリポジトリはWEKO2からJuNii2フォーマットのマッピングを経てWEKO3にインポート（移行）されている。この移行プロセスにおいて、別の命名規則が適用された可能性がある。

### つくばリポジトリの例

```
item_files          → ファイル情報
item_titles         → タイトル
item_creator        → 著者
item_language       → 言語
item_resource_type  → 資源タイプ
item_keyword        → キーワード
item_access_right   → アクセス権
```

これらに加え、パターン1（`item_5_description_4` 等）やパターン2（`item_1742562522665` 等）のキーも混在している。

### つくばリポジトリのキー混在状況

| パターン | 例 | 推定される由来 |
|----------|-----|---------------|
| `item_{name}` | `item_creator` | WEKO2からの移行時に生成 |
| `item_5_{name}_{index}` | `item_5_description_4` | アイテムタイプ5の初期定義 |
| `item_{timestamp}` | `item_1742562522665` | Web UIからの後日追加 |

## TSVヘッダー行でのプロパティキーの使われ方

TSVの2行目では、プロパティキーは `.metadata.` プレフィックスと子要素のパスを伴う:

```
.metadata.{property_key}[{array_index}].{sub_item_name}
```

例:
```
.metadata.item_30002_funding_reference21[0].subitem_funder_identifiers.subitem_funder_identifier_type
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         プロパティキー（パターン1）         子要素のJSONパス
```

- `[0]`, `[1]` 等: 配列フィールドの繰り返しインデックス（TSV上での展開）
- `.subitem_xxx`: 子要素名（プロパティ定義内のJSON Schemaで定義）

## 参考資料

- [RCOSDP/weko - GitHub](https://github.com/RCOSDP/weko) — WEKO3ソースコード
- [register_item_types.py](https://github.com/RCOSDP/weko/blob/main/scripts/demo/register_item_types.py) — デフォルトアイテムタイプ登録スクリプト
- [item_type_config.py](https://github.com/RCOSDP/weko/blob/main/scripts/demo/item_types/item_type_config.py) — アイテムタイプID定数定義
- [create_itemtype.js](https://github.com/RCOSDP/weko/blob/main/modules/weko-itemtypes-ui/weko_itemtypes_ui/static/js/weko_itemtypes_ui/create_itemtype.js) — Web UIキー生成コード
- [properties/](https://github.com/RCOSDP/weko/tree/main/scripts/demo/properties) — プロパティ定義ファイル群
