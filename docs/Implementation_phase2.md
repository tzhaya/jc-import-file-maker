# Phase 2: TSV エクスポート機能の実装プラン

## Context

`make_jc_importer.html` は DOI → API取得 → メタデータ編集UI を実装済みだが、WEKO インポート用TSVファイルの出力機能が未実装。Phase 2 として DOM → JSON → TSV のパイプラインを追加する。

## 前提条件

**JPCOAR スキーマ 2.0 対応（#25）のフェーズ1-a が完了していること。**

DOM の構造・フィールドキー・語彙が固まってから TSV 出力を実装することで、列定義の二度手間を防ぐ。
以下の issue がすべて完了していることを確認してから着手すること:

| issue | 内容 | TSV への影響 |
|---|---|---|
| #26 | nameIdentifier スキーム語彙の更新 | スキーム値が変わる |
| #27 | `creatorType` 属性の追加 | creator の DOM にサブフィールドが増える |
| #28 | 言語コード `ja-Kana` → `ja-Latn` | lang 属性の値が変わる |
| #29 | `relationType` 語彙への追加 | relationType の値が変わる |
| #31 | `resourceType` 語彙の更新 | resourcetype の値が変わる |
| #34 | 助成情報にプログラム情報フィールドを追加 | funding の DOM にサブフィールドが増える |

フェーズ1-b（#30 出版者必須度変更）は UI のみで DOM 構造に影響しないため、TSV 実装と並行可能。
フェーズ2-b（#32 出版者情報・#33 日付リテラル）は新規フィールド追加であり、TSV 実装後に `TSV_EXCLUDED_GROUPS` から除外して対応する。

## 対象ファイル

- **編集**: `make_jc_importer.html`（単一ファイルアプリ）
- **参照**: `samples/デフォルトアイテムタイプ（フル）(30002).tsv`（出力フォーマットの基準）

## 出力ルール

- **空フィールドの省略**: 値が存在しないフィールドの列はTSVに出力しない
  - フィールド全体が空の場合（例: contributor3 にデータなし → contributor3 の列群すべてを省略）
  - 複合型の内部配列が空の場合（例: creator2 に nameIdentifiers がない → その識別子列を省略）
- **除外フィールド**: heading36, file35, dissertation30〜degree33, apc5, item_1698624001〜item_1698624010 は常に出力しない
- **System列の自動補完**: RESOURCE_TYPE_MAP, ACCESS_RIGHTS_MAP 等から自動計算

## アーキテクチャ

```
DOM (input/select/textarea)
  ↓ collectFromDOM()
metadata JSON （mapToItemType()と同じ構造）
  ↓ generateTsv(metadata)
  ├─ buildColumnDefs(metadata)   ... 配列サイズに応じた列定義の動的生成（空フィールド省略）
  ├─ buildHeaderRows(columnDefs) ... ヘッダ5行の組み立て
  └─ buildDataRow(columnDefs, metadata) ... データ行の値取得
  ↓
TSV文字列 → downloadTsv() → ブラウザダウンロード（UTF-8 BOM, LF）
```

## 実装ステップ

### Step 1: TSV列テンプレート定義（`TSV_COL_GROUPS`）

30002.tsv の列構造を「列グループ」として定義する。各グループは1つのメタデータフィールドに対応し、配列インデックスの展開ルールを持つ。

