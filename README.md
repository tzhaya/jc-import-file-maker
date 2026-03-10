# JAIRO Cloud インポート用TSV生成ツール(β)

DOIを入力してCrossref・OpenAlex APIから書誌情報を取得し、[JAIRO Cloud](https://jpcoar.org/support/jairo-cloud/)へのインポート用TSVファイルを生成するツールです。

[make_jc_importer.html](make_jc_importer.html)←このリンクを右クリック→「名前をつけてリンク(先)を保存」で保存してご利用ください。

## 使い方

**このツールはベータ版です。インポート用TSVファイルの生成機能はPhase 2で実装予定です。**

現在のバージョン（Phase 1）では、APIからのデータ取得・マッピング・編集UIが実装されています。

1. `make_jc_importer.html` をダウンロードし、ブラウザで開きます。
2. DOIを「DOI」の入力欄に入力します。
3. 「データ取得」ボタンを押します
4. Crossrefなどから必要なメタデータを取得して、「メタデータ確認・編集」として表示します。編集も可能です。
5. 「プレビュー表示」ボタンでプレビューができます。
6. TSVファイルとしてダウンロードができます（準備中）

詳しい使い方と取得したデータの取り扱いは[使い方ガイド](docs/user_guide.md)を参照ください。

### 助成情報検索ツール

- 付属ツールとして、助成情報検索ツール `funder_lookup.html` を作成しました。
- [funder_lookup.html](https://github.com/tzhaya/jc-import-file-maker/blob/master/funder_lookup.html) ←このリンクを右クリック→「名前をつけてリンク(先)を保存」で保存してご利用ください。
- 保存したファイルをブラウザで開いて科研費課題番号やJGN課題番号を入力すると、JPCOAR 2.0 準拠の助成情報（助成機関識別子・助成機関名・プログラム情報・研究課題名）を検索できます。
- 論文の謝辞（Acknowledgement）をコピー＆ペーストして科研費課題番号の抽出ができます。

### API Key の設定

#### Chrome拡張版（推奨）

Chrome拡張版では `options.html`（拡張の設定ページ）でAPIキーをまとめて設定できます。設定値はブラウザのローカルストレージに保存され、ソースコードに書き込む必要がありません。また、CORS非対応のAPI（KAKEN XML API・JaLC API・Open Policy Finder API）が Chrome拡張のService Worker経由で利用可能になります。

#### 通常ブラウザ版

`make_jc_importer.html` をテキストエディタで開き、ファイル冒頭付近の `CONFIG` 定数にAPIキーを設定してください。

助成情報検索ツール `funder_lookup.html` でも、同様にCiNii APIキーを設定できます。

```js
const CONFIG = {
    // OpenAlex APIキー（任意）
    // https://openalex.org/settings/api からご自身のキーを取得して貼り付けてください
    OpenAlex_API_KEY: "YOUR_OpenAlex_API_KEY",

    // CiNii APIキー（任意）
    // CiNiiウェブAPI 利用登録 https://support.nii.ac.jp/ja/cinii/api/developer で取得したキーを貼り付けてください
    CiNii_API_KEY: "YOUR_CiNii_API_KEY",

    // Open Policy Finder APIキー（任意・Chrome拡張版のみ有効）
    OPF_API_KEY: "YOUR_OPF_API_KEY",
};
```

#### OpenAlex API Key（必須）

OpenAlex APIは、APIキーなしでの利用回数に制限があります。継続的に利用する場合は、APIキーの設定を推奨します。

- [OpenAlex API設定ページ](https://openalex.org/settings/api) からAPIキーを取得してください。
- 未設定の場合、ページ上部に警告メッセージが表示されます。未設定でも利用可能ですが、利用回数の制限を超えるとデータ取得時にエラーが表示されます。

#### CiNii API Key（KAKEN API利用時は必須）

- KAKEN APIは利用にあたり CiNii API Key が必要です。
- [CiNiiウェブAPI 利用登録](https://support.nii.ac.jp/ja/cinii/api/developer) からAPIキーを取得してください。

CiNii APIキー未設定でも、以下の機能が動作します：

- JSPS（日本学術振興会）が助成機関に含まれる場合に、CiNii Research Projects API を通じて科研費の課題名（日英）とKAKEN課題ページURLを自動取得
- ISSNをもとにCiNii Research OpenSearch APIからNCID（NACSIS-CAT書誌ID）を自動取得

## 機能

### Phase 1

- DOIの入力により Crossref / OpenAlex API から書誌情報を自動取得
- JaLC DOI対応：JaLC REST APIからのメタデータ取得・マッピング（Chrome拡張版のみ有効・CORS非対応のため）
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
- Open Policy Finder 連携：ISSN付き雑誌論文のDOI取得時に、Open Policy Finderでの雑誌OAポリシー確認リンクを表示。Chrome拡張版ではOPF APIへの直接アクセスでモーダル内にポリシー情報を表示
- JATS XML 形式のDescription(内容記述)からタグの除去
- Crossref と OpenAlex の著者情報マッチング（姓名一致 → インデックスフォールバック）
- 空フィールドのみの表示
- KAKEN連携：JSPS助成の科研費課題名（日英）・課題ページURL自動取得（CiNii Research Projects API）
- NCID自動取得：ISSNからCiNii Research OpenSearch APIでNCIDを取得し収録物識別子に追加（CiNii書誌ページへの参照リンク付き）
- Crossref ISBN・relation フィールドの関連情報への取り込み：book系でISBNをisIdenticalTo/ISBNとして追加、全資源タイプでCrossref relationフィールドのエントリを関連情報に追加
- JGN（Japan Grant Number）連携：award が `JP` で始まる場合に Crossref JGN API（prefix `10.52926`）を照会し、JST助成金の課題名（日英）と課題DOI URIを自動取得。JGN未登録の場合は既存のKAKEN連携（JSPS科研費）にフォールバック
- KAKEN/JGN番号からの助成機関自動設定：課題番号からJGN/KAKEN APIで助成機関名・Crossref Funder IDを自動補完。UIの「助成機関を検索」ボタンで手動入力時も逆引き可能
- 識別子からの機関名逆引き
  - 所属機関識別子（ROR）・助成機関識別子（ROR / Crossref Funder）を入力すると「名称を確認」ボタンが表示されます。
  - ボタンを押すと、APIから名称を取得します。「上書き」ボタンを押して現在の内容を置き換えることができます。

### Phase 2

- メタデータ収集（`collectMetadata()`）
- TSV出力（`generateTsv()`、ダウンロードボタン）

## 技術スタック

- HTML5 / CSS3 / JavaScript（依存ライブラリなし、単一HTMLファイル）
- 外部API: [Crossref](https://api.crossref.org/), [JaLC](https://api.japanlinkcenter.org/), [OpenAlex](https://api.openalex.org/), [ROR](https://ror.org/), [CiNii Research](https://cir.nii.ac.jp/), [KAKEN API](https://support.nii.ac.jp/ja/kaken/api/api_outline)

## ディレクトリ構成

```
├── make_jc_importer.html   # メインツール（単一HTMLファイル）
├── funder_lookup.html      # 助成情報検索ツール（課題番号→助成機関情報一括検索）
├── manifest.json           # Chrome拡張 Manifest V3（CORS回避・APIキー管理）
├── background.js           # Chrome拡張 Service Worker（fetch プロキシ）
├── options.html            # Chrome拡張 設定ページ（APIキー管理 UI）
├── api-flow.md             # APIフロー整理（Crossref/OpenAlex等の取得順・JPCOARマッピング）
├── data/                   # 参照・設定データ
│   ├── ItemType.json       # JAIRO Cloud アイテムタイプ定義
│   ├── tsv_headers.json    # TSVヘッダー定義
│   └── crossref_fields.json　# Crossrefフィールド定義
├── docs/                   # 仕様・設計ドキュメント
│   ├── requirements.md         # 要件定義
│   ├── user_guide.md           # 使い方ガイド
│   ├── worklog.md              # 作業ログ
│   ├── fieldmapping.md         # Crossref/OpenAlexとのフィールドマッピング一覧
│   ├── fields.md               # JPCOARスキーマ フィールド一覧
│   ├── JPCOARschema_guide.md   # JPCOARスキーマ 項目別説明リンク一覧
│   ├── accessrights.md         # アクセス権 統制語彙
│   ├── relatedIdentifier.md    # 関連識別子 統制語彙
│   ├── resource_type_vocabulary.md       # 資源タイプ語彙別表（JPCOAR 2.0対応）
│   ├── attribute_value_mlt.md           # attribute_value_mlt と配列記法のルール
│   ├── crossref_type_mapping.md         # Crossref type → JPCOAR 資源タイプ マッピング
│   ├── JPCOAR_JaLC_Crossref_requirements.md  # JPCOAR/JaLC/Crossref 必須項目マッピング
│   ├── pipeline_comparison.md           # TSVエクスポート パイプライン比較
│   ├── Implementation_phase1.md         # Phase 1 実装計画
│   ├── Implementation_phase2.md         # Phase 2 実装計画（TSVエクスポート）
│   ├── Implementation_JaLC.md           # JaLC API対応 実装計画
│   ├── Implementation_KAKEN.md          # KAKEN API対応 実装計画
│   ├── Implementation_OPF.md            # Open Policy Finder連携 実装計画
│   ├── Implementation_doi_badges.md     # DOI必須項目バッジ表示 実装計画
│   ├── Implementation_issue17.md        # Issue #17 識別子からの機関名逆引き 実装計画
│   ├── Implementation_issue42.md        # Issue #42 関連情報取得改善 実装計画
│   └── Implementation_funder_lookup.md  # 助成情報検索ツール 実装記録
└── samples/                # サンプルデータ（API レスポンス等）
```

## ドキュメント

- [要件定義](docs/requirements.md)
- [使い方ガイド](docs/user_guide.md)
- [作業ログ](docs/worklog.md) 実装作業時のログです。
- [APIフロー整理](api-flow.md) Crossref/OpenAlex等の取得順・JPCOARマッピングの概要です。

### 実装計画・実装記録

- [Phase 1](docs/Implementation_phase1.md) 現在の実装計画書です。
- [Phase 2](docs/Implementation_phase2.md) TSVファイル出力対応の実装計画書です。
- [Chrome拡張化（Issue #70 + PR #61）](docs/Implementation_issue70.md) Chrome拡張（CORS回避・APIキー管理・OPF API連携）の実装記録です。
- [KAKEN対応](docs/Implementation_KAKEN.md) KAKEN APIからのデータ取得に関する実装計画書です。
- [JaLC API対応](docs/Implementation_JaLC.md) JaLC REST APIからのデータ取得に関する実装計画書です。
- [Open Policy Finder連携](docs/Implementation_OPF.md) OPF API/参照リンク対応の実装計画書です。
- [DOI必須項目バッジ表示](docs/Implementation_doi_badges.md) DOI必須項目バッジ表示機能の実装計画書です。
- [Issue #17 識別子からの機関名逆引き](docs/Implementation_issue17.md)
- [Issue #42 関連情報取得改善](docs/Implementation_issue42.md)
- [助成情報検索ツール](docs/Implementation_funder_lookup.md) 助成情報検索ツールの実装記録です。

### フィールド・語彙リファレンス

- [フィールドマッピング一覧](docs/fieldmapping.md) Crossref/OpenAlexとのマッピング表です。
- [JPCOARスキーマ フィールド一覧](docs/fields.md) 「デフォルトアイテムタイプ（フル）」に含まれるフィールド一覧です。
- [JPCOARスキーマ 項目別説明リンク一覧](docs/JPCOARschema_guide.md)
- [資源タイプ語彙別表](docs/resource_type_vocabulary.md) JPCOAR 2.0対応の資源タイプ語彙一覧です。
- [Crossref type → JPCOAR 資源タイプ マッピング](docs/crossref_type_mapping.md)
- [JPCOAR/JaLC/Crossref 必須項目マッピング](docs/JPCOAR_JaLC_Crossref_requirements.md)
- [アクセス権 統制語彙](docs/accessrights.md)
- [関連識別子 統制語彙](docs/relatedIdentifier.md)
- [attribute_value_mlt と配列記法のルール](docs/attribute_value_mlt.md)
- [TSVエクスポート パイプライン比較](docs/pipeline_comparison.md)

## ライセンス

このプロジェクトは [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/) の下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

外部APIから得られたデータの利用については、それぞれの利用規約に従ってください。

  -  [Crossref](https://api.crossref.org/)
  -  [JaLC](https://api.japanlinkcenter.org/api-docs/index.html)
  -  [OpenAlex](https://api.openalex.org/)
  -  [ROR](https://ror.org/about/terms/),
  -  [CiNii Research、KAKEN API](https://support.nii.ac.jp/ja/cinii/terms)


## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-10 | Chrome拡張化（[#70](https://github.com/tzhaya/jc-import-file-maker/issues/70)）：Manifest V3 Chrome拡張を追加。Service Worker経由でCORS非対応API（KAKEN XML・JaLC・OPF）を有効化。options.htmlでAPIキーをchrome.storage.localに安全に保存。KAKEN XML API・JaLC APIを本有効化。OPF APIポリシー取得・モーダル表示を実装（[#50](https://github.com/tzhaya/jc-import-file-maker/issues/50)・PR [#61](https://github.com/tzhaya/jc-import-file-maker/pull/61)同時対応） |
| 2026-03-07 | funder_lookup.html に更新チェック機能を追加：GitHubリポジトリとの最終更新日比較で新バージョンを通知（[#65](https://github.com/tzhaya/jc-import-file-maker/issues/65)） |
| 2026-03-05 | OPF参照リンク：ISSNベースのOpen Policy Finder検索リンクをinfo-barに追加。ISSN付き雑誌論文でOAポリシーを別タブで確認可能に（[#62](https://github.com/tzhaya/jc-import-file-maker/issues/62)） |
| 2026-03-05 | KAKEN XML API 暫定スキップ：CORS非対応による処理時間短縮のためfetchKakenXml()呼び出しをコメントアウト（[#59](https://github.com/tzhaya/jc-import-file-maker/issues/59)） |
| 2026-03-05 | KAKEN XML API CORS対応：fetchKakenXml()にtry/catch追加、CiNii Research OpenSearchを常に最終フォールバックに変更、補助金番号検出時のKAKEN検索リンク表示（[#58](https://github.com/tzhaya/jc-import-file-maker/issues/58)） |
| 2026-03-04 | KAKEN XML API対応：補助金の研究課題番号から正規の研究課題/領域番号への自動解決、CiNii APIキー未設定時はCiNii Research OpenSearchにフォールバック（[#58](https://github.com/tzhaya/jc-import-file-maker/issues/58)） |
| 2026-03-03 | 助成情報検索ツール拡張：JGN課題番号からプログラム情報識別子（JGN_fundingStream）を自動設定、Acknowledgementsテキストからの課題番号自動抽出モードを追加（[#56](https://github.com/tzhaya/jc-import-file-maker/issues/56)） |
| 2026-03-03 | 助成情報検索ツール（`funder_lookup.html`）を新規作成。課題番号からJPCOAR 2.0準拠の助成情報（助成機関識別子・助成機関名・プログラム情報・研究課題名）を一括検索（[#54](https://github.com/tzhaya/jc-import-file-maker/issues/54)） |
| 2026-03-03 | KAKEN/JGN番号から助成機関名・Crossref Funder IDを自動設定。研究課題番号入力欄に「助成機関を検索」ボタンを追加し、手動入力時もJGN/KAKEN APIから助成機関情報を逆引き可能に（[#52](https://github.com/tzhaya/jc-import-file-maker/issues/52)） |
| 2026-03-02 | PMID識別子のURL除去：関連情報のidentifierType=PMID時にPubMed URLから番号のみを抽出し、IRDB登録エラーを回避（[#47](https://github.com/tzhaya/jc-import-file-maker/issues/47)） |
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
