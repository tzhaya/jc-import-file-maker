# JAIRO Cloud インポート用TSV生成ツール(β)

DOIを入力してCrossref・OpenAlex APIから書誌情報を取得し、[JAIRO Cloud](https://jairo.nii.ac.jp/)へのインポート用TSVファイルを生成するツールです。

## 使い方

**このツールはベータ版です。インポート用TSVファイルの生成機能はPhase 2で実装予定です。**

`make_jc_importer.html` をブラウザで開き、DOIを入力するだけで利用できます。サーバー不要のスタンドアロンHTMLツールです。

現在のバージョン（Phase 1）では、APIからのデータ取得・マッピング・編集UIが実装されています。

### OpenAlex API Key の設定

OpenAlex APIは、APIキーなしでの利用回数に制限があります。継続的に利用する場合は、APIキーの設定を推奨します。

1. [OpenAlex API設定ページ](https://openalex.org/settings/api) からAPIキーを取得
2. `make_jc_importer.html` をテキストエディタで開く
3. ファイル冒頭付近の `CONFIG` 定数を探し、`YOUR_API_KEY` を取得したキーに置き換える

```js
const CONFIG = {
    API_KEY: "ここに取得したAPIキーを貼り付け",
};
```

APIキーが未設定の場合、ページ上部に警告メッセージが表示されます。未設定でも利用可能ですが、利用回数の制限を超えるとデータ取得時にエラーが表示されます。

## 機能

### Phase 1

- DOIの入力により Crossref / OpenAlex API から書誌情報を自動取得
- ROR API（v2）による機関情報の補完（ISNI・ROR ID取得）
- 取得データをJPCOARスキーマにマッピングし、アコーディオン形式で表示・編集
  - JPCOARスキーマの28のフィールドに対応（タイトル・著者・抄録・出版社・関連情報・助成情報 等）
  - ネスト構造のカラーコーディング（4階層）
  - 項目の追加・削除（確認ダイアログ付き）
  - リソースタイプ・アクセス権のセレクトメニューと URI 自動補完
  - JPCOAR スキーマへの参照リンク
  - 要確認項目へのワーニング表示（⚠ 要確認）
  - 参考用の元データ値の表示とURLのリンク
- OA バッジ表示（Gold / Green / Hybrid / Closed）
- JATS XML 形式のDescription(内容記述)からタグの除去
- Crossref と OpenAlex の著者情報マッチング（姓名一致 → インデックスフォールバック）
- 空フィールドのみの表示

### Phase 2

- メタデータ収集（`collectMetadata()`）
- TSV出力（`generateTsv()`、ダウンロードボタン）

## 技術スタック

- HTML5 / CSS3 / JavaScript（依存ライブラリなし、単一HTMLファイル）
- 外部API: [Crossref](https://api.crossref.org/), [OpenAlex](https://api.openalex.org/), [ROR](https://ror.org/)

## ディレクトリ構成

```
├── make_jc_importer.html   # メインツール（単一HTMLファイル）
├── data/                   # 参照・設定データ
│   ├── ItemType.json       # JAIRO Cloud アイテムタイプ定義
│   ├── tsv_headers.json    # TSVヘッダー定義
│   └── crossref_fields.json　# Crossrefフィールド定義
├── docs/                   # 仕様・設計ドキュメント
└── samples/                # サンプルデータ（API レスポンス等）
```

## ドキュメント

- [要件定義](docs/requirements.md)
- [実装計画](docs/Implementation_phase1.md) 現在の実装計画書です。
- [作業ログ](docs/worklog.md) 実装作業時のログです。

- [フィールドマッピング一覧](docs/fieldmapping.md) Crossref/OpenAlexとのマッピング表です。  
- [JPCOARスキーマ フィールド一覧](docs/fields.md) 「デフォルトアイテムタイプ（フル）」に含まれるフィールド一覧です。
- [JPCOARスキーマ 項目別説明リンク一覧](docs/JPCOARschema_guide.md)

## ライセンス

このプロジェクトは [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/) の下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-02-17 | 同一助成機関から複数awardがある場合に各awardごとにエントリを生成するよう修正 |
| 2026-02-17 | OpenAlex API Key設定機能を追加（[#1](https://github.com/tzhaya/jc-import-file-maker/issues/1)） |
| 2026-02-15 | 初回リリース（Phase 1: データ取得・マッピング・編集UI） |

## 作者
- Takanori Hayashi