```javascript
// 列グループ定義：各フィールドの「[0]1個分」の列テンプレート
const TSV_COL_GROUPS = [
  // --- システムフィールド（固定11列、展開なし） ---
  { id: 'system', expandable: false, columns: [
    { key: '.id', label: 'ID', sys: '', con: '' },
    { key: '.uri', label: 'URI', sys: '', con: '' },
    { key: '.metadata.path[0]', label: '.IndexID[0]', sys: '', con: 'Allow Multiple' },
    // ... 残り8列
  ]},

  // --- 単純配列型（FIELD_DEFSのarray型）---
  // タイトル: トップレベル[i]で展開
  { id: 'item_30002_title0', expandable: true, arrayPath: 'item_30002_title0',
    columns: [
      { key: '.metadata.item_30002_title0[{i}].subitem_title',
        label: 'タイトル[{i}].タイトル', sys: '', con: 'Required, Allow Multiple' },
      { key: '.metadata.item_30002_title0[{i}].subitem_title_language',
        label: 'タイトル[{i}].言語', sys: '', con: 'Required, Allow Multiple' },
    ]},

  // --- 複合型（creator等）--- 多段配列展開
  // 作成者: [i]=作成者, 内部に [j]=姓名/姓/名/識別子/所属, [k]=所属機関名/識別子
  { id: 'item_30002_creator2', expandable: true, arrayPath: 'item_30002_creator2',
    // 1人分の列テンプレート（内部配列も展開対象）
    subGroups: [
      { subArrayPath: 'creatorAffiliations', nestedGroups: [
        { subArrayPath: 'affiliationNameIdentifiers', columns: [
          { keyTpl: '...creator2[{i}].creatorAffiliations[{j}].affiliationNameIdentifiers[{k}].affiliationNameIdentifier',
            labelTpl: '作成者[{i}].作成者所属[{j}].所属機関識別子[{k}].所属機関識別子' },
          // ...
        ]},
        { subArrayPath: 'affiliationNames', columns: [/*...*/] },
      ]},
      { subArrayPath: 'creatorAlternatives', columns: [/*...*/] },
      { subArrayPath: 'creatorMails', columns: [/*...*/] },
      { subArrayPath: 'creatorNames', columns: [/*...*/] },
      // creatorType（スカラー → 配列展開なし）
      { scalar: true, columns: [/*...*/] },
      { subArrayPath: 'familyNames', columns: [/*...*/] },
      { subArrayPath: 'givenNames', columns: [/*...*/] },
      { subArrayPath: 'nameIdentifiers', columns: [/*...*/] },
    ]},

  // --- 単純オブジェクト型（展開なし） ---
  { id: 'item_30002_access_rights4', expandable: false, columns: [
    { key: '.metadata.item_30002_access_rights4.subitem_access_right',
      label: 'アクセス権.アクセス権', sys: 'System', con: '' },
    { key: '.metadata.item_30002_access_rights4.subitem_access_right_uri',
      label: 'アクセス権.アクセス権URI', sys: '', con: '' },
  ]},

  // ... 残りの全フィールド（30002.tsv の列順序に従う）
];
```

**ポイント**: 列の順序と日本語ラベルは 30002.tsv と完全一致させる。テンプレート中の `{i}`, `{j}`, `{k}` は展開時に実際のインデックスに置換する。

#### contributor3 サブグループのキー名注意事項

