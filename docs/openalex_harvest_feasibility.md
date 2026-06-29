# OpenAlex を起点とした JAIRO Cloud 登録パイプラインの実現可能性と要件

## 背景・目的

自機関（大学・研究機関）に所属する研究者が発表した論文を捕捉し、機関リポジトリ（JAIRO Cloud）に登録するというミッションがある。

現在、NII 公式ツールとして **OA Assist** が提供されており、Lens.org・J-STAGE 等から取得した論文情報を SWORD プロトコルで JAIRO Cloud にインポートできる。しかし論文の捕捉率が十分に高くないという課題が指摘されている。

そこで本ドキュメントでは、**OpenAlex をソースとして自機関研究者の発表論文を定期的に捕捉し、本リポジトリ（`jc-import-file-maker`）のようなツールを経由して JAIRO Cloud インポート用データを生成する**構想について、実現可能性と必要要件を整理する。

> 調査日: 2026-06-11

---

## 結論（TL;DR）

**技術的な実現可能性は高い。** OpenAlex の Works API は機関（ROR ID）による著者所属フィルタと日付による差分取得をサポートしており、

```
定期的に自機関の新着論文 DOI リストを取得
  → jc-import-file-maker のマッピングロジックで JPCOAR 2.0 準拠 TSV を生成
  → JAIRO Cloud へ一括インポート（または SWORD v3 で送信）
```

というパイプラインは、本リポジトリの既存資産の大部分を再利用して構築できる。

ただし **捕捉率の改善幅は OpenAlex のカバレッジ特性に依存する。**

- OpenAlex は Crossref 中心のため、英文国際誌の捕捉は Lens.org（OA Assist）と同等以上が期待できる。
- 一方で **JaLC DOI のみの J-STAGE 和文誌・紀要類は OpenAlex でも捕捉できない**（Lens.org も同じ弱点）。OA Assist の捕捉率が低い原因が国内文献にある場合、OpenAlex への乗り換えだけでは解決しない。
- 所属情報は生の affiliation 文字列の機械的解析に基づくため、誤マッチ・欠落が一定割合発生する。

**「OpenAlex に置き換えれば捕捉率が上がる」と断定する前に、後述の PoC（捕捉率の実測）を強く推奨する。**

---

## 1. 構成案：5 段階パイプライン

```
① 捕捉（ハーベスト）     OpenAlex Works API
   filter=authorships.institutions.ror:{自機関ROR},from_publication_date:...
   ＋ cursor paging で全件取得、定期実行（cron / GitHub Actions）
        ↓ DOIリスト
② 重複排除（差分判定）   自機関リポジトリとのDOI照合
   （既存のOpenSearch検索ツールのロジックが再利用可能）
        ↓ 未登録DOIリスト
③ スクリーニング         司書によるレビュー（対象外除外・OAポリシー・版の確認）
   （現ツールのOPF連携・OAステータス表示がそのまま使える）
        ↓ 登録対象DOI
④ メタデータ生成         現ツールの mapToItemType() 相当
   （Crossref+OpenAlex+ROR+CiNii+KAKEN のフォールバックチェーンを再利用）
        ↓ TSV (232列・5行ヘッダー) + 本文ファイル
⑤ 投入                   TSV+ZIP一括インポート、または SWORD v3 API
```

### 本リポジトリの既存資産との対応

| 段階 | 状態 | 流用元 |
|------|------|--------|
| ① 捕捉 | 新規開発 | — |
| ② 重複排除 | 流用可 | OpenSearch 検索ツール（Chrome 拡張） |
| ③ スクリーニング | 流用可 | `make_jc_importer` の OA バッジ・OPF 連携 |
| ④ メタデータ生成 | 中核を流用 | `mapToItemType()`（`api-flow.md` に整理済み） |
| ⑤ 投入 | TSV 仕様調査済み | `docs/weko3_tsv_import_spec.md` |

