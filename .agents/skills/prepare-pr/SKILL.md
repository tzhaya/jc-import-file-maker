---
name: prepare-pr
description: PR作成前の必須チェックリストを実行する。テスト用HTML同期・E2Eテスト依頼・README/docs/MEMORY更新・LOCAL_VERSION同期・manifest.jsonバージョン更新・「最終更新」日付/更新概要の同期を漏れなく行う。コミットやPR作成の直前に使用。
disable-model-invocation: false
argument-hint: "[main|funder|openalex|all]（省略時はgit diffから自動判定） (任意のメモ)"
---

# PR作成前チェックリスト

変更を pull request にまとめる前に、以下をすべて実施する。**コミットではなく PR 作成を促すこと。**
1項目でも未完了ならPR作成に進まない。

## 0. 変更範囲の判定

引数で scope（`main`/`funder`/`openalex`/`all`）が指定されていればそれを使う。省略時は `git diff` の対象ファイルから自動判定する:

- `make_jc_importer.html` 変更 → main
- `funder_lookup.html` 変更 → funder
- `openalex_lookup.html` 変更 → openalex
- `shared.js` / `tsv_headers_template.js` 変更 → 複数ツール共有のため all 相当（main+funder+openalex）として扱う
- 複数ツールにまたがる場合は該当する複数 scope をまとめて扱う

以降のステップは、ここで判定した scope に含まれるツールのみを対象とする。

## 1. テスト用ファイルの同期 → E2Eテスト

判定した scope に応じて `/sync-test <scope>` を実行し、本番HTMLの変更をテスト用HTMLへ反映する（CONFIGのAPIキーは置き換えず残す）:

| 本番 | テスト用 |
|------|----------|
| `make_jc_importer.html` | `make_jc_importer_test.html` |
| `funder_lookup.html` | `funder_lookup_test.html` |

> `openalex_lookup.html` にはテスト版が存在しない（単一ファイル運用）。scope に openalex が含まれる場合は `/e2e-test openalex` で本番HTMLを直接対象にテストする。

同期後、ユーザーに該当 scope 分の `/e2e-test <scope>` の手動実行を依頼する（Codexからは起動不可）。
**該当 scope が ALL PASSED になるまでPR作成に進まない。**

## 2. Chrome拡張への変更反映（本番→拡張）

scope に含まれるツールのみ処理する。対象外のツールは反映不要（スキップ）。

- main が対象:
  - `chrome-extension/panel.html` の更新概要テーブルを更新（内容はStep 5参照）
  - `chrome-extension/make_jc_importer.js` に変更を反映（CONFIGのAPIキーは残す）
- funder が対象:
  - `chrome-extension/funder_panel.html` の「最終更新」日付を更新（内容はStep 5参照）
  - `chrome-extension/funder_lookup.js` に変更を反映（CONFIGのAPIキーは残す）
- shared.js / tsv_headers_template.js が対象（=all相当）→ `chrome-extension/shared.js` / `chrome-extension/tsv_headers_template.js` に同一内容をコピー
- openalex が対象 → `chrome-extension/openalex_panel.js` / `chrome-extension/openalex_panel.html` に同一ロジックを反映（CONFIGはshared.js経由のため個別のAPIキー置換は不要）。「最終更新」表記・LOCAL_VERSIONは無い

> 本番HTML/共有JSを編集すると `sync-reminder` フックが同期先を即時リマインドする。

## 3. `LOCAL_VERSION` 定数の更新（GitHub更新チェック用）

scope に含まれるファイルのみ、`checkForUpdate()` 内 `const LOCAL_VERSION = 'YYYY-MM-DD'` をコミット日（JST）に更新する。対象外のファイルには触れない:

- main が対象 → `make_jc_importer.html` / `chrome-extension/make_jc_importer.js`
- funder が対象 → `funder_lookup.html` / `chrome-extension/funder_lookup.js`

未更新だと「新しいバージョンがあります」が誤表示される。
（`openalex_lookup.html` は `checkForUpdate()` を持たないため対象外）

## 4. `chrome-extension/manifest.json` の `version` 更新

Chrome拡張配下（`make_jc_importer.js` / `funder_lookup.js` / `panel.html` / `funder_panel.html` 等）を変更した場合、セマンティックバージョニングで更新:

- **major**: 破壊的変更（UI大幅刷新・データ形式変更等）
- **minor**: 機能追加（新タブ・API対応追加等）
- **patch**: バグ修正・軽微な改善

## 5. ドキュメント更新

「最終更新」日付と更新概要は JST日付・最新5件・古い情報は削除して同期する。

- `README.md`:
  - 「最新の更新」テーブル: **scope に該当する行のみ**日付・バージョン・更新概要を更新（Chrome拡張版のみバージョン列に `ver. X.Y.Z`、他は `—`）
  - 変更履歴テーブルには scope に関わらず毎回1行追記（新しい日付が上）
- 本文中の「最終更新」日付＋更新概要テーブル（`make_jc_importer.html` / `funder_lookup.html` 等）は scope に該当するファイルのみ更新
- `docs/requirements.md`: 機能追加・変更があれば要件定義を更新
- `docs/worklog.md`: 最終更新日・実装内容の詳細セクションを追記
- `MEMORY.md`: 行番号目安・ファイル規模など該当箇所を更新

## 6. 品質チェック（`npm test`）

`npm test`（`scripts/check.js`: JSON parse + JS構文 + UTF-8妥当性 + 手動同期ファイルの一致チェック + TSVヘッダー構造チェック）を実行し、**ALL PASSしてからPR作成に進む**。

特に `shared.js` / `tsv_headers_template.js` を編集した場合、`chrome-extension/` 側へのコピー忘れはここで検出される（#193）。

## 7. PR作成

ブランチ運用ルール（AGENTS.md）に従い `gh pr create` でPRを作成する。
