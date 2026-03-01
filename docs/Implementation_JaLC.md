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

---

## サンプルデータ検証（2026-03-01）

機関リポジトリ → IRDB → JaLC 経路でDOI付与されたデータを JaLC REST API で取得し、実装コードとの整合性を検証した。

### サンプル
- `samples/10.34556%252F0002000089.json` — ジャーナルアーティクル (`content_type: "JA"`)
- `samples/10.34556%252F0002000787.json` — 図書 (`content_type: "BK"`)

### 各フィールドの検証結果

#### サンプル1: `10.34556/0002000089` (JA)

| フィールド | サンプル値 | 実装状況 |
|-----------|-----------|---------|
| `content_type: "JA"` | → `journal article` | `JALC_CONTENT_TYPE_MAP` で対応済み |
| `title_list` (ja+en 2件) | 多言語タイトル | `mapToItemTypeJaLC` L2106-2109 で正しく処理 |
| `creator_list` (3名, en only) | `last_name`+`first_name`, 所属なし | `buildJaLCAuthors` で処理可。所属・ID空でも問題なし |
| `publication_date` (year+month+day) | `1994/10/01` | L2086-2091 で `YYYY-MM-DD` に構築。問題なし |
| `journal_id_list` (ISSN print) | `13407686` | L2139-2143 で `PISSN` に。問題なし |
| `journal_title_name_list` (en) | `JIRCAS Journal` | L2156-2159 で処理。問題なし |
| `volume/issue/first_page/last_page` | `1/1/1/7` | L2178-2181 で直接取得。問題なし |
| **`keyword_list`** (5件, en) | `{keyword, sequence, lang}` | **不一致: 後述** |
| `edition.variation: "VoR"` | 出版タイプ情報 | **未使用: 後述** |
| `content_language: "en"` | → `eng` | `LANG_MAP` で変換。問題なし |
| `publisher_list` (en, 1件) | 組織名 | L2172-2175 で処理。問題なし |
| `alternate_identifier_list` | OAIPMH | マッピング対象外（問題なし） |

#### サンプル2: `10.34556/0002000787` (BK)

| フィールド | サンプル値 | 実装状況 |
|-----------|-----------|---------|
| `content_type: "BK"` | → `book` | `JALC_CONTENT_TYPE_MAP` で対応済み |
| `title_list` (ja only, 1件) | 日本語のみ | 問題なし |
| `creator_list` (1名, `first_name`のみ) | 組織名が `first_name` に | **要注意: 後述** |
| `relation_list` (46件) | hasVersion 2件 + hasPart 44件 | **パフォーマンス懸念: 後述** |
| `fund_list` (1件) | FundRef DOI + award番号 | **`funder_identifier` 形式確認: 後述** |
| `publication_date` (year+month+day) | `2025/06/09` | 問題なし |
| `book_classification: "01"` | 未知フィールド | マッピング対象外（問題なし） |
| `content_language: "ja"` | → `jpn` | 問題なし |
| `publisher_list` (ja, 1件) | 組織名 | 問題なし |
| journal系フィールドなし | BKなので正常 | 空配列で問題なし |

### 発見された課題

#### 課題1: `keyword_list` vs `subject_list` フィールド名不一致（要修正）

**現状**: 実装コード (L2122) は `subject_list` を参照:
```js
const subjects = (jalcJson.subject_list || []).map(s => ({
  subitem_subject: s.subject || '',
```

**実際のAPI**: サンプル1のキーワードは `keyword_list` フィールドで提供され、構造が異なる:
```json
{ "keyword": "predators", "sequence": "1", "lang": "en" }
```

`subject_list` は JaLC スキーマ上は分類体系付き主題（NDC等）用の別フィールドの可能性がある。

**対応案**: `keyword_list` と `subject_list` の両方をマージして subjects に格納する。フィールド名の違い（`keyword` vs `subject`）に対応する:
```js
const subjects = [];
(jalcJson.keyword_list || []).forEach(k => {
  subjects.push({
    subitem_subject: k.keyword || '',
    subitem_subject_language: k.lang || '',
    subitem_subject_scheme: '',
    subitem_subject_uri: '',
  });
});
(jalcJson.subject_list || []).forEach(s => {
  subjects.push({
    subitem_subject: s.subject || '',
    subitem_subject_language: s.lang || '',
    subitem_subject_scheme: s.scheme || '',
    subitem_subject_uri: s.uri || '',
  });
});
```

