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
| プログラム情報識別子 | 23-.3 | 常に空欄（JGN APIから取得不可） |
| プログラム情報 | 23-.4 | JGN: `funding.scheme` / KAKEN: 科学研究費助成事業（定数） |
| 研究課題番号 | 23-.5 | 入力値 |
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
