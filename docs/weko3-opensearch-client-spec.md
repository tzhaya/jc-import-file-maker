# WEKO3 OpenSearch クライアント仕様

最終更新: 2026-07-14（Issue #237）

## 1. 概要

Chrome拡張の「リポジトリコンテンツ検索」は、JAIRO Cloud / WEKO3のOpenSearch APIへ検索条件を送り、JPCOAR XMLの結果を表示する。検索項目、ID検索、作成日時ソートを提供し、ページング中は最初に実行した検索のリポジトリURL・条件・並べ替えを保持する。

実装ファイル:

- `chrome-extension/opensearch_panel.html`
- `chrome-extension/opensearch_panel.js`

## 2. 対応リポジトリと通信

- HTTPSの `*.repo.nii.ac.jp` と、クライアントに登録された追加許可ホストだけを受け付ける。
- 入力URLのパスは使用せず、`new URL(value).origin` を検索中のstateへ保存する。
- Chrome拡張のhost permissionsを使用してサイドパネルから直接fetchする。Service Workerプロキシは使用しない。
- `format=jpcoar` で応答形式を指定し、独自の `Accept` ヘッダーは付けない。WEKO3環境によってはAccept条件を指定するとHTTP 406になるためである。
- API URLは `<origin>/api/opensearch/search` とする。
- 固定パラメータは `format=jpcoar`、`size=20`、`page=<ページ番号>` とする。

## 3. 検索項目

### 3.1 標準検索

| パラメータ | 表示名 | UI |
|---|---|---|
| `keyword` | キーワード | テキスト |
| `title` | タイトル | テキスト |
| `exact_title_match` | タイトル完全一致 | チェックボックス |
| `creator` | 作成者・著者 | テキスト |
| `des` | 内容記述 | テキスト |
| `type` | 資源タイプ | 選択 |
| `id` + `id_attr` | ID検索 | ID値＋ID種別 |

`exact_title_match=true` は、タイトルが入力され、完全一致が選択された場合だけ送信する。

資源タイプは `docs/resource_type_vocabulary.md` の全78件を使用する。APIへ英語名を送り、UIには「日本語名（英語名）」を表示する。JPCOAR 2.0追加語彙と1.0のみの語彙には区分を表示する。旧選択肢 `conference object` は使用せず、`conference output` を使用する。

ID種別は次の11種から選択する。

`DOI` / `selfDOI` / `ISBN` / `ISSN` / `NCID` / `PMID` / `NAID` / `ICHUSHI` / `URI` / `fullTextURL` / `identifier`

ID値とID種別は必ず対で指定する。片方だけの場合は通信せず、不足している入力欄へフォーカスする。

### 3.2 詳細検索

詳細検索は初期状態で折りたたむ。

| パラメータ | 表示名 | UI |
|---|---|---|
| `subject` | 主題 | テキスト |
| `publisher` | 出版者 | テキスト |
| `lang` | 言語 | テキスト |
| `srctitle` | 収録物名 | テキスト |
| `wid` | 作成者名識別子 | テキスト |

作成者名などの入力値は前後の空白だけを除き、カンマ、姓名順、大文字小文字を変更しない。`wid` はORCID等の識別子またはWEKO著者IDを想定するが、有効な体系は機関により異なる。

### 3.3 対象外

次の検索項目は今回実装しない。

- `version`
- `mimetype`、`itemtype`、`cname`、`spatial`、`temporal`
- `dissno`、`degreename`、`dgname`、`license`、`iid`
- 日付範囲検索

`version` はJIRCAS・筑波大学・国立国語研究所・お茶の水女子大学で `VoR` / `AM` / `P` 等を実測したが、すべてHTTP 200・0件であった。動作を確認できる環境が見つかった場合に別Issueで再検討する。

## 4. 作成日時ソート

`_created` は検索条件ではなく、ソートキー `createdate` として扱う。

| UI | パラメータ |
|---|---|
| 既定順 | 送信しない |
| 作成日時が古い順 | `sort=createdate` |
| 作成日時が新しい順 | `sort=-createdate` |

両方向ともJIRCAS・筑波大学で動作を確認済みである。

### 4.1 JPCOARのページ内逆順補正

2026-07-14の実測では、両機関の `format=jpcoar` 出力はJSONのヒット順に対して各ページ内で逆順に列挙された。sortなしでも同様である。このため、JPCOAR XMLのアイテム配列は解析後にページ内で一度だけ反転し、APIが指定した順序へ戻して表示する。ページ間の順序は変更しない。

## 5. 日付検索

現行OpenSearchには、レコード作成日時 `_created` を範囲検索する専用パラメータはない。`createdate` はソート専用である。

