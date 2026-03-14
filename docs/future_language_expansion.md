# 要対応事項: 言語選択肢の拡張（LANGUAGE_VAL2_2 対応）

作成日: 2026-03-14

## 概要

WEKO3 には言語選択肢として2つのリストが存在する。本ツールは現在、標準リスト（18項目）のみに対応している。
将来的に拡張リスト（185項目）への対応を検討する必要がある。

## WEKO3 の言語リスト定義

ソース: `RCOSDP/weko` リポジトリ `scripts/demo/properties/property_config.py`

### LANGUAGE_VAL2_1（標準リスト、18項目）— 現在対応済み

```
ja, ja-Kana, ja-Latn, en, fr, it, de, es, zh-cn, zh-tw, ru, la, ms, eo, ar, el, ko
```

- 用途: タイトル・内容記述等のテキスト系フィールドの `xml:lang` 属性
- 本ツールの `TITLE_MAPS.language` はこのリストに準拠

### LANGUAGE_VAL2_2（拡張リスト、185項目）— 未対応

- 全 ISO 639-1 言語コード + `ja-Latn` を含む
- `ja-Kana` は含まれない
- WEKO3 の一部プロパティで使用される可能性あり

## 対応方針（案）

- 標準リストで実用上の問題がない間は現状維持
- 多言語対応が必要なユーザーから要望があれば、拡張リストへの切り替えまたは選択式を検討
- 対応する場合は `TITLE_MAPS.language` を拡張し、UI のセレクト要素が長大になる点に注意（検索可能なドロップダウン等の UX 改善が必要になる可能性）

## 関連

- Issue #28（`ja-Latn` 追加、対応済み）
- JPCOAR 2.0 スキーマ: https://schema.irdb.nii.ac.jp/ja/schema/2.0/3-.2
