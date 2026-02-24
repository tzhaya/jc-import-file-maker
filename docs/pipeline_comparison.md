# TSVエクスポート パイプライン比較

## 背景

Phase 2 の TSV エクスポート実装にあたり、以下の3つのパイプラインを検討した。

- **A: DOM → JSON → TSV**（現計画）
- **B: DOM → YAML → TSV**（togura 連携）
- **C: DOM → TSV**（直接変換）

## togura の YAML スキーマについて

[togura](https://github.com/nabeta/togura) は JPCOAR 2.0 スキーマ準拠の YAML を入力として、HTML/XML/JaLC XML/RO-Crate 等を生成する Python 製静的サイトジェネレータ。

YAML の構造例：

```yaml
creator:
  - creator_name:
      - name: Doe, Jane
        lang: en
    affiliation:
      - affiliation_name:
          - name: Univ. of Tokyo
            lang: en
        name_identifier:
          - identifier_scheme: ROR
            identifier: https://ror.org/xxx
funding_reference:
  - funder_name:
      - funder_name: JSPS
        lang: ja
    award_number:
      award_number: JP21K00001
      award_number_type: JGN
```

## 比較表

| 観点 | A: DOM → JSON → TSV | B: DOM → YAML → TSV | C: DOM → TSV |
|---|---|---|---|
| 実装コスト | 中（計画済み） | 高（二重マッピング） | 低 |
| WEKO互換性 | ◎ 直結 | △ 変換層が必要 | ◎ 直結 |
| 他ツール連携 | × | ◎ togura で XML/JaLC 生成可 | × |
| 中間状態の検査 | ○ DevToolsで確認可 | ○ YAMLファイルで確認可 | × |
| テスト容易性 | ○ DOM不要でテスト可 | ○ 同左 | × DOM依存 |
| 人間可読性 | △ JSON | ◎ YAML | × なし |
| 後からの機能拡張 | △ WEKO専用 | ○ JPCOAR標準に乗れる | × |

## 各パイプラインの詳細

### A: DOM → JSON → TSV（現計画）

```
DOM → collectFromDOM() → { item_30002_creator2: [...] }（WEKO固有の命名）
                       → buildColumnDefs() → TSV
```

- 中間 JSON は WEKO 固有の命名（`creatorAffiliations`, `affiliationNameIdentifiers` 等）
- `mapToItemType()` の出力と同一構造なので、既存の知識がそのまま使える
- WEKO TSV への変換コストが最小

**問題点**: 中間 JSON は WEKO 専用であり、他ツールへの転用は不可。

### B: DOM → YAML → TSV

```
DOM → collectFromDOM() → YAML（JPCOAR 2.0 標準命名）
                       → yamlToWeko()（変換層）
                       → { item_30002_... }
                       → buildColumnDefs() → TSV
```

togura YAML と WEKO TSV では命名が根本的に異なるため、変換層が別途必要になる：

| togura YAML のキー | WEKO TSV のキー |
|---|---|
| `creator[].affiliation[].affiliation_name[].name` | `creatorAffiliations[].affiliationNames[].affiliationName` |
| `creator[].name_identifier[].identifier_scheme` | `nameIdentifiers[].nameIdentifierScheme` |
| `funding_reference[].award_number.award_number` | `subitem_award_numbers.subitem_award_number` |
| `type`（COAR 語彙） | `resourcetype`（WEKO 語彙、別マッピングが必要） |

技術面での追加コスト：

- JavaScript での YAML パースには `js-yaml` 等のライブラリが必要（単一 HTML ファイルに外部依存が生じる）
- YAML → WEKO JSON → TSV の変換は既存の `mapToItemType()` とほぼ同等の作業量

**問題点**: 変換コストが高く、単一 HTML ファイルの方針とも相性が悪い。

### C: DOM → TSV（直接変換）

```
DOM → TSV（DOM 走査しながら直接列を書き出す）
```

- 実装は最もシンプルに見えるが、列定義と DOM 走査が密結合になる
- 空フィールドの省略・内部配列の展開を DOM 上で直接行う必要があり、結局 `buildColumnDefs()` 相当のロジックが必要になる
- 中間状態がないためテストが困難

**問題点**: デバッグ・テスト・拡張のいずれも困難。

## 結論

**Phase 2 の WEKO TSV 出力には A（DOM → JSON → TSV）を採用する。**

YAML 変換層の追加コストに見合う利益が、WEKO 出力という目的においては得られない。

togura 連携は独立した将来機能として価値があるため、以下のように経路を分けることを推奨する：

```
Phase 2（現計画）: DOM → JSON（WEKO 固有）→ TSV
将来 Phase 3:      DOM → YAML（JPCOAR 2.0）→ togura で XML/JaLC 生成
                   ↑ 別途「YAML 出力」ボタンとして追加
```

2経路を持つ場合でも `collectFromDOM()` は共通化できる（収集したデータを WEKO JSON にも JPCOAR YAML にも変換できる）。
