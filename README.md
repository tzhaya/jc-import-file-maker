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
    // OpenAlex APIキー（必須）
    // https://openalex.org/settings/api からご自身のキーを取得して貼り付けてください
    OpenAlex_API_KEY: "YOUR_OpenAlex_API_KEY",

    // CiNii APIキー（任意）
    // CiNiiウェブAPI 利用登録 https://support.nii.ac.jp/ja/cinii/api/developer で取得したキーを貼り付けてください
    CiNii_API_KEY: "YOUR_CiNii_API_KEY",
};
```

#### OpenAlex API Key（必須）

OpenAlex APIは、APIキーなしでの利用回数に制限があります。継続的に利用する場合は、APIキーの設定を推奨します。

- [OpenAlex API設定ページ](https://openalex.org/settings/api) からAPIキーを取得してください。
- 未設定の場合、ページ上部に警告メッセージが表示されます。未設定でも利用可能ですが、利用回数の制限を超えるとデータ取得時にエラーが表示されます。

#### CiNii API Key（任意）

CiNii APIキー未設定でも、以下の機能が動作します：
- JSPS（日本学術振興会）が助成機関に含まれる場合に、CiNii Research Projects API を通じて科研費の課題名（日英）とKAKEN課題ページURLを自動取得
- ISSNをもとにCiNii Research OpenSearch APIからNCID（NACSIS-CAT書誌ID）を自動取得

APIキーを設定するとレート制限が緩和されます。

- [CiNiiウェブAPI 利用登録](https://support.nii.ac.jp/ja/cinii/api/developer) からAPIキーを取得してください。

## 機能

### Phase 1

- DOIの入力により Crossref / OpenAlex API から書誌情報を自動取得
- JaLC DOI対応（準備中）：JaLC REST APIからのメタデータ取得・マッピングコードは実装済みだが、CORS制約により未有効化
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
- Crossref ISBN・relation フィールドの関連情報への取り込み：book系でISBNをisIdenticalTo/ISBNとして追加、全資源タイプでCrossref relationフィールドのエントリを関連情報に追加
- JGN（Japan Grant Number）連携：award が `JP` で始まる場合に Crossref JGN API（prefix `10.52926`）を照会し、JST助成金の課題名（日英）と課題DOI URIを自動取得。JGN未登録の場合は既存のKAKEN連携（JSPS科研費）にフォールバック
- 識別子からの機関名逆引き
  - 所属機関識別子（ROR）・助成機関識別子（ROR / Crossref Funder）を入力すると「名称を確認」ボタンが表示されます。
  - ボタンを押すと、APIから名称を取得します。「上書き」ボタンを押して現在の内容を置き換えることができます。

### Phase 2

- メタデータ収集（`collectMetadata()`）
- TSV出力（`generateTsv()`、ダウンロードボタン）

## 技術スタック

- HTML5 / CSS3 / JavaScript（依存ライブラリなし、単一HTMLファイル）
- 外部API: [Crossref](https://api.crossref.org/), [JaLC](https://api.japanlinkcenter.org/), [OpenAlex](https://api.openalex.org/), [ROR](https://ror.org/), [CiNii Research](https://cir.nii.ac.jp/)

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
- 実装計画
  - [Phase 1](docs/Implementation_phase1.md) 現在の実装計画書です。
  - [Phase 2](docs/Implementation_phase2.md) TSVファイル出力対応の実装計画書です。
  - [KAKEN対応](docs/Implementation_KAKEN.md) KAKEN APIからのデータ取得に関する実装計画書です。
  - [JaLC API対応](docs/Implementation_JaLC.md) JaLC REST APIからのデータ取得に関する実装計画書です。
- [作業ログ](docs/worklog.md) 実装作業時のログです。

- [フィールドマッピング一覧](docs/fieldmapping.md) Crossref/OpenAlexとのマッピング表です。  
- [JPCOARスキーマ フィールド一覧](docs/fields.md) 「デフォルトアイテムタイプ（フル）」に含まれるフィールド一覧です。
- [JPCOARスキーマ 項目別説明リンク一覧](docs/JPCOARschema_guide.md)

## ライセンス

このプロジェクトは [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/) の下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-01 | 関連情報の取得改善：関連DOIのURL形式統一（`https://doi.org/`プレフィックス付与）、関連名称（タイトル）の自動取得（Crossref/JaLC API）、JaLC API relation_listフィールド名修正（[#42](https://github.com/tzhaya/jc-import-file-maker/issues/42)） |
| 2026-02-27 | プレビュー機能追加：入力済みメタデータをJAIRO Cloud風コンパクトテーブルでモーダル表示。collectFromDOM()によるDOM→JSON変換基盤を実装（[#37](https://github.com/tzhaya/jc-import-file-maker/issues/37)） |
| 2026-02-26 | JaLC API対応（準備中）：JaLC DOIからのメタデータ取得・マッピングコードを追加。CORS制約により未有効化（[#6](https://github.com/tzhaya/jc-import-file-maker/issues/6)） |
| 2026-02-25 | GitHub 最新コミットとの比較による更新チェック機能追加、インデックスID入力欄をシステム管理フィールドに移行、更新概要を直近5件に制限（[#36](https://github.com/tzhaya/jc-import-file-maker/issues/36)） |
| 2026-02-25 | Crossref の受理日（`accepted`）・提出日（`submitted`）を日付フィールドに追加取得し、Accepted / Submitted タイプとして記録（[#24](https://github.com/tzhaya/jc-import-file-maker/issues/24)） |
| 2026-02-24 | JPCOAR スキーマ 2.0 資源タイプ語彙対応：`RESOURCE_TYPE_MAP` に v2.0 の31型（データセットサブタイプ・特許サブタイプ等）を追加し、セレクトメニューも更新（docs/resource_type_vocabulary.md も更新） |
| 2026-02-24 | 出版タイプ選択時に出版タイプリソース URI を自動設定（COAR version type vocabulary、`VERSION_TYPE_MAP` 追加） |
| 2026-02-24 | 識別子からの機関名逆引き：所属機関識別子（ROR）・助成機関識別子（ROR / Crossref Funder）から「名称を確認」ボタンでAPI逆引きし、名称不一致時は「上書き」ボタンで置換可能（[#17](https://github.com/tzhaya/jc-import-file-maker/issues/17)） |
| 2026-02-23 | JGN連携：award が `JP` で始まる場合にCrossref JGN API（prefix `10.52926`）を照会しJST助成金の課題名（日英）・課題DOI URIを自動取得。JGN未登録時はKAKEN連携にフォールバック（[#14](https://github.com/tzhaya/jc-import-file-maker/issues/14)） |
| 2026-02-22 | Crossref ISBN・relation フィールドを関連情報に取り込み：book系でISBNをisIdenticalTo/ISBNとして追加、全資源タイプでCrossref relationフィールドに対応（[#20](https://github.com/tzhaya/jc-import-file-maker/issues/20)） |
| 2026-02-22 | DOI必須項目バッジ表示：資源タイプに応じてJaLC/Crossref DOIの必須・条件付必須をセクションヘッダーに色付きタグ+ツールチップで動的表示（[#15](https://github.com/tzhaya/jc-import-file-maker/issues/15)） |
| 2026-02-22 | Crossref type → JPCOAR 資源タイプ マッピングを追加：書籍・会議論文・学位論文等23タイプを正しくマッピング（[#12](https://github.com/tzhaya/jc-import-file-maker/issues/12)） |
| 2026-02-19 | CiNii識別子UIを簡素化：特別UIを廃止し標準UIに統合、Scheme選択時のURI自動設定とCiNii Researchers検索ボタンを追加 |
| 2026-02-19 | NCID自動取得：ISSNをもとにCiNii Research OpenSearch APIからNCIDを取得し収録物識別子に追加（[#3](https://github.com/tzhaya/jc-import-file-maker/issues/3)） |
| 2026-02-18 | KAKEN連携：JSPS助成時にCiNii Research APIから科研費課題名・URLを自動取得（[#2](https://github.com/tzhaya/jc-import-file-maker/issues/2), [#7](https://github.com/tzhaya/jc-import-file-maker/issues/7)） |
| 2026-02-17 | DOI登録機関（RA）判定機能を追加し、Crossref/JaLC/その他で処理を分岐（[#5](https://github.com/tzhaya/jc-import-file-maker/issues/5)） |
| 2026-02-17 | 同一助成機関から複数awardがある場合に各awardごとにエントリを生成するよう修正 |
| 2026-02-17 | OpenAlex API Key設定機能を追加（[#1](https://github.com/tzhaya/jc-import-file-maker/issues/1)） |
| 2026-02-15 | 初回リリース（Phase 1: データ取得・マッピング・編集UI） |

## 作者
- Takanori Hayashi
