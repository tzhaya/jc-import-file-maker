# Phase 2: TSV エクスポート機能の実装プラン

**ステータス: 全フェーズ完了**（Phase 2-A〜2-D、2026-03-22）

## Context

`make_jc_importer.html` の TSV エクスポート機能の実装記録。DOM → JSON → TSV のパイプラインにより、単一DOI・複数DOI一括のインポート用TSVファイルを出力する。

## 前提条件（すべて完了済み）

JPCOAR スキーマ 2.0 対応（#25）の全フェーズが完了していること。

| issue | 内容 | 状態 |
|---|---|---|
| #26 | nameIdentifier スキーム語彙の更新 | 完了 |
| #27 | `creatorType` 属性の追加 | 完了 |
| #28 | 言語コード `ja-Kana` → `ja-Latn` | 完了 |
| #29 | `relationType` 語彙への追加 | 完了 |
| #31 | `resourceType` 語彙の更新 | 完了 |
| #34 | 助成情報にプログラム情報フィールドを追加 | 完了 |
| #32 | 出版者情報（publisherDetail）追加 | 完了 |
| #33 | 日付リテラル（dateLiteral）追加 | 完了 |
| #107 | 助成機関識別子タイプURI追加 | 完了 |
| #108 | researchmap_linkage / peer_reviewed 追加 | 完了 |
| #114 | tsv_headers.json 更新（232列） | 完了 |

## 対象ファイル

- **編集**: `make_jc_importer.html`（単一ファイルアプリ）
- **参照**: `data/tsv_headers.json`（TSV列定義の正典。構造変更時は必ずこのファイルを更新してから `TSV_HEADERS_TEMPLATE` 定数に反映する）
- **参照**: `samples/デフォルトアイテムタイプ（フル）(30002).tsv`（出力フォーマット確認用）
- **参照**: [weko3_property_key_naming.md](weko3_property_key_naming.md) — プロパティキーの命名規則（3パターン）と助成情報フィールド構造
- **参照**: [weko3_tsv_import_spec.md](weko3_tsv_import_spec.md) — WEKO3ソースコードから調査したTSVインポート処理の全仕様（ZIP構造、5行ヘッダー、システムカラム、バリデーション、ファイル処理等）

### プロパティキー柔軟化の設計方針

TSV の列定義・プロパティキーは `tsv_headers.json` 駆動とし、2種類の変更に対応できるよう設計する：

| 変更種別 | 対応方法 |
|----------|---------|
| **列追加・削除・順序変更**（フォーマット変更） | `data/tsv_headers.json` を更新 → `TSV_HEADERS_TEMPLATE` 定数に反映するだけで対応完了 |
| **プロパティキー名変更**（`item_30002_` → 別のプレフィックス） | ユーザがリポジトリのTSVヘッダーを `tsv-template` テキストエリアに貼り付ける → `detectTsvPrefix()` が自動検出してキーを置換 |

フォーマット変更時の手順:
1. `data/tsv_headers.json` を更新
2. HTML 内の `TSV_HEADERS_TEMPLATE` 定数（STEP 8a セクション）を更新
3. 新フィールドが除外対象であれば `TSV_EXCL_SUFFIXES` / `TSV_EXCL_TIMESTAMP` に追加

プロパティキー名の種類については [weko3_property_key_naming.md](weko3_property_key_naming.md) を参照:

| パターン | 例 | 発生条件 |
|----------|-----|----------|
| `item_{item_type_id}_{name}{idx}` | `item_30002_funding_reference21` | 30002 からコピーしたアイテムタイプ |
| `item_{timestamp}` | `item_1708699025255` | Web UI から後日追加されたプロパティ |
| `item_{name}` | `item_creator` | WEKO2 からの移行 |

## 出力ルール

- **空フィールドの省略**: 値が存在しないフィールドの列はTSVに出力しない
  - フィールド全体が空の場合（例: contributor3 にデータなし → contributor3 の列群すべてを省略）
  - ※ 内部配列（creatorAffiliations 等）は `tsv_headers.json` テンプレートで [0] のみ定義。1要素のみ出力（WEKO3 TSVフォーマット上の制約）
- **除外フィールド**: heading36, dissertation30〜degree33, item_1698624001〜item_1698624010 は常に除外（file35 は #84 で対応済み、item_1698624005・item_1698624008 は #32/#33 で対応済み）
- **System列の自動補完**: RESOURCE_TYPE_MAP, ACCESS_RIGHTS_MAP 等から自動計算
- **複数DOI出力**: `allMetadata[]` に蓄積した複数metadataからヘッダー5行+データN行を出力（#100）
- **リポジトリURL置換**: `#repo-host` 入力欄でスキーマURL `https://localhost/` を実際のリポジトリURLに置換
- **ファイル名**: 単一DOI → `{DOI}.tsv`、複数DOI → `import_YYYYMMDD_HHMMSS.tsv`

