# 助成情報検索ツール HTML ページ 実装記録

> **ステータス: 実装完了（2026-03-03）**

## 背景
issue #53 で実装済みの `fetchJgn()` / `fetchKaken()` の機能を活用し、科研費課題番号やJGN課題番号から助成機関情報を一括検索・表示するスタンドアロン HTML ページを作成する。

## 作成ファイル
- `funder_lookup.html` — 単一HTMLファイル（プロジェクトルート直下）

## 機能仕様

### 入力
- テキストエリア（複数行）に課題番号を改行区切りで入力
- `JP21H01234` / `21H01234` のいずれの形式も受付（`fetchKaken()` が `replace(/^JP/i, '')` で正規化）
- 「検索」ボタンで一括実行
- CiNii APIキーは JavaScript 定数として埋め込み（キーなしでも動作）

### 検索ロジック（本体 `make_jc_importer.html` から移植・拡張）
1. `fetchJgn(awardNumber)` — Crossref JGN API で検索
   - 助成機関情報を `project[0].funding[0].funder` から取得（`funder.id[]` から DOI 抽出）
   - `funding.funder` が無い場合は `publisher` フィールドでフォールバック
   - プログラム情報を `project[0].funding[0].scheme` から取得（issue #34 JPCOAR 2.0 fundingStream）
2. `fetchKaken(awardNumber)` — CiNii Research KAKEN API で検索
3. フロー: JGN → 成功ならJGNデータ使用 / 失敗(null) → KAKEN検索
4. KAKEN成功時の補完:
   - 助成機関: `JSPS_FUNDER_DOI` / `JSPS_FUNDER_NAMES` 定数
   - プログラム情報: `KAKENHI_FUNDING_STREAM` 定数（日英）

### 表示（カード形式）
各課題番号ごとに独立したカードで以下のフィールドを表示（空値も空欄として表示）:

| フィールド | JPCOAR 2.0 | データソース |
|-----------|------------|-------------|
| 助成機関識別子 | 23-.1 | JGN: `funding.funder.id[].id` / KAKEN: JSPS定数 |
| 助成機関名 | 23-.2 | JGN: `funding.funder.name` / KAKEN: JSPS定数 |
| プログラム情報識別子 | 23-.3 | JGN: 課題番号から JGN_fundingStream コードを自動抽出（#56） |
| プログラム情報 | 23-.4 | JGN: `funding.scheme` / KAKEN: 科学研究費助成事業（定数） |
| 研究課題番号 | 23-.5 | 入力値 |
| 研究課題番号URI | 23-.5 | JGN: `https://doi.org/10.52926/{番号}` / KAKEN: CiNii Research URL |
| 研究課題名 | 23-.5 | JGN: `project-title` / KAKEN: CiNii Research API |

### 移植・新規コード

| コード | 元ソース | 備考 |
|--------|----------|------|
| `fetchJgn()` | 本体 L1294-1322 | 拡張: `project.funding.funder` からの取得 + `scheme` 取得 |
| `fetchKaken()` | 本体 L1258-1291 | そのまま移植 |
| `JSPS_FUNDER_DOI`, `JSPS_FUNDER_NAMES` | 本体 L766-770 | そのまま移植 |
| `KAKENHI_FUNDING_STREAM` | 新規 | 科学研究費助成事業（日英）定数 |
| `CONFIG.CiNii_API_KEY` | 本体 L558-566 | 定数のみ |
| `fmtVal()` | 本体プレビューセクション | そのまま移植 |
| `lookupOne()` | 新規 | JGN→KAKEN検索フロー + 結果組み立て |
| `buildResultCards()` | 新規 | カード形式の結果表示 |

## 検証方法
- ブラウザで `funder_lookup.html` を開く
- テキストエリアに以下を入力して検索:
  - `JP21H01234` / `21H01234`（KAKEN科研費番号 — JP付き/なし）
  - `JPMJSA1907`（JGN JST番号 — funder情報が `project.funding` 内にある例）
  - 存在しない番号（エラーハンドリング確認）

---

## 拡張: プログラム情報識別子自動設定 + Acknowledgements課題番号抽出（#56）

> **ステータス: 実装完了（2026-03-03）**

### 背景

issue #34 の調査で、JPCOAR 2.0 の「プログラム情報識別子」(`fundingStreamIdentifier`) に `JGN_fundingStream` タイプが定義されていることが判明。JGN の課題番号には [NISTEP 体系的番号](https://www.nistep.go.jp/taikei) のプログラムコードが埋め込まれており、自動抽出が可能。

### 機能A: プログラム情報識別子（fundingStreamIdentifier）の自動設定

#### 体系的番号の構造

| 課題番号 | 分解 | JGN_fundingStream コード |
|---|---|---|
| JPMJPR2125 | JP + **MJPR** + 2125 | MJPR（さきがけ/PRESTO） |
| JPMJSA1907 | JP + **MJSA** + 1907 | MJSA（SATREPS） |
| JPMJMS0001 | JP + **MJMS** + 0001 | MJMS（ムーンショット） |

#### 実装

- `fetchJgn()`: 正規表現 `/^JP([A-Z]+)\d/i` で JP 直後のアルファベット部分を抽出し `fundingStreamId` として返却
- `lookupOne()`: JGN 結果に `fundingStreamId` / `fundingStreamIdType: 'JGN_fundingStream'` を追加
- `buildResultCards()`: プログラム情報識別子行にコードとタイプを表示
- 科研費番号（`JP21H01234` 等）は JP 直後が数字のため抽出されない（空欄のまま）

