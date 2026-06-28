# 残存 Issues 一覧と実装優先順位

最終更新: 2026-06-28（#172 棚卸し: Phase 3 #157系・#142〜#165 の完了反映、OPEN節をGitHubの状態に同期、構成記述を現状に更新）

## 概要

Phase 1（データ取得・編集UI）・Phase 2（TSV拡張: #85, #99, #100, #101）・JPCOAR 2.0 対応（#25 系）・OPF連携（#44 系）はいずれも完了済み。
2026 年前半に、電子ジャーナルページからのDOI自動取得（#73 / #159）、管理フィールド初期値の設定（#148）、各種バグ修正（#142 / #143 / #161）、OpenAlex由来ROR誤同定の要確認表示（#165）、作業中データの自動保存・復元（#162）、そして **Phase 3「OpenAlex起点 JAIRO Cloud 登録パイプライン 前段階（手動運用版）」（#157 / #154 / #155 / #156、PR #171）** を実装済み。

残りの OPEN 課題は、(1) 出荷済み Chrome 拡張コードのレビュー対応・リリース運用の自動化、(2) 新規 API 連携・入力経路（SCPJ・リポジトリ JSON 出力・異種アイテムタイプテンプレート）、(3) JPCOAR スキーマ必須度の表示、(4) コード共有の仕組み改善、(5) JaLC/KAKEN 連携の拡張（日本語著者名）。
さらに OpenAlex パイプラインの本格自動化（定期ハーベスタ・永続ストア・SWORD v3 等）は「将来検討」として整理する（`docs/openalex_harvest_feasibility.md` §1〜§3 参照）。

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
| ドキュメント | #87, #116 | **完了** |

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

### グループ F: Chrome拡張化・ウェブストア登録 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #70 | Chrome拡張化（MV3・CORS回避・APIキー管理） | 完了（2026-03-10） |
| #72 | JAIRO Cloud OpenSearch クライアント統合 | 完了（2026-03-11） |
| #112 | Chromeウェブストアへの登録（アイコン・プライバシーポリシー・ストア公開） | 完了（2026-05-19） |

### グループ H: JaLC対応拡張 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #6 | JaLC APIからのデータマッピング | 完了（2026-06-15） |
| #4 | JaLC DOIのインポート対応 | 完了（2026-06-15） |
| #77 | JaLCデータ取り込み修正（keyword_list・出版者並べ替え等） | 完了（2026-03-11） |

### グループ L: 電子ジャーナルページからのDOI自動取得 — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #73 | metaタグ（citation_doi / prism.doi / DOI / dc.identifier）からのDOI自動取得、助成情報検索タブのDOI入力欄 | 完了（2026-06-10） |
| #159 | DOI自動取得のJSON-LD（schema.org `ScholarlyArticle`）対応への拡張 | 完了（2026-06-15） |

### グループ M: バグ修正・管理フィールド — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #142 | IndexID・公開日がTSVに出力されないバグ修正（`__system__` 分類） | 完了（2026-06-06） |
| #143 | 管理フィールドのIndexID/POS_INDEX候補値ヒント誤り（入れ違い）修正 | 完了（2026-06-06） |
| #148 | 管理フィールド初期値（IndexID/POS_INDEX/リポジトリURL）の設定対応 | 完了（2026-06-15） |
| #161 | プログラム情報識別子タイプの誤出力修正（既定値の自動選択防止） | 完了（2026-06-19） |

### グループ N: OpenAlex連携・Phase 3（OpenAlex起点パイプライン前段階） — **全完了**

| Issue | 内容 | 状態 |
|-------|------|------|
| #165 | OpenAlex由来ROR誤同定の検出・「⚠ 要確認」表示・誤同定時のCrossref所属採用 | 完了（2026-06-22） |
| #162 | 作業中データの自動保存・復元（`shared.js` saveDraft/loadDraft/clearDraft、復元バナー） | 完了（2026-06-27） |
| #154 | Phase 3 機能B: DOIリスト一括取得（複数DOIを順次取得→バッチ蓄積） | 完了（2026-06-28、PR #171） |
| #155 | Phase 3 機能A: OpenAlex機関別著作検索パネル（自機関RORでWorks API取得・候補一覧） | 完了（2026-06-28、PR #171） |
| #156 | Phase 3 重複照合バッジ（OpenSearchタイトル検索→DOI照合の3値表示・Chrome拡張限定） | 完了（2026-06-28、PR #171） |
| #157 | Phase 3 親issue: OpenAlex起点 JAIRO Cloud登録パイプライン 前段階（手動運用版） | 完了（2026-06-28、PR #171） |

### その他の完了済み Issue

