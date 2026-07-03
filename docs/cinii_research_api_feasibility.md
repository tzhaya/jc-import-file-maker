# CiNii Research API / JaLC API 活用の検討（#156 登録状況チェック比較・JaLC DOI 論文の捕捉）

## 背景・目的

`jc-import-file-maker` は OpenAlex を起点に自機関研究者の論文を捕捉し、JAIRO Cloud（WEKO3）への
インポートデータを生成する構想（[OpenAlex ハーベスト実現可能性](openalex_harvest_feasibility.md)）を
段階的に実装している。その中で2つの問いが出た。

- **問い A**：#156 で実装した「自機関リポジトリでの登録状況チェック」と同等の照合を、
  **CiNii Research API** でも行えるか。行える場合、#156 と比べて有意な点はあるか。
- **問い B**：OpenAlex に収録されない **JaLC DOI 論文**（和文誌・紀要等）を捕捉するには、
  **JaLC API の所属機関検索**と **CiNii Research API** のどちらが適切か。

本ドキュメントは両者の調査結果と推奨を整理する。実装是非・スコープは未確定（検討資料）。

> 調査日: 2026-06-29
>
> 注: 公式 API ドキュメント（`support.nii.ac.jp`・`api.japanlinkcenter.org/api-docs`）は
> 調査環境の egress ポリシーにより取得できなかった。検索パラメータの細部
> （CiNii Research の機関単位絞り込みの有無・JaLC `/search` の全項目・provenance フィールド名）は
> 実装時に実レスポンスで要確認。CORS 可否・JaLC レスポンス構造は本リポジトリ内の実装・サンプルで実証。

---

## 結論（TL;DR）

- **問い A**：技術的に可能。最大の有意点は **CiNii Research が CORS 対応で、#156 が拡張版限定だった
  照合を標準ブラウザ版にも広げられる**点。ただし CiNii は IRDB ハーベストのため**鮮度に遅延**があり、
  #156 の核心的利点「リポジトリ現在状態への問い合わせで**状態の同期ずれが起きない**」が失われる。
  → **置換ではなく補完**（標準版向け／全国横断の重複アウェアネス）が妥当。
- **問い B**：**CiNii Research 一択**。JaLC は所属機関（affiliation）の検索機能を備えているが、
  実データの affiliation 登録が任意（登録者依存）のため、検索効率では
  **researcher（NRID／KAKEN 研究者ID／researchmap）経由が主軸**。JaLC は捕捉エンジンではなく
  **per-DOI のメタデータ源**として既存どおり残す。

---

## 既存資産（重要）

本ツールは **すでに CiNii Research OpenSearch と JaLC API を呼んでいる**。新規ホストではない。

| 用途 | 関数 / 箇所 | エンドポイント | 実行環境 |
|------|------------|----------------|----------|
| ISSN→NCID | `chrome-extension/make_jc_importer.js:1174` `fetchNcidFromCiNii` | `cir.nii.ac.jp/opensearch/v2/books` | 標準版・拡張版 |
| KAKEN 課題名 | `make_jc_importer.js:1079-1088` `fetchKakenCiNii` | `cir.nii.ac.jp/opensearch/v2/projects` | 標準版・拡張版 |
| JaLC メタデータ | `make_jc_importer.js:907` `fetchJaLC` | `api.japanlinkcenter.org/v2/dois/{doi}` | 拡張版のみ（CORS プロキシ経由） |
| #156 自館照合 | `chrome-extension/openalex_panel.js:203-308` | 自機関 WEKO3 `api/opensearch/search` | 拡張版のみ |

CiNii Research が標準版でも動く（`background.js:19-38` の CORS プロキシ whitelist に `cir.nii.ac.jp` が
**含まれない**＝直接 fetch 成功）ことが、本検討の鍵となる事実である。

---

## §A 自館登録状況チェックを CiNii Research で行えるか（#156 比較）

#156 は **WEKO3 OpenSearch にタイトル検索 → 返戻 JPCOAR XML 内の識別子で DOI 照合**し、
🔴登録済みの可能性大／🟡要確認／🟢未登録の可能性 の3値バッジを表示する
（`openalex_panel.js` の `normalizeTitleForSearch` / `matchAgainstRepo` / `parseRepoSearch` /
`classifyMatch` / `applyDuplicateBadges`）。CORS 制約により照合は **Chrome 拡張版限定**。

### #156 と CiNii Research の本質的な違い

