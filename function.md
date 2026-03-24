# JAIRO Cloud インポート用TSV生成ツール(β) 機能と技術

## 機能

### Phase 1

- DOIの入力により Crossref / OpenAlex API から書誌情報を自動取得
- JaLC DOI対応：JaLC REST APIからのメタデータ取得・マッピング（Chrome拡張版のみ有効・CORS非対応のため）（[#6](https://github.com/tzhaya/jc-import-file-maker/issues/6)・[#70](https://github.com/tzhaya/jc-import-file-maker/issues/70)）
- ROR API（v2）による機関情報の補完（ISNI・ROR ID取得）
- 取得データをJPCOARスキーマにマッピングし、アコーディオン形式で表示・編集
  - JPCOARスキーマの30のフィールドに対応（タイトル・著者・抄録・出版者・出版者情報・関連情報・助成情報 等）
  - ネスト構造のカラーコーディング（4階層）
  - 項目の追加・削除（確認ダイアログ付き）
  - リソースタイプ・アクセス権のセレクトメニューと URI 自動補完
  - 出版タイプ選択時の COAR version type URI 自動設定
  - JPCOAR スキーマへの参照リンク（フィールド・サブフィールド）（[#87](https://github.com/tzhaya/jc-import-file-maker/issues/87)）
  - 要確認項目へのワーニング表示（⚠ 要確認）
  - 参考用の元データ値の表示とURLのリンク
  - 空フィールドの非表示（空フィールドのみのセクションを折りたたみ表示）
- DOI必須項目バッジ表示：資源タイプに応じてJaLC/CrossrefのDOI必須・条件付必須をセクションヘッダーに色付きタグ+ツールチップで動的表示（[#15](https://github.com/tzhaya/jc-import-file-maker/issues/15)）
- OA情報統合（[#51](https://github.com/tzhaya/jc-import-file-maker/issues/51)）
  - OA バッジ表示：OpenAlexのOAステータス全6値対応（Diamond / Gold / Green / Hybrid / Bronze / Closed）
  - 出版タイプ・relationType自動判定：OAステータスに基づき `determineVersionInfo()` でVoR/AM/SMURとrelationTypeを自動設定
  - アクセス権動的判定：`determineAccessRights()` でOAステータス+OPFエンバーゴ情報からopen access/embargoed accessを自動設定
  - OAサマリー表示（info-bar）、OPFモーダル連動（ハイライト+IR優先配置）、エンバーゴヒント表示（公開可能日候補）
  - OpenAlexリポジトリ情報：`any_repository_has_fulltext` → `locations[]` からリポジトリURLを関連情報に追加
- Open Policy Finder 連携：ISSN付き雑誌論文のDOI取得時に、Open Policy Finderでの雑誌OAポリシー確認リンクを表示。Chrome拡張版ではOPF APIへの直接アクセスでモーダル内にポリシー情報を表示（[#62](https://github.com/tzhaya/jc-import-file-maker/issues/62)・[#50](https://github.com/tzhaya/jc-import-file-maker/issues/50)・[#51](https://github.com/tzhaya/jc-import-file-maker/issues/51)）
- JATS XML 形式のDescription(内容記述)からタグの除去
- Crossref と OpenAlex の著者情報マッチング（姓名一致 → インデックスフォールバック）
- KAKEN連携：JSPS助成の科研費課題名（日英）・課題ページURL自動取得（CiNii Research Projects API）（[#2](https://github.com/tzhaya/jc-import-file-maker/issues/2)・[#7](https://github.com/tzhaya/jc-import-file-maker/issues/7)・[#58](https://github.com/tzhaya/jc-import-file-maker/issues/58)・[#82](https://github.com/tzhaya/jc-import-file-maker/issues/82)）
- NCID自動取得：ISSNからCiNii Research OpenSearch APIでNCIDを取得し収録物識別子に追加（CiNii書誌ページへの参照リンク付き）（[#3](https://github.com/tzhaya/jc-import-file-maker/issues/3)）
- Crossref ISBN・relation フィールドの関連情報への取り込み：book系でISBNをisIdenticalTo/ISBNとして追加、全資源タイプでCrossref relationフィールドのエントリを関連情報に追加（[#20](https://github.com/tzhaya/jc-import-file-maker/issues/20)・[#42](https://github.com/tzhaya/jc-import-file-maker/issues/42)）
- JGN（Japan Grant Number）連携：award が `JP` で始まる場合に Crossref JGN API（prefix `10.52926`）を照会し、JST助成金の課題名（日英）と課題DOI URIを自動取得。JGN未登録の場合は既存のKAKEN連携（JSPS科研費）にフォールバック（[#14](https://github.com/tzhaya/jc-import-file-maker/issues/14)）
- KAKEN/JGN番号からの助成機関自動設定：課題番号からJGN/KAKEN APIで助成機関名・Crossref Funder IDを自動補完。UIの「助成機関を検索」ボタンで手動入力時も逆引き可能（[#52](https://github.com/tzhaya/jc-import-file-maker/issues/52)）
- 助成情報プログラム情報対応：JPCOAR 2.0 の fundingStream / fundingStreamIdentifier に対応。JGN APIからプログラム情報を自動取得、科研費課題には固定値を自動設定（[#34](https://github.com/tzhaya/jc-import-file-maker/issues/34)）
- 識別子からの機関名逆引き（[#17](https://github.com/tzhaya/jc-import-file-maker/issues/17)）
  - 所属機関識別子（ROR）・助成機関識別子（ROR / Crossref Funder）を入力すると「名称を確認」ボタンが表示されます。
  - ボタンを押すと、APIから名称を取得します。「上書き」ボタンを押して現在の内容を置き換えることができます。
- JPCOAR 2.0 新規フィールド
  - 出版者情報（publisherDetail / `item_1698624005`）：出版者名・所在地・出版地・注記の4サブ配列。Crossref/JaLCの出版者から自動マッピング（[#32](https://github.com/tzhaya/jc-import-file-maker/issues/32)）
  - 日付リテラル（dateLiteral / `item_1698624008`）：ISO 8601以外の日付文字列用。手動入力フィールド（[#33](https://github.com/tzhaya/jc-import-file-maker/issues/33)）
  - 助成機関識別子タイプURI（funderIdentifierTypeURI）：識別子タイプ選択時に `FUNDER_ID_TYPE_URI_MAP` で自動設定（[#107](https://github.com/tzhaya/jc-import-file-maker/issues/107)）
  - 査読の有無（peer_reviewed）：出版タイプフィールドのサブフィールドとして追加（[#108](https://github.com/tzhaya/jc-import-file-maker/issues/108)）
  - researchmap_linkage：CRIS連携用システムフィールド（[#108](https://github.com/tzhaya/jc-import-file-maker/issues/108)）
- 語彙・スキーマ準拠
  - 資源タイプ語彙を JPCOAR 2.0 準拠（74タイプ）に更新。廃止語彙（internal report・report part）はUI非表示、後方互換として保持（[#31](https://github.com/tzhaya/jc-import-file-maker/issues/31)）
  - 識別子スキーム語彙を JPCOAR 2.0 準拠に更新（e-Rad_Researcher・NRID・kakenhi 追加）（[#26](https://github.com/tzhaya/jc-import-file-maker/issues/26)）
  - 言語コードに ja-Latn（ローマ字ヨミ）を追加（WEKO3 LANGUAGE_VAL2_1 準拠）（[#28](https://github.com/tzhaya/jc-import-file-maker/issues/28)）
- ファイル情報（file35）入力UI：ファイル選択によるファイル名・サイズ・MIMEタイプ自動取得、CCライセンス自動設定（[#84](https://github.com/tzhaya/jc-import-file-maker/issues/84)）
- ファイルパス自動判定：`showDirectoryPicker()` APIでdata/以下のフォルダを選択しfile_pathを自動設定、PDF→fulltext/画像→thumbnail自動判別（[#90](https://github.com/tzhaya/jc-import-file-maker/issues/90)）
- プレビュー機能：入力済みメタデータをJAIRO Cloud風コンパクトテーブルでモーダル表示（`collectFromDOM()` によるDOM→JSON変換基盤）（[#37](https://github.com/tzhaya/jc-import-file-maker/issues/37)）
- GitHub更新チェック機能：GitHubリポジトリの最新コミットと比較し、新バージョンを通知（[#36](https://github.com/tzhaya/jc-import-file-maker/issues/36)）

### Phase 2（全完了）

- Phase 2-A（実装完了）：単一DOI TSV出力（[#85](https://github.com/tzhaya/jc-import-file-maker/issues/85)）
  - DOM → JSON変換（`collectFromDOM()`）→ TSV生成（`generateTsv()`）→ ダウンロード（`exportTsv()`）
  - UTF-8 BOM付き・LF改行
  - 空フィールド省略、一部フィールド（heading36・dissertation30-degree33・item_1698624001-010）は常に除外
  - ファイル名: `{DOI}.tsv`
- Phase 2-B（実装完了）：カスタムテンプレート完全パース（[#99](https://github.com/tzhaya/jc-import-file-maker/issues/99)）
  - 5行ヘッダー（ItemType行・プロパティキー行・日本語ラベル行・System印行・制約行）の貼り付けでTSVテンプレートを丸ごと上書き
  - `parseCustomTemplate()` でプロパティキー解析、`groupTsvColumns()` / `buildTsvColumnDefs()` で列定義生成
- Phase 2-C（実装完了）：複数DOI一括TSV出力（[#100](https://github.com/tzhaya/jc-import-file-maker/issues/100)）
  - DOIを連続取得して `allMetadata[]` に蓄積、ヘッダー5行+データN行の一括TSVを出力
  - バッチ管理パネル（蓄積件数表示・個別削除・全クリア・アイテム切替）
  - リポジトリURL入力でスキーマURL `https://localhost/` を置換
  - ファイル名: `import_YYYYMMDD_HHMMSS.tsv`
- Phase 2-D（実装完了）：ItemType行自動設定（[#101](https://github.com/tzhaya/jc-import-file-maker/issues/101)）
  - カスタムテンプレートのItemType行を自動検出・設定

## 技術スタック

- HTML5 / CSS3 / JavaScript（依存ライブラリなし、単一HTMLファイル）
- 外部API: [Crossref](https://api.crossref.org/), [JaLC](https://api.japanlinkcenter.org/), [OpenAlex](https://api.openalex.org/), [ROR](https://ror.org/), [CiNii Research](https://cir.nii.ac.jp/), [KAKEN API](https://support.nii.ac.jp/ja/kaken/api/api_outline), [Open Policy Finder](https://openpolicyfinder.jisc.ac.uk/)

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
- [ファイル情報UI](docs/Implementation_file35.md) ファイル情報（file35）入力UIの実装計画書です。
- [助成情報検索ツール](docs/Implementation_funder_lookup.md) 助成情報検索ツールの実装記録です。
- [残存Issues一覧](docs/remaining_issues.md) 未実装・実装中のIssue一覧と推奨実装順序です。

### フィールド・語彙リファレンス

- [フィールドマッピング一覧](docs/fieldmapping.md) Crossref/JaLC/OpenAlexとのマッピング表です。
- [JPCOARスキーマ フィールド一覧](docs/fields.md) 「デフォルトアイテムタイプ（フル）」に含まれるフィールド一覧です。
- [JPCOARスキーマ 項目別説明リンク一覧](docs/JPCOARschema_guide.md)
- [資源タイプ語彙別表](docs/resource_type_vocabulary.md) JPCOAR 2.0対応の資源タイプ語彙一覧です。
- [Crossref type → JPCOAR 資源タイプ マッピング](docs/crossref_type_mapping.md)
- [JPCOAR/JaLC/Crossref 必須項目マッピング](docs/JPCOAR_JaLC_Crossref_requirements.md)
- [アクセス権 統制語彙](docs/accessrights.md)
- [関連識別子 統制語彙](docs/relatedIdentifier.md)
- [attribute_value_mlt と配列記法のルール](docs/attribute_value_mlt.md)
- [TSVエクスポート パイプライン比較](docs/pipeline_comparison.md)
- [WEKO3 TSVインポート仕様](docs/weko3_tsv_import_spec.md)
- [WEKO3 プロパティキー命名規則](docs/weko3_property_key_naming.md) TSVヘッダーのプロパティキー（item_30002_*・item_16986240*）の命名規則です。
- [APIフロー](docs/api-flow.md) DOI入力からTSV出力までのデータフローです。