新規に必要なのは実質 **① ② の自動化**と、複数 DOI の「リスト一括投入」インターフェースである。現ツールは既に複数 DOI の連続取得 → 一括 TSV 出力に対応しているため、その入口を API 起点にする拡張が中心となる。

---

## 2. 実現可能性の評価

### OpenAlex 側：できること

- **機関フィルタ**: `authorships.institutions.ror:` または `authorships.institutions.lineage:` で自機関所属著者の論文を抽出可能。lineage を使えば附属病院・附置研などの下部組織も包含できる。
- **差分取得**: `from_publication_date` による定期取得が基本。2026 年 2 月の API 刷新で新着コンテンツ取得用エンドポイントも追加された。
- **API 利用条件**: 2026 年 2 月 13 日以降、**全リクエストに API キーが必須**になった。無料キーで 1 日 $1 相当のクレジット（単発取得 1 クレジット、リスト検索 10 クレジット/回、DOI 単体取得は無料）が付与され、月次〜週次の機関規模バッチなら無料枠で収まる可能性が高い。現ツールは既に OpenAlex API キー対応済みのため、この点の障壁はない。
- **カバレッジ（英文誌）**: OpenAlex は WoS・Scopus を上回る文献数をカバーし、非英語文献のカバーも商用 DB より良好という評価がある。Lens.org と同系統のソース（Crossref・PubMed・旧 MAG）に加え DataCite・機関リポジトリ等も取り込んでいるため、**Lens 単独より捕捉が広い可能性は十分ある。**

### リスク・制約

1. **JaLC DOI の空白地帯**
   OpenAlex のソースは Crossref・DataCite・PubMed・HAL 等で、**JaLC は含まれない。** J-STAGE 和文誌・紀要・国内学会誌の多くはここで漏れる。これは Lens.org も同じ弱点であるため、OA Assist の捕捉率が低い原因が国内文献にあるなら、OpenAlex への乗り換えだけでは解決しない。CiNii Research・J-STAGE WebAPI・researchmap の併用が必要となる（現ツールは JaLC DOI 個別処理には対応済み）。

2. **所属同定の精度**
   OpenAlex の機関付与は生の affiliation 文字列の機械学習解析であり、誤り・欠落がある。機関名の英語表記ゆれ（旧称・ローマ字ゆれ）で取りこぼす論文が出るため、**機関フィルタ＋自機関研究者の ORCID / OpenAlex Author ID リストによる著者ベース検索の二本立て**が捕捉率向上の鍵になる。

3. **OpenAlex 単独ではメタデータが不足**
   現ツールの設計どおり、著者の姓・名分割は Crossref、所属は OpenAlex、という役割分担が必要（OpenAlex は表示名のみ・抄録は inverted index 形式）。① で得た DOI を既存の「Crossref+OpenAlex 並列取得」フローに流す現設計は正しく、流用すべきである。

4. **本文ファイルの問題**
   TSV インポートは本文 PDF を `data/` に同梱する方式。`best_oa_location` からの PDF 自動収集は出版社の利用規約・ライセンス確認が必須で、Green OA（著者最終稿）は結局著者への依頼ワークフローが要る。**メタデータ登録の自動化と本文収集の自動化は分けて設計する。**

---

## 3. 必要な要件

### 機能要件

| # | 要件 | 備考 |
|---|------|------|
| R1 | 自機関の ROR ID（lineage 含む）と OpenAlex Institution ID の確定 | 統合・改称履歴の確認 |
| R2 | 定期ハーベスタ（OpenAlex Works API、cursor paging、API キー管理、レート制御） | サーバーサイドまたは GitHub Actions で実装 |
| R3 | 著者ベース補完検索（自機関研究者の ORCID リスト管理） | 教員 DB・researchmap との連携。個人情報管理に注意 |
| R4 | 既登録判定（リポジトリの OpenSearch / OAI-PMH との DOI 突合、処理済み・除外済み DOI の状態管理） | 状態を永続化するストアが必要（**現ツールにない最大の要素**） |
| R5 | レビュー UI（候補一覧 → 承認/除外 → 既存ツールへ DOI リスト投入） | 現ツールの OA バッジ・OPF 連携を活用 |
| R6 | メタデータ変換（既存 `mapToItemType()` の再利用、Crossref DOI がないレコードのフォールバック） | JaLC 経路は実装済み、OpenAlex オンリーは要設計 |
| R7 | 投入方式の選択：TSV+ZIP（現行・人手アップロード）／ SWORD v3（完全自動化向き） | WEKO3 v2.0.0 で SWORD v3+OAuth2・ワークフロー連携に対応済み。OA Assist と同じ経路を自前ツールでも利用できる |

