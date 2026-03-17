# 残存 Issues 一覧と実装優先順位

最終更新: 2026-03-15

## 概要

Phase 1（データ取得・編集UI）は完了済み。Phase 2-A（単一DOI TSV出力）も実装完了（#85 クローズ済み）。
残りは Phase 2-B〜D（TSV拡張）、JPCOAR 2.0 新規フィールド、UI改善。

---

## 完了済みグループ

### グループ A: JPCOAR 2.0 既存フィールド対応 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #26 | nameIdentifier スキーム語彙の更新 | 完了 |
| #27 | creatorType 属性を select 化 | 完了 |
| #28 | 言語コード ja-Latn 追加 | 完了 |
| #29 | relationType 語彙への追加 | 完了 |
| #30 | 出版者必須度変更（DOIバッジ） | 完了 |
| #31 | resourceType 語彙更新 | 完了 |
| #34 | 助成情報にプログラム情報追加 | 完了 |

### Phase 2-A: 単一DOI TSV出力 — **完了**（#85 クローズ済み）

`TSV_HEADERS_TEMPLATE` / `generateTsv()` / `downloadTsv()` / `exportTsv()` / `collectFromDOM()` 等、単一DOIのTSV出力に必要な機能は全て実装済み。

---

## グループ E: Phase 2 TSV 拡張（#85 から分割）

#85（Phase 2-A）完了に伴い、残りのフェーズを個別issueに分割。

### #99: カスタムテンプレート完全パース（Phase 2-B）

- **内容**: ユーザが自機関のTSVテンプレート（5行ヘッダー）を貼り付けた場合に `TSV_HEADERS_TEMPLATE` を丸ごと上書き
- **現状**: プレフィックス自動検出・置換のみ対応。ラベル行・System行・制約行はデフォルト固定
- **実装内容**:
  - `parseCustomTemplate(templateText)` 関数の新規実装
  - ItemType行からアイテムタイプ名・スキーマURLを自動取得
- **変更対象**: `make_jc_importer.html` の `generateTsv()` / `groupTsvColumns()`

### #100: 複数DOI一括TSV出力（Phase 2-C）

- **内容**: 複数DOIのメタデータを蓄積し、1つのTSVファイルとして一括出力
- **実装内容**:
  - `allMetadata = []` 蓄積機構の導入
  - `generateTsv()` の複数 metadata 対応（全件の配列最大サイズで列展開）
  - 複数DOI時のファイル名をタイムスタンプベースに
- **変更対象**: `make_jc_importer.html` の `exportTsv()` / `generateTsv()` / `buildTsvColumnDefs()`

### #101: ItemType行の自動設定（Phase 2-D）

- **内容**: TSV 1行目のアイテムタイプ名・スキーマURLを自動設定（現在は `(未設定)` 固定）
- **変更対象**: `make_jc_importer.html` の `generateTsv()` / `TSV_HEADERS_TEMPLATE[0]`
- **備考**: #99（カスタムテンプレート）実装時に合わせて対応可能

---

## グループ B: UI改善（任意のタイミングで実施可能）

### #87: JPCOARスキーマ 項目別説明リンクの変更

- **内容**: 各項目名からのJPCOARスキーマ説明リンクを2.0に更新し、下位項目にもリンクを追加
- **DOM 構造への影響**: なし（リンクURL変更のみ）
- **変更対象**:
  - `make_jc_importer.html` の JPCOAR_LINKS 定数（~L570–610）
  - `docs/JPCOARschema_guide.md` の更新（1.0/2.0 リンク併記）

### #90: file_path の設定方法の改善

- **内容**: ファイル情報（file35）の `file_path` をディレクトリ構造ベースの相対パスで設定する方法を検討
- **DOM 構造への影響**: なし（既存file_path入力フィールドの動作変更のみ）
- **関連**: #84（実装完了・クローズ済み）
- **WEKO3仕様**（[weko3_tsv_import_spec.md](weko3_tsv_import_spec.md) §6）:
  - `file_path` はZIP内 `data/` からの相対パス（`recid_{id}/` プレフィックスは必須ではない）
  - 新規アイテム: ZIP内にファイルが存在しない場合はエラー
  - 更新アイテム: 存在しない場合は警告（メタデータのみ更新）
  - メタデータ内の `filename` と `file_path` の整合性が必要

---

## グループ D: JPCOAR 2.0 新規フィールド追加

### #32: 出版者情報（新規フィールド）

- **内容**: JPCOAR 2.0 で追加された出版者情報フィールド（`item_1698624005` / `jpcoar:publisherDetail`）
- **対応方針**: TSV出力の `TSV_EXCL_TIMESTAMP` から `item_1698624005` を除外し、UI・collectFromDOMを追加
- **親issue**: #25

### #33: 日付リテラル（新規フィールド）

- **内容**: JPCOAR 2.0 で追加された日付リテラルフィールド（`item_1698624008` / `dcterms:date`）
- **対応方針**: TSV出力の `TSV_EXCL_TIMESTAMP` から `item_1698624008` を除外し、UI・collectFromDOMを追加
- **親issue**: #25

---

## 推奨実装順序

```
Step 1: グループ E — Phase 2 TSV拡張（#99 → #101 → #100）
         ※ #101 は #99 と同時実装可能
         ※ #100（複数DOI）は最も複雑なため最後

Step 2: グループ D — JPCOAR 2.0 新規フィールド（#32, #33）
         ※ TSV_EXCL_TIMESTAMP からの除外 + UI追加

Step 3: グループ B — UI改善（#87, #90）は任意のタイミングで
```

---

## 親issue との関係

### #25: JPCOAR スキーマ 2.0 対応（親issue）

| フェーズ | Issue | 状態 |
|---------|-------|------|
| 1（既存フィールド変更） | #26, #27, #28, #29, #30, #31, #34 | **全完了** |
| 2（新規フィールド追加） | #32, #33 | OPEN |
| ドキュメント | #87 | OPEN |

#25 の完了条件: #32, #33, #87 の全完了。

---

## 変更対象ファイル

| ファイル | 変更 issues |
|---------|------------|
| `make_jc_importer.html` | #32, #33, #87, #90, #99, #100, #101 |
| `chrome-extension/make_jc_importer.js` | #32, #33, #87 と同期 |
| `chrome-extension/panel.html` | UI 変更があれば同期 |
| `docs/JPCOARschema_guide.md` | #87 |

---

## 実装時の参照ポイント

| 機能 | 参照先 |
|------|--------|
| #32, #33 新規フィールド追加パターン | #84（file35 実装）の FIELD_DEFS / render / collect / TSV対応 |
| #87 JPCOARリンク | `docs/JPCOARschema_guide.md`、JPCOAR_LINKS 定数（~L570–610） |
| #99 カスタムテンプレート | `docs/Implementation_phase2.md` Phase 2-B セクション |
| #100 複数DOI | `docs/Implementation_phase2.md` Phase 2-C セクション |
| #101 ItemType行 | `TSV_HEADERS_TEMPLATE[0]`（~L5142） |