#### Crossref Funder タイプについて

`fundingStreamIdentifierType` には `Crossref Funder`（子プログラムの Funder DOI）も定義されているが、以下の理由で現時点では対応しない:
- Crossref Funder Registry の `hierarchy-names` は英語名のみ、JGN の `scheme` は日本語で言語マッチング困難
- 全 descendants の個別 API 呼び出し（JST で37件）は負荷が大きい

#### Crossref Funder Registry の階層例（JST）

| レベル | Funder DOI | 名称 | JPCOAR 項目 |
|---|---|---|---|
| 親 | `10.13039/501100001700` | MEXT（文部科学省） | ― |
| 子 | `10.13039/501100002241` | JST（科学技術振興機構） | 助成機関識別子 |
| 孫 | `10.13039/501100009023` | さきがけ / PRESTO | プログラム情報識別子 |
| ひ孫 | Crossref DOI type `grant` | 個別の研究課題 | 研究課題番号 |

### 機能B: Acknowledgementsテキストからの課題番号自動抽出

#### 実装

- ラジオボタンで「課題番号」/「Acknowledgementsテキスト」モードを切替
- `updatePlaceholder()`: モードに応じてラベル・placeholder・ヒント文を動的切替
- `doSearch()`: Ack モード時は `/JP[A-Za-z0-9]+/g` で課題番号を抽出（`Set` で重複排除）
- 課題番号モードは従来通り改行区切り

#### エラー時の NISTEP リンク表示

- `lookupOne()`: JP で始まり英字を含む番号（`/^JP[A-Z]/i`）で JGN・KAKEN いずれも見つからなかった場合、エラーカードに[最新の体系的番号一覧（NISTEP）](https://www.nistep.go.jp/taikei/)へのリンクを表示
- `nistepHint` プロパティとして HTML リンクを返し、`buildResultCards()` でエスケープせずに挿入
- 科研費番号（JP + 数字で始まるもの）やJP接頭辞のない番号ではリンク非表示

### 検証方法

#### 機能A: fundingStreamIdentifier
- `JPMJPR2125` → プログラム情報識別子: `MJPR` (JGN_fundingStream) が表示
- `JPMJSA1907` → プログラム情報識別子: `MJSA` (JGN_fundingStream) が表示
- `21K12345` → KAKEN 結果、プログラム情報識別子: 空欄
- `JP21H01234` → KAKEN 結果、プログラム情報識別子: 空欄

#### 機能B: Acknowledgements 抽出
- Ack モードで以下のテキストを貼り付けて検索:
  ```
  This work was supported by ... (Grant Nos. JP18K05379 to Y.N.; JP21H02158 to Y.N., Y.F.; JP16K07412, JP24510312 to Y.F.), ... (Grant No. JPJ009237), ... (Grant No. JPMJSA1907) ...
  ```
- 6件の課題番号が抽出・検索されること: JP18K05379, JP21H02158, JP16K07412, JP24510312, JPJ009237, JPMJSA1907
- 重複排除されること

---

## 拡張: KAKEN XML API 対応 + 補助金番号自動解決（#58）

> **ステータス: 実装完了（2026-03-04）**

### 背景

論文の謝辞に「補助金の研究課題番号」（例: `23H03160`）が記載されるケースがある。CiNii Research OpenSearch API では検索不可だが、KAKEN XML API（`kaken.nii.ac.jp/opensearch/`）では補助金番号でもヒットし、正規の「研究課題/領域番号」（例: `JP23K27850`）に解決できる。

### 変更概要

| コード | 変更 |
|--------|------|
| `fetchKaken()` | `fetchKakenCiNii()` にリネーム（フォールバック用に残存） |
| `fetchKakenXml()` | 新規追加: KAKEN XML API（CiNii APIキー必須） |
| `lookupOne()` | 検索優先順位変更 + 補助金番号検出 |
| `buildResultCards()` | `supplementaryWarning` 行追加 |

### 検索優先順位の変更

```
CiNii APIキーあり:
  1. fetchKakenXml()    ← KAKEN XML API 優先
  2. fetchJgn()         ← JGN フォールバック（JP接頭辞あり）

CiNii APIキーなし:
  1. fetchJgn()         ← JGN（JP接頭辞あり）
  2. fetchKakenCiNii()  ← CiNii Research OpenSearch フォールバック
```

### 補助金番号の検出と修正

- 入力番号と KAKEN XML API の `normalizedValue` を比較
- 異なる場合: 正規番号に自動修正 + `supplementaryWarning` を結果に付与
- カード表示で警告行を表示（色: `#e65100`）
- 例: `23H03160` → `JP23K27850`

### CiNii APIキー未設定時

- KAKEN XML API は利用不可
- JGN → CiNii Research OpenSearch の従来フローにフォールバック
- 検索失敗時のエラーメッセージに「CiNii APIキーが設定されていません」を表示

### 検証方法

- CiNii APIキー設定状態で `23H03160`（補助金番号）を入力 → `JP23K27850` に修正、警告表示
- CiNii APIキー設定状態で `JP23K27850`（正規番号）を入力 → 修正なし、警告なし
- CiNii APIキー未設定で `JP23K27850` → CiNii Research OpenSearch フォールバックでヒット
- CiNii APIキー未設定で `23H03160` → ヒットしない（制約通り）
- JST課題番号（例: `JPMJSA1907`）→ KAKEN不一致、JGNフォールバック動作確認