creator と contributor は同じ `renderOnePerson()` を共有するが、内部フィールドキー名が異なる（[renderPersonField L2508-2518](../make_jc_importer.html#L2508)）。TSV_COL_GROUPS の contributor3 サブグループでは以下の正しいキーを使うこと：

| サブフィールド | creator のキー | contributor のキー（TSV実キー） |
|---|---|---|
| 姓名言語 | `creatorNameLang` | `lang` |
| 名前タイプ | `creatorNameType` | `nameType` |
| 所属機関名配列キー | `affiliationNames` | `contributorAffiliationNames` |
| 所属機関名フィールド | `affiliationName` | `contributorAffiliationName` |
| 所属機関名言語 | `affiliationNameLang` | `contributorAffiliationNameLang` |
| 所属識別子配列キー | `affiliationNameIdentifiers` | `contributorAffiliationNameIdentifiers` |
| 所属識別子フィールド | `affiliationNameIdentifier` | `contributorAffiliationNameIdentifier` |
| 所属識別子Scheme | `affiliationNameIdentifierScheme` | `contributorAffiliationScheme` |
| 所属識別子URI | `affiliationNameIdentifierURI` | `contributorAffiliationURI` |

#### identifier16 の列順注意事項

TSV の列順は `subitem_identifier_type` → `subitem_identifier_uri`（タイプが先）だが、FIELD_DEFS の定義順は逆（URI が先）。TSV_COL_GROUPS はTSV列順（タイプ→URI）に合わせること。

### Step 2: DOM → JSON 収集関数（`collectFromDOM()`）

DOMの入力要素を走査して、`mapToItemType()` と同じ構造の JSON オブジェクトを返す。

#### システムフィールドのキー名マッピング

DOM の `dataset.key` には `sys_*` プレフィックスが付く（`sys_id`, `sys_uri` 等）が、`buildEmptyMetadata().system` や `getSystemValue()` で使う内部キーはプレフィックスなし（`id`, `uri` 等）。`collectFromDOM()` でマッピングが必要。

```javascript
// DOM dataset.key → metadata.system キー 変換マップ
const SYS_KEY_MAP = {
  sys_id:      'id',
  sys_uri:     'uri',
  sys_path:    'path',
  sys_pos:     'pos_index',
  sys_status:  'publish_status',
  sys_mail:    'feedback_mail',
  sys_cnri:    'cnri',
  sys_doi_ra:  'doi_ra',
  sys_doi:     'doi',
  sys_edit:    'edit_mode',
  sys_pubdate: 'pubdate',
};

function collectFromDOM() {
  const metadata = {};

  // 1. システムフィールド（dataset.key → 内部キーに変換）
  metadata.system = {};
  document.querySelectorAll('#system-fields-body input, #system-fields-body select')
    .forEach(el => {
      const internalKey = SYS_KEY_MAP[el.dataset.key] ?? el.dataset.key;
      metadata.system[internalKey] = el.value;
    });

  // 2. メタデータフィールド（FIELD_DEFS に従い型別に収集）
  for (const def of FIELD_DEFS) {
    const section = document.querySelector(`.field-section[data-key="${def.key}"]`);
    if (!section) { metadata[def.key] = def.type === 'object' || def.type === 'biblio' ? {} : []; continue; }

    switch (def.type) {
      case 'array':       metadata[def.key] = collectArrayField(section, def); break;
      case 'object':      metadata[def.key] = collectObjectField(section, def); break;
      case 'creator':     metadata[def.key] = collectPersonField(section, true); break;
      case 'contributor': metadata[def.key] = collectPersonField(section, false); break;
      case 'relation':    metadata[def.key] = collectRelationField(section); break;
      case 'funding':     metadata[def.key] = collectFundingField(section); break;
      case 'biblio':      metadata[def.key] = collectBiblioField(section); break;  // null返却あり（後述）
      case 'rightsHolder':  metadata[def.key] = collectRightsHolderField(section); break;
      case 'geolocation':   metadata[def.key] = collectGeolocationField(section); break;
      case 'conference':    metadata[def.key] = collectConferenceField(section); break;
    }
  }
  return metadata;
}
```

**各型の収集ロジック**:

- **`collectArrayField(section, def)`**: `.nested-item.level-1` を列挙 → 各アイテム内の `.field-row[data-field-key]` から値を取得
- **`collectObjectField(section, def)`**: `.accordion-content` 内の `.field-row` から直接取得
- **`collectPersonField(section, isCreator)`**: `.nested-item.level-1` = 各人物 → 内部の `.nested-section-header` + `.entry-group` を走査して creatorNames/contributorNames, familyNames, givenNames, nameIdentifiers, creatorAffiliations/contributorAffiliations を再帰的に収集。`isCreator` フラグに応じて上記フィールドキー名テーブルを参照すること
- **`collectRelationField(section)`**: 関連情報の構造（subitem_relation_type, subitem_relation_type_id{object}, subitem_relation_name[array]）を収集
- **`collectFundingField(section)`**: 助成情報（subitem_funder_names[array], subitem_funder_identifiers{object}, subitem_award_titles[array], subitem_award_numbers{object}, subitem_funding_streams[array], subitem_funding_stream_identifiers{object}）を収集
- **`collectBiblioField(section)`**: 書誌情報（単一オブジェクト、内部に bibliographic_titles[array]）を収集。**セクションが空ならば `null` を返す**（`isFieldEmpty()` が null → empty と判定するためTSV出力時に自動スキップされる）
- **`collectRightsHolderField`**: rightHolderNames[array], nameIdentifiers[array]
- **`collectGeolocationField`**: subitem_geolocation_point{object}, subitem_geolocation_box{object}, subitem_geolocation_place[array]
- **`collectConferenceField`**: subitem_conference_names[array], subitem_conference_date{object}, subitem_conference_venues[array], subitem_conference_places[array], subitem_conference_sponsors[array], subitem_conference_country, subitem_conference_sequence

### Step 3: TSV列展開（`buildColumnDefs(metadata)`）

metadata JSON の配列サイズを調べ、TSV_COL_GROUPS のテンプレートを展開して最終的な列定義配列を生成する。
**空フィールドはスキップし、除外対象フィールドも出力しない。**

```javascript
// 除外フィールド（TSVに出力しない）
// ※ apc5 は EXCLUDED_KEYS（API取得対象外）かつ FIELD_DEFS 非定義（UI非表示）のため常に空 → 明示的に除外
const TSV_EXCLUDED_GROUPS = new Set([
  'item_30002_apc5',
  'item_30002_heading36',
  'item_30002_file35',
  'item_30002_dissertation_number30',
  'item_30002_degree_name31',
  'item_30002_date_granted32',
  'item_30002_degree_grantor33',
  'item_1698624001', 'item_1698624002', 'item_1698624003',
  'item_1698624004', 'item_1698624005', 'item_1698624006',
  'item_1698624007', 'item_1698624008', 'item_1698624009',
  'item_1698624010',
]);

// フィールドが空かどうか判定
function isFieldEmpty(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    return Object.values(value).every(v => v === '' || v == null);
  }
  return value === '';
}

function buildColumnDefs(metadata) {
  const columns = []; // { key, label, sys, con } の配列

  for (const group of TSV_COL_GROUPS) {
    // 除外フィールドはスキップ
    if (TSV_EXCLUDED_GROUPS.has(group.id)) continue;

    if (!group.expandable) {
      // 固定列（system, object型）
      // object型で全値が空ならスキップ
      if (group.id !== 'system' && isFieldEmpty(metadata[group.id])) continue;
      columns.push(...group.columns);
    } else if (group.subGroups) {
      // 複合型: 配列が空ならスキップ
      const arr = metadata[group.arrayPath] || [];
      if (arr.length === 0) continue;
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i] || {};
        // 内部配列も空ならその列群をスキップ
        expandSubGroups(columns, group.subGroups, item, { i });
      }
    } else {
      // 単純配列型: 配列が空ならスキップ
      const arr = metadata[group.arrayPath] || [];
      if (arr.length === 0) continue;
      for (let i = 0; i < arr.length; i++) {
        for (const col of group.columns) {
          columns.push({
            key: col.key.replace(/\{i\}/g, i),
            label: col.label.replace(/\{i\}/g, i),
            sys: col.sys, con: col.con,
          });
        }
      }
    }
  }
  return columns;
}

// expandSubGroups 内でも内部配列が空ならスキップ
function expandSubGroups(columns, subGroups, item, indices) {
  for (const sg of subGroups) {
    if (sg.scalar) {
      // スカラーフィールド: 親が存在すれば常に出力
      columns.push(...expandTemplates(sg.columns, indices));
    } else {
      const subArr = item[sg.subArrayPath] || [];
      if (subArr.length === 0) continue; // ★ 空の内部配列はスキップ
      for (let j = 0; j < subArr.length; j++) {
        const subItem = subArr[j] || {};
        const newIndices = { ...indices, j };
        if (sg.nestedGroups) {
          expandSubGroups(columns, sg.nestedGroups, subItem, newIndices);
        } else {
          columns.push(...expandTemplates(sg.columns, newIndices));
        }
      }
    }
  }
}
```

### Step 4: TSV文字列生成（`generateTsv(metadata)`）

```javascript
function generateTsv(metadata) {
  const cols = buildColumnDefs(metadata);

  // Row 1: ItemType
  const row1 = ['#ItemType', 'デフォルトアイテムタイプ（フル）(30002)',
                'https://jircas.repo.nii.ac.jp/items/jsonschema/30002']
               .concat(Array(Math.max(0, cols.length - 3)).fill(''));

  // Row 2-5: ヘッダ
  const row2 = ['#' + cols[0].key, ...cols.slice(1).map(c => c.key)];
  const row3 = ['#' + cols[0].label, ...cols.slice(1).map(c => c.label)];
  const row4 = ['#', ...cols.slice(1).map(c => c.sys)];
  const row5 = ['#', ...cols.slice(1).map(c => c.con)];

  // Row 6: データ行
  const row6 = cols.map(c => getValueByColumnKey(c.key, metadata));

  return [row1, row2, row3, row4, row5, row6]
    .map(row => row.join('\t'))
    .join('\n') + '\n';
}
```

### Step 5: 値の取得（`getValueByColumnKey` / `getSystemValue`）

列キー（例: `.metadata.item_30002_creator2[0].creatorNames[0].creatorName`）をパースして、metadata オブジェクトから対応する値を取得する。

```javascript
function getValueByColumnKey(columnKey, metadata) {
  // システムフィールドの場合
  if (!columnKey.startsWith('.metadata.')) {
    return getSystemValue(columnKey, metadata.system);
  }

  // .metadata. を除去してパスをパース
  const path = columnKey.replace(/^\.metadata\./, '');
  // 例: "item_30002_creator2[0].creatorNames[0].creatorName"
  // → ["item_30002_creator2", 0, "creatorNames", 0, "creatorName"]
  const segments = parsePath(path);

  let current = metadata;
  for (const seg of segments) {
    if (current == null) return '';
    current = typeof seg === 'number' ? current[seg] : current[seg];
  }
  return current ?? '';
}
```

#### `getSystemValue()` の仕様

TSV列キー（`.id`, `.pos_index[0]` 等）から `metadata.system` の値を返す。TSV列キーと内部キー（`SYS_KEY_MAP` で定義済み）のマッピングを逆引きする。

```javascript
// TSV列キー → metadata.system 内部キー 変換マップ
const TSV_SYS_KEY_MAP = {
  '.id':                 'id',
  '.uri':                'uri',
  '.metadata.path[0]':   'path',
  '.pos_index[0]':       'pos_index',
  '.publish_status':     'publish_status',
  '.feedback_mail[0]':   'feedback_mail',
  '.cnri':               'cnri',
  '.doi_ra':             'doi_ra',
  '.doi':                'doi',
  '.edit_mode':          'edit_mode',
  '.metadata.pubdate':   'pubdate',
};

function getSystemValue(columnKey, system) {
  const internalKey = TSV_SYS_KEY_MAP[columnKey];
  return internalKey != null ? (system[internalKey] ?? '') : '';
}
```

### Step 6: ダウンロード関数

```javascript
function downloadTsv(tsvString, filename) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + tsvString], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'import.tsv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Step 7: UI追加

1. ボタンエリアに「TSV出力」ボタンを追加
2. ベータ版の注意文言を更新

```html
<button id="export-btn" onclick="exportTsv()">TSV出力</button>
```

```javascript
function exportTsv() {
  const metadata = collectFromDOM();
  const tsv = generateTsv(metadata);
  // metadata.system.doi は SYS_KEY_MAP 経由で収集済み（sys_doi ではない）
  const doi = metadata.system.doi || 'import';
  downloadTsv(tsv, `${doi.replace(/\//g, '_')}.tsv`);
}
```

## TSV_COL_GROUPS で定義するフィールド一覧（30002.tsv列順）

| # | フィールド | 型 | 展開 | 空時の扱い |
|---|---|---|---|---|
| 1 | system | 固定 | なし（11列） | 常に出力 |
| 2 | title0 | array | [i] | 空なら省略 |
| 3 | alternative_title1 | array | [i] | 空なら省略 |
| 4 | creator2 | creator | [i][j][k] 多段 | 空なら省略、内部配列も空なら省略 |
| 5 | contributor3 | contributor | [i][j][k] 多段 | 空なら省略、内部配列も空なら省略 |
| 6 | access_rights4 | object | なし | 全値空なら省略 |
| 7 | rights6 | array | [i] | 空なら省略 |
| 8 | rights_holder7 | rightsHolder | [i][j] | 空なら省略 |
| 9 | subject8 | array | [i] | 空なら省略 |
| 10 | description9 | array | [i] | 空なら省略 |
| 11 | publisher10 | array | [i] | 空なら省略 |
| 12 | date11 | array | [i] | 空なら省略 |
| 13 | language12 | array | [i] | 空なら省略 |
| 14 | resource_type13 | object | なし | 全値空なら省略 |
| 15 | version14 | object | なし | 全値空なら省略 |
| 16 | version_type15 | object | なし | 全値空なら省略 |
| 17 | identifier16 | array | [i] | 空なら省略 |
| 18 | identifier_registration17 | object | なし | 全値空なら省略 |
| 19 | relation18 | relation | [i][j] | 空なら省略 |
| 20 | temporal19 | array | [i] | 空なら省略 |
| 21 | geolocation20 | geolocation | [i][j] | 空なら省略 |
| 22 | funding_reference21 | funding | [i][j] | 空なら省略 |
| 23 | source_identifier22 | array | [i] | 空なら省略 |
| 24 | source_title23 | array | [i] | 空なら省略 |
| 25 | volume_number24 | object | なし | 全値空なら省略 |
| 26 | issue_number25 | object | なし | 全値空なら省略 |
| 27 | number_of_pages26 | object | なし | 全値空なら省略 |
| 28 | page_start27 | object | なし | 全値空なら省略 |
| 29 | page_end28 | object | なし | 全値空なら省略 |
| 30 | bibliographic29 | biblio | [j]（bibliographic_titlesのみ） | 空（null含む）なら省略 |
| 31 | conference34 | conference | [i][j] | 空なら省略 |
| - | apc5 | - | - | **常に除外**（EXCLUDED_KEYS かつ FIELD_DEFS 非定義） |
| - | dissertation30〜degree33 | - | - | **常に除外** |
| - | file35 | - | - | **常に除外** |
| - | heading36〜item_1698624010 | - | - | **常に除外** |

## 検証方法

1. DOI入力 → データ取得 → 「TSV出力」ボタン押下
2. ダウンロードされた .tsv ファイルを開き以下を確認:
   - UTF-8 BOM付き、LF改行
   - ヘッダ5行 + データ1行
   - 列キー（2行目）が 30002.tsv のパターンと一致
   - 作成者が複数の場合、[0],[1],...と列が動的に増加
   - System列（resourceuri, access_right_uri等）が自動補完
3. 空値表示モード → TSV出力 → 全列が [0] のみの基本構造で出力
4. 出力TSVをWEKOテスト環境にインポートして動作確認（可能な場合）

## 作業完了後のドキュメント更新

実装完了後、以下のドキュメントを更新すること。

### README.md
- 「未実装（Phase 2）」セクションを「実装済み（Phase 2）」に変更
- ベータ版の注意文言を削除または更新
- Phase 2 の機能概要を「実装済み」セクションに追記
- ドキュメントセクションに `Implementation_phase2.md` へのリンクを追加

### docs/worklog.md
- 最終更新日を更新
- Phase 2 の実装記録を追加（Step 1〜7 の各ステップ完了内容）
- 「未完了タスク」セクションの Phase 2 項目を完了済みに更新
- 技術メモに Phase 2 固有の知見を追記（空フィールド省略ロジック、列展開アルゴリズム等）
