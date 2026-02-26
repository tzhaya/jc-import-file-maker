# Issue #6: JaLC APIからのデータマッピング 実装プラン

## Context
現在 `fetchData()` でRA判定が `JaLC` の場合は「未対応」エラーを表示（L1219-1220）。JaLC DOI（主にJ-STAGEの日本語論文）のメタデータ取得・マッピングを実装し、Crossrefパスと同等のインポート機能を実現する。

**OpenAlex連携は行わない**（JaLC DOIのデータがOpenAlexに収録されていないため）。JaLC APIから直接、著者名（多言語）・所属（ROR付き）・ISSN・助成情報・抄録・ライセンス・キーワード・日付が取得可能。

## 対象ファイル
- `make_jc_importer.html` — 全変更をこのファイルに実装

## 実装内容

### 1. `JALC_CONTENT_TYPE_MAP` 定数追加（~10行）
**挿入位置**: `CROSSREF_RELATION_ID_TYPE_MAP`（L636）の直後

公式5値のみマッピング:
```js
const JALC_CONTENT_TYPE_MAP = {
  'JA': 'journal article',
  'BK': 'book',
  'RD': 'dataset',
  'EL': 'learning object',
  'GD': 'other',
};
```
未知の値はフォールバック（空文字）。

### 2. `fetchJaLC(doi)` 関数追加（~15行）
**挿入位置**: `fetchOpenAlex()` の直後（L1012付近）

- エンドポイント: `https://api.japanlinkcenter.org/v2/dois/${encodeURIComponent(doi)}`
- `Accept: application/json` ヘッダー
- レスポンスから `.data` を返す
- 404/エラーハンドリングは既存 `fetchCrossref()` と同パターン

### 3. `buildJaLCAuthors(jalcCreators)` 関数追加（~80行）
**挿入位置**: `buildAuthors()`（L1349）の直後

JaLC著者データの特徴:
- `names[]` の `lang` で ja/en を直接区別（`_warnLang: false`）
- `affiliation_list[].affiliation_identifier_list[]` から ROR URI を直接取得（ROR API不要）
  - `https://ror.org/xxx` → rorId抽出して `affiliationNameIdentifierScheme: 'ROR'` に格納
- `researcher_id_list[]` から e-Rad番号取得（type='ERAD'）、ORCIDがあれば対応
- 多言語名: ja/en 両方を `creatorNames` 配列に格納
- 姓名分離: `last_name` / `first_name` を直接使用

### 4. `buildJaLCFunders(jalcFundList)` 関数追加（~70行）
**挿入位置**: `buildFunders()`（L1412）の直後

- `fund_list[].funder_identifier_list[]` から FundRef DOI 抽出
  - `http://dx.doi.org/10.13039/...` → DOI部分（`10.13039/...`）を抽出
- `award_number_group_list[].award_number_list[]` から課題番号取得
- カンマ区切り課題番号は分割して個別処理
- JSPS判定 + JGN/KAKEN連携: 既存の `fetchJgn()` / `fetchKaken()` を再利用
- async関数、`Promise.all()` で並列処理（既存 `buildFunders()` と同パターン）

### 5. `mapToItemTypeJaLC(jalcJson)` 関数追加（~200行）
**挿入位置**: `mapToItemType()`（L1718）の直後

`mapToItemType()` と同じ出力構造（metadataオブジェクト）を返す。主な違い:

| 項目 | Crossrefパス | JaLCパス |
|------|-------------|---------|
| 資源タイプ | `CROSSREF_TYPE_MAP` | `JALC_CONTENT_TYPE_MAP` |
| 著者 | `buildAuthors(cr, oa, ror)` | `buildJaLCAuthors(jalc.creator_list)` |
| 助成情報 | `buildFunders(cr.funder)` | `buildJaLCFunders(jalc.fund_list)` |
| タイトル | `crJson.title[0]`（英語のみ） | `title_list[]` 多言語（lang付き） |
| 抄録 | `crJson.abstract`（JATS処理） | `description_list[]`（プレーンテキスト、lang/type付き） |
| ライセンス | `crJson.license[]` VoRのみ | `rights_list[]`（テキスト + URI） |
| キーワード | 空フィールド | `subject_list[]`（lang付き） |
| 日付 | `date-parts` 配列 → `formatDateParts()` | `date_list[].date`（ISO文字列、そのまま使用） + `publication_date`（year/month/day） |
| ISSN | `issn-type[]` / `ISSN[]` | `journal_id_list[]` type='ISSN', issn_type='print'/'online' |
| NCID | `fetchNcid()` 再利用 | 同じく `fetchNcid()` 再利用 |
| 出版者 | `crJson.publisher` | `publisher_list[]`（多言語） |
| 雑誌名 | `container-title[0]` | `journal_title_name_list[]`（多言語） |
| 出版タイプ | OAステータスから決定 | 設定しない（OpenAlex不使用のため空） |
| 関連情報 | DOI + OpenAlex ids + ISBN + relation | DOI + `relation_list[]` |
| 言語 | `'eng'` 固定 | `content_language` から決定（`'ja'`→`'jpn'`等） |

**`publication_date` 処理**: `publication_year` は常にあり、`publication_month` / `publication_day` は存在する場合のみ結合（`YYYY` / `YYYY-MM` / `YYYY-MM-DD`）。

### 6. `fetchJaLCData(doi)` オーケストレーター追加（~25行）
**挿入位置**: `fetchCrossrefData()`（L1199）の直後

```
fetchJaLCData(doi):
  1. await fetchJaLC(doi)
  2. info-bar表示（DOIリンク、OAバッジなし）
  3. metadata = await mapToItemTypeJaLC(jalcJson)
  4. showHints = true; renderAll(metadata)
```
OpenAlex不使用のため `Promise.all` 不要、シンプルなシーケンシャル処理。
OAバッジは非表示またはグレーアウト（OAステータス不明）。

### 7. `fetchData()` のJaLC分岐有効化（~2行変更）
**変更箇所**: L1219-1220

```js
// Before:
showError('JaLC DOI のインポートは現在未対応です。今後のアップデートで対応予定です.');
// After:
await fetchJaLCData(doi);
```

## 実装順序
1. `JALC_CONTENT_TYPE_MAP` 定数
2. `fetchJaLC()` 関数
3. `buildJaLCAuthors()` 関数
4. `buildJaLCFunders()` 関数
5. `mapToItemTypeJaLC()` 関数
6. `fetchJaLCData()` オーケストレーター
7. `fetchData()` 分岐有効化
8. テスト・動作確認
9. ドキュメント更新（README, worklog, requirements, version-info, MEMORY.md）

## 推定追加行数
約400行（ファイル規模: ~3200行 → ~3600行、+12%）

## 検証方法
- JaLC DOI でデータ取得・UI表示を確認
  - J-STAGE論文: 日本語著者名・所属・ISSNが正しく表示されること
  - 助成情報付きDOI: KAKEN/JGN連携が動作すること
  - 抄録・ライセンス・キーワードが取得されること
  - 多言語タイトル（ja/en）が両方表示されること
  - `publication_date` の月日がある場合に正しくフォーマットされること
- Crossref DOI で既存機能に影響がないことを確認
- テスト用JaLC DOI: `10.11514/infopro.2008.0.138.0`（Issue本文のサンプル）
