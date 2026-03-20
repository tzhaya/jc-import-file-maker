# WEKO3 v2 テンプレート対応 — 検証結果と実装計画

## Context

WEKO3実機（jircas.repo.nii.ac.jp）がJPCOARスキーマ2.0対応のアップデートを行い、
TSVテンプレート（30002/40039）の構造が変更された。v1テンプレートとv2テンプレートの差分を
分析し、本ツールのTSV出力・入力UIへの影響を特定した。

## 検証結果: v1 → v2 差分一覧

### A. ツール修正が必要な変更（3件）

| # | 変更内容 | 対象テンプレート | 現状 |
|---|----------|------------------|------|
| 1 | システムフィールド `.researchmap_linkage` 追加 | 30002, 40039 | コード内に参照なし |
| 2 | `version_type15` に `subitem_peer_reviewed`（査読の有無）追加 | 30002, 40039 | FIELD_DEFS/TSV_HEADERS_TEMPLATE に未定義 |
| 3 | `funding_reference21` に `subitem_funder_identifier_type_uri`（助成機関識別子タイプURI）追加 | 30002, 40039 | funder_identifiers に未定義（funding_stream_identifiers には既存） |

### B. ツール修正が不要な変更

| 変更内容 | 理由 |
|----------|------|
| カタログ（item_1698624004）の構造変更（descriptions配列化、file_uriネスト化、rights名称変更） | TSV_EXCL_TIMESTAMP で除外対象 |
| 出版者情報（item_1698624005）に言語サブフィールド追加 | 現時点では TSV_EXCL_TIMESTAMP で除外対象。#32 で有効化予定のため、その際にv2構造変更を反映する |
| 40039: ページ数/開始・終了ページと書誌情報の列順序入れ替え | WEKO3インポートは列順序非依存 |
| 40039: JIRCAS独自フィールド（受付番号、中長期計画、研究プログラム等）の追加 | TSV_EXCL_TIMESTAMP で除外対象 |
| 日本語ラベルの変更（「識別子タイプ」→「助成機関識別子タイプ」等） | ラベルはTSV出力に影響しない |

---

## 提案する Issue 構成

### Issue A: `.researchmap_linkage` システムフィールド追加（小規模）

**修正箇所:**
- `TSV_HEADERS_TEMPLATE`（~L5190）: 5つの行配列すべてに `.researchmap_linkage` を追加
  - 位置: `.feedback_mail[0]` と `.cnri` の間
  - row1(key): `.researchmap_linkage`
  - row2(label): `.RESEAECHMAP_LINKAGE`（WEKO3のtypoに合わせる）
  - row3(system): 空
  - row4(constraint): 空
- `TSV_SYS_KEY_MAP`（~L5330）: `.researchmap_linkage` → `researchmap_linkage` 追加
- `buildEmptyMetadata()`（~L4660）: system に `researchmap_linkage: ''` 追加
- システムフィールドDOM（~L1221）: `sys_researchmap` データキー追加（input要素）
- `collectSystemFromDOM()`: 自動で収集される（汎用ループ）

### Issue B: `subitem_peer_reviewed`（査読の有無）追加（中規模）

**修正箇所:**
- `TSV_HEADERS_TEMPLATE`（~L5190）: version_type15 セクションに列追加
  - 位置: `.subitem_version_resource` の前
  - row1(key): `.metadata.item_30002_version_type15.subitem_peer_reviewed`
  - row2(label): `出版タイプ.査読の有無`
  - row3(system): 空
  - row4(constraint): 空
- `FIELD_DEFS`（~L3004）: version_type15 の fields に追加
  - `{ k: 'subitem_peer_reviewed', l: '査読の有無', t: 'select', o: 'peer_reviewed' }`
- `TITLE_MAPS`（~L979）: `peer_reviewed` 選択肢を追加
  - 要確認: WEKO3が受け付ける値（要実機確認 or スキーマ定義参照）
- `buildEmptyMetadata()`（~L4691）: version_type15 に `subitem_peer_reviewed: ''` 追加
- `collectFromDOM()`: 汎用 `collectObjectField()` で自動収集
- `mapToItemType()` / `mapToItemTypeJaLC()`（~L1756, ~L2081）: API取得時にpeer_reviewed情報があれば設定
  - 注: Crossref/JaLC APIからこの情報が取得可能か要調査

