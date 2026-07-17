# ドキュメント一覧

このディレクトリには、利用者向けガイド、開発・運用資料、仕様書、調査資料、ポリシー、実装記録を収録しています。
現在は多くのファイルを `docs/` 直下に配置していますが、文書を探しやすくするため、将来的には末尾の「将来的なフォルダ分け案」に沿って整理する予定です。

## 利用者向けガイド

- [使い方ガイド](user_guide.md) — DOIからのメタデータ取得、編集、TSV出力などの操作方法
- [設定ガイド](settings.md) — APIキーと初期値の設定方法

## 開発・保守・リリース

- [開発者向けドキュメント](developer_docs.md) — 開発環境、品質チェック、テスト、保守者向け資料
- [要件定義](requirements.md) — ツールの要件と対象機能
- [リリース手順](release_procedure.md) — Chrome拡張機能を含むリリース作業
- [残存Issues一覧](remaining_issues.md) — 未対応課題と実装優先順位
- [今後の方向性（2026-07-05時点）](roadmap_2026-07-05.md) — プロジェクトの位置づけと開発の優先順位
- [変更履歴](changelog.md) — リリース・機能変更の履歴
- [作業ログ](worklog.md) — `make_jc_importer.html` を中心とする実装記録

## 現行仕様・リファレンス

### マッピング仕様

- [フィールドマッピング一覧](fieldmapping.md) — Crossref、JaLC、DataCiteからJPCOARフィールドへの対応
- [DataCite → JPCOAR マッピング表](datacite_jpcoar_mapping.md)
- [Crossref type → JPCOAR 資源タイプ](crossref_type_mapping.md)
- [アイテムタイプ間フィールドマッピング対応表](itemtype_field_mapping_tsukuba.md)
- [JPCOAR / JaLC DOI / Crossref DOI 必須項目マッピング](JPCOAR_JaLC_Crossref_requirements.md)

### 語彙・項目定義

- [アクセス権 統制語彙](accessrights.md)
- [関連識別子 統制語彙](relatedIdentifier.md)
- [Resource Type Vocabulary](resource_type_vocabulary.md)
- [ItemType.json フィールド一覧](fields.md)
- [JPCOARスキーマ 項目別説明リンク一覧](JPCOARschema_guide.md)

### WEKO3仕様

- [WEKO3 TSVインポート仕様](weko3_tsv_import_spec.md)
- [WEKO3 メタデータプロパティキーの命名規則](weko3_property_key_naming.md)
- [`attribute_value_mlt` と配列記法のルール](attribute_value_mlt.md)
- [WEKO3 OpenSearch クライアント仕様](weko3-opensearch-client-spec.md) — 本プロジェクトでの実装仕様
- [WEKO3 OpenSearch クライアント汎用仕様書](weko3-opensearch-client-general-spec.md) — API調査を含む汎用仕様

## 調査・比較・将来構想

- [CiNii Research API / JaLC API 活用の検討](cinii_research_api_feasibility.md)
- [OpenAlexを起点とした登録パイプラインの実現可能性](openalex_harvest_feasibility.md)
- [TSVエクスポート パイプライン比較](pipeline_comparison.md)
- [言語選択肢の拡張](future_language_expansion.md)
- [WEKO3 v2 テンプレート対応](plan_weko3_v2_template.md) — 検証結果と実装計画

## ポリシー・公開審査資料

- [プライバシーポリシー](privacy-policy.md)
- [Chrome Web Store 権限の正当化](chrome_store_permissions.md)

## 実装計画・履歴

### 実装計画・実装記録

- [Phase 1 実装計画](Implementation_phase1.md)
- [Phase 2 実装計画](Implementation_phase2.md)
- [Issue #17: 識別子からの機関名逆引き](Implementation_issue17.md)
- [Issue #42: 関連情報の取得改善](Implementation_issue42.md)
- [Issue #70: Chrome拡張化](Implementation_issue70.md)
- [Issue #84: ファイル情報入力UI](Implementation_file35.md)
- [DOI必須項目バッジ表示](Implementation_doi_badges.md)
- [助成情報検索ツール](Implementation_funder_lookup.md)
- [JaLC APIデータマッピング](Implementation_JaLC.md)
- [KAKEN連携](Implementation_KAKEN.md)
- [Open Policy Finder連携](Implementation_OPF.md)
- [CORS回避・Chrome拡張化 引き継ぎメモ](handover_cors_extension.md)

### 時点レビュー

- [現状レビュー（2026-07-05）](current_review_2026-07-05.md)

## Webサイト・外部参考資料

- [GitHub Pagesトップ](index.html)
- [`images/`](images/) — GitHub Pagesおよび使い方ガイドで使用する画像
- [JPCOAR・JaLCガイドライン付録（PDF）](JPCOAR_JaLC_Guideline_appendix_ver1_5%20.pdf)

## リポジトリ直下の関連文書

- [README](../README.md) — プロジェクト概要と導入方法
- [APIフロー整理](../api-flow.md) — 外部APIの取得順とマッピング概要
- [機能と技術](../function.md) — 機能構成と技術情報

## 将来的なフォルダ分け案

文書の役割に応じて、次の構成への移設を検討します。移設時には、README、文書間リンク、`scripts/check.js` のUTF-8検査対象、GitHub Pagesの公開URLを合わせて更新します。

```text
docs/
├── README.md
├── index.html
├── images/
├── guides/                    # 利用者向けガイド
├── development/               # 開発・保守・リリース資料
├── specifications/            # 現行仕様・リファレンス
│   ├── mappings/              # データソースとJPCOARのマッピング
│   ├── vocabularies/          # 統制語彙・項目定義
│   └── weko3/                 # WEKO3固有仕様
├── research/                  # 調査・比較・将来構想
├── governance/                # ポリシー・公開審査資料
├── history/
│   ├── implementations/       # Issue・機能単位の実装計画と記録
│   └── reviews/               # 日付時点のレビュー
└── references/                # 外部参考資料
```

`index.html` と `images/` はGitHub Pagesの構成を保つため、当面は現在の場所を維持します。`privacy-policy.md` など外部から直接参照される可能性がある文書は、公開URLへの影響を確認してから移設します。