### 非機能要件・アーキテクチャ上の論点

- **実行環境の転換**: 現ツールはブラウザ / Chrome 拡張だが、定期実行にはサーバーサイド化（Node.js 等）が必要。`shared.js` の API 呼び出し・マッピングロジックを UI から分離してライブラリ化するのが先決。副産物として、Chrome 拡張でしか使えなかった CORS 制約 API（KAKEN XML・JaLC・OPF）がすべて使えるようになる。
- **TSV インポートの未検証問題**: README 記載のとおり現在の TSV 出力は「インポート未検証」。自動化の前に、テスト環境での実インポート検証が前提条件になる。
- **OA Assist との関係は「置換」でなく「補完」**: OA Assist は SWORD 連携・確認ワークフロー・運用サポートが整備済みの公式ツール。OA Assist を主経路としつつ、OpenAlex 由来の候補から **OA Assist / リポジトリ未収録分だけを差分供給**する設計が、運用負荷とリスクの面で現実的。

---

## 4. 推奨する次のステップ：捕捉率の PoC

本開発の前に、効果を定量化する小さな実験を勧める。

1. 自機関の ROR ID で `api.openalex.org/works?filter=authorships.institutions.ror:{ID},from_publication_date:2025-01-01` を全件取得（DOI リストのみ）
2. 自機関リポジトリの既登録 DOI（OAI-PMH またはエクスポート）および OA Assist 捕捉分と突合
3. 「OpenAlex だけが捕捉した論文」の件数・内訳（出版社・言語・DOI RA 別）を集計

これで「OpenAlex 追加でどれだけ捕捉率が上がるか」「漏れの主因が JaLC 圏か affiliation 解析か」が判明し、R3（著者ベース補完）や CiNii 併用の要否を、根拠を持って判断できる。この PoC はスクリプト 1 本（既存リポジトリの OpenSearch ロジック＋ OpenAlex フィルタ）で実施可能。

---

## 5. 前段階の実装設計（手動運用版）

> **実装ステータス**: 本節（前段階・手動運用版）は **Phase 3（#157）** として起票済み。子Issue は #154（機能B：DOIリスト一括取得 §5-3）／#155（機能A：OpenAlex機関検索パネル §5-2）／#156（重複照合バッジ §5-4）。§1 フルパイプラインの完全版（R2 定期ハーベスタ・R4 永続ストア・R7 SWORD v3 等）と §4 PoC の独立起票は行わず、将来Phase およびこの手動運用版ツールでの検証に委ねる。

§1 のフルパイプラインに進む前に、**永続的な状態管理（R4 のデータベース）を持たない手動運用版**を実装する。これは PoC（§4）と実用ツールを兼ね、「OpenAlex で何が捕捉できるか」を実際の業務フローで検証できる。

### 5-1. 全体の流れ

```
① OpenAlex を自機関対象に検索（過去 n 日の更新分）
        ↓
② 候補一覧を表示（重複照合バッジ付き）
        ↓
③ ユーザが登録対象を選択 → DOI リストを出力
        ↓
④ jc-import-file-maker に DOI リストを一括インポート
        ↓
⑤ 既存の編集 UI で確認・編集
        ↓
⑥ 一括 TSV 出力（既存機能）
```