## アーキテクチャ

```
DOM (input/select/textarea)
  ↓ collectFromDOM()
metadata JSON （mapToItemType()と同じ構造）
  ↓ saveCurrent() で allMetadata[] に蓄積（複数DOI時）
  ↓
exportTsv()
  ├─ allMetadata[] から metadataArray を構築
  ├─ buildMaxSizeMetadata(metadataArray) ... 列展開用の仮想metadata（最大配列サイズ）
  ↓
generateTsv(metadataArray, templateText, repoHost)
  ├─ parseCustomTemplate(templateText)       ... カスタムテンプレート解析（Phase 2-B）
  │   └─ 5行ヘッダーを完全パースして実効テンプレートを構築
  ├─ detectTsvPrefix(templateText, metadata) ... プレフィックス検出
  ├─ buildTsvColumnDefs(prefix, metadata, template) ... テンプレートから列定義を展開
  │   ├─ groupTsvColumns(prefix, template)   ... フィールドグループ化 + 除外フィールド除去
  │   └─ 配列フィールドを size 分展開、空フィールドはスキップ
  ├─ buildHeaderRows(cols)                   ... ヘッダー5行の組み立て
  │   └─ ItemType行の自動設定（Phase 2-D）
  ├─ getTsvValue(col, metadata) × N行       ... lookupKey（item_30002_ ベース）で値取得
  └─ repoHost による URL 置換
  ↓
TSV文字列 → downloadTsv() → ブラウザダウンロード（UTF-8 BOM, LF）
```

**lookupKey と key の分離**: `buildTsvColumnDefs` は列ごとに 2 つのキーを持つ:
- `key`: TSV 出力に使うキー（検出した prefix に置換済み。例: `item_40039_creator2[0]...`）
- `lookupKey`: `metadata` オブジェクトへのアクセスに使うキー（常に `item_30002_` ベース。FIELD_DEFS に対応）

## 実装ステップ

### Step 1: TSV列テンプレート（`TSV_HEADERS_TEMPLATE`）

`data/tsv_headers.json` の内容を JS 定数としてインライン定義する。
5要素配列: `[row0, row1, row2, row3, row4]`

| 要素 | 内容 | TSV上の行 |
|------|------|----------|
| row0 | `["#ItemType", "(未設定)", ""]` | 1行目 |
| row1 | プロパティキー列（232列） | 2行目 |
| row2 | 日本語ラベル列 | 3行目 |
| row3 | System 印列 | 4行目 |
| row4 | 制約列 | 5行目 |

```javascript
const TSV_HEADERS_TEMPLATE = [/* data/tsv_headers.json の内容 */];
```

**更新手順**: `data/tsv_headers.json` を編集後、その内容で `TSV_HEADERS_TEMPLATE` を置き換える。

### Step 2: 除外フィールド定義

フィールドキー名が変わっても suffix で照合できるよう分離して定義する:

```javascript
// suffix（item_30002_ 以降の名前）で照合 → prefix が変わっても機能する
// ※ file35 は #84 で対応済みのため除外対象から削除
const TSV_EXCL_SUFFIXES = new Set([
  'apc5', 'heading36',
  'dissertation_number30', 'degree_name31', 'date_granted32', 'degree_grantor33',
]);
// timestamp ベースのフィールドは full key で照合
// ※ item_1698624005（出版者情報）と item_1698624008（日付リテラル）は
//   #32/#33 で対応済みのため除外対象から削除
const TSV_EXCL_TIMESTAMP = new Set([
  'item_1698624001', 'item_1698624002', 'item_1698624003', 'item_1698624004',
  /* item_1698624005 は出力対象 */
  'item_1698624006', 'item_1698624007',
  /* item_1698624008 は出力対象 */
  'item_1698624009', 'item_1698624010',
]);

function isTsvExcluded(key) {
  if (key.startsWith('.file_path')) return true;
  const m = key.match(/\.metadata\.(item_\d+_?(\w*))/);
  if (!m) return false;
  return TSV_EXCL_SUFFIXES.has(m[2]) || TSV_EXCL_TIMESTAMP.has(m[1]);
}
```

フォーマット変更で新フィールドが追加される場合: 出力対象なら何もしない（自動的に列が追加される）。除外対象なら `TSV_EXCL_SUFFIXES` か `TSV_EXCL_TIMESTAMP` に追加する。

