---
name: e2e-test
description: Playwrightの恒久スクリプトでmain、funder、openalexの回帰確認またはIssue固有確認を手動実行する。
disable-model-invocation: true
argument-hint: "[main | funder | openalex] [DOI / award number / ROR ID]"
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# E2Eテスト

このSkillはユーザーが手動で起動する。ClaudeからブラウザE2Eを開始しない。

共通設定（対象・既定入力）は `scripts/e2e-config.mjs`、実行本体は `scripts/run-e2e.mjs`。
対象は本番HTMLそのもの。開発者のAPIキーは git 管理外の `config.local.js` から読み込まれる。

## 対象を選ぶ

- `main`: `make_jc_importer.html`
- `funder`: `funder_lookup.html`
- `openalex`: `openalex_lookup.html`

回帰確認とIssue固有確認を区別する。
回帰確認だけでIssue固有の完了条件を満たしたことにしない。
Issue固有の受入結果はPR本文へ記録する。

```powershell
node scripts/run-e2e.mjs <main|funder|openalex> [入力値]
```

mainで`AWARD_NUMBERS`が検出された場合は、runnerがfunderも自動確認する。

Chrome拡張限定機能は標準HTMLのE2Eで完了扱いにしない。
unpacked extensionの実E2Eを行うか、未実施範囲と代替テストをPRへ明記し、「E2E済み」と書かない。

失敗時だけ詳細を確認する。トラブル時は`references/troubleshooting.md`を読む。
