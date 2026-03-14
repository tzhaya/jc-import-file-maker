# 残存 Issues 一覧と実装優先順位

最終更新: 2026-03-14

## 概要

Phase 1（データ取得・編集UI）は大部分完了済み。Phase 2（TSV出力）が未着手のまま。
TSV 出力を実装する前に、DOM 構造・語彙値に影響する JPCOAR 2.0 対応 issues を先に完了させる必要がある。

---

## グループ A: Phase 2 TSV出力の**前提**（先に完了すること）

これらが未完了のまま TSV を実装すると、列定義（`TSV_COL_GROUPS`）や `collectFromDOM()` を後から再修正することになる。

### #26: nameIdentifier スキーム語彙の更新（JPCOAR 2.0）

- **内容**: 作成者・寄与者の識別子スキーム選択肢に `e-Rad` 等を追加
- **現状**: `nameIdentifierScheme: ['ORCID','CiNii','ISNI','J-GLOBAL']` のみ（`make_jc_importer.html` L992）
- **変更対象**:
  - `TITLE_MAPS.nameIdentifierScheme` に `e-Rad` 等を追加
  - `affiliationNameIdentifierScheme` も確認（現状: `['ISNI','ROR','GRID','kakenhi','Ringgold']`、L990）
- **参照**: JPCOAR 2.0 スキーマ仕様（nameIdentifier スキーム一覧）

### #27: creatorType 属性を select 化（JPCOAR 2.0）

- **内容**: 作成者の「タイプ」フィールドをテキスト入力からドロップダウンに変更
- **現状**: `typeSelectOpts: isCreator ? null : 'contributorType'`（L3559–3560）
  - creator は `null` → テキスト入力のまま
  - contributor は select 済み（`'contributorType'` 使用）
- **変更対象**: `make_jc_importer.html` L3559 の `null` を専用 TITLE_MAPS キーに変更
  - `TITLE_MAPS` に `creatorType: ['Author','Editor','Illustrator','Translator','Other',...]` を追加
  - L3559: `typeSelectOpts: isCreator ? 'creatorType' : 'contributorType'`
- **参照**: JPCOAR 2.0 スキーマ仕様（creatorType 許容値一覧）

### #28: 言語コード `ja-Kana` → `ja-Latn` 変更（JPCOAR 2.0）

- **内容**: JPCOAR 2.0 で採用された BCP 47 準拠の言語コードに更新
- **現状**: `'ja-Kana'` が `TITLE_MAPS.language` に残存（L921）
- **変更対象**:
  - `TITLE_MAPS.language` の `'ja-Kana'` → `'ja-Latn'` に置換
  - `mapToItemType()` 内で `ja-Kana` をハードコードしている箇所があれば修正
- **注意**: 既存データで `ja-Kana` が保存されている場合の表示は変わらない（DOM の select 値が一致しなくなる）

### #29: relationType 語彙への追加（JPCOAR 2.0）

- **内容**: JPCOAR 2.0 で追加された relationType 語彙値を選択肢に追加
- **現状**: `subitem_relation_type: [..., 'isCitedBy','Cites','inSeries']`（L970–974）
- **変更対象**:
  - `TITLE_MAPS.subitem_relation_type` に追加値があれば追記
  - JPCOAR 2.0 スキーマで追加されたタイプを確認すること
- **参照**: JPCOAR 2.0 スキーマ仕様（relationType 統制語彙）

### #31: resourceType 語彙を JPCOAR 2.0 / COAR Vocabulary 対応版に更新

- **内容**: JPCOAR 2.0 で `resourceType` の語彙別表が改訂。データセット系サブタイプの追加や会議系タイプの変更を反映
- **変更対象**:
  - `TITLE_MAPS` の資源タイプ選択肢を更新
  - `CROSSREF_TYPE_MAP` / `JALC_CONTENT_TYPE_MAP` のマッピング先を確認
- **参照**: JPCOAR 2.0 スキーマ仕様（resourceType 語彙別表）

### #34: 助成情報にプログラム情報フィールドを追加（JPCOAR 2.0）

- **内容**: 助成情報（`funding_reference21`）に JPCOAR 2.0 の「プログラム情報」フィールドを追加
  - プログラム情報名（`subitem_funding_streams`: 配列）
  - プログラム情報識別子（`subitem_funding_stream_identifiers`: オブジェクト）
- **現状**: `renderOneFunder()` に上記フィールドが存在しない（L3666–3764）
- **変更対象**:
  - `make_jc_importer.html` の `renderOneFunder()` を拡張
  - `collectFundingField()` でプログラム情報を収集するよう拡張（L4523）
  - `mapToItemType()` 内の助成情報マッピング部分にも追加
  - `buildEmptyMetadata()` の助成情報フィールドにも追加