この設計の利点は、**重い要素（重複排除の永続ストア・定期実行）を後回しにして、既存資産の大部分をそのまま使える**点にある。④〜⑥は既存のバッチ蓄積基盤（`allMetadata` 配列・バッチ管理パネル・アイテム間ナビゲーション・一括 TSV 出力）がほぼそのまま流用できる。

### 5-2. 機能 A：OpenAlex 機関検索（新パネル）

| 項目 | 内容 |
|------|------|
| 入力 | ROR ID（設定ページに保存可）、過去 n 日（任意指定）、（任意）資源タイプフィルタ |
| クエリ例 | `api.openalex.org/works?filter=authorships.institutions.ror:{ROR},from_publication_date:{今日−n日},has_doi:true&select=doi,title,publication_date,primary_location,open_access,authorships&per-page=100&cursor=*` |
| 表示 | タイトル・掲載誌・出版日・OA ステータスバッジ・DOI の一覧＋チェックボックス＋重複照合バッジ（§5-4） |
| 出力 | 選択した DOI を改行区切りリストとしてコピー／インポートタブへ直接受け渡し（拡張版） |

- OpenAlex API は **CORS 対応**のため、通常ブラウザ版・Chrome 拡張版の両方で機関検索が動作する（OpenSearch タブのように Service Worker 経由にする必要がない）。
- 新パネルの UI 構造は既存の `opensearch_panel.js`（OpenSearch 検索タブ）がひな型になる。

### 5-3. 機能 B：DOI リスト一括取得（make_jc_importer 側）

- DOI リスト貼り付け用テキストエリアを追加し、既存の `fetchData()` 相当を 1 件ずつ順次実行（待機を挟んでレート制御）→ 既存のバッチパネルに蓄積。
- 失敗した DOI はスキップして最後にまとめて報告（JaLC DOI は拡張版のみ等、既存の制約をそのまま継承）。
- 以降の編集・一括 TSV 出力は既存機能のまま。

### 5-4. 重複排除（R4 の簡易版）：タイトル検索 → DOI 照合

WEKO3 の OpenSearch は検索パラメータに DOI 直接指定を持たないため、**タイトルで検索 → 返戻された JPCOAR XML 内の識別子で DOI 照合**する方式を採る。この方式は**永続的な状態管理を持たずに R4 を実現**でき（毎回リポジトリの現在の状態に問い合わせるため状態の同期ずれが起きない）、前段階の設計として筋が良い。

判定は **2 値ではなく 3 値**とする。「タイトルはヒットしたが DOI が一致しない」ケースには「別の論文（類似タイトル）」と「同一論文だがリポジトリ側にDOI未登録（過去の手入力レコードに多い）」が混在し、2 値だと後者が「未登録」に分類されて重複登録の温床になるため。

| 判定 | 条件 | 既定の扱い |
|------|------|-----------|
| 🔴 重複可能性大 | タイトルヒット＋DOI 一致 | チェック OFF |
| 🟡 要確認 | タイトルヒット＋DOI 不一致 | チェック OFF＋ヒットしたリポジトリレコードへのリンク表示（目視比較用） |
| 🟢 未登録の可能性 | タイトルヒットなし | チェック ON |

最終判断はユーザが行う（検索・照合とも経験則的な処理であるため）。

#### 実装上の注意点

1. **タイトル検索の正規化**: 論文タイトルにはギリシャ文字・上下付き文字・HTML タグ片が含まれ、完全一致検索は取りこぼす。タグ除去＋先頭 N 語（または N 文字）への切り詰めで検索し、再現率を優先する（誤ヒットは DOI 照合と目視で落とす）。
2. **DOI 正規化**: 照合前に両側とも小文字化＋ `https://doi.org/` プレフィックス除去。リポジトリ側は JPCOAR 内の複数箇所（`jpcoar:identifier`・関連情報 `relatedIdentifier`・`identifierRegistration`）を全部走査して比較する。
3. **OpenSearch は公開済みアイテムしか返さない**: ワークフロー処理中・非公開のアイテムは見えないため、「未登録の可能性」は登録作業中のアイテムと衝突しうる。前段階では許容範囲だが制約として明記する。
4. **配置と負荷**: 機能 A の結果一覧に 1 行ずつ照合バッジとして組み込む。候補 1 件につき OpenSearch クエリ 1 回（自機関リポジトリ宛で負荷は軽微、念のため間隔を空けて順次実行）。OpenSearch は CORS 制約のため照合機能は **Chrome 拡張版限定**となる（通常ブラウザ版では照合なしの一覧のみ）。

