---
name: prepare-pr
description: PR作成前の準備と検証を二段階で行う。prepareで同期・バージョン・日付・文書を確定し、ユーザーによるE2E後にverifyで全テスト、差分、E2E記録と成果物ハッシュの一致を確認する。
---

# PR準備

`--prepare`と`--verify`を順に実行する。
一項目でも未完了ならPR作成へ進まない。

## `--prepare`

差分から`main`、`funder`、`openalex`、`chrome-extension`、`docs-only`を判定する。
機能変更では次を行う。

1. `/sync-test`でテスト用HTMLを同期する。
2. 標準版、共有JS、Chrome拡張版の必要な同期を行う。
3. `LOCAL_VERSION`をJSTの日付へ揃える。
4. Chrome拡張変更時は`manifest.json`を更新する。
5. README、要件、worklog、最終更新表記を必要に応じて更新する。
6. 実差分からリスクを再評価する。

文書またはSkillだけの変更ではE2Eとmanifest更新を要求しない。
準備後、対象に応じてユーザーへ`/e2e-test`の手動実行を依頼する。Codexから起動しない。

## `--verify`

1. `node scripts/verify-e2e-record.mjs --require-if-changed`を実行する。
2. `npm test`を実行する。
3. `git diff --check`を実行する。
4. 同期、バージョン、JST日付、必須文書を確認する。
5. Issue固有の受入結果と未検証範囲を確認する。
6. 最終差分からレビュー方式を決める。

E2E記録は実行対象ファイルと現在の成果物の一致だけを保証し、ブラウザ操作の独立証明にはならない。
CIでも同じ検証を行い、偶発的ドリフトを防ぐ。
非文書のE2E対象ファイルが一つでも変われば`docs-only`除外を認めない。

レビューはlowなら通常、mediumならPR時にsingle、highなら原則PRをcrossとする。
計画crossは設計の手戻りが大きい場合だけ追加する。
階層化による削減は仮説として、次の3〜5件で前向きに測る。

PR本文には変更、背景、影響、最終リスク、受入結果、単体・E2E・CI、未検証範囲、関連Issueを記載する。