### Step 3: プレフィックス検出（`detectTsvPrefix`）

```javascript
function detectTsvPrefix(templateText, metadata) {
  // 1. ユーザが貼り付けたTSVヘッダーから検出（優先）
  if (templateText && templateText.trim()) {
    const m = templateText.match(/\.metadata\.(item_\d+_)/);
    if (m) return m[1];
  }
  // 2. metadata のキーから自動検出
  for (const key of Object.keys(metadata)) {
    if (key === 'system') continue;
    const m = key.match(/^(item_\d+_)/);
    if (m) return m[1];
  }
  return 'item_30002_'; // デフォルト
}
```

### Step 4: フィールドグループ化と列展開

`groupTsvColumns(prefix)`: `TSV_HEADERS_TEMPLATE` row1 を走査し、同一トップレベルフィールドキー（`.metadata.item_XXXX`）の列をグループ化。除外フィールドはスキップ。

`buildTsvColumnDefs(prefix, metadata)`: 各グループを metadata の配列サイズで展開。
- system フィールド: 常に出力
- object フィールド（`[0]` なし）: 全値空なら省略
- array フィールド（`[0]` あり）: `metadata[metaKey].length` 分だけ `[0]` を `[0]`, `[1]`, ... に置換して展開

### Step 5: DOM → JSON 収集関数（`collectFromDOM()`）

DOMの入力要素を走査して、`mapToItemType()` と同じ構造の JSON オブジェクトを返す。**既に実装済み**。

#### システムフィールドのキー名マッピング

DOM の `dataset.key` には `sys_*` プレフィックスが付く（`sys_id`, `sys_uri` 等）が、`buildEmptyMetadata().system` や `getTsvValue()` で使う内部キーはプレフィックスなし（`id`, `uri` 等）。

```javascript
const SYS_KEY_MAP = {
  sys_id: 'id', sys_uri: 'uri', sys_path: 'path',
  sys_pos: 'pos_index', sys_status: 'publish_status',
  sys_mail: 'feedback_mail', sys_researchmap: 'researchmap_linkage', sys_cnri: 'cnri',
  sys_doi_ra: 'doi_ra', sys_doi: 'doi',
  sys_edit: 'edit_mode', sys_pubdate: 'pubdate',
};
```

### Step 6: 値の取得（`getTsvValue`）

`col.lookupKey`（常に `item_30002_` ベース）でパスをパースして metadata から値を取得。

```javascript
function getTsvValue(col, metadata) {
  if (!col.lookupKey.startsWith('.metadata.item_')) {
    // システムフィールド: TSV_SYS_KEY_MAP で内部キーを引く
    const sysKey = TSV_SYS_KEY_MAP[col.lookupKey];
    return sysKey != null ? (metadata.system?.[sysKey] ?? '') : '';
  }
  const segs = parseTsvPath(col.lookupKey.replace(/^\.metadata\./, ''));
  let cur = metadata;
  for (const seg of segs) { if (cur == null) return ''; cur = cur[seg]; }
  return cur ?? '';
}
```

#### `parseTsvPath()` の仕様

`'item_30002_creator2[0].creatorNames[0].creatorName'`
→ `['item_30002_creator2', 0, 'creatorNames', 0, 'creatorName']`

#### TSV_SYS_KEY_MAP

```javascript
const TSV_SYS_KEY_MAP = {
  '.id': 'id', '.uri': 'uri', '.metadata.path[0]': 'path',
  '.pos_index[0]': 'pos_index', '.publish_status': 'publish_status',
  '.feedback_mail[0]': 'feedback_mail', '.researchmap_linkage': 'researchmap_linkage',
  '.cnri': 'cnri', '.doi_ra': 'doi_ra', '.doi': 'doi',
  '.edit_mode': 'edit_mode', '.metadata.pubdate': 'pubdate',
};
```

### Step 7: TSV文字列生成（`generateTsv`）

