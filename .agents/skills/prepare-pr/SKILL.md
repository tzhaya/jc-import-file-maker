---
name: prepare-pr
description: PR作成前の必須チェックリストを実行する。テスト用HTML同期・E2Eテスト依頼・README/docs/MEMORY更新・LOCAL_VERSION同期・manifest.jsonバージョン更新・「最終更新」日付/更新概要の同期を漏れなく行う。コミットやPR作成の直前に使用。
disable-model-invocation: false
argument-hint: "(任意のメモ)"
---

# PR作成前チェックリスト

変更を pull request にまとめる前に、以下をすべて実施する。**コミットではなく PR 作成を促すこと。**
1項目でも未完了ならPR作成に進まない。

## 1. テスト用ファイルの同期 → E2Eテスト

`/sync-test` で本番HTMLの変更をテスト用HTMLへ反映する（CONFIGのAPIキーは置き換えず残す）:

| 本番 | テスト用 |
|------|----------|
| `make_jc_importer.html` | `make_jc_importer_test.html` |
| `funder_lookup.html` | `funder_lookup_test.html` |

> `openalex_lookup.html` にはテスト版が存在しない（単一ファイル運用）。変更した場合は `/e2e-test openalex` で本番HTMLを直接対象にテストする。

同期後、ユーザーに `/e2e-test` の手動実行を依頼する（Codexからは起動不可）。
**ALL PASSED になるまでPR作成に進まない。**

## 2. Chrome拡張への変更反映（本番→拡張）

「最終更新」日付と更新概要は JST日付・最新5件・古い情報は削除して同期する。

- `make_jc_importer.html` を変更した場合:
  - `make_jc_importer.html` の「最終更新」日付＋更新概要テーブルを更新
  - `chrome-extension/panel.html` の更新概要テーブルを同じ内容に更新
  - `chrome-extension/make_jc_importer.js` に変更を反映（CONFIGのAPIキーは残す）
- `funder_lookup.html` を変更した場合:
  - `funder_lookup.html` の「最終更新」日付を更新
  - `chrome-extension/funder_panel.html` の「最終更新」日付を同じ内容に更新
  - `chrome-extension/funder_lookup.js` に変更を反映（CONFIGのAPIキーは残す）
- `shared.js` を変更した場合 → `chrome-extension/shared.js` に同一内容をコピー
- `tsv_headers_template.js` を変更した場合 → `chrome-extension/tsv_headers_template.js` に同一内容をコピー
- `openalex_lookup.html` を変更した場合 → `chrome-extension/openalex_panel.js` / `chrome-extension/openalex_panel.html` に同一ロジックを反映（CONFIGはshared.js経由のため個別のAPIキー置換は不要）。「最終更新」表記・LOCAL_VERSIONは無い

> 本番HTML/共有JSを編集すると `sync-reminder` フックが同期先を即時リマインドする。

## 3. `LOCAL_VERSION` 定数の更新（GitHub更新チェック用）

各ファイルの `checkForUpdate()` 内 `const LOCAL_VERSION = 'YYYY-MM-DD'` をコミット日（JST）に更新:

- `make_jc_importer.html` → `chrome-extension/make_jc_importer.js`
- `funder_lookup.html` → `chrome-extension/funder_lookup.js`

未更新だと「新しいバージョンがあります」が誤表示される。
（`openalex_lookup.html` は `checkForUpdate()` を持たないため対象外）

## 4. `chrome-extension/manifest.json` の `version` 更新

Chrome拡張配下（`make_jc_importer.js` / `funder_lookup.js` / `panel.html` / `funder_panel.html` 等）を変更した場合、セマンティックバージョニングで更新:

- **major**: 破壊的変更（UI大幅刷新・データ形式変更等）
- **minor**: 機能追加（新タブ・API対応追加等）
- **patch**: バグ修正・軽微な改善

## 5. ドキュメント更新

- `README.md`:
  - 「最新の更新」テーブル: 4ツール（Chrome拡張版 / インポート用TSV生成ツール / 助成情報検索ツール / OpenAlex機関別著作検索）の日付・バージョン・更新概要を更新。Chrome拡張版のみバージョン列に `ver. X.Y.Z`、他は `—`
  - 変更履歴テーブルに日付と内容を追記（新しい日付が上）
- `docs/requirements.md`: 機能追加・変更があれば要件定義を更新
- `docs/worklog.md`: 最終更新日・実装内容の詳細セクションを追記
- `MEMORY.md`: 行番号目安・ファイル規模など該当箇所を更新

## 6. 品質チェック（`npm test`）

`npm test`（`scripts/check.js`: JSON parse + JS構文 + UTF-8妥当性 + 手動同期ファイルの一致チェック + TSVヘッダー構造チェック）を実行し、**ALL PASSしてからPR作成に進む**。

特に `shared.js` / `tsv_headers_template.js` を編集した場合、`chrome-extension/` 側へのコピー忘れはここで検出される（#193）。

## 7. PR作成

ブランチ運用ルール（AGENTS.md）に従い `gh pr create` でPRを作成する。
