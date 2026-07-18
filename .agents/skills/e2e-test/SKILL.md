---
name: e2e-test
description: Playwrightの恒久スクリプトでmain、funder、openalexの回帰確認またはIssue固有確認を手動実行し、合否と対象成果物のSHA-256記録を生成する。
---

# E2Eテスト

このSkillはユーザーが手動で起動する。CodexからブラウザE2Eを開始しない。

## 対象を選ぶ

- `main`: `make_jc_importer_test.html`
- `funder`: `funder_lookup_test.html`
- `openalex`: `openalex_lookup.html`

回帰確認とIssue固有確認を区別する。
回帰確認だけでIssue固有の完了条件を満たしたことにしない。

```powershell
node .agents/skills/e2e-test/scripts/run-e2e.mjs <main|funder|openalex> [入力値]
```

mainで`AWARD_NUMBERS`が検出された場合は、runnerがfunderも自動確認する。
記録のsuiteは回帰確認に限定する。Issue固有の受入結果はPR本文へ別に記録する。

成功時は`.e2e-results/<target>.json`へ対象コミット、JST日時、suite、対象ファイルのSHA-256、結果を記録する。
この記録は成果物ドリフトの検出用であり、実行証明ではない。

Chrome拡張限定機能は標準HTMLのE2Eで完了扱いにしない。
unpacked extensionの実E2Eを行うか、未実施範囲と代替テストをPRへ明記し、「E2E済み」と書かない。

失敗時だけ詳細を確認する。トラブル時は`references/troubleshooting.md`を読む。
