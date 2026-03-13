---
name: sync-test
description: 本番HTMLの変更をテスト用HTMLに同期する。make_jc_importer.html → make_jc_importer_test.html、funder_lookup.html → funder_lookup_test.html のいずれかまたは両方を同期。
disable-model-invocation: true
argument-hint: "[all | main | funder]"
allowed-tools:
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Bash(diff *)
---

# テスト用HTML同期

本番HTMLファイルの変更内容をテスト用HTMLに反映します。

## 対象ファイル

| 本番 | テスト用 |
|------|----------|
| `make_jc_importer.html` | `make_jc_importer_test.html` |
| `funder_lookup.html` | `funder_lookup_test.html` |

## 引数

- `all`（デフォルト、引数なし時も同様）: 両方を同期
- `main`: `make_jc_importer.html` のみ同期
- `funder`: `funder_lookup.html` のみ同期

## 同期手順

### 1. 差分の確認

本番ファイルとテスト用ファイルの差分を確認してください:
```
diff make_jc_importer.html make_jc_importer_test.html
diff funder_lookup.html funder_lookup_test.html
```

### 2. CONFIG セクションの保護

**最重要ルール**: テスト用ファイルの CONFIG セクションにある API キーは絶対に上書きしないでください。

テスト用ファイルには実際の API キーが設定されています:
- `OpenAlex_API_KEY`
- `CiNii_API_KEY`
- `OPF_API_KEY`

同期前にテスト用ファイルの CONFIG セクションの値を控えておき、同期後に復元してください。

### 3. 同期の実行

本番ファイルの内容をテスト用ファイルにコピーし、CONFIG セクションの API キーのみテスト用の値に戻してください。

### 4. 確認

同期後、以下を確認してください:
- CONFIG セクションの API キーがテスト用の値のままであること
- それ以外の部分が本番ファイルと一致していること

### 5. 報告

同期した内容の概要をユーザーに報告してください。テスト用ファイルは git 管理外（.gitignore）なのでコミットは不要です。