- **参照元（実装済み）**:
  - `funder_lookup.html` の `fundingStreams` / `fundingStreamId` ロジック
  - `docs/fieldmapping.md` の助成情報フィールドマッピング表
  - `docs/Implementation_funder_lookup.md` の JPCOAR 2.0 プログラム情報説明

---

## グループ B: Phase 2 と並行可能（UI のみ）

### #30: 出版者必須度変更（JPCOAR 2.0）

- **内容**: JPCOAR 2.0 での出版者フィールドの必須度変更を DOI 必須項目バッジに反映
- **DOM 構造への影響**: なし（バッジ表示ロジックのみ）
- **変更対象**: `make_jc_importer.html` の `createDoiBadges()` 周辺

### #87: JPCOARスキーマ 項目別説明リンクの変更

- **内容**: 各項目名からのJPCOARスキーマ説明リンクを2.0に更新し、下位項目にもリンクを追加
- **DOM 構造への影響**: なし（リンクURL変更のみ）
- **変更対象**:
  - `make_jc_importer.html` の JPCOAR_LINKS 定数（~L570–610）
  - `docs/JPCOARschema_guide.md` の更新（1.0/2.0 リンク併記）

### #90: file_path の設定方法の改善

- **内容**: ファイル情報（file35）の `file_path` をディレクトリ構造ベースの相対パスで設定する方法を検討
- **DOM 構造への影響**: なし（既存file_path入力フィールドの動作変更のみ）
- **関連**: #84（実装完了・クローズ済み）、#85

---

## グループ C: Phase 2 TSV 実装本体（#85）

### #85: TSV エクスポート機能

- **内容**: DOM → JSON → TSV のパイプラインを実装しダウンロードボタンを追加
- **現状**: **未着手**（`worklog.md` 未完了タスクセクションに記載）
- **既存基盤**: `collectFromDOM()` がプレビュー機能（#37）で実装済み（L4715）
- **詳細仕様**: `docs/Implementation_phase2.md` に全ステップの詳細設計あり
- **主要実装内容**:
  1. `TSV_HEADERS_TEMPLATE` 定数定義（`data/tsv_headers.json` のインライン版）
  2. `buildTsvColumnDefs(prefix, metadata)` — 配列サイズに応じた動的列展開
  3. `generateTsv(metadata, templateText)` — 5行ヘッダー + データ行生成
  4. `downloadTsv(tsvString, filename)` — BOM付きUTF-8 TSV ダウンロード
  5. `exportTsv()` + UI ボタン追加

---

## グループ D: Phase 2 完了後に追加

### #32: 出版者情報（新規フィールド）

- **内容**: JPCOAR 2.0 で追加された出版者情報フィールド（出版者識別子等）
- **対応方針**: Phase 2 実装後に `TSV_EXCL_SUFFIXES` / `TSV_EXCL_TIMESTAMP` から除外して追加

### #33: 日付リテラル（新規フィールド）

- **内容**: JPCOAR 2.0 で追加された日付リテラルフィールド
- **対応方針**: Phase 2 実装後に追加

---

## 推奨実装順序

```
Step 1: グループ A（#26 → #27 → #28 → #29確認 → #31 → #34）
         ※ DOM 構造・語彙値が固まってから TSV を実装する

Step 2: Phase 2 TSV出力実装（#85、Implementation_phase2.md に詳細設計済み）

Step 3: グループ B（#30, #87, #90）は任意のタイミングで

Step 4: グループ D（#32, #33）を TSV 完了後に追加
```

---

## 変更対象ファイル

| ファイル | 変更 issues |
|---------|------------|
| `make_jc_importer.html` | #26, #27, #28, #29, #30, #31, #34, #85, #87, #90 |
| `chrome-extension/make_jc_importer.js` | #26, #27, #28, #29, #30, #31, #34, #87 と同期 |
| `chrome-extension/panel.html` | UI 変更があれば同期 |
| `docs/JPCOARschema_guide.md` | #87 |

---

## 実装時の参照ポイント

| 機能 | 参照先 |
|------|--------|
| #27 creatorType select 化 | L3265–3268（contributor の select 実装パターン） |
| #34 プログラム情報フィールド | `funder_lookup.html` L320–373（fundingStreams ロジック） |
| #85 TSV列定義 | `docs/Implementation_phase2.md`（TSV_COL_GROUPS 全定義） |
| #85 collectFromDOM 拡張 | `make_jc_importer.html` L4715（既存 collectFromDOM） |
| #85 フィールド構造 | `samples/export/デフォルトアイテムタイプ（フル）(30002).tsv` |
| #87 JPCOARリンク | `docs/JPCOARschema_guide.md`、JPCOAR_LINKS 定数（~L570–610） |
