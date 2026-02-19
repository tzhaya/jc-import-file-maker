# Crossref type → JPCOAR 資源タイプ マッピング候補

作成日: 2026-02-19

## 凡例

- **現状一致**: ハイフン→スペース変換で `TITLE_MAPS.resourcetype` に一致するもの
- **要マッピング**: 変換後も一致しないため、別途マッピングが必要なもの

## 現状一致するタイプ（変更不要）

| Crossref type | ラベル | 変換後 | JPCOAR 資源タイプ |
|---|---|---|---|
| `journal-article` | Journal Article | journal article | journal article |
| `book` | Book | book | book |
| `book-part` | Part | book part | book part |
| `report` | Report | report | report |
| `journal` | Journal | journal | journal |
| `dataset` | Dataset | dataset | dataset |
| `other` | Other | other | other |

## 要マッピングのタイプ

| Crossref type | ラベル | JPCOAR 資源タイプ候補 | 備考 |
|---|---|---|---|
| `edited-book` | Edited Book | book | 編集書籍 |
| `monograph` | Monograph | book | 単行書 |
| `reference-book` | Reference Book | book | 参考図書・辞書・百科事典等 |
| `book-set` | Book Set | book | 書籍セット（上下巻等） |
| `book-series` | Book Series | book | 書籍シリーズ |
| `book-chapter` | Book Chapter | book part | 書籍の章 |
| `book-section` | Book Section | book part | 書籍のセクション |
| `book-track` | Book Track | book part | 書籍のトラック（オーディオブック等） |
| `reference-entry` | Reference Entry | book part | 辞書・百科事典の項目 |
| `proceedings-article` | Proceedings Article | conference paper | 会議論文 |
| `proceedings` | Proceedings | conference proceedings | 会議録 |
| `proceedings-series` | Proceedings Series | conference proceedings | 会議録シリーズ |
| `dissertation` | Dissertation | thesis | 学位論文 |
| `posted-content` | Posted Content | article | プレプリント等 |
| `peer-review` | Peer Review | article | 査読レポート |
| `report-series` | Report Series | report | 報告書シリーズ |
| `report-component` | Report Component | report part | 報告書の一部 |
| `journal-volume` | Journal Volume | journal | 雑誌の巻 |
| `journal-issue` | Journal Issue | journal | 雑誌の号 |
| `database` | Database | dataset | データベース |
| `standard` | Standard | other | 規格 |
| `component` | Component | other | 構成要素（図表等） |
| `grant` | Grant | other | 助成金情報 |

## 参考: JPCOAR 資源タイプ一覧（TITLE_MAPS.resourcetype）

<details>
<summary>全資源タイプ一覧（クリックで展開）</summary>

- conference paper
- data paper
- departmental bulletin paper
- editorial
- journal
- journal article
- newspaper
- review article
- other periodical
- software paper
- article
- book
- book part
- cartographic material
- map
- conference output
- conference presentation
- conference proceedings
- conference poster
- aggregated data
- clinical trial data
- compiled data
- encoded data
- experimental data
- genomic data
- geospatial data
- laboratory notebook
- measurement and test data
- observational data
- recorded data
- simulation data
- survey data
- dataset
- image
- still image
- moving image
- video
- lecture
- patent
- internal report
- report
- research report
- technical report
- policy report
- report part
- working paper
- data management plan
- sound
- thesis
- bachelor thesis
- master thesis
- doctoral thesis
- interactive resource
- learning object
- manuscript
- musical notation
- research proposal
- software
- technical documentation
- workflow
- other

</details>
