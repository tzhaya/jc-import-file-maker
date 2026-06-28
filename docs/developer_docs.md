# 開発者向けドキュメント

初心者向けの使い方は [user_guide.md](user_guide.md) を参照してください。
このドキュメントは保守・開発に必要な情報をまとめています。

## 開発環境のセットアップ

```
git clone https://github.com/tzhaya/jc-import-file-maker.git
cd jc-import-file-maker
npm install
```

## 品質チェック（npm test）

`npm test` を実行すると `scripts/check.js` が走り、以下を検証します:

- **JSON parse**: `package.json` / `chrome-extension/manifest.json` が構文的に正しいか
- **JS 構文チェック** (`node --check`): 自作 JS ファイル（`shared.js`、Chrome拡張の各 JS）に構文エラーがないか
- **UTF-8 妥当性**: 上記ファイルおよび主要 Markdown が UTF-8 として正しく読めるか

外部 API・APIキー・ネットワーク接続は不要です。PR 作成時は CI が自動で実行します（[.github/workflows/ci.yml](../.github/workflows/ci.yml)）。

## 文字コードについて

このリポジトリのテキストファイルは **UTF-8**（BOM なし）で保存されています（TSV エクスポート出力は UTF-8 BOM 付きですが、ソースコードは BOM なし）。`.editorconfig` で `charset = utf-8` を明示しています。

### CLIや AI エージェントで日本語が文字化けして見える場合

ファイルが壊れているのではなく、**表示環境のエンコーディング差**が原因である場合がほとんどです。

**確認手順（Windows PowerShell）:**

```powershell
# UTF-8 として正しく読めるか確認
Get-Content -Encoding UTF8 README.md | Select-Object -First 20

# コンソール出力エンコーディングを UTF-8 に変更（セッション内のみ）
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
```

**VS Code での確認:** エディタ右下のステータスバーにエンコーディングが表示されます（`UTF-8` であれば正常）。

`npm test` の UTF-8 妥当性チェックが pass であれば、チェック対象ファイルのエンコーディングは健全です。CLI 表示だけを根拠に日本語本文の一括復旧作業は行わないでください（[#175](https://github.com/tzhaya/jc-import-file-maker/issues/175)）。

## ブランチ・PRワークフロー

詳細は [CLAUDE.md](../CLAUDE.md) を参照してください。基本的に全変更でブランチを作成し、PR 経由でマージします。PR 作成直前は `/prepare-pr` チェックリストを実行してください。

## リリース手順

[docs/release_procedure.md](release_procedure.md) を参照してください。

## ドキュメント一覧（保守者向け）

| ドキュメント | 内容 |
|---|---|
| [requirements.md](requirements.md) | 要件定義 |
| [fieldmapping.md](fieldmapping.md) | JPCOARフィールドマッピング |
| [weko3_tsv_import_spec.md](weko3_tsv_import_spec.md) | WEKO3 TSVインポート仕様 |
| [privacy-policy.md](privacy-policy.md) | プライバシーポリシー |
| [release_procedure.md](release_procedure.md) | リリース手順 |
| [remaining_issues.md](remaining_issues.md) | 残存Issue一覧 |
| [worklog.md](worklog.md) | 実装作業ログ |
| [api-flow.md](../api-flow.md) | Crossref/OpenAlex 取得フロー概要 |
| [function.md](../function.md) | 機能と技術 |
