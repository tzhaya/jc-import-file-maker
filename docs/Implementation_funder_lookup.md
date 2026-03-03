# 助成情報検索ツール HTML ページ 実装計画

## 背景
issue #53 で実装済みの `fetchJgn()` / `fetchKaken()` の機能を活用し、科研費課題番号やJGN課題番号から助成機関情報を一括検索・表示するスタンドアロン HTML ページを作成する。

## 作成ファイル
- `funder_lookup.html` — 単一HTMLファイル（プロジェクトルート直下）

## 機能仕様

### 入力
- テキストエリア（複数行）に課題番号を改行区切りで入力
- `JP21H01234` / `21H01234` のいずれの形式も受付（既存の `fetchKaken()` が `replace(/^JP/i, '')` で正規化済み）
- 「検索」ボタンで一括実行
- CiNii APIキーは本体同様 JavaScript 定数として埋め込み（キーなしでも動作）

### 検索ロジック（本体 `make_jc_importer.html` から移植）
1. `fetchJgn(awardNumber)` — Crossref JGN API で検索
2. `fetchKaken(awardNumber)` — CiNii Research KAKEN API で検索
3. フロー: JGN → 成功ならJGNデータ使用 / 失敗(null) → KAKEN検索
4. KAKEN成功時は JSPS 定数（`JSPS_FUNDER_DOI`, `JSPS_FUNDER_NAMES`）で助成機関を補完

### 表示（本体プレビューの `buildFundingPreview` に準拠）
- `pv-inner-table` スタイルのテーブル
- カラム: `#`, `助成機関名`, `識別子`, `課題番号`, `課題名`
- 各行に1件の課題番号の結果を表示
- 検索中はローディング表示、エラー時はエラーメッセージ表示

### 移植するコード（`make_jc_importer.html` より）
| コード | 行番号 | 備考 |
|--------|--------|------|
| `fetchJgn()` | L1294-1322 | そのまま移植 |
| `fetchKaken()` | L1258-1291 | そのまま移植 |
| `JSPS_FUNDER_DOI`, `JSPS_FUNDER_NAMES` | L766-770 | そのまま移植 |
| `CONFIG.CiNii_API_KEY` | L403-411 | 定数のみ |
| プレビューCSS (`.pv-inner-table`, `.pv-link`) | L429-449 | サブセット |
| `fmtVal()` | プレビューセクション | 言語後置・URLリンク化の簡略版 |

### ページ構成
```html
<html>
  <head>
    <style>
      /* 本体プレビューのCSSサブセット */
      .pv-inner-table, .pv-link 等
      /* 入力エリア・ボタンのスタイル */
    </style>
  </head>
  <body>
    <h1>助成情報検索ツール</h1>
    <textarea placeholder="課題番号を1行に1つ入力"></textarea>
    <button>検索</button>
    <div id="result"><!-- 結果テーブル --></div>
    <script>
      // CONFIG, JSPS定数
      // fetchJgn(), fetchKaken()
      // 検索実行 → 結果テーブル生成
    </script>
  </body>
</html>
```

## 実装手順
1. `funder_lookup.html` を新規作成
2. CSS（本体プレビュースタイルのサブセット + 入力UI用スタイル）
3. HTML構造（入力エリア + 結果表示エリア）
4. JavaScript:
   - CONFIG定数 + JSPS定数
   - `fetchJgn()`, `fetchKaken()` を本体から移植
   - メイン検索関数: テキストエリアから番号を抽出 → 各番号に対しJGN→KAKEN順で検索 → 結果を `buildFundingPreview` 風テーブルで表示
   - `fmtVal()` 簡略版

## 検証方法
- ブラウザで `funder_lookup.html` を開く
- テキストエリアに以下を入力して検索:
  - `JP21H01234`（KAKEN科研費番号 — JPプレフィックスあり）
  - `21H01234`（KAKEN科研費番号 — JPプレフィックスなし）
  - `JPMJPR2024`（JGN JST番号）
  - 存在しない番号（エラーハンドリング確認）
