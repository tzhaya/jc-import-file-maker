# プロジェクト共通ルール

## ユーザー設定
- 日付の記録はすべて **日本標準時（JST / UTC+9）** を使用
- `gh` コマンドが見つからない場合はフルパス `"/c/Program Files/GitHub CLI/gh.exe"` で実行

## ファイル構成（正本とビルド）
- **JSの正本はリポジトリ直下**: `shared.js` / `tsv_headers_template.js` / `make_jc_importer.js` / `funder_lookup.js` / `openalex_lookup.js` / `weko3_opensearch_core.js`
- `chrome-extension/` 配下の同名ファイル（`openalex_lookup.js` は `openalex_panel.js`）は **`npm run build` が生成するコピー**。直接編集しない
- 正本を編集したら `npm run build` を実行する。未反映は `npm test`（CI）の File sync 検査で落ちる
- 拡張専用ファイル（`background.js` / `options.js` / `opensearch_panel.js` / 各パネルHTML / `manifest.json`）は `chrome-extension/` 内で直接編集する
- 標準版HTML（`make_jc_importer.html` / `funder_lookup.html` / `openalex_lookup.html`）はマークアップのみ。JSは `<script src>` で正本を読み込む
- 開発者のAPIキー等は git 管理外の `config.local.js` に置く（標準版HTMLが任意読込し `CONFIG` を上書き）。Chrome拡張版は `options.html` で設定
- 環境差分は実行時ガードで吸収する（拡張専用ボタンは存在チェック、`typeof chrome` 判定など）。ファイルを分岐させない

## ワークフロー
- 作業完了時はコミットではなく **pull request の作成** を促すこと
- PR作成の直前に `/prepare-pr` を実行すること（build反映・テスト・LOCAL_VERSION・E2E依頼の短いチェックリスト）
- HTML/JS に変更があるPRは、ユーザーが `/e2e-test` を手動実行し ALL PASSED になるまでPR作成に進まない（Claudeからは起動不可）。ドキュメントのみの変更はE2E不要
- `chrome-extension/manifest.json` の `version` は **リリース時のみ** 更新する（`docs/release_procedure.md` 参照）。通常のPRでは触らない
- リリース作業は `/release` を使用する（リリースPR準備と検証を行い、タグpushなどの公開操作は直前に確認する）
- 変更記録は **PR本文と `docs/changelog.md`** に残す。`docs/worklog.md` への毎PR追記は不要（過去分のアーカイブとして保持）

## ドキュメント運用
- `docs/` に新規ドキュメントを追加したら `docs/README.md` の一覧に追記する（`scripts/check.js` は git 追跡ファイルを自動検査するため登録不要）

### 変更履歴の記載先と粒度
利用者が読む面と開発者が読む面で粒度を分ける。混同すると同じ変更が二重に並ぶ。

| 記載先 | 読み手 | 粒度 | 更新するPR |
|---|---|---|---|
| `docs/changelog.md` | 開発者 | PR単位・全量 | 毎PR |
| `README.md`「変更履歴」「最新の更新」 | 利用者 | リリース単位 | リリースPR |
| `chrome-extension/panel.html` 更新概要テーブル | 利用者 | リリース単位 | リリースPR |
| `make_jc_importer.html` 更新概要テーブル | 利用者 | リリース単位（**通常ブラウザ版に影響する変更のみ**） | リリースPR |

- 通常のPRでは **`docs/changelog.md` だけ**に書く。README・HTMLの更新履歴には行を足さない
  （#248 で manifest をリリース時のみ更新に変えて以降、1リリース＝複数PRになったため。毎PRで足すと同じ変更が二重に並ぶ）
- 例外として、拡張リリースを伴わない利用者向けの変更（導入手順・ドキュメント）は、その時点で README に個別行を足してよい
- 利用者向けの3面は、**Issue番号や関数名・内部フラグ名を主役にせず、利用者にとって何が変わるかを書く**。技術的詳細は `docs/changelog.md` へのリンクで足りる
- `make_jc_importer.html` には**拡張専用機能（OpenSearchパネル・OPF連携・KAKEN XML等）の行を載せない**

### アプリ内「最終更新」表示と LOCAL_VERSION
- `make_jc_importer.html` / `chrome-extension/panel.html` / `funder_lookup.html` / `chrome-extension/funder_panel.html` の「最終更新: YYYY-MM-DD」は**利用者に見える表示**。更新履歴に行を足したら必ず一緒に直す
- `make_jc_importer.js` / `funder_lookup.js` の `LOCAL_VERSION` は**別物**で、更新チェック（`remoteDate > LOCAL_VERSION`）の基準日。**そのJSが master に最後にコミットされる日**と一致させる
  - 実際のコミット日より古い → 最新版の利用者にも更新通知が出続ける
  - 新しい → 古い版の利用者に通知が出ない
- **正本JSを変更しないPRでは `LOCAL_VERSION` を触らない。** 変更する場合はマージ日と一致させる

## ブランチ運用ルール
- **基本的にすべての変更でブランチを作成する**（PRワークフローのため）
- ブランチ命名規則:
  - 新機能: `feature/機能名`
  - バグ修正: `fix/修正内容`
- 作業の流れ: ブランチ作成 → 作業・コミット → `gh pr create` → レビュー・マージ → `git checkout master && git pull` → ブランチ削除
- マージ済みブランチは速やかに削除し、散らかりを防ぐ

> Chrome拡張（MV3）作業時の固有ルールは `chrome-extension/CLAUDE.md` を参照（当該ディレクトリ作業時に自動読込）。