| Issue | 内容 | 状態 |
|-------|------|------|
| #107 | 助成機関識別子タイプURI（funderIdentifierTypeURI）追加 | 完了（2026-03-20） |
| #108 | WEKO3 v2テンプレート対応（researchmap_linkage / peer_reviewed） | 完了（2026-03-20） |
| #114 | data/tsv_headers.json の更新（226→232列） | 完了（2026-03-21） |
| #115 | Chrome拡張の初期化処理修正 | 完了（2026-03-21） |
| #111 | CONFIGの共通化（`shared.js` / `tsv_headers_template.js` への外部化） | 完了（2026-03-29） |
| #43 | WEKO3 TSVインポート仕様の調査（`docs/weko3_tsv_import_spec.md`） | 完了（2026-03-24） |
| #116 | JPCOARスキーマ2.0対応に伴うドキュメント修正 | 完了（2026-03-23） |

---

## OPEN Issues

### グループ O: Chrome拡張のレビュー対応・リリース運用

#### #145: #73実装コードのレビュー（activeTab権限の付与タイミングほか）

- **内容**: 出荷済みの #73（電子ジャーナルページDOI自動取得）実装に対する、セキュリティ・バグ・保守性の改善
- **主な指摘**: ページ由来DOI文字列の無検証利用（S1）、`activeTab` 権限の付与タイミング、ほか
- **対象**: `chrome-extension/manifest.json` / `panel.html` / `funder_panel.html` / `make_jc_importer.js` / `funder_lookup.js` / `funder_lookup.html`
- **ラベル**: enhancement

#### #169: リリース手順の自動化（タグ作成・push／ウェブストア提出）

- **内容**: `docs/release_procedure.md` の後半（手動）を自動化。`manifest.json` の `version` を単一の真実として、タグ・GitHub Release・ストア提出を連動
- **A**: `master` マージ後のタグ作成・push 自動化（認証エラー対応の解消）
- **B**: ビルド zip の Chromeウェブストアへの自動アップロード・審査提出
- **備考**: GitHub Actions（`release.yml`）はタグ push 時の zip 化→Release 添付まで実装済み

---

### グループ P: 新規 API 連携・入力経路

#### #136: SCPJ API連携

- **内容**: SCPJ（日本の学術雑誌のOAポリシー）API（`https://jpcoar.github.io/scpj-api/data/by_issn/{issn}.json`）を、主に JaLC DOI（国内誌）取得時に OPF 同様に参照し、OAポリシー表示・OA可否の自動判定に利用
- **方針**: 該当ISSN が見つからない場合は「不明」として処理
- **ラベル**: enhancement

#### #123: リポジトリのJSON出力を使用したインポート

- **内容**: JAIRO Cloud (WEKO3) の JSON 出力 API（`https://{host}/records/{id}/export/json`）からのインポート可否を検討
- **ラベル**: enhancement

#### #122: 異なるアイテムタイプ構造のカスタムテンプレート対応

- **内容**: #99 のカスタムテンプレートは同一アイテムタイプのプレフィックス違いのみ対応。サフィックスまで異なるアイテムタイプ（例: つくばリポジトリ「アイテムタイプJ(5)」）でデータ行マッピングが失敗する問題に対応
- **調査**: サブフィールド構造（ドット以降）は 28 カテゴリ中 27 カテゴリで一致。これを手掛かりにマッピングを汎用化

---

### グループ I: JPCOAR 2.0 追加対応

#### #95: JPCOARスキーマ 2.0 必須度の表示・判定機能

- **内容**: DOI登録要件とは独立した、JPCOARスキーマレベルの必須度（R / R.cond / MA / O）をUIに表示
- **検討事項**: 全フィールド必須度一覧整理、DOIバッジとの併存方法、入力漏れ検知の要否
- **関連**: #30, #15
- **ラベル**: enhancement

---

### グループ J: コード品質・設計改善

#### #74: コード共有の仕組み改善

- **内容**: HTML版・Chrome拡張版で重複するロジック（CORS制約API〔JaLC・KAKEN・OPF〕の扱い含む）の共有方法を改善。`shared.js` / `tsv_headers_template.js` 共通化（#111）の延長
- **考慮**: HTML版とChrome拡張版の両方を維持する保守性
- **ラベル**: enhancement

---

### グループ H': JaLC/KAKEN拡張

#### #8: KAKENから日本語の作成者名を取得する

- **内容**: KAKEN XMLから日本語作成者名・e-Rad/NRID識別子を取得し、ORCID一致で著者にマッピング
- **変更対象**: `make_jc_importer.html` / `chrome-extension/make_jc_importer.js` の著者マッピング処理

---

## 推奨実装順序

