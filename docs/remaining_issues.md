# 残存 Issues 一覧と実装優先順位

最終更新: 2026-03-23（#51 エンバーゴアクセス権修正完了、#44 全完了を反映）

## 概要

Phase 1（データ取得・編集UI）は完了済み。Phase 2（TSV拡張）も全完了（#85, #99, #100, #101 クローズ済み）。
JPCOAR 2.0 対応（#25）は全完了（#32, #33, #87 クローズ済み）。
OPF連携（#44）も全完了（#50, #51 クローズ済み）。
残りは Chrome拡張強化、JaLC対応拡張、ドキュメント整備。

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

### グループ D: JPCOAR 2.0 新規フィールド追加 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #32 | 出版者情報（publisherDetail）追加 | 完了（2026-03-20） |
| #33 | 日付リテラル（dcterms:date）追加 | 完了（2026-03-20） |

### グループ B: UI改善 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #87 | JPCOARスキーマ 項目別説明リンクを2.0に更新 | 完了（2026-03-15） |
| #90 | file_path のディレクトリ構造ベース自動設定 | 完了（2026-03-22） |

### 親issue #25: JPCOAR スキーマ 2.0 対応 — **全完了**（クローズ済み）

| フェーズ | Issue | 状態 |
|---------|-------|------|
| 1（既存フィールド変更） | #26, #27, #28, #29, #30, #31, #34 | **全完了** |
| 2（新規フィールド追加） | #32, #33 | **全完了** |
| ドキュメント | #87 | **完了** |

### Phase 2-A: 単一DOI TSV出力 — **完了**（#85 クローズ済み）

`TSV_HEADERS_TEMPLATE` / `generateTsv()` / `downloadTsv()` / `exportTsv()` / `collectFromDOM()` 等、単一DOIのTSV出力に必要な機能は全て実装済み。

### グループ E: Phase 2 TSV拡張 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #85 | Phase 2-A 単一DOI TSV出力 | 完了 |
| #99 | Phase 2-B カスタムテンプレート完全パース | 完了（2026-03-22） |
| #100 | Phase 2-C 複数DOI一括TSV出力 | 完了（2026-03-22） |
| #101 | Phase 2-D ItemType行自動設定 | 完了（2026-03-22） |

### グループ G: OPF連携拡張 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #44 | Open Policy Finder連携対応（親issue） | 完了（2026-03-22） |
| #50 | OPF API連携基盤 | 完了 |
| #51 | OA情報統合 + UIラベル日本語化 + エンバーゴアクセス権修正 | 完了（2026-03-23） |

### その他の完了済み Issue

| Issue | 内容 | 状態 |
|-------|------|------|
| #107 | 助成機関識別子タイプURI（funderIdentifierTypeURI）追加 | 完了（2026-03-20） |
| #108 | WEKO3 v2テンプレート対応（researchmap_linkage / peer_reviewed） | 完了（2026-03-20） |
| #114 | data/tsv_headers.json の更新（226→232列） | 完了（2026-03-21） |
| #115 | Chrome拡張の初期化処理修正 | 完了 |

---

## OPEN Issues

### グループ F: Chrome拡張強化

#### #73: 電子ジャーナルページからのDOI自動取り込み

- **内容**: 電子ジャーナルページのメタデータ（`citation_doi`, `prism.doi`, `dc.identifier`, `DOI`）からDOIを自動取得し、Chrome拡張で利用
- **トリガー**: 要検討（ボタン押下・サイドパネル表示・拡張機能起動等）
- **変更対象**: Chrome拡張（content script追加等）

#### #112: Chromeウェブストアへの登録

- **内容**: Chrome拡張機能のChromeウェブストア登録に必要な事項の整理
- **前提**: 機能が安定してから着手

---

### グループ H: JaLC対応拡張

#### #4: JaLC DOIのインポート対応

- **内容**: JaLC DOIのインポート完全対応（基本実装は #6 で完了済み、残りは改善・拡張）

