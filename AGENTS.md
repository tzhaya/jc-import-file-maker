# プロジェクト共通ルール

## ユーザー設定
- 日付の記録はすべて **日本標準時（JST / UTC+9）** を使用
- `gh` コマンドが見つからない場合はフルパス `"/c/Program Files/GitHub CLI/gh.exe"` で実行

## ワークフロー
- 作業完了時はコミットではなく **pull request の作成** を促すこと
- **PR作成の直前に `/prepare-pr` を実行すること**（テスト用HTML同期・E2Eテスト依頼・README/docs/MEMORY更新・`LOCAL_VERSION`同期・`manifest.json`バージョン更新・「最終更新」反映の必須チェックリスト）。1項目でも未完了ならPR作成に進まない
- E2Eテストはユーザーが `/e2e-test` を手動実行する（Codexからは起動不可）。ALL PASSED になるまでPR作成に進まない
- 本番HTML/共有JSを編集すると `sync-reminder` フックが同期先を即時リマインドする

## ドキュメント運用
- `docs/` に新規ドキュメントを追加したら `scripts/check.js` の `UTF8_FILES` に追加し、`docs/developer_docs.md` のドキュメント一覧にも追記すること
- ドキュメントのみの変更（HTML/共有JS/Chrome拡張を含まない）PRは E2Eテスト対象外・`manifest.json` バージョン更新不要（#184・#181 が前例パターン）

## 共通ファイル構成（#111）
- `shared.js` — CONFIG定数 + `loadConfig()` + `extensionFetch()` を定義。両HTML・Chrome拡張で共有
- `tsv_headers_template.js` — `TSV_HEADERS_TEMPLATE` 定数を定義。`make_jc_importer.html` / Chrome拡張のみ使用
- APIキー設定はスタンドアロン版では `shared.js` を直接編集、Chrome拡張版では `options.html` で設定

> Chrome拡張（MV3）作業時の固有ルールは `chrome-extension/AGENTS.md` を参照（当該ディレクトリ作業時に自動読込）。

## ブランチ運用ルール
- **基本的にすべての変更でブランチを作成する**（PRワークフローのため）
- ブランチ命名規則:
  - 新機能: `feature/機能名`
  - バグ修正: `fix/修正内容`
- 作業の流れ:
  1. `git checkout -b feature/xxx` — ブランチ作成
  2. 作業・コミット
  3. `gh pr create` — PR作成
  4. レビュー・マージ
  5. `git checkout master && git pull` — master同期
  6. `git branch -d feature/xxx` — ローカルブランチ削除
  7. 必要に応じてリモートブランチも削除
- マージ済みブランチは速やかに削除し、散らかりを防ぐ