```
Step 1: グループ O — Chrome拡張のレビュー対応（#145）
         ※ 出荷済みコードのセキュリティ・バグ改善のため優先度高

Step 2: グループ O — リリース運用の自動化（#169）
         ※ 以降のリリース作業の手間を削減

Step 3: グループ P — 新規API連携・入力経路（#136 SCPJ → #123 JSON入力 → #122 異種テンプレート）
         ※ #136 は OPF 連携の延長で着手しやすい

Step 4: グループ H' — JaLC/KAKEN拡張（#8）
         ※ Chrome拡張でのCORS解消済み

Step 5: グループ I — JPCOAR 2.0 必須度（#95）
         ※ 検討段階

Step 6: グループ J — コード共有の仕組み改善（#74）
         ※ 任意のタイミングで実施可能（サーバーサイド化の布石にもなる）
```

### 完了済みグループ（実装順序から除外）
- グループ A / D / B（JPCOAR 2.0 既存・新規フィールド・UI）— 全完了
- グループ E（Phase 2 TSV拡張）— 全完了
- グループ F（Chrome拡張化・ウェブストア登録）— 全完了
- グループ G（OPF連携拡張）— 全完了
- グループ H（JaLC対応拡張）— 全完了
- グループ L / M / N（DOI自動取得・バグ修正・OpenAlex連携 Phase 3）— 全完了

---

## 変更対象ファイル

| ファイル | 変更 issues |
|---------|------------|
| `make_jc_importer.html` | #8, #95, #122, #123, #136 |
| `chrome-extension/make_jc_importer.js` | 上記と同期、#8, #122, #123, #136 |
| `chrome-extension/panel.html` / `funder_panel.html` | #145（UI・権限） |
| `chrome-extension/funder_lookup.js` / `funder_lookup.html` | #136, #145 |
| `chrome-extension/manifest.json` | #145（権限）, #169（version連動） |
| `chrome-extension/openalex_panel.{html,js}` / `opensearch_panel.{html,js}` | 将来Phase（OpenAlex本格自動化） |
| `shared.js` / `tsv_headers_template.js` | #74（共有ロジック改善） |
| `.github/workflows/` | #169（リリース自動化） |
| `docs/` | #169, 将来Phase整理 |

---

## 実装時の参照ポイント

| 機能 | 参照先 |
|------|--------|
| #145 #73コードレビュー | `chrome-extension/make_jc_importer.js` の `getDoiFromCurrentTab()` / `normalizeDoi()`、`activeTab` 権限 |
| #169 リリース自動化 | `docs/release_procedure.md`、`.github/workflows/release.yml`、`chrome-extension/manifest.json` の `version` |
| #136 SCPJ連携 | `https://jpcoar.github.io/scpj-api/data/by_issn/{issn}.json`、OPF連携（`fetchOpfPolicy()` 相当）の実装パターン |
| #123 JSON入力 | `https://{host}/records/{id}/export/json`、`collectFromDOM()` の入力側 |
| #122 異種テンプレート | `docs/weko3_property_key_naming.md`、`parseCustomTemplate()` のサブフィールド照合 |
| #95 JPCOAR必須度 | `DOI_REQUIREMENTS` + `createDoiBadges()` の拡張 |
| #8 KAKEN日本語著者名 | KAKEN XML API、著者マッピング（ORCID一致） |

---

## 将来検討（OpenAlex パイプラインの本格自動化）

Phase 3（#157 系）で実装したのは **手動運用版（候補検索→DOIリスト→既存フローへ投入）** まで。本格的な定期ハーベスト自動化は未着手で、以下を将来検討とする。詳細は [`docs/openalex_harvest_feasibility.md`](openalex_harvest_feasibility.md) §1〜§3 を参照。

| # | 要件 | 概要 | 現状 |
|---|------|------|------|
| R2 | 定期ハーベスタ | OpenAlex Works API を cursor paging で定期取得（cron / GitHub Actions）、APIキー管理・レート制御 | 未着手。サーバーサイド化（`shared.js` のロジックの UI 分離・ライブラリ化）が前提 |
| R3 | 著者ベース補完検索 | 自機関研究者の ORCID / OpenAlex Author ID リストで捕捉率向上 | 未着手。教員DB・researchmap連携、個人情報管理に注意 |
| R4 | 永続ストア（既登録・処理済み判定） | 処理済み・除外済み DOI の状態を永続化（**現ツールにない最大の要素**） | 未着手。#156 の照合バッジは都度判定で永続化なし |
| R7 | SWORD v3 投入 | TSV+ZIP の人手アップロードに代わる完全自動投入（WEKO3 v2.0.0 対応） | 未着手。OA Assist と同経路。TSVインポートの実環境検証が前提条件 |
