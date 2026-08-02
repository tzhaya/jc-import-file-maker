---
name: release
description: Chrome拡張機能のリリースPR準備、manifest version更新、テスト、タグ作成、GitHub Release確認、Chromeウェブストア提出案内を安全に進める。ユーザーがリリース、バージョン更新、タグ付け、配布用ZIP作成、Chromeウェブストアへの公開を依頼したときに使用する。
---

# リリース

正本の `docs/release_procedure.md` と `.github/workflows/release.yml` を最初に読む。
通常の開発PRでは使用せず、実際に配布するときだけ使用する。

## 安全原則

- 既定ではリリースPRの準備まで行う。
- タグの作成・pushとChromeウェブストアへの提出は公開操作として分離し、各操作の直前にユーザーの明示的な確認を得る。
- `package.json` の `version` は拡張機能の配布バージョンではないため変更しない。
- タグは必ずマージ済みの `master` に作成する。リリースブランチや未マージコミットには作成しない。
- 既存のタグを移動・上書きしない。失敗時も `--force` を使用しない。
- Chromeウェブストアへの提出はユーザーが手動で行う。認証済みブラウザを勝手に操作しない。

## 1. 事前確認

1. `git status --short`、現在のブランチ、最新タグ、`chrome-extension/manifest.json` のversionを確認する。
2. 前回タグから `master` までのコミットと変更ファイルを調べ、Chrome拡張へ影響する変更があるかを要約する。
3. 次のversionを提案する。
   - 破壊的変更: major
   - 機能追加: minor
   - バグ修正・軽微な改善: patch
4. 変更内容から桁を一意に判断できない場合だけ、ユーザーにversionを確認する。
5. 作業ツリーがdirtyなら既存変更の所有者と内容を確認し、リリース変更と混在させない。

## 2. リリースPRを準備

1. 最新の `master` から `release/<version>` ブランチを作る。
2. `chrome-extension/manifest.json` の `version` を更新する。
   あわせて `README.md` の「最新の更新」「変更履歴」、`chrome-extension/panel.html` と `make_jc_importer.html` の更新概要テーブル、各HTML（`funder_lookup.html` / `chrome-extension/funder_panel.html` を含む）の「最終更新」表示をリリース単位で更新する。利用者向けの記述にする（詳細は CLAUDE.md「ドキュメント運用」）。
3. `make_jc_importer.js` と `funder_lookup.js` の `LOCAL_VERSION` を確認する。前リリース以降の機能変更が未反映の場合だけ、そのJSの**実際の最終コミット日**（`git log -1 --date=format:%Y-%m-%d --format=%cd -- <ファイル>`、JST）に更新する。**リリースPRのマージ日ではない**（マージ日はコミット日と一致しないことがあり、ずれると更新チェックが誤動作する。詳細は CLAUDE.md「アプリ内『最終更新』表示と LOCAL_VERSION」）。
4. ルートのJSを変更した場合は `npm run build` を実行する。
5. `docs/changelog.md` に前回リリース以降の変更をまとめる（利用者向けの面はステップ2で対応済み）。
6. `git diff --check` と `npm test` を実行する。
7. HTML/JSを変更した場合はユーザーに `/e2e-test` を依頼し、`ALL PASSED` の報告までPR作成へ進まない。
8. `/prepare-pr` 相当の確認を行い、変更内容・version判断・テスト結果を示す。ユーザーの承認後にコミット、push、PR作成を行う。

## 3. タグとGitHub Release

リリースPRのマージ後、ユーザーがタグ公開を明示的に承認した場合だけ行う。

1. `master` を最新化し、作業ツリーがcleanであることを確認する。
2. `HEAD` が `origin/master` と一致し、リリースPRが含まれることを確認する。
3. manifest versionが `<version>`、作成予定タグが `v<version>` で完全一致することを確認する。
4. 同名タグがローカルにもリモートにも存在しないことを確認する。
5. `git tag v<version>`、`git push origin v<version>` を実行する。
6. GitHub Actionsの `Release Chrome Extension` が成功するまで確認する。
7. GitHub Releasesに `jc-import-file-maker-v<version>.zip` が添付されていることを確認する。

不一致・CI失敗・既存タグを検出したら停止し、修正案を報告する。

## 4. Chromeウェブストア

GitHub Release成功後、次をユーザーへ案内する。

1. ReleaseのZIPをダウンロードする。
2. Chromeデベロッパーダッシュボードへアップロードする。
3. 変更内容を入力して審査へ提出する。
4. 公開後にストア上のversionを確認する。

最後に、GitHub ReleaseのURL、タグ、manifest version、Actions結果、Web Store提出状況をまとめる。