### 5-5. 設計上の注意点：「過去 n 日の更新分」の日付の意味

`from_publication_date` は**出版日**ベースのため、「最近 OpenAlex に収録されたが出版日は数ヶ月前」の論文を取りこぼす。収録日ベースの `from_created_date` は従来 Premium 限定フィルタであった（2026 年 2 月の料金改定後の扱いは要確認）。前段階としては「**出版日ベース＋ n を大きめ（例：90 日）に取り、既登録分は §5-4 の照合＋目視で除外**」が無難で、ここが将来の重複排除機能（R4 完全版）の動機付けにもなる。

コスト面は問題ない。リスト検索は 10 クレジット/ページ、1 機関の n 日分は数ページなので、無料枠（$1/日）で十分収まる。

### 5-6. 実装順序

工数感は **機能 B（小：既存基盤への追加）＜ 機能 A（中：`opensearch_panel` 相当の新パネル 1 枚）**。まず機能 B だけ入れて手動 DOI リストで運用を試し、次に機能 A（＋重複照合）を足す順序が無理なく進められる。

---

## 参考リンク

### OpenAlex API
- [Filter works | OpenAlex technical documentation](https://docs.openalex.org/api-entities/works/filter-works)
- [Institutions | OpenAlex technical documentation](https://docs.openalex.org/api-entities/institutions)
- [Authentication & Pricing | OpenAlex Developers](https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication)
- [API keys required starting Feb 13（openalex-users）](https://groups.google.com/g/openalex-users/c/rI1GIAySpVQ)
- [New Features and Usage-Based Pricing | OpenAlex blog](https://blog.openalex.org/openalex-api-new-features-and-usage-based-pricing/)
- [Where do works in OpenAlex come from?](https://help.openalex.org/hc/en-us/articles/24347019383191-Where-do-works-in-OpenAlex-come-from)
- [Institutions and Raw Affiliation String Parsing](https://help.openalex.org/hc/en-us/articles/24831328396311-Institutions-and-Raw-Affiliation-String-Parsing)

### カバレッジ評価（学術論文）
- [Reference Coverage Analysis of OpenAlex compared to Web of Science and Scopus（arXiv）](https://arxiv.org/pdf/2401.16359)
- [Evaluating the linguistic coverage of OpenAlex（JASIST）](https://asistdl.onlinelibrary.wiley.com/doi/full/10.1002/asi.24979)

### OA Assist / JAIRO Cloud
- [OA Assist｜RCOS](https://rcos.nii.ac.jp/service/oaps/)
- [OA Assist を利用した場合の操作マニュアル](https://rcosdp.github.io/weko/guide/manual/OAAssist.html)
- [JAIRO Cloud（公開基盤）｜RCOS](https://rcos.nii.ac.jp/service/weko3/)
- [JAIRO Cloud（WEKO3）v2.0.0 リリースノート（SWORD API 変更含む）](https://nii-auth.atlassian.net/wiki/spaces/JAIROCloudWEKO3/pages/97484801/)
- [JAIRO Cloud サポートポータル｜JPCOAR](https://jpcoar.org/support/jairo-cloud/portal/)

### 本リポジトリ内の関連ドキュメント
- [CiNii Research API / JaLC API 活用の検討（#156 比較・JaLC DOI 捕捉）](cinii_research_api_feasibility.md)
- [API フロー整理](../api-flow.md)
- [WEKO3 TSV インポート仕様](weko3_tsv_import_spec.md)
- [TSV エクスポート パイプライン比較](pipeline_comparison.md)
- [要件定義](requirements.md)
