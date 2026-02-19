# JAIRO Cloud インポート用TSV生成ツール(β)

DOIを入力してCrossref・OpenAlex APIから書誌情報を取得し、[JAIRO Cloud](https://jairo.nii.ac.jp/)へのインポート用TSVファイルを生成するツールです。

## 使い方

**このツールはベータ版です。インポート用TSVファイルの生成機能はPhase 2で実装予定です。**

`make_jc_importer.html` をブラウザで開き、DOIを入力するだけで利用できます。サーバー不要のスタンドアロンHTMLツールです。

現在のバージョン（Phase 1）では、APIからのデータ取得・マッピング・編集UIが実装されています。

### API Key の設定

`make_jc_importer.html` をテキストエディタで開き、ファイル冒頭付近の `CONFIG` 定数にAPIキーを設定してください。

```js
const CONFIG = {
    OpenAlex_API_KEY: "ここにOpenAlex APIキーを貼り付け",
    CiNii_API_KEY: "ここにCiNii APIキーを貼り付け",
};
```

#### OpenAlex API Key（必須）

OpenAlex APIは、APIキーなしでの利用回数に制限があります。継続的に利用する場合は、APIキーの設定を推奨します。

- [OpenAlex API設定ページ](https://openalex.org/settings/api) からAPIキーを取得してください。
- 未設定の場合、ページ上部に警告メッセージが表示されます。未設定でも利用可能ですが、利用回数の制限を超えるとデータ取得時にエラーが表示されます。

#### CiNii API Key（任意）

CiNii APIキーを設定すると、以下の機能が有効になります：
- JSPS（日本学術振興会）が助成機関に含まれる場合に、CiNii Research Projects API を通じて科研費の課題名（日英）とKAKEN課題ページURLを自動取得

CiNii APIキー未設定でも、ISSNをもとにCiNii Research OpenSearch APIからNCID（NACSIS-CAT書誌ID）を自動取得します。APIキーを設定するとレート制限が緩和されます。

- [CiNiiウェブAPI 利用登録](https://support.nii.ac.jp/ja/cinii/api/developer) からAPIキーを取得してください。
- 未設定の場合、KAKEN連携はスキップされ、Crossrefの助成情報のみが表示されます。

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
- KAKEN連携：JSPS助成の科研費課題名（日英）・課題ページURL自動取得（CiNii Research Projects API）
- NCID自動取得：ISSNからCiNii Research OpenSearch APIでNCIDを取得し収録物識別子に追加（CiNii書誌ページへの参照リンク付き）

### Phase 2

- メタデータ収集（`collectMetadata()`）
- TSV出力（`generateTsv()`、ダウンロードボタン）

## 技術スタック

- HTML5 / CSS3 / JavaScript（依存ライブラリなし、単一HTMLファイル）
- 外部API: [Crossref](https://api.crossref.org/), [OpenAlex](https://api.openalex.org/), [ROR](https://ror.org/), [CiNii Research](https://cir.nii.ac.jp/)

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
| 2026-02-19 | CiNii識別子UIを簡素化：特別UIを廃止し標準UIに統合、Scheme選択時のURI自動設定とCiNii Researchers検索ボタンを追加 |
| 2026-02-19 | NCID自動取得：ISSNをもとにCiNii Research OpenSearch APIからNCIDを取得し収録物識別子に追加（[#3](https://github.com/tzhaya/jc-import-file-maker/issues/3)） |
| 2026-02-18 | KAKEN連携：JSPS助成時にCiNii Research APIから科研費課題名・URLを自動取得（[#2](https://github.com/tzhaya/jc-import-file-maker/issues/2), [#7](https://github.com/tzhaya/jc-import-file-maker/issues/7)） |
| 2026-02-17 | DOI登録機関（RA）判定機能を追加し、Crossref/JaLC/その他で処理を分岐（[#5](https://github.com/tzhaya/jc-import-file-maker/issues/5)） |
| 2026-02-17 | 同一助成機関から複数awardがある場合に各awardごとにエントリを生成するよう修正 |
| 2026-02-17 | OpenAlex API Key設定機能を追加（[#1](https://github.com/tzhaya/jc-import-file-maker/issues/1)） |
| 2026-02-15 | 初回リリース（Phase 1: データ取得・マッピング・編集UI） |

## 作者
- Takanori Hayashi
