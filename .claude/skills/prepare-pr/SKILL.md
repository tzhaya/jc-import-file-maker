---
name: prepare-pr
description: PR作成前のチェックリストを一括実行する。build反映・全テスト・LOCAL_VERSION・文書更新を確認し、HTML/JS変更時はユーザーにE2Eを依頼する。
disable-model-invocation: false
argument-hint: "(任意のメモ)"
model: sonnet
---

# PR準備

PR作成の直前に以下を上から順に確認する。未完了項目があればPR作成へ進まない。
**コミットではなくPR作成を促す。**

1. `git diff master...HEAD`（＋未コミット差分）から変更種別を判定する: `docs-only` か、HTML/JS変更を含むか。
2. JS正本（リポジトリ直下）を変更した場合は `npm run build` を実行し、コピー先の反映漏れをなくす。
3. `npm test` を実行し ALL PASS を確認する（File sync 検査を含む）。
4. 機能変更があるツールの `LOCAL_VERSION`（`make_jc_importer.js` / `funder_lookup.js`）をJSTの日付へ更新する。
5. ユーザー向けの動作・設定が変わった場合のみ、README・`docs/user_guide.md`・`docs/settings.md` 等の該当箇所を更新する。変更記録はPR本文と `docs/changelog.md` へ（worklog追記は不要）。
6. `chrome-extension/manifest.json` の `version` は触らない（リリース時のみ更新）。
7. HTML/JS変更を含む場合、ユーザーへ `/e2e-test` の手動実行を依頼する。Claudeから起動しない。ALL PASSED の報告を受けてからPR作成へ進む。
8. リスクが高い変更（永続形式・権限・非同期競合・外部API仕様・大規模構造変更）のみ `/cross-review` を提案する。それ以外は通常レビューで進める。

PR本文には変更内容、背景、テスト結果（単体・E2E）、未検証範囲、関連Issueを記載する。