### Issue C: `subitem_funder_identifier_type_uri`（助成機関識別子タイプURI）追加（中規模）

**修正箇所:**
- `TSV_HEADERS_TEMPLATE`（~L5190）: funding_reference21 セクションに列追加
  - 位置: `.subitem_funder_identifier_type` の後
  - row1(key): `.metadata.item_30002_funding_reference21[0].subitem_funder_identifiers.subitem_funder_identifier_type_uri`
  - row2(label): `助成情報[0].助成機関識別子.助成機関識別子タイプURI`
  - row3(system): 空
  - row4(constraint): `Allow Multiple`
- `FIELD_DEFS`（~L3004付近）: funding type の funder_identifiers セクションに追加
  - `{ k: 'subitem_funder_identifier_type_uri', l: '助成機関識別子タイプURI', t: 'text', ro: true }`
- `emptyFunder` テンプレート（~L4165）: `subitem_funder_identifier_type_uri: ''` 追加
- `buildFunders()`（~L2089）: `subitem_funder_identifier_type_uri` を設定
  - Crossref Funder の場合: 空（標準URIなし）
- `buildJaLCFunders()`（~L2217）: 同上
- `collectFundingField()`（~L4927）: DOM から収集
- `renderOneFunder()`（~L3880）: UI表示追加（funder_identifier_type の後）
- `buildEmptyMetadata()`（~L4700付近）: emptyFunder に追加

### Issue D: サンプルTSVファイル更新（小規模）

- v2テンプレートを正式な基準ファイルとして採用
- v1テンプレートは `samples/` に残すか削除するか（要判断）
- `import.tsv` の更新が必要か確認

---

## 検証方法

1. 各Issue実装後、テスト用DOI `10.1016/j.advnut.2025.100480` で TSV 生成
2. 生成されたTSVのヘッダ行をv2テンプレートと比較
   - システムフィールド列の一致
   - version_type15 列の一致
   - funding_reference21 列の一致
3. v2エクスポートデータ（export_v2）との互換性確認
4. E2Eテスト実行

## 未確認事項

- [x] `subitem_peer_reviewed` の選択肢値 → **確認済み**
  - WEKO3ソース: [version_type.py](https://github.com/RCOSDP/weko/blob/bb5562045e9a6b30f0d523d70ee6971c5de49ce5/scripts/demo/properties/version_type.py)
  - 選択肢: `"Peer reviewed"`（査読あり）/ `"Not peer reviewed"`（査読なし）/ 空（未設定）
  - OA Assist が SWORD API 経由で設定する値。WEKO3 UI には入力欄なし
  - JPCOAR スキーマガイドラインにも定義なし（WEKO3 独自拡張）
  - TITLE_MAPS に `peer_reviewed: [['', ''], ['Peer reviewed', 'Peer reviewed'], ['Not peer reviewed', 'Not peer reviewed']]` を追加
- [x] `subitem_funder_identifier_type_uri` に設定すべきURI値 → **確認済み**
  - JPCOAR 2.0 スキーマガイドライン: https://schema.irdb.nii.ac.jp/ja/schema/2.0/23-.1
  - 記入レベル: MA（該当する場合は必須）— `funderIdentifierType` を設定する場合は必須
  - funderIdentifierType ごとの URI マッピング:
    | funderIdentifierType | funderIdentifierTypeURI |
    |---|---|
    | `Crossref Funder` | `https://www.crossref.org/services/funder-registry/` |
    | `e-Rad_funder` | `https://www.e-rad.go.jp/datasets/files/haibunkikan.csv` |
    | `ISNI` | `https://isni.org/` |
    | `ROR` | `https://ror.org/` |
    | `GRID` | （非推奨、RORへ統合） |
    | `Other` | （任意） |
  - `buildFunders()` / `buildJaLCFunders()` で `subitem_funder_identifier_type` 設定時に自動設定
  - e-Rad配分機関一覧を `samples/haibunkikan.csv` に保存済み（参考資料）
- [x] v1テンプレートの取り扱い → **確認済み**
  - `samples/v1/` に移動して保持（旧版であることを明示）
  - v2テンプレートを `samples/` 直下に配置（`_v2` サフィックス除去済み）
  - v1エクスポートも `samples/v1/export/` に移動済み