#### #6: JaLC APIからのデータマッピング

- **内容**: JaLC REST APIからのデータマッピング改善
- **現状**: 基本マッピングは実装済み。CORS制約によりChrome拡張でのみ動作

#### #8: KAKENから日本語の作成者名を取得する

- **内容**: KAKEN XMLから日本語作成者名・e-Rad/NRID識別子を取得し、ORCID一致で著者にマッピング
- **変更対象**: `make_jc_importer.html` の著者マッピング処理

---

### グループ I: JPCOAR 2.0 追加対応

#### #95: JPCOARスキーマ 2.0 必須度の表示・判定機能

- **内容**: DOI登録要件とは独立した、JPCOARスキーマレベルの必須度（R / R.cond / MA / O）をUIに表示
- **検討事項**: 全フィールド必須度一覧整理、DOIバッジとの併存方法、入力漏れ検知の要否
- **関連**: #30, #15

---

### グループ J: コード品質・設計改善

#### #74: HTMLファイルからCORS制限コードの削除・再構成

- **内容**: JaLC・KAKEN・OPFはCORS制限によりHTMLファイルからは利用不可。Chrome拡張で利用可能になったため、HTMLファイルからの削除を検討
- **考慮**: HTML版とChrome拡張版の両方を維持する必要があり、保守性を考慮

#### #111: CONFIGの共通化

- **内容**: `make_jc_importer.html` と `funder_lookup.html` のAPIキー設定を外部ファイルに共通化。TSVテンプレートの外部ファイル参照も含む
- **関連**: #99（カスタムテンプレート）と連動可能

---

### グループ K: ドキュメント整備

#### #43: WEKO3 TSVインポート仕様の調査結果

- **内容**: Phase 2 実装に向けたWEKO3 TSVインポート/エクスポート仕様の調査。`tsv_headers.json` の配列展開ルール等
- **成果物**: `docs/weko3_tsv_import_spec.md`（作成済み）
- **備考**: 調査は完了しているが、issueがクローズされていない

#### #116: JPCOARスキーマ2.0対応に伴うドキュメント修正

- **内容**: JPCOAR 2.0対応によるTSVフォーマット変更に伴うドキュメント修正
- **対象**: `docs/fieldmapping.md`, `docs/Implementation_phase2.md`, `docs/remaining_issues.md`, `docs/weko3_property_key_naming.md`

---

## 推奨実装順序

```
Step 1: グループ K — ドキュメント整備（#116, #43）

Step 2: グループ H — JaLC対応拡張（#8, #6, #4）
         ※ Chrome拡張でのCORS解消済み

Step 3: グループ I — JPCOAR 2.0 追加対応（#95）
         ※ 検討段階

Step 4: グループ F — Chrome拡張強化（#73, #112）
         ※ #112（ウェブストア登録）は機能安定後

Step 5: グループ J — コード品質改善（#74, #111）
         ※ 任意のタイミングで実施可能
```

### 完了済みグループ（実装順序から除外）
- グループ E — Phase 2 TSV拡張（#99, #100, #101）— 全完了
- グループ G — OPF連携拡張（#44, #50, #51）— 全完了

---

## 変更対象ファイル

| ファイル | 変更 issues |
|---------|------------|
| `make_jc_importer.html` | #8, #74, #95, #111 |
| `chrome-extension/make_jc_importer.js` | 上記と同期 |
| `chrome-extension/panel.html` | UI 変更があれば同期 |
| `chrome-extension/` 全般 | #73, #112 |
| `funder_lookup.html` | #111 |
| `docs/` | #43, #116 |

---

## 実装時の参照ポイント

| 機能 | 参照先 |
|------|--------|
| #43 WEKO3仕様 | `docs/weko3_tsv_import_spec.md` |
| #73 DOI自動取込 | HTML meta tag（citation_doi, prism.doi, dc.identifier, DOI） |
| #95 JPCOAR必須度 | `DOI_REQUIREMENTS` + `createDoiBadges()` の拡張 |
