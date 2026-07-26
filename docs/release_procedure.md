# リリース手順

## 概要

`v*` タグを push すると GitHub Actions（`.github/workflows/release.yml`）が自動起動し、`chrome-extension/` を zip 化して GitHub Releases に添付します。

一連の作業には `/release` Skillを使用します。リリースPRの準備と検証を支援し、タグpushなどの公開操作は実行直前に確認します。Chromeウェブストアへの提出は手動です。

---

## 手順

### 1. 実装・テスト（通常のPRフロー）

1. ブランチを作成して実装する（`feature/xxx` または `fix/xxx`）
2. JS正本（リポジトリ直下）を変更したら `npm run build` で `chrome-extension/` へ反映する
3. `npm test` と `/e2e-test`（ALL PASSED）を確認し、PRを作成・マージする

通常のPRでは `manifest.json` の `version` を更新しない。

### 2. リリースPRを作成する

リリースするタイミングで、以下をまとめた小さなリリースPRを作る。

| 更新対象 | 内容 |
|---|---|
| `chrome-extension/manifest.json` の `version` | 前リリース以降の変更内容に応じて patch/minor/major を上げる |
| `LOCAL_VERSION`（`make_jc_importer.js` / `funder_lookup.js`） | 未反映ならリリース日（JST）に更新 |
| `docs/changelog.md` | 前リリース以降の変更をまとめる |
| `README.md` の変更履歴 | 必要に応じて更新 |

### 3. タグを作成して push する

manifest.json の `version`（例: `1.9.5`）に合わせたタグを打つ。

```bash
git tag v1.9.5
git push origin v1.9.5
```

> **認証エラーが出た場合**: gh のトークンを一時流用する
> ```bash
> git -c credential.helper="!gh auth git-credential" push origin v1.9.5
> ```

### 5. GitHub Actions の完了を確認する

- [Actions タブ](https://github.com/tzhaya/jc-import-file-maker/actions) でワークフローが成功したことを確認する
- [Releases](https://github.com/tzhaya/jc-import-file-maker/releases) に zip ファイルが添付されていることを確認する

### 6. Chromeウェブストアに提出する（必要な場合）

機能変更・バグ修正を含む場合は審査が必要。

1. [Chrome デベロッパーダッシュボード](https://chrome.google.com/webstore/devconsole) を開く
2. GitHub Releases からダウンロードした zip をアップロードする
3. 変更内容の説明を入力して「審査に提出」する

> **自動化予定（#169）**: 現在この提出は手動だが、[#169](https://github.com/tzhaya/jc-import-file-maker/issues/169) で Chrome ウェブストアへの提出自動化を計画中。実現後は本手順を更新する。

---

## バージョニング規則

`manifest.json` の `version`（`major.minor.patch`）を以下の基準で上げる。

| 種別 | 上げる桁 | 例 |
|---|---|---|
| 破壊的変更（UIの大幅刷新・データ形式変更等） | major | `1.x.x` → `2.0.0` |
| 機能追加（新タブ・API対応追加等） | minor | `1.9.x` → `1.10.0` |
| バグ修正・軽微な改善 | patch | `1.9.4` → `1.9.5` |

version の更新はリリースPRでのみ行い、前リリース以降に Chrome 拡張へ影響する変更（正本JS・拡張専用ファイル）が含まれる場合に、その内容で桁を決める。

---

## タグと manifest version の対応表

> **注**: v1.14.1〜v1.25.0の各リリース内容はこの表に未記載です。詳細は `docs/changelog.md` を参照してください。

| タグ | manifest version | 日付 | 内容 |
|---|---|---|---|
| v1.25.1 | 1.25.1 | 2026-07-26 | JISC Open Policy Finder API "full v1" リリース通知を受けたエラーハンドリング改善（#229）：401/403/429等の実エラーを「情報なし」と区別して表示し、OPF取得エラー時のアクセス権判定を安全側（`embargoed access`）に修正 |
| v1.14.0 | 1.14.0 | 2026-06-28 | OpenAlex起点パイプライン前段階（手動運用版・Phase 3、#157）：DOIリスト一括取得（#154）、OpenAlex機関別著作検索＋登録済み照合バッジ（#155/#156）、TSVタイトルのタグ/改行除去で行崩れ防止 |
| v1.13.0 | 1.13.0 | 2026-06-27 | 作業中データの自動保存・復元：入力中・蓄積中のメタデータをローカルストレージに自動保存し、タブ／サイドパネルを閉じても次回起動時に復元（#162） |
| v1.12.0 | 1.12.0 | 2026-06-22 | OpenAlex由来RORの誤同定対応：URI欄に「要確認」バッジ、誤同定検出時はROR未設定でCrossref所属表記を採用（#165） |
| v1.11.1 | 1.11.1 | 2026-06-19 | プログラム情報識別子タイプの空欄時に既定値（Crossref Funder）がTSVへ誤出力される不具合を修正（#161） |
| v1.11.0 | 1.11.0 | 2026-06-16 | TSV管理フィールド・リポジトリURLの初期値を設定可能に（#148）、ページからのDOI取得をJSON-LD（schema.org）対応に拡張（#159） |
| v1.10.1 | 1.10.1 | 2026-06-11 | 助成情報検索ツールのバグ修正：日本語混在行の課題番号誤取込、検索結果外部リンクでのパネルリセットを修正（#149, #150） |
| v1.10.0 | 1.10.0 | 2026-06-10 | 電子ジャーナルページのmetaタグからDOIを自動取得するボタンを追加、助成情報検索タブにDOIからの課題番号自動取得を追加（#73） |
| v1.9.5 | 1.9.5 | 2026-06-06 | IndexID・公開日TSV出力バグ修正、管理フィールドヒント誤り修正（#142, #143） |
| v1.9.4 | 1.9.4 | 2026-05-15 | 表示情報整理：5月の実作業を更新概要テーブルに反映、LOCAL_VERSION 同期 |
| v1.9.3 | 1.9.3 | 2026-05-14 | ツール名を「JAIRO Cloud インポート支援ツール」に統一（#138, #139） |
| v1.9.2 | 1.9.2 | 2026-05-13 | Chromeウェブストア登録準備：拡張機能アイコン追加、プライバシーポリシー策定（#112） |