```javascript
// Phase 2-C: metadataArray（複数DOI対応）、repoHost（URL置換）を追加
function generateTsv(metadataArray, templateText, repoHost) {
  const maxMeta = buildMaxSizeMetadata(metadataArray); // 列展開用仮想metadata
  const parsed = parseCustomTemplate(templateText);     // Phase 2-B
  const prefix = detectTsvPrefix(templateText, maxMeta);
  const cols = buildTsvColumnDefs(prefix, maxMeta, parsed);
  if (!cols.length) return null;

  // ヘッダー5行
  const tmpl = (parsed || TSV_HEADERS_TEMPLATE)[0];
  const row1 = [tmpl[0], tmpl[1], tmpl[2], ...Array(Math.max(0, cols.length - 3)).fill('')];
  const row2 = cols.map((c, i) => (i === 0 ? '#' : '') + c.key);
  const row3 = cols.map((c, i) => (i === 0 ? '#' : '') + c.label);
  const row4 = ['#', ...cols.slice(1).map(c => c.sys)];
  const row5 = ['#', ...cols.slice(1).map(c => c.con)];

  // データN行（各metadataに対して1行）
  const dataRows = metadataArray.map(meta =>
    cols.map(c => {
      let v = getTsvValue(c, meta);
      if (repoHost && typeof v === 'string') v = v.replace(/https:\/\/localhost\//g, repoHost);
      return v;
    })
  );

  return [row1, row2, row3, row4, row5, ...dataRows].map(r => r.join('\t')).join('\n') + '\n';
}
```

### Step 8: ダウンロード関数

```javascript
function downloadTsv(tsvString, filename) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + tsvString], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'import.tsv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
```

### Step 9: UI追加

1. ボタンエリアに「TSV出力」ボタンを追加（緑色、データ取得後に表示）
2. `<details>` 要素でTSVオプションパネルを追加（テンプレート貼り付けテキストエリア + リポジトリURL入力）
3. バッチ管理パネル（蓄積件数表示・個別削除・全クリア・アイテム切替）（Phase 2-C）
4. Chrome拡張では `addEventListener` でボタンイベントを登録（MV3 CSP対応）

```javascript
// Phase 2-C: バッチ対応のexportTsv
function exportTsv() {
  saveCurrent();  // 現在のDOM編集内容をallMetadataに保存
  const metadataArray = allMetadata.filter(m => m);
  if (!metadataArray.length) { alert('TSV出力できるデータがありません。'); return; }
  const templateText = document.getElementById('tsv-template')?.value || '';
  const repoHost = document.getElementById('repo-host')?.value?.trim() || '';
  const tsv = generateTsv(metadataArray, templateText, repoHost);
  if (!tsv) { alert('TSV出力できるデータがありません。'); return; }
  // ファイル名: 単一DOI→{DOI}.tsv、複数DOI→import_YYYYMMDD_HHMMSS.tsv
  let filename;
  if (metadataArray.length === 1) {
    const doi = metadataArray[0].system?.doi || 'import';
    filename = `${doi.replace(/\//g, '_')}.tsv`;
  } else {
    const now = new Date();
    filename = `import_${now.toISOString().replace(/[-:T]/g, '').slice(0, 15)}.tsv`;
  }
  downloadTsv(tsv, filename);
}
```

### Step 10: カスタムテンプレート完全パース（Phase 2-B / #99）

5行ヘッダーの貼り付けでTSVテンプレートを丸ごと上書きする機能。

```javascript
function parseCustomTemplate(templateText) {
  // 5行（またはそれ以上）のTSVヘッダーをパースして
  // TSV_HEADERS_TEMPLATE と同じ構造の配列を返す
  // groupTsvColumns / buildTsvColumnDefs に template 引数として渡す
}
```

### Step 11: 複数DOI一括TSV出力（Phase 2-C / #100）

- `allMetadata[]` + `currentBatchIndex` でバッチ蓄積・管理
- `saveCurrent()`: DOM編集内容を `allMetadata[currentBatchIndex]` に保存
- `buildMaxSizeMetadata(metadataArray)`: 複数metadataの各配列フィールドの最大サイズを持つ仮想metadataを生成（列展開用）
- バッチ管理UI: `updateBatchPanel()` / `removeBatchItem()` / `clearBatch()`

### Step 12: ItemType行自動設定（Phase 2-D / #101）

カスタムテンプレートの1行目（`#ItemType`行）からItemType名・IDを自動検出し、TSV出力時に設定する。

## 対象フィールド一覧（tsv_headers.json の列順）

