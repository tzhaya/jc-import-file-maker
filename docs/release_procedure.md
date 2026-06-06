# リリース手順

## 概要

`v*` タグを push すると GitHub Actions（`.github/workflows/release.yml`）が自動起動し、`chrome-extension/` を zip 化して GitHub Releases に添付します。

---

## 手順

### 1. 実装・テスト

1. ブランチを作成して実装する（`feature/xxx` または `fix/xxx`）
2. `make_jc_importer_test.html` / `funder_lookup_test.html` を更新する
3. `/e2e-test` で ALL PASSED を確認する

### 2. PR マージ前の更新チェック

以下がすべて更新されていることを確認する。

| 更新対象 | 内容 |
|---|---|
| `LOCAL_VERSION`（`make_jc_importer.html` / `chrome-extension/make_jc_importer.js`） | コミット日（JST）に更新 |
| `LOCAL_VERSION`（`funder_lookup.html` / `chrome-extension/funder_lookup.js`） | 変更した場合のみ更新 |
| `chrome-extension/manifest.json` の `version` | セマンティックバージョニングで patch/minor/major を上げる |
| 各 HTML の「最終更新」日付・更新概要テーブル（直近5件） | `make_jc_importer.html` / `chrome-extension/panel.html` など |
| `README.md` の「最新の更新」テーブルと変更履歴テーブル | |
| `docs/worklog.md` の最終更新日・バージョン履歴・実装セクション | |

### 3. PR を作成・マージする

```bash
gh pr create --title "..." --body "..."
# レビュー後マージ
git checkout master && git pull
git branch -d feature/xxx
```

### 4. タグを作成して push する

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

---

## バージョニング規則

`manifest.json` の `version`（`major.minor.patch`）を以下の基準で上げる。

| 種別 | 上げる桁 | 例 |
|---|---|---|
| 破壊的変更（UIの大幅刷新・データ形式変更等） | major | `1.x.x` → `2.0.0` |
| 機能追加（新タブ・API対応追加等） | minor | `1.9.x` → `1.10.0` |
| バグ修正・軽微な改善 | patch | `1.9.4` → `1.9.5` |

Chrome拡張配下のファイル（`make_jc_importer.js`, `funder_lookup.js`, `panel.html`, `funder_panel.html` 等）を変更した場合のみ version を更新する。

---

## タグと manifest version の対応表

| タグ | manifest version | 日付 | 内容 |
|---|---|---|---|
| v1.9.5 | 1.9.5 | 2026-06-06 | IndexID・公開日TSV出力バグ修正、管理フィールドヒント誤り修正（#142, #143） |
| v1.9.4 | 1.9.4 | 2026-05-15 | 表示情報整理：5月の実作業を更新概要テーブルに反映、LOCAL_VERSION 同期 |
| v1.9.3 | 1.9.3 | 2026-05-14 | ツール名を「JAIRO Cloud インポート支援ツール」に統一（#138, #139） |
| v1.9.2 | 1.9.2 | 2026-05-13 | Chromeウェブストア登録準備：拡張機能アイコン追加、プライバシーポリシー策定（#112） |