**TODO**: JaLC API仕様書で `subject_list` の存在・構造を確認する。

#### 課題2: `creator_list` で組織名が `first_name` に入るケース（軽微）

サンプル2の著者データ:
```json
{ "type": "person", "names": [{ "lang": "ja", "first_name": "みどりの食料システム国際情報センター" }] }
```

`last_name` がなく `first_name` のみ。現在の `buildJaLCAuthors` (L1545):
```js
const fullName = family && given ? `${family}, ${given}` : family || given;
```
→ `given`（= `first_name`）がそのまま `fullName` になる。**動作はする**。

ただし `creatorNameType: 'Personal'` 固定 (L1547) は不正確。JaLC側の `type: "person"` がそもそも不正確なデータ（実際は組織）なので、API側のデータ品質の問題。

**対応案**: `last_name` も `first_name` も1件のみで `last_name` が空の場合に限り、簡易的なヒューリスティックを入れることも可能だが、過剰対応のリスクあり。**現状維持で問題なし**（ユーザーがUIで修正可能）。

#### 課題3: 大量の関連DOIに対するタイトル取得のパフォーマンス（要対策）

サンプル2は `relation_list` に46件（うちDOIタイプ45件）あり、`isIdenticalTo` 以外の全DOIでタイトル取得APIが発火する。現在のコード (L2220):
```js
const relTitles = await Promise.all(doiRelEntries.map(e => fetchRelationTitleJaLC(e.doi)));
```

44件の JaLC API 並列呼び出しが発生し、レート制限やUI応答性の問題が懸念される。

**対応案**:
- (A) 同時実行数を制限（例: 5件ずつ逐次バッチ処理）
- (B) 関連DOIのタイトル取得に上限を設ける（例: 最初の10件のみ）
- (C) タイトル取得を非同期バックグラウンドで行い、完了次第UIに反映

**TODO**: JaLC APIのレート制限仕様を確認。Crossrefパスの `fetchRelationTitle` も同様の課題があるため、共通の対策が望ましい。

#### 課題4: `funder_identifier` の形式（問題なし、記録のみ）

サンプル2の `funder_identifier`:
```json
{ "funder_identifier": "https://doi.org/10.13039/501100009472", "type": "FundRef" }
```

実装計画のコメントでは `"http://dx.doi.org/..."` 形式を想定していたが、実際は `"https://doi.org/..."` 形式。DOI部分の正規表現抽出 (L1698) は十分汎用的で**両形式に対応済み**:
```js
const m = fi.funder_identifier.match(/\b(10\.\d{4,}\/\S+)/);
```

#### 課題5: `edition.variation` (VoR) の活用可能性（低優先度）

サンプル1に `edition.variation: "VoR"` がある。実装計画では「出版タイプは設定しない（OpenAlex不使用のため）」としているが、JaLC APIから直接 VoR 情報が取得可能。

既存の `VERSION_TYPE_MAP` を使って `subitem_version_type` / `subitem_version_resource` にマッピングできる:
```js
const variation = (jalcJson.edition?.variation || '').toUpperCase();
const versionUri = VERSION_TYPE_MAP[variation] || '';
```

**対応案**: 低優先度だが、データがある場合は活用すべき。実装は数行。

### 実装計画への反映事項まとめ

| # | 課題 | 優先度 | 対応 |
|---|------|--------|------|
| 1 | `keyword_list` フィールド名不一致 | **高** | `keyword_list` + `subject_list` 両方対応に修正 |
| 2 | 組織名が `first_name` に入るケース | 低 | 現状維持（API側のデータ品質問題） |
| 3 | 大量関連DOIのタイトル取得 | **中** | 同時実行数制限 or 上限設定を検討 |
| 4 | `funder_identifier` 形式 | なし | 既存コードで対応済み |
| 5 | `edition.variation` → 出版タイプ | 低 | 数行の追加で活用可能 |