| # | フィールド | 展開 | 除外 |
|---|---|---|---|
| 1 | system（固定12列、researchmap_linkage含む） | なし | 常に出力 |
| 2 | title0 | [i] | 空なら省略 |
| 3 | alternative_title1 | [i] | 空なら省略 |
| 4 | creator2 | [i] + 内部[0]固定 | 空なら省略 |
| 5 | contributor3 | [i] + 内部[0]固定 | 空なら省略 |
| 6 | access_rights4 | なし | 全値空なら省略 |
| - | apc5 | - | **常に除外** |
| 7 | rights6 | [i] | 空なら省略 |
| 8 | rights_holder7 | [i] | 空なら省略 |
| 9 | subject8 | [i] | 空なら省略 |
| 10 | description9 | [i] | 空なら省略 |
| 11 | publisher10 | [i] | 空なら省略 |
| 12 | date11 | [i] | 空なら省略 |
| 13 | language12 | [i] | 空なら省略 |
| 14 | resource_type13 | なし | 全値空なら省略 |
| 15 | version14 | なし | 全値空なら省略 |
| 16 | version_type15 | なし | 全値空なら省略 |
| 17 | identifier16 | [i] | 空なら省略 |
| 18 | identifier_registration17 | なし | 全値空なら省略 |
| 19 | relation18 | [i] + 内部[0]固定 | 空なら省略 |
| 20 | temporal19 | [i] | 空なら省略 |
| 21 | geolocation20 | [i] + 内部[0]固定 | 空なら省略 |
| 22 | funding_reference21 | [i] + 内部[0]固定 | 空なら省略 |
| 23 | source_identifier22 | [i] | 空なら省略 |
| 24 | source_title23 | [i] | 空なら省略 |
| 25 | volume_number24 | なし | 全値空なら省略 |
| 26 | issue_number25 | なし | 全値空なら省略 |
| 27 | number_of_pages26 | なし | 全値空なら省略 |
| 28 | page_start27 | なし | 全値空なら省略 |
| 29 | page_end28 | なし | 全値空なら省略 |
| 30 | bibliographic_information29 | [0]固定（bibliographic_titles） | 全値空なら省略 |
| - | dissertation_number30〜degree_grantor33 | - | **常に除外** |
| 31 | conference34 | [i] + 内部[0]固定 | 空なら省略 |
| 32 | file35 | [i] + 内部[0]固定 | 空なら省略（#84 で対応済み） |
| - | heading36 | - | **常に除外** |
| 33 | item_1698624005（出版者情報） | [i] + 内部[0]固定 | 空なら省略（#32 で対応済み） |
| 34 | item_1698624008（日付リテラル） | [i] | 空なら省略（#33 で対応済み） |
| - | item_1698624001〜1698624004, 1698624006〜1698624007, 1698624009〜1698624010 | - | **常に除外** |

※「内部[0]固定」= tsv_headers.json テンプレートが [0] のみ定義しているため、外部配列のみ展開し内部は常に [0]。WEKO3 TSVフォーマット上の制約。

## 検証方法

### 単一DOI出力（Phase 2-A）
1. DOI入力 → データ取得 → 「TSV出力」ボタン押下
2. ダウンロードされた .tsv ファイルを開き以下を確認:
   - UTF-8 BOM付き、LF改行
   - ヘッダー5行 + データ1行
   - 列キー（2行目）が 30002.tsv のパターンと一致
   - 作成者が複数の場合、[0],[1],...と列が動的に増加
   - System列（resourceuri, access_right_uri等）が自動補完
   - ファイル名が `{DOI}.tsv`

### カスタムテンプレート（Phase 2-B）
3. TSV出力オプションに別リポジトリの5行ヘッダーを貼り付け → 列キーのプレフィックスが変わることを確認
4. カスタムテンプレートの列順序・列数がそのまま出力に反映されることを確認

### 複数DOI一括出力（Phase 2-C）
5. 複数DOIを連続取得 → バッチパネルに蓄積件数が表示されることを確認
6. 「TSV出力」→ ヘッダー5行 + データN行が出力されることを確認
7. ファイル名が `import_YYYYMMDD_HHMMSS.tsv` であることを確認
8. リポジトリURL入力 → `https://localhost/` が置換されることを確認

### ItemType行（Phase 2-D）
9. カスタムテンプレート貼り付け時にItemType行が自動設定されることを確認

### 共通
10. 出力TSVをWEKOテスト環境にインポートして動作確認（可能な場合）

## フォーマット変更時の対応チェックリスト

- [ ] `data/tsv_headers.json` を更新
- [ ] `make_jc_importer.html` の `TSV_HEADERS_TEMPLATE` 定数を更新（STEP 8a セクション）
- [ ] 追加フィールドが除外対象なら `TSV_EXCL_SUFFIXES` または `TSV_EXCL_TIMESTAMP` に追加
- [ ] 追加フィールドの値取得が必要なら `collectFromDOM()` の各 collect 関数を更新
- [ ] 検証方法に従い動作確認

## 実装完了後のドキュメント更新（完了済み）

- [x] README.md: Phase 2 の機能概要を変更履歴に追記
- [x] docs/worklog.md: Phase 2 の実装記録を追加
- [x] function.md: Phase 2 セクションを全完了状態に更新
- [x] docs/remaining_issues.md: グループ E を全完了に更新