| | #156（WEKO3 OpenSearch） | CiNii Research |
|---|---|---|
| 答える問い | 「**自機関リポジトリ**に今この瞬間登録済みか」 | 「CiNii の全国集約（全IR＋CiNii Articles＋KAKEN…）に**前回ハーベスト時点で**載っているか」 |
| データ鮮度 | **ライブ**（リポジトリ現在状態） | **ハーベスト遅延あり**（IRDB 収集は数日〜数週間遅れ） |
| 自機関に限定 | URL を自機関に向けるだけ | provenance（収録元）で**後段フィルタが必要** |
| CORS / 実行環境 | 制約あり → **拡張版限定** | **対応 → 標準版でも動く** |
| DOI 照合 | JPCOAR XML を3箇所走査 | JSON-LD の DOI フィールドで**クリーンに取得** |
| 和文 / JaLC 圏 | 自館収録分のみ | CiNii Articles 等も含み**広い** |

### 有意な点（CiNii を使う利点）

1. **CORS 対応 → 標準ブラウザ版でも照合バッジが出せる。** #156 最大の制約（照合は拡張版限定）を
   解消できる。本ツールで CiNii Research の標準版動作は実証済み。
2. **DOI 抽出が堅牢・簡潔。** JSON-LD の DOI フィールドを読むだけで、JPCOAR の
   `identifier`／`relatedIdentifier`／`identifierRegistration` の3箇所走査が不要。
3. **既存インフラ流用。** 同一ホスト（`cir.nii.ac.jp/opensearch/v2`）・既存パターン。
   新規 host_permissions も CORS プロキシ追加も不要。
4. **横断的な重複検知。** 他機関リポジトリ・CiNii Articles 既収録分も拾える
   （共著論文を他機関が先に登録済み、等）。ただしこれは「自館登録済みか」とは別の問い。

### 有意でない点 / 置換にならない理由

1. **ハーベスト遅延 = 状態同期ずれの再導入。** #156 の設計上の核心的利点
   （[openalex_harvest_feasibility.md](openalex_harvest_feasibility.md) §5-4「毎回リポジトリの
   現在状態に問い合わせるため状態の同期ずれが起きない」）が崩れる。昨日登録したアイテムは
   CiNii 未反映 → 誤って🟢未登録 → **重複登録の温床**。登録前重複排除の用途では、
   ライブな WEKO3 照合（#156）が権威。
2. **自館限定には provenance フィルタ必須**で、その「どの収録元＝自館か」のマッピング維持が必要。
   自機関 URL を向けるだけの #156 より壊れやすい。
3. **曖昧タイトル問題は残る**（DOI 直接検索の可否が未確認なら、タイトル正規化＋切り詰めは依然必要）。
4. **公開済みのみ＋遅延**の二重の可視性制約。

### 推奨（実装する場合）

**置換せず2層構成にする。**
- 拡張版：#156 のライブ自館照合を権威として維持。
- 追加：CiNii Research 照合を **(a) 標準版でも動く第2バッジ／フォールバック**、
  **(b) 他機関・全国収録の重複アウェアネス**として足す。
- 自館限定が要るなら、CiNii レスポンスの provenance で自機関 IRDB ソースに絞る（要・実レスポンス確認）。

実装の見取り：`openalex_panel.js` に CiNii 照合関数を追加（`fetchNcidFromCiNii` の fetch/parse
パターン＋ `bareDoi()` 正規化を流用）、標準版でもバッジを出すため `no-match` 分岐を見直し。

---

## §B JaLC DOI 論文（OpenAlex 非収録）の捕捉：JaLC API vs CiNii Research

### 課題

和文誌・紀要等の JaLC DOI 論文は OpenAlex に収録されず、#155（OpenAlex 機関検索）で漏れる
（[openalex_harvest_feasibility.md](openalex_harvest_feasibility.md) §2 リスク1）。自機関研究者の
JaLC DOI 論文を捕捉する手段として、(A) JaLC API の所属機関検索 と (B) CiNii Research API を比較する。

### サンプルが示す決定的事実

`samples/JaLC/10.34556%252F0002000787.json`（`v2/dois` 単件取得）:

- `creator_list` に**著者の所属機関フィールドが無い**。
- 機関を示すのは `publisher_name`／`site_name`／`siteId`（例 `SI/NII.JAIRO`）＝**DOI の登録元**のみ。
- `alternate_identifier` に IRDB OAI-ID（`oai:irdb.nii.ac.jp:07496:...`）。

→ JaLC で機関を識別できるのは「**誰が DOI を登録したか**」だけ。機関リポジトリ登録物なら
publisher＝機関だが、**J-STAGE 和文誌は publisher＝学会**であり著者の所属ではない。捕捉したいのは
正に後者（学会誌に載った自館研究者の論文）であり、ここで機関識別が効かない。