APIには `filedate_from/to`、`dategranted_from/to`、`date_range1_from/to`～`date_range5_from/to` があるが、`date_range1`～`date_range5` の意味は機関・アイテムタイプのマッピングに依存する。JPCOARのIssued / Availableとは固定対応しないため、汎用の日付範囲UIは提供しない。

## 6. 検索状態とページング

新規検索とページ移動は分離する。

1. 新規検索時にフォームを読み、正規化・検証する。
2. `repoOrigin`、`query`、`sort` をstateへ保存する。
3. ページ移動ではフォームを読まず、保存済みstateだけを使用する。

検索後にフォーム、リポジトリURL、並べ替えを変更しても、「前へ」「次へ」では最初の検索条件を維持する。変更後の条件を使うには検索ボタンまたはEnterで新規検索を実行する。

## 7. 入力検証と安全性

- 検索条件が空の場合、並べ替えだけを指定しても通信しない。
- 空文字と未許可のパラメータはURLへ追加しない。
- URL生成には `URLSearchParams` を使用する。
- 検索条件は許可パラメータのホワイトリストに限定する。
- 表示には `textContent` / `createElement` を使用し、メタデータを `innerHTML` へ挿入しない。
- 外部リンクには `target="_blank"` と `rel="noopener"` を指定する。

## 8. ID検索の実測結果

ID検索の可否は機関・識別子種別・インデックス設定に依存する。2026-07-14の実測結果は次のとおり。

| ID種別 | JIRCAS | 筑波大学 |
|---|---|---|
| DOI | 対象アイテムを確認できず | 対象アイテムを確認 |
| NCID | 対象アイテムを確認 | 対象アイテムを確認 |
| ISSN | 0件 | 0件 |
| `identifier` | 未検証 | 0件 |

ISSNが0件となる原因は、PISSN / EISSN等の格納方法と `id_attr=ISSN` の不一致が考えられるが、検索インデックスの構成まで確認した確定事項ではない。

ID検索は完全一致・単一件数を保証しない。NCID等では同じ識別子を共有する複数アイテムが返ることがある。受入判定は、件数ではなく「指定した識別子を持つ対象アイテムが結果に含まれること」とする。

実測例:

- JIRCAS: `id=AA12622284&id_attr=NCID`
- 筑波大学: `id=10.2964/jsik_2016_001&id_attr=DOI`
- JIRCAS `wid=0000-0002-5189-1865`（ORCID）
- 筑波大学 `wid=157097`（WEKO著者ID）

## 9. 実装構造

DOM依存処理と純粋関数を分離する。

```text
フォーム読取
  → normalizeQuery(raw)
  → validateQuery(query)
  → state保存
  → buildUrl(repoOrigin, query, page, sort)
```

`buildUrl` は許可された検索パラメータだけを直列化する。`normalizeJpcoarItemOrder` はページ内逆順補正だけを担当する。これらの純粋関数と語彙定数はNodeの単体テストから利用できるようexportする。

## 10. 受入条件

- 標準・詳細検索項目を単独または複合で送信できる。
- タイトル完全一致はタイトル入力時だけ送信される。
- 資源タイプ78件が原典と一致し、`conference output` が検索できる。
- ID片側欠落時は通信せず、対象入力欄へフォーカスする。
- ID検索は実証済みの組み合わせで対象アイテムを結果に含む。
- `createdate` / `-createdate` の表示順が指定と一致する。
- JPCOARの逆順補正はページ内だけで一度行われる。
- ページ2からページ1へ戻る場合を含め、ページング中は初回条件を保持する。
- sortだけ、空条件では通信しない。
- `version`、日付範囲、その他対象外パラメータを送信しない。
- URL特殊文字を正しく保持する。
- APIの `totalResults` は総件数、画面のアイテム数は当該ページ分（最大20件）として扱う。
- 既存の結果表示、詳細表示、ファイルリンク、URL検証、エラー処理が回帰しない。

## 11. テスト

`tests/opensearch.test.js` で以下を検証する。

- 語彙文書と実装78件の名称・区分・順序・重複
- 条件のtrim、空値除外、タイトル完全一致、IDペア検証
- 固定パラメータ、複合条件、ソート、特殊文字
- 未許可・対象外パラメータの除外
- JPCOARページ内逆順補正と入力配列の非破壊性

Chrome実機ではJIRCAS・筑波大学を使用し、検索・ID・wid・資源タイプ・昇降順・ページング・既存表示を確認する。

## 12. 参考資料

- `docs/weko3-opensearch-client-general-spec.md`
- `docs/resource_type_vocabulary.md`
- [Issue #237](https://github.com/tzhaya/jc-import-file-maker/issues/237)