### API 能力

- **JaLC REST API**：2026-03-25 に `/search` エンドポイントが追加され、**著者名・タイトル・PID**に加え
  **所属機関（affiliation）での検索も可能**（フィールド検索 `query.affiliation` ・
  ID フィルタ `filter=affiliation-identifier`）。ただし実データの affiliation 登録は任意のため、
  実際の検索効率は affiliation 登録率に左右される。本ツールは既に `v2/dois/{doi}` 単件取得を利用
  （`make_jc_importer.js:907`、CORS 制約で拡張版のみ）。
- **CiNii Research OpenSearch**：`authorid`（NRID）パラメータ対応・`q` で Author ID 検索可。
  和文誌・紀要・IR（IRDB 経由）・CiNii Articles・KAKEN を集約＝**捕捉したい母集団そのもの**を含む。
  CORS 対応・JSON-LD・DOI フィールドあり（本ツールで既利用）。

### 評価

| 観点 | (A) JaLC 所属機関検索 | (B) CiNii Research |
|------|----------------------|--------------------|
| 所属機関での検索 | **可能**（`query.affiliation` / `filter=affiliation-identifier` ）。ただし affiliation 登録は任意 | researcher-ID(NRID) 経由で実質可。自由文 affiliation は弱い |
| 対象コーパス | JaLC 登録分（登録元単位） | 和文誌・紀要・IR・CiNii Articles・KAKEN を**横断集約** |
| 機関の手掛かり | publisher/site＝登録元（学会誌では著者所属と無関係） | 著者→研究者→機関のリンク（KAKEN/researchmap 連携） |
| CORS / 実行環境 | 拡張版のみ（プロキシ経由） | **標準版でも可**（既実証） |
| 既存資産 | per-DOI メタデータ源として既利用 | OpenSearch 呼び出し既存 |

### 結論・推奨

1. **「所属機関で検索」する捕捉エンジンとしては CiNii Research が主軸。** JaLC も所属機関検索機能を備えるが、
   実データの affiliation 登録率が低く（登録は任意）検索効率が限定的。堅牢な捕捉には researcher 経由が推奨。
2. **ただし CiNii も自由文の affiliation 検索は不確実。** 和文メタデータは所属が疎なため、堅牢なのは
   **researcher 経由**：自機関の研究者リスト（NRID／KAKEN 研究者ID／researchmap）を起点に
   CiNii Research（`authorid`）や KAKEN で各研究者の業績 DOI を引く。
   [openalex_harvest_feasibility.md](openalex_harvest_feasibility.md) の R3（著者ベース補完検索）・
   §2 リスク2 と整合する。
3. **JaLC は捕捉エンジンではなく per-DOI メタデータ源として残す**（既存 `fetchJaLC` のまま）。
   CiNii で得た候補 DOI → 既存 #155 DOI リスト一括取り込み＋#156 重複照合に流す。
4. 補足の代替：J-STAGE WebAPI・researchmap・IRDB 直接ハーベストも同目的に使えるが、
   今回比較の2択では CiNii が優位。

---

## 制約・未確認事項（実装前に実機で要確認）

- CiNii Research OpenSearch に機関単位の絞り込み手段があるか（`affiliation` 系パラメータ／
  researcher facet）。無ければ researcher リスト前提の設計にする。
- CiNii Research レスポンスの provenance（収録元）フィールド名と、自機関 IRDB ソースの識別方法。
- CiNii Research / JaLC OpenSearch で DOI を直接検索条件にできるか（不可ならタイトル・researcher 経由）。
- 自機関研究者 NRID リストの入手・維持（KAKEN by 機関／researchmap）。
- 公式 API ドキュメントは調査環境で未取得のため、上記は本リポジトリ内の実装・サンプル・
  公開アナウンスからの推定を含む。

---

## 参考リンク

- [OpenSearch in CiNii Research | NII Support](https://support.nii.ac.jp/en/cir/r_opensearch)
- [CiNii - Metadata and API | NII Support](https://support.nii.ac.jp/en/cinii/api/api_outline)
- [JaLC REST API ドキュメント](https://api.japanlinkcenter.org/api-docs/index.html)
- [REST API で JaLC データ取得機能をリリース（JST）](https://jipsti.jst.go.jp/information/2022/01/1188.html)

### 本リポジトリ内の関連ドキュメント

- [OpenAlex ハーベスト実現可能性](openalex_harvest_feasibility.md)（§5-4 が #156 の設計根拠）
- [API フロー整理](../api-flow.md)
