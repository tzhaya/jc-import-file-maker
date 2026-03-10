# 作業ログ: make_jc_importer.html 実装記録

最終更新: 2026-03-05（OPF参照リンク: ISSNベースのOpen Policy Finder検索リンクをinfo-barに追加）

## プロジェクト概要
JAIRO Cloud インポート用TSV生成ツール (`make_jc_importer.html`) の新規実装。
DOI を入力して Crossref / OpenAlex / ROR API から書誌メタデータを取得し、JAIRO Cloud の ItemType 構造に変換してアコーディオン付き編集可能テーブルに表示するシングルページ HTML アプリ。

実装計画: `Implementation_phase1.md`
対象ファイル: `make_jc_importer.html`（新規作成）
現在のファイル規模: **約4525行**（STEP 1〜8 + クリーンアップ＋フィールド補完＋参照用列 + APIキー設定 + RA判定 + KAKEN連携 + NCID取得 + DOI必須項目バッジ + Crossref typeマッピング + ISBN/relation取り込み + JGN連携 + 識別子逆引き + JPCOAR 2.0 語彙対応 + JaLC API対応 + プレビュー機能 + 関連情報取得改善）

---

## 2026-03-05: OPF参照リンク — ISSNベースのOpen Policy Finder検索リンク追加（issue #62）

### 背景

Issue #50 で実装予定だった OPF API 連携は CORS 制限により利用できないため、代替として ISSN を元に Open Policy Finder の Web 検索ページへの参照リンクを提供する。

### 実装内容

- `make_jc_importer.html`:
  - info-bar HTML に `#opf-link-row` を追加（DOI リンク + OA バッジの次行）
  - 表示テキスト: 「📖 オープンアクセスポリシーをOpen Policy Finderで確認する」
  - `target="_blank"` + `rel="noopener noreferrer"` で別タブ表示
  - `fetchCrossrefData()` 内で `mapToItemType()` 完了後に metadata から ISSN を取得し、OPF 検索 URL を生成
  - ISSN がない場合はリンク非表示
  - `fetchData()` 内でリセット処理追加

### OPF 検索 URL 仕様

```
https://openpolicyfinder.jisc.ac.uk/search?search={ISSN}&per_page=10&publication_page=1&publisher_page=1&funder_page=1
```

- 検索結果が1件のみの場合、OPF サイト側で自動的に雑誌ポリシーページにリダイレクト

---

## 2026-03-05: KAKEN XML API 暫定スキップ — CORS非対応による処理時間短縮（issue #59）

### 背景

KAKEN XML API は CORS 非対応のため、ブラウザから呼び出すと必ずエラーとなりフォールバックに遷移する。無駄なリクエスト・待機時間を削減するため、CORS 解消まで fetchKakenXml() 呼び出しを暫定的にスキップする。

### 実装内容

- `make_jc_importer.html`: buildFunders(), buildJaLCFunders(), renderOneFunder() 内の fetchKakenXml() 呼び出し3箇所をコメントアウト
- `funder_lookup.html`: lookupOne() 内の fetchKakenXml() 呼び出し1箇所をコメントアウト
- 全箇所に `// [暫定スキップ]` と `// CORS 解消時は下記コメントを外して有効化すること。` のガイドコメント付与
- fetchKakenXml() 関数自体は残置（復元容易性のため）
- 検索順序: JGN → CiNii Research OpenSearch に短縮

---

## 2026-03-05: KAKEN XML API CORS対応 — フォールバック修正・補助金番号KAKEN検索リンク（issue #58）

### 背景

KAKEN XML API (`kaken.nii.ac.jp`) が CORS 非対応のため、ブラウザから直接アクセスするとエラーになることが判明。CiNii Research OpenSearch フォールバックが APIキー設定時にスキップされるバグも発見。

### 実装内容

**両ファイル共通:**
- `fetchKakenXml()`: try/catch 追加（CORS エラー時 `null` 返却でフォールバック自動遷移）
- CiNii Research OpenSearch フォールバック: `!hasCiNiiKey` 条件を削除、常に最終フォールバックとして試行
- 補助金番号パターン（JP除去後 `/^\d+[A-Z]/i`）で検索失敗時、KAKEN検索リンク表示
  - リンク: `https://kaken.nii.ac.jp/ja/search/?qb={番号}`

### 変更箇所

- `make_jc_importer.html`: fetchKakenXml（try/catch）, buildFunders, buildJaLCFunders, renderOneFunder（フォールバック条件修正 + KAKEN検索リンク）
- `funder_lookup.html`: fetchKakenXml（try/catch）, lookupOne（フォールバック条件修正 + kakenSearchHint）, buildResultCards（kakenSearchHint表示）
- `.gitignore`: `funder_lookup_test.html` 追加

---

## 2026-03-04: KAKEN XML API 対応 — 補助金番号→正規番号自動解決（issue #58）

### 背景

論文の謝辞に「補助金の研究課題番号」（例: `23H03160`）が記載されるケースがある。CiNii Research OpenSearch APIではこの番号で検索がヒットしないが、KAKEN XML API（`kaken.nii.ac.jp/opensearch/`）では `normalizedValue` として正規番号を取得可能。

### 実装内容

**make_jc_importer.html:**
- `fetchKakenXml()` 新規追加: KAKEN XML API（CiNii APIキー必須、DOMParser でXML解析）
- `fetchKaken()` → `fetchKakenCiNii()` リネーム（フォールバック用に残存）
- `buildFunders()` / `buildJaLCFunders()`: 検索優先順位変更（KAKEN XML → JGN → CiNii Research OpenSearch）
- `renderOneFunder()`: 補助金番号修正時の警告表示 + ボタンハンドラ更新
- `#cinii-apikey-warning` div + ページ読み込み時チェック追加

**funder_lookup.html:**
- `fetchKakenXml()` 新規追加（`fundingStreams` フィールド付き）
- `fetchKaken()` → `fetchKakenCiNii()` リネーム
- `lookupOne()`: 検索優先順位変更 + 補助金番号検出 + `supplementaryWarning`
- `buildResultCards()`: 警告行追加

### 変更箇所

- `make_jc_importer.html`: fetchKakenXml, fetchKakenCiNii, buildFunders, buildJaLCFunders, renderOneFunder, HTML警告div, APIキーチェック
- `funder_lookup.html`: fetchKakenXml, fetchKakenCiNii, lookupOne, buildResultCards
- `docs/Implementation_KAKEN.md`: Issue #58 セクション追記 + 返り値修正
- `docs/Implementation_funder_lookup.md`: Issue #58 セクション追記

---

## 2026-03-03: 助成情報検索ツール拡張 — プログラム情報識別子自動設定・Acknowledgements抽出（issue #56）

### 背景

issue #34 の調査で、JPCOAR 2.0 の「プログラム情報識別子」に `JGN_fundingStream` タイプが定義されていること、JGN課題番号にNISTEP体系的番号のプログラムコードが埋め込まれていることが判明。また、論文のAcknowledgementsテキストから課題番号を自動抽出する需要を確認。

### 実装内容

**機能A: プログラム情報識別子（fundingStreamIdentifier）の自動設定**
- `fetchJgn()`: 正規表現 `/^JP([A-Z]+)\d/i` で課題番号からJGN_fundingStreamコードを抽出（例: JPMJPR2125 → MJPR）
- `lookupOne()`: JGN結果に `fundingStreamId` / `fundingStreamIdType: 'JGN_fundingStream'` を追加
- `buildResultCards()`: プログラム情報識別子行にコードとタイプを表示
- 科研費番号はJP直後が数字のため空欄のまま

**機能B: Acknowledgementsテキストからの課題番号自動抽出**
- ラジオボタンで「課題番号」/「Acknowledgementsテキスト」入力モードを切替
- `updatePlaceholder()`: モードに応じてラベル・placeholder・ヒント文を動的切替
- `doSearch()`: Ackモード時は `/JP[A-Za-z0-9]+/g` で課題番号を抽出（Setで重複排除）

---

## 2026-03-03: 助成情報検索ツール新規作成（issue #54）

### 背景

issue #53 で実装済みの `fetchJgn()` / `fetchKaken()` の機能を活用し、科研費課題番号やJGN課題番号から助成機関情報を一括検索・表示するスタンドアロン HTML ページを作成。

### 実装内容

**新規ファイル: `funder_lookup.html`**
- 単一HTMLファイルのスタンドアロンツール
- 課題番号を改行区切りで複数入力、一括検索
- `JP21H01234` / `21H01234` のいずれの形式も受付
- JGN → KAKEN の順に検索、カード形式で結果表示
- JPCOAR 2.0 助成情報フィールドに準拠した表示項目:
  - 助成機関識別子 / 助成機関名 / プログラム情報識別子 / プログラム情報 / 研究課題番号 / 研究課題名
- `fetchJgn()` を拡張: `project[0].funding[0].funder` から助成機関DOI取得、`funding.scheme` からプログラム情報取得
- `KAKENHI_FUNDING_STREAM` 定数を新規追加（科学研究費助成事業 日英）
- 検索中はリアルタイムでローディング表示、エラー時はエラーメッセージ表示
- CC0 1.0 ライセンス・GitHub リポジトリリンク付きフッター

---

## 2026-03-03: KAKEN/JGN番号から助成機関名・Crossref Funder ID自動設定（issue #52）

### 背景

KAKEN/JGN連携で研究課題名とURIは取得していたが、助成機関名とCrossref Funder IDは設定されていなかった。JaLCパスやユーザー手動入力時に助成機関情報が空のままになるケースがあった。

### 実装内容

**JSPS定数のグローバル化**
- `JSPS_FUNDER_DOI`（`10.13039/501100001691`）と `JSPS_FUNDER_NAMES`（日英）をグローバル定数として定義
- `buildFunders()` / `buildJaLCFunders()` のローカル `JSPS_DOI` を統合

**`fetchJgn()` の拡張**
- JGN Crossrefレスポンスの `funder` 配列から助成機関名（`funder[0].name`）とDOI（`funder[0].DOI`）を抽出
- 返り値に `funderNames` と `funderDoi` を追加

**`fetchKaken()` の返り値統一**
- `fetchJgn()` と同じ形式に統一（`funderNames: [], funderDoi: ''` を追加）

**`buildFunders()` / `buildJaLCFunders()` の修正**
- KAKEN/JGN結果がある場合に、助成機関名と識別子が空なら自動補完
- JGN成功時: JGNレスポンスのfunder情報を使用
- KAKEN成功時: JSPS定数を使用
- 既存値がある場合は上書きしない（Crossref/JaLC元データ優先）

**UI: 「助成機関を検索」ボタン**
- `renderOneFunder()` 内の研究課題番号入力欄に「助成機関を検索」ボタンを追加
- クリック時: JGN → KAKEN の順に試行し、助成機関名・識別子・課題名・URIをフォーム全体に設定
- 結果表示は既存の `lookup-result` スタイルを使用

---

## 2026-03-02: PMID識別子のURL除去（issue #47）

### 問題

関連情報のidentifierType=PMIDの場合、Crossref APIやOpenAlex APIがPubMed URL（`https://pubmed.ncbi.nlm.nih.gov/41617642`）を返すが、IRDBは8桁までの数字のみを期待する。URL形式のまま出力するとIRDBで「8桁までの数字以外の値が設定されています」エラーが発生する。

### 実装内容

**Crossref relation エントリ（L1993付近）**
- `jpcoarIdType === 'PMID'` の場合、`id.replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, '')` でURLプレフィックスを除去し番号のみを出力

**OpenAlex ids エントリ（L1953付近）**
- `upperKey === 'PMID'` の場合、同様のreplaceでURLプレフィックスを除去

### 影響範囲
- Crossrefパス: mapToItemType() 内のセクション4（Crossref relation エントリ）
- OpenAlexパス: mapToItemType() 内のセクション2（OpenAlex ids エントリ）
- JaLCパス: 影響なし（relation に PMID が出現しない）

---

## 2026-03-01: 使い方ガイド追加

### 実装内容

- `docs/user_guide.md` を新規作成（スクリーンショット付き使い方ガイド）
- `docs/images/` に9枚のスクリーンショットを配置
- `README.md` に使い方ガイドへのリンクを追加

### ガイドの構成

1. ツール概要
2. 画面の構成（3エリア）
3. 基本的な使い方（STEP 1〜3: DOI入力→メタデータ編集→プレビュー確認）
   - データ取り込みの詳細（OpenAlex警告・所属機関・出版タイプ・助成情報・研究課題名）
   - アコーディオン操作・DOI必須項目バッジ・データ編集・エントリ追加削除・識別子逆引き機能
4. APIキー設定
5. 対応RA一覧
6. 自動取得される情報一覧
7. FAQ

---

## 2026-03-01: 関連情報の取得改善（issue #42）

### 実装内容

**Step 1: タイトル取得関数の新設（~L1145, L1161）**
- `fetchRelationTitle(doi)`: Crossref API から関連DOIのタイトルと言語を取得。エラー時は null（silent fail）
- `fetchRelationTitleJaLC(doi)`: JaLC API から関連DOIのタイトルと言語を取得。title_list の最初の1件を採用

**Step 2: mapToItemType() の relation 部分修正（L1926）**
- IIFE `(() => {...})()` → async IIFE `await (async () => {...})()` に変更（await 使用のため）
- セクション4（Crossref relation エントリ）: DOI タイプの場合 `https://doi.org/` プレフィックスを付与してURL形式に統一
- セクション5（新規追加）: isIdenticalTo 以外の DOI エントリを収集し、Promise.all で並列にタイトル取得して subitem_relation_name に設定

**Step 3: mapToItemTypeJaLC() の relation 部分修正（L2197）**
- JaLC API のフィールド名を実際のレスポンスに修正: `relation_type`→`relation`、`identifier_type`→`type`、`related_identifier||url`→`content`
- DOI タイプの場合 `https://doi.org/` プレフィックスを付与
- isIdenticalTo 以外の DOI エントリについて JaLC API（fetchRelationTitleJaLC）でタイトルを取得

### 設計ポイント
- fetchCrossref()/fetchJaLC() を再利用しない理由: 既存関数は 404 で throw するが、関連 DOI の取得失敗は正常系（silent fail）
- isIdenticalTo は自身の DOI/OpenAlex IDs/ISBN のため名称取得対象外
- JaLC DOI は Crossref に情報がないため JaLC API を使用

---

## 2026-02-27: プレビュー機能追加（issue #37）

### 実装内容

**Step A: CSS・HTML**
- モーダルオーバーレイCSS（`#preview-modal`, `.modal-inner`, `.modal-header`, `.modal-body`）
- プレビュー用テーブルCSS（`.pv-table`, `.pv-section-header`, `.pv-inner-table`, `.pv-link`）
- プレビューボタン（`#preview-btn`）をDOI入力エリアに追加
- モーダルDOM（`#preview-modal` > `.modal-inner` > `.modal-body`）

**Step B: collectFromDOM()（STEP 7）**
- `getFieldVal(container, key)`: data-field-key から input/select/textarea の値取得
- `SYS_KEY_MAP`: sys_id→id 等のDOMキー→JSONキーマッピング
- `collectSystemFromDOM()`: #system-fields-body からシステムフィールド収集
- `collectObjectField(section, def)`: object型フィールド収集
- `collectArrayField(section, def)`: 単純array型フィールド収集
- `buildPersonKeys(isCreator)`: creator/contributor のキー名マッピング生成
- `collectOneAffiliation(affEl, keys)`: 1件の所属情報収集（level-3/4走査）
- `collectPersonField(section, isCreator)`: creator/contributor収集（level-1→level-2走査、data-field-keyで判別）
- `collectRelationField(section)`: 関連情報収集
- `collectFundingField(section)`: 助成情報収集
- `collectBiblioField(section)`: 書誌情報収集（全空→null）
- `collectRightsHolderField(section)`: 権利者情報収集
- `collectGeolocationField(section)`: 位置情報収集
- `collectConferenceField(section)`: 会議記述収集
- `collectFromDOM()`: FIELD_DEFS ループのメイン関数（Phase 2 TSVエクスポートの共通基盤）

**Step C: プレビュー表示（STEP 8）**
- `fmtVal(v, lang)`: 値+言語整形、URL検出→リンク化、HTMLエスケープ
- `buildObjectPreview` / `buildArrayPreview`: 単純フィールドの2列テーブル表示
- `buildPersonPreview`: 作成者/寄与者の内側テーブル（#/姓名/姓・名/識別子/所属）
- `buildFundingPreview`: 助成情報の内側テーブル（#/機関名/識別子/課題番号/課題名）
- `buildRelationPreview`: 関連情報のコンパクト表示
- `buildBiblioPreview`: 書誌情報3行集約（雑誌名/巻号ページ/発行日）
- `buildRightsHolderPreview` / `buildGeolocationPreview` / `buildConferencePreview`: 各型対応
- `buildPreviewTable(metadata)`: 全体HTMLテーブル生成メイン
- `showPreview()` / `closePreview()`: モーダル表示/非表示（Esc/オーバーレイクリック対応）

### 設計ポイント
- Person フィールドの DOM 走査: `nested-section-content` 内の `entry-group` の `data-field-key` で姓名/姓/名/識別子を判別
- 所属機関: level-2 `item-content` → level-3 `nested-section-content` → level-4 `item-content` の3段走査
- createNestedItem は `item-content`、createSection は `accordion-content`、createNestedSectionHeader は `nested-section-content` を使用
- collectFromDOM() の出力は mapToItemType() と同じJSON構造（Phase 2 TSVエクスポートで `generateTsv(collectFromDOM())` として共有可能）

---

## 2026-02-26: JaLC API対応・準備中（issue #6）

### 状況
マッピングコードは実装済みだが、JaLC REST API が CORS 非対応のためブラウザから直接アクセスできない。`fetchData()` の JaLC 分岐は無効化し、エラーメッセージ表示のままとしている。CORS 対策が解決次第、`await fetchJaLCData(doi)` に切り替えるだけで有効化できる。

### 実装内容

**JALC_CONTENT_TYPE_MAP 定数**
- JaLC `content_type`（JA/BK/RD/EL/GD）→ JPCOAR 資源タイプラベルのマッピング（公式5値）

**fetchJaLC(doi)**
- JaLC REST API (`/v2/dois/{doi}`) からメタデータ取得
- `Accept: application/json` ヘッダー、レスポンスの `.data` を返却

**buildJaLCAuthors(jalcCreators)**
- `names[]` の `lang` で ja/en を直接区別（`_warnLang` 不要）
- `affiliation_list[].affiliation_identifier_list[]` から ROR URI を直接取得（ROR API呼び出し不要）
- `researcher_id_list[]` から e-Rad番号・ORCID取得

**buildJaLCFunders(jalcFundList)**
- `funder_identifier_list[]` から FundRef DOI 抽出（`http://dx.doi.org/10.13039/...` → DOI部分）
- カンマ区切り課題番号を分割して個別処理
- JSPS判定 + JGN/KAKEN連携（既存の `fetchJgn()` / `fetchKaken()` を再利用）

**mapToItemTypeJaLC(jalcJson)**
- `mapToItemType()` と同じメタデータオブジェクト構造を返す
- 多言語タイトル・出版者・雑誌名、抄録（`description_list`）、ライセンス（`rights_list`）、キーワード（`subject_list`）
- `date_list[]` から Accepted/Submitted 日付取得
- `publication_date` の year/month/day を結合（YYYY / YYYY-MM / YYYY-MM-DD）
- `journal_id_list[]` から ISSN（print/online区別）→ `fetchNcid()` 再利用
- `content_language` → ISO 639-2 変換（ja→jpn等）
- 出版タイプは設定しない（OpenAlex不使用）

**fetchJaLCData(doi)**
- JaLC取得フロー: `fetchJaLC()` → info-bar表示（OAバッジは "Unknown"） → `mapToItemTypeJaLC()` → `renderAll()`

**fetchData() 分岐変更**
- `ra === 'JaLC'` 時の `showError()` を `await fetchJaLCData(doi)` に置換

---

## 2026-02-25: 更新チェック機能・インデックスID移行・更新概要5件制限（issue #36）

### 実装内容

**更新チェック機能 (`checkForUpdate()`)**
- ページ読み込み時に GitHub API (`repos/tzhaya/jc-import-file-maker/commits?path=make_jc_importer.html&per_page=1`) を呼び出し
- 最新コミット日と HTML内の `LOCAL_VERSION` 定数を比較
- 新しい版がある場合、version-info div 内に赤字リンクで通知表示
- fetch失敗時（オフライン・レート制限）は静かに無視

**インデックスID入力欄の削除**
- HTML: DOI入力エリアの「インデックスID:」入力行を削除
- CSS: `#pos-index-input` スタイル定義を削除
- JS: `document.getElementById('pos-index-input').value` の3箇所を空文字 `''` に変更
  - `renderSystemFields()` の `sys_pos` デフォルト値
  - `mapToItemType()` の `pos_index`
  - `buildEmptyMetadata()` の `pos_index`
- POS_INDEX はシステム管理フィールド (`.POS_INDEX[0]`) で入力する方針に変更

**更新概要テーブルを直近5件に制限**
- 古い3件を削除し、今回の変更を先頭に追加して5件を維持

---

## 2026-02-25: Crossref 複数日付取り込み（issue #24）

### 問題

Crossref API から取得する日付は `published-online` / `published-print` / `published` を優先順で1件取得し、`Issued` タイプとして記録するのみだった。
Crossref には受理日（`accepted`）・提出日（`submitted`）フィールドもあり、これらが存在する場合は JPCOAR スキーマ定義（「関連する情報があれば必ず記入する」）に従って記録する必要があった。

### 実装内容

**`formatDateParts()` ヘルパー関数を追加**（`getPubDate()` の直前）

- `date-parts` 配列を受け取り `YYYY-MM-DD` / `YYYY-MM` / `YYYY` 形式の文字列に変換する低レベルヘルパー
- 既存の `getPubDate()` も `formatDateParts()` を利用するようリファクタリング

**`mapToItemType()` に `acceptedDate` / `submittedDate` を追加**

- `crJson.accepted?.['date-parts']?.[0]` → `acceptedDate`
- `crJson.submitted?.['date-parts']?.[0]` → `submittedDate`

**`item_30002_date11` を複数エントリ配列に拡張**

```javascript
item_30002_date11: [
  pubDate       && { subitem_date_issued_datetime: pubDate,       subitem_date_issued_type: 'Issued' },
  acceptedDate  && { subitem_date_issued_datetime: acceptedDate,  subitem_date_issued_type: 'Accepted' },
  submittedDate && { subitem_date_issued_datetime: submittedDate, subitem_date_issued_type: 'Submitted' },
].filter(Boolean)
```

`&&` + `.filter(Boolean)` により「フィールドが存在すれば必ず追加、存在しなければスキップ」を実現。

### 対象外

- `posted` → `Available`：JPCOAR スキーマで `Available` はエンブレッシュ解除日（`coar:accessRights = embargoed access` 時）の意味であり、プレプリント公開日とは意味が異なるため除外。
- `created` / `deposited` / `indexed`：Crossref のシステム管理日でありコンテンツの日付ではないため除外。

---

## 2026-02-24: JPCOAR 2.0 資源タイプ語彙対応・出版タイプリソース自動設定

### 問題

1. **出版タイプリソース未設定**: 出版タイプ（AO/AM/VoR 等）のセレクトを変更しても出版タイプリソース URI が自動設定されなかった。
2. **資源タイプ 2.0 未対応**: JPCOAR スキーマ 2.0 で追加された資源タイプ（データセットサブタイプ・特許サブタイプ等）が選択できても `RESOURCE_TYPE_MAP` に対応エントリがなく、`resourceuri` が空になっていた。

### 実装内容

**`VERSION_TYPE_MAP` 定数追加** (`ACCESS_RIGHTS_MAP` 直前)

- AO / SMUR / AM / P / VoR / CVoR / EVoR / NA の8型を COAR version type vocabulary URI にマッピング
- 出典: http://vocabularies.coar-repositories.org/version_types/

**FIELD_DEFS 修正** (`item_30002_version_type15`)

- `subitem_version_type` フィールドに `link: { tgt: 'subitem_version_resource', map: VERSION_TYPE_MAP }` を追加
- `subitem_version_resource` フィールドに `ro: true` を追加（自動入力のため readonly 化）
- 資源タイプの `resourcetype` → `resourceuri` 自動設定と同一パターン

**`RESOURCE_TYPE_MAP` 拡張**

- v2.0 追加型 31 件を追加（コメントで `// v2.0追加` を明記）
  - Articles: `journal`（c_0640）、`other periodical`（QX5C-AR31）
  - Conference Output: `conference output`（c_c94f、旧 `conference object` の改称）、`conference presentation`（R60J-J5BD）
  - Dataset サブタイプ 13 型: aggregated data / clinical trial data / compiled data / encoded data / experimental data / genomic data / geospatial data / laboratory notebook / measurement and test data / observational data / recorded data / simulation data / survey data
  - Patent サブタイプ 7 型: design patent / PCT application / plant patent / plant variety protection / software patent / trademark / utility model
  - Other 8 型: commentary / design / industrial design / layout design / peer review / research protocol / source code / transcription
- v1.0 のみの型（periodical / interview / internal report / report part）にコメント `// v1.0のみ` を追加

**`TITLE_MAPS.resourcetype` 更新**

- Patent サブタイプ 7 型、Other 8 型（計 15 型）をセレクトメニューに追加
- patent の直前に特許サブタイプをグループ化して配置

**`docs/resource_type_vocabulary.md` 全面更新**

- v1.0 / v2.0 の両出典 URL を明記
- 「凡例」セクション追加（v1.0 / v2.0追加 / v1.0のみ の区分）
- カテゴリ別構成に再編（Articles / Books / Cartographic Material / Conference Output / Dataset / Image / Lecture / Patent / Report / Sound / Thesis / Other）
- v2.0 追加型を **太字** で明示
- v2.0 で廃止の可能性がある型（periodical / interview / internal report / report part）を "v1.0のみ" で明示
- `conference object` → `conference output` の改称を注記

---

## 2026-02-24: 識別子からの機関名逆引き（#17）

### 問題

所属機関識別子（ROR URI）や助成機関識別子（Crossref Funder DOI / ROR URI）を入力しても、対応する機関名と照合する手段がなく、誤入力を検出できなかった。

### 実装内容

**CSS 追加** (`<style>` 末尾)

- `.lookup-result` クラス: 結果エリア用（ok: 緑、warn: オレンジ、err: 赤）

**API 関数追加** (`fetchRorDetails` 直後)

- `fetchRorNamesAll(rorUri)`: ROR v2 API で `ror_display` + `label` タイプの全名称を取得
- `fetchCrossrefFunderDetails(funderUri)`: Crossref Funders API で主名称を取得（`alt-names` は参考表示のみ）

**`attachLookupUi()` ヘルパー追加** (`renderOnePerson` 直前)

- ボタン（呼び出し元生成）とイベント処理・結果エリアを一体管理するユーティリティ関数
- 遅延バインディングパターン: Scheme/Type select DOM 追加後に `attachLookupUi` を呼ぶことで `updateVisibility` を初期化
- 比較ロジック: 取得名称と現入力値を集合比較し、完全一致で緑、不一致でオレンジ + 上書きボタン表示
- 上書き処理: 既存の `entry-group` を削除し、API 取得名称（言語タグ付き）で再生成

**`renderOneAffiliation()` 修正**

- 所属機関識別子セクション（新規追加・既存エントリの両方）に逆引き UI を追加
- Scheme 変更時のコールバックで `updateAffLookup()` を呼び出し、ROR 選択時のみボタン表示

**`renderOneFunder()` 修正**

- 助成機関識別子の識別子フィールド行に「名称を確認」ボタンをインライン追加
- 識別子タイプ変更時のコールバックで `updateFunderLookup()` を呼び出し
- タイプが ROR → `fetchRorNamesAll`、Crossref Funder → `fetchCrossrefFunderDetails` に分岐
- `getTargetCont: () => fnCont` で助成機関名コンテナを参照し、上書き時に置換

### 行数変化

追加行数: +約145行（現在のファイル規模: 約3010行）

---

## 2026-02-23: JGN連携追加（#14）

### 問題

Crossref から取得した助成情報の `award` に `JPMJBF1801` のような JGN（Japan Grant Number）体系的番号が含まれる場合、課題名・URIが取得されていなかった。
JST 助成金は CiNii Research Projects（KAKEN）には登録されておらず、既存の KAKEN 連携では対応不可だった。

### 実装内容

**`fetchJgn(awardNumber)` 関数を追加**（`fetchKaken()` 直後、`fetchNcid()` 直前）

- URL: `https://api.crossref.org/works/10.52926/${encodeURIComponent(awardNumber)}`
- 404 → `null` 返却（JGN未登録、KAKEN にフォールバック）
- `type !== 'grant'` → `null` 返却
- `project[0].project-title[]` から `{ subitem_award_title, subitem_award_title_language }` の配列を生成
- URI: `https://doi.org/10.52926/${awardNumber}`
- 戻り値形式は `fetchKaken()` と同じ `{ titles, kakenUrl }` → 下流コード（`buildFunders()`）の変更を最小化

**`buildFunders()` 内 `buildEntry()` を修正**

```
変更前:
  KAKEN連携: JSPS かつ award番号ありの場合のみ fetchKaken() 呼び出し

変更後:
  1. JGN連携: award が /^JP/i にマッチする場合、まず fetchJgn() を試みる
  2. KAKEN連携: JSPS かつ JGN未取得の場合のみ fetchKaken() を呼び出す（フォールバック）
```

### スコープ整理

| 助成機関 | 番号形式 | JGN | 対応 |
|---|---|---|---|
| JST | `JPMJXXXXXXXX` | 登録あり（200） | JGN連携で課題名・URI取得 |
| JSPS | `JP19K11839` 等 | 未登録（404） | KAKEN連携にフォールバック |

---

## 2026-02-22: Crossref ISBN・relation フィールドの関連情報取り込み追加（#20）

### 問題

issue #12 で Crossref type マッピングを追加した際、book 型データの検証を行ったところ、以下の情報が関連情報（`item_30002_relation18`）に取り込まれていないことを確認した。

1. **`ISBN` フィールド**（book 系資源タイプ固有）: Crossref が返す ISBN が関連情報に登録されていない
2. **`relation` フィールド**（全資源タイプ共通）: Crossref が返す関連識別子が全く処理されていない

### 実装内容

**定数 2 つを追加**（`CROSSREF_TYPE_MAP` 末尾直後）

- `CROSSREF_RELATION_TYPE_MAP`: Crossref relation type（ハイフン区切り）→ JPCOAR relation type（17エントリ）
- `CROSSREF_RELATION_ID_TYPE_MAP`: Crossref `id-type` → JPCOAR identifierType（6エントリ）

値は `TITLE_MAPS.subitem_relation_type` / `TITLE_MAPS.subitem_relation_type_select` に完全一致させた（`arXiv` 等の大文字小文字に注意）。

**`item_30002_relation18` IIFE に処理を追加**（既存の DOI / OpenAlex ids 処理の後）

```
3) Crossref ISBN エントリ（book 系）
   isbn-type 優先 → なければ ISBN 配列にフォールバック（issn-type / ISSN と同パターン）
   → isIdenticalTo / ISBN として追加

4) Crossref relation エントリ（全資源タイプ）
   CROSSREF_RELATION_TYPE_MAP / CROSSREF_RELATION_ID_TYPE_MAP でマッピング
   対象外の relation type / id-type はスキップ
```

UI 側（`renderRelationField`）は変更不要（ISBN や各 relation type は既に TITLE_MAPS に定義済み）。

---

## 2026-02-22: Crossref type → JPCOAR 資源タイプ マッピング追加（#12）

### 問題

Crossref API から書籍等を取り込んだ際、資源タイプが正しく識別されない問題があった。従来のコードは Crossref の `type` フィールドのハイフンをスペースに変換するだけで、30タイプのうち7タイプしか `TITLE_MAPS.resourcetype` に一致しなかった（`edited-book` → `edited book` → 一致なし → 空）。

### 実装内容

**`CROSSREF_TYPE_MAP` 定数を追加**（`RESOURCE_TYPE_MAP` の直後、約L510付近）

Crossref type（ハイフン付き）を直接キーとし、対応するJPCOAR資源タイプを値とするマッピングテーブル（23エントリ）を追加。マッピング根拠は `docs/crossref_type_mapping.md` に記載。

**`mapToItemType()` 内の資源タイプ解決ロジックを更新**

```javascript
// 変更前
const crType       = (crJson.type || '').replace(/-/g, ' ');
const resourcetype = TITLE_MAPS.resourcetype.includes(crType) ? crType : '';

// 変更後
const crTypeRaw    = crJson.type || '';
const crTypeLabel  = crTypeRaw.replace(/-/g, ' ');
const resourcetype = TITLE_MAPS.resourcetype.includes(crTypeLabel)
  ? crTypeLabel
  : (CROSSREF_TYPE_MAP[crTypeRaw] || '');
```

フォールバック順序:
1. ハイフン→スペース変換で TITLE_MAPS に一致 → そのまま使用（既存の7タイプ）
2. `CROSSREF_TYPE_MAP` でルックアップ → 対応するJPCOAR資源タイプを使用（23タイプ）
3. どちらも一致しない → 空文字（未知のタイプ）

### マッピング概要

| 変換先 | 対象 Crossref type |
|---|---|
| `book` | edited-book, monograph, reference-book, book-set, book-series |
| `book part` | book-chapter, book-section, book-track, reference-entry |
| `conference paper` | proceedings-article |
| `conference proceedings` | proceedings, proceedings-series |
| `thesis` | dissertation |
| `article` | posted-content, peer-review |
| `report` | report-series |
| `report part` | report-component |
| `journal` | journal-volume, journal-issue |
| `dataset` | database |
| `other` | standard, component, grant |

---

## 実装ステップ完了記録

### STEP 1: HTML骨格とCSSスタイル ✅

**実装内容:**
- HTML 構造作成
  - `#input-area`: DOI入力、インデックスID入力、データ取得ボタン、空値表示ボタン
  - `#info-bar`: DOIリンク + OAバッジ表示エリア
  - `#preview-area`: メタデータ確認・編集エリア
    - `#system-fields`: システム管理フィールド（テーブル形式）
    - `#metadata-fields`: メタデータフィールド（アコーディオン）
- CSS スタイル定義
  - ベースカラー: `#2c5f2e`（深緑）
  - アコーディオン左ボーダー（ネストレベル別）:
    - Level 1: `#4caf50`（16px indent）
    - Level 2: `#81c784`（32px indent）
    - Level 3: `#a5d6a7`（48px indent）
    - Level 4: `#c8e6c9`（64px indent）
  - `[+ 追加]` / `[− 削除]` ボタンスタイル（角丸、緑/赤）
  - `.warn-badge` スタイル（オレンジ、⚠ 要確認）
- JS: `toggleAccordion()` 実装
- JS: `renderSystemFields()` 実装（11フィールド）
- JS: `renderDemoAccordion()` デモ表示実装（※後のクリーンアップで削除済み）

**ユーザー確認:** OK

---

### STEP 2: 定数・マスターデータ定義 ✅

**実装内容:**
- `EXCLUDED_KEYS` Set（18キー）: 学位論文関連・システム系・未使用フィールドを除外
- `RESOURCE_TYPE_MAP`（46エントリ）: `resource_type_vocabulary.md` から生成
- `ACCESS_RIGHTS_MAP`（4エントリ）: `accessrights.md` から生成
- `JPCOAR_LINKS`（26エントリ）: `JPCOARschme_guide.md` から生成、フィールドキー→スキーマURL
- `TITLE_MAPS` オブジェクト: `ItemType.json` から抽出した全 titleMap データ
  - `language`, `subitem_language`, `resourcetype`, `subitem_access_right`,
    `subitem_version_type`, `subitem_description_type`, `subitem_date_issued_type`,
    `subitem_relation_type`, `subitem_relation_type_select`, `subitem_source_identifier_type`,
    `contributorType`, `affiliationNameIdentifierScheme`,
    `nameIdentifierScheme`, `creatorNameType`, `subitem_identifier_type`,
    `subitem_funder_identifier_type`, `subitem_conference_country` など
- `buildSelect(values, selected, onChange)` ヘルパー関数
- デモを TITLE_MAPS 使用の select メニュー付きに更新
- 資源タイプ連動（select変更でURI自動更新）実装

**ユーザー確認:** OK
**ユーザーコメント:** アコーディオンを閉じた時のサマリー表示（"他5名"）は人数が合っていない → STEP 5 で動的に修正予定

---

### STEP 3: API取得層 ✅

**実装内容:**
- `normalizeDoi(raw)`: `doi:`, `https://doi.org/` プレフィックスを正規化
- `fetchCrossref(doi)`: Crossref API 取得、`data.message` を返却
- `fetchOpenAlex(doi)`: OpenAlex API 取得、レスポンス全体を返却
- `fetchRorDetails(rorUri)`: ROR v2 API 取得
  - `names[].types` に `"ror_display"` を含むエントリから機関名を取得
  - `external_ids[type=isni].all[0]` からISNI取得（スペース除去）
  - 返却: `{ isni, rorDisplayName, rorId }`
- `fetchAllRorData(oaJson)`: OpenAlex の全機関 ROR URI を並列取得（`Promise.all`）
  - 返却: `Map<rorUri, { isni, rorDisplayName, rorId }>`
- `fetchData()`: メインオーケストレーター
  - Crossref + OpenAlex 並列取得
  - ROR データ並列取得
  - OAバッジ表示（Gold/Green/Hybrid/Closed）
  - DOIリンク表示
  - `mapToItemType()` 呼び出し → `renderAll()` へ（未実装時はフォールバック）
- `showEmptyFields()`: `renderAll()` または `renderDemoAccordion()` へ委譲

**ユーザー確認:** OK（スクリーンショットでDOIリンク・OAバッジ・成功メッセージを確認）

**コンソールエラーについての質問:**
- `[Violation] Permissions policy violation: unload` from `g9nhm28jb13afdh.js:2`
  → ブラウザ拡張機能が注入したスクリプトのエラー。実装コードとは無関係。
- `Uncaught Error: Could not establish connection. Receiving end does not exist.`
  → Chrome 拡張機能のメッセージングエラー。実装コードとは無関係。

---

### STEP 4: データマッピング層 ✅（追加作業完了 2026-02-15）

**実装内容:**
- `processAbstract(raw)`: JATS 7ステップ処理（改行削除→実体参照解除→先頭jats:title削除→セクションタイトル変換→タグ除去→スペース正規化）
- `getPubDate(cr)`: Crossref から発行日取得（`published-online` → `published-print` → `published` の優先順）
- `buildAuthors(crAuthors, oaAuthorships, rorMap)`: 著者マッピング
  - Crossref著者とOpenAlex著者を姓（family name）で照合、フォールバックはインデックス順
  - ORCID: Crossref優先 → OpenAlex fallback（OA由来の場合 `_warnOrcid: true`）
  - 所属: OpenAlex `institutions[]` から ROR 経由で ISNI + ROR 識別子付きで取得
  - `_warnLang: true` フラグ（言語を英語と仮設定した場合）
- `buildFunders(crFunders)`: 助成情報マッピング
  - funder名、Crossref Funder DOI、award番号を変換
  - 同一funderの複数awardをflatMapで展開（各awardごとに1エントリ生成）
- `mapToItemType(crJson, oaJson, rorMap)`: メインマッピング関数
  - 以下の全フィールドをマッピング:
    - タイトル、作成者、アクセス権（固定: open access）
    - 権利情報（VoRライセンスURL + Copyright assertion）
    - 主題（API取り込み対象外。空の編集可能フィールドを準備するのみ）
      - ※当初実装では OpenAlex keywords を取り込んでいたが、仕様変更により削除
    - 内容記述（アブストラクト）、出版者、日付、言語（固定: eng）
    - 資源タイプ（cr.type のハイフン→スペース変換で照合）
    - 出版タイプ（Gold/Hybrid OA → VoR、それ以外 → AM）
    - 関連情報（DOI isIdenticalTo + OpenAlex `ids` からPMID等の追加エントリ）
    - ISSN（issn-type から EISSN/PISSN 判定）
    - 収録物名、収録物識別子、巻・号・ページ、書誌情報
    - 助成情報

**ユーザー確認:** スクリーンショットで動作確認済み

**追加作業完了内容（2026-02-15）:**

1. **主題フィールドの修正** ✅: OpenAlex keywords / Crossref subjects 取り込みを削除し、空フィールド1件のみ設定
2. **関連情報のOpenAlex ids対応（4.5節）** ✅: PMID等の追加エントリを `VALID_RELATION_ID_TYPES` Set で照合して追加
   - `OPENALEX` キーは除外（VALID_RELATION_ID_TYPES に未定義のため自動除外）
3. **アブストラクト処理の改善（4.6節）** ✅: `stripTags()` を `processAbstract()` (7ステップ) に置き換え
4. **言語設定ルール（4.7節）** ✅: `subitem_relation_name` を `[]`（テキストなし時は言語フィールドなし）に修正

---

### STEP 5: UIレンダリング層（アコーディオンテーブル）✅

**実装内容:**
- `FIELD_DEFS` 配列: 全28フィールドの表示順・ラベル・型・サブフィールド・サマリー関数を宣言的に定義
  - type分類: `array`(11), `object`(10), `creator`(1), `contributor`(1), `relation`(1), `funding`(1), `biblio`(1), `rightsHolder`(1), `geolocation`(1), `conference`(1)
  - ※APC除外により30→28フィールドに変更
- DOM生成ヘルパー関数群:
  - `createSection(key, label, summaryText)`: トップレベルアコーディオンセクション
  - `createFieldRow(label, value, inputType, selectOptsKey, extra)`: 入力フィールド行
  - `createNestedItem(label, level)`: ネストアコーディオン項目（Level 1〜4）
  - `createNestedSectionHeader(label, level, showAdd)`: サブセクションヘッダー
  - `createAddButton(label)`: 追加ボタン
  - `renderItemFields(itemData, fieldsDef, container)`: フィールド定義からフィールド行群を一括生成
- 汎用レンダラー:
  - `renderArrayField(def, items)`: 配列フィールド（タイトル、主題、権利情報等）
  - `renderObjectField(def, obj)`: 単一オブジェクトフィールド（アクセス権、資源タイプ、巻号等）
- 専用レンダラー:
  - `renderPersonField(def, persons, isCreator)`: 作成者/寄与者（4レベルネスト対応）
  - `renderRelationField(def, relations)`: 関連情報（fieldset + 配列）
  - `renderFundingField(def, funders)`: 助成情報（配列 + fieldset + 配列）
  - `renderBiblioField(def, obj)`: 書誌情報（配列 + fieldset + スカラー値）
  - `renderRightsHolderField(def, holders)`: 権利者情報（権利者名配列 + 識別子配列）
  - `renderGeolocationField(def, geos)`: 位置情報（点 + 空間 + 自由記述配列）
  - `renderConferenceField(def, confs)`: 会議記述（会議名・主催機関・開催期間・会場・開催地・開催国）
- `renderAll(metadata)`: メイン関数。FIELD_DEFSを走査しtype別にレンダラーへ振り分け
- `buildEmptyMetadata()`: 空値テスト表示用メタデータオブジェクト生成
- `fetchData()` 更新: フォールバック処理を削除し `renderAll(metadata)` を直接呼び出し
- `showEmptyFields()` 更新: `buildEmptyMetadata()` + `renderAll()` に切替
- 入力支援:
  - select メニュー: TITLE_MAPSのキー参照でbuildSelect()自動生成
  - URI連動: 資源タイプ・アクセス権のselect変更時に対応URIフィールド自動更新（linkedUri）
  - 警告バッジ: `_warnLang`（言語仮設定）、`_warnOrcid`（OpenAlex由来ORCID）
  - JPCOARリンク: JPCOAR_LINKSからフィールドラベルをリンク化
- サマリー表示: 折りたたみ時に内容要約を動的生成（作成者「他N名」、主題「他N件」、内容記述「先頭50文字…」等）

**ユーザー確認:** 実装確認済み（コード 1449〜2120行）

---

### STEP 6: 動的追加・削除機能 ✅（2026-02-15 実装完了）

**実装方針:** Direct DOM manipulation（currentMetadata 非更新）

**実装内容:**
1. **CSS**: `.entry-group` / `.btn-delete-inline` スタイル追加
   - `.entry-group`: サブ配列エントリをグルーピング（左ボーダー＋インデント）
   - `.btn-delete-inline`: エントリ内の削除ボタン（ブロック表示）
2. **`removeNestedItemEl(el)` + `renumberItems(container)`**: DOM直接削除 + インデックス再採番
3. **`createNestedItem`** 削除ボタン: `stopPropagation()` のみ → `confirm()` + `removeNestedItemEl()` に変更
4. **`createNestedSectionHeader(label, level, onAdd)`**: 第3引数を `onAdd` コールバックに変更
   - 関数を渡すと `onAdd(content)` を呼び出し、falsy の場合は noop
5. **`createAddButton(label, onAdd)`**: 第2引数 `onAdd` 追加
6. **`createEntryGroup()`**: サブ配列1エントリを削除ボタン付きでラップするヘルパー
7. **`renderOnePerson(person, idx, keys)`**: `renderPersonField` の人物1件分を切り出し
   - 姓名 / 姓 / 名 / 識別子 の各エントリを `createEntryGroup` でラップ
   - 各サブ配列セクションに `onAdd` コールバック設定（空エントリ追加）
8. **`renderOneAffiliation(aff, ai, keys)`**: 所属機関1件分を切り出し
   - 所属機関名 / 所属機関識別子 の各セクションに `onAdd` 設定
9. **`renderPersonField`** 大幅改修:
   - `keys` オブジェクトに key 変数をまとめ `renderOnePerson` に委譲
   - `createAddButton` に空人物追加の `onAdd` を設定
10. **`renderOneFunder(funder, idx, defLabel)`**: `renderFundingField` の助成1件分を切り出し
    - 助成機関名 / 研究課題名 の各エントリを `createEntryGroup` でラップ + `onAdd` 設定
11. **`renderArrayField`**: `createAddButton` に空アイテム追加の `onAdd` を設定
12. **`renderRelationField`**: `createAddButton` + `createNestedSectionHeader('関連名称')` に `onAdd` 設定
13. **`renderFundingField`**: `createAddButton` に `renderOneFunder` を使用した `onAdd` を設定

**検証事項:**
- `10.1016/j.advnut.2025.100480` でデータ取得後:
  - 作成者の「作成者姓名」で [+ 追加] → 空エントリグループが追加、[− 削除] で削除
  - 作成者の「作成者姓」「作成者名」「作成者識別子」「所属機関名」でも同様
  - 「所属機関識別子」で [+ 追加] → Level 4 アコーディオンが追加
  - [+ 作成者を追加] → 新しい作成者エントリ（Level 1）が追加、インデックス採番
  - 作成者の [− 削除] → 削除後インデックス再採番
  - タイトル・主題等 array フィールドでも追加/削除動作
  - 関連情報・助成情報で追加/削除動作

---

### コードクリーンアップ＋フィールド補完 ✅（2026-02-15）

**1. 冗長コード削除:**
- `renderDemoAccordion()` 関数を削除（約265行の死コード、STEP 1 UI確認用で役目を終えていた）
- `currentMetadata` 変数の宣言・代入を削除（セットされるだけで未使用）
- 古いコメント「STEP 1 検証用: 静的なダミー表示のみ（APIは未実装）」を削除
- `renderRelationField` 追加ハンドラ内の未使用変数 `idText` を削除

**2. 位置情報フィールド定義（`item_30002_geolocation20`）:**
- `FIELD_DEFS` の type を `'array'`（fields空） → `'geolocation'` に変更
- `renderOneGeolocation()` + `renderGeolocationField()` 専用レンダラーを新設
  - 位置情報（点）: 経度・緯度（固定1セット）
  - 位置情報（空間）: 西部経度・東部経度・南部緯度・北部緯度（固定1セット）
  - 位置情報（自由記述）: テキスト（複数追加・削除可）
- `buildEmptyMetadata()` に構造付き空エントリを追加

**3. 会議記述フィールド定義（`item_30002_conference34`）:**
- `FIELD_DEFS` の type を `'array'`（fields空） → `'conference'` に変更
- `renderOneConference()` + `renderConferenceField()` 専用レンダラーを新設
  - 会議名（配列、名前+言語）、回次（テキスト）
  - 主催機関（配列、名前+言語）
  - 開催期間（オブジェクト、開始/終了 年月日+期間テキスト+言語）
  - 開催会場（配列、会場名+言語）、開催地（配列、地名+言語）
  - 開催国（select、ISO 3166-1 alpha-3）
- `TITLE_MAPS` に `subitem_conference_country`（249か国コード）を追加
- `buildEmptyMetadata()` に構造付き空エントリを追加

**4. 権利者情報ネスト構造の実装（`item_30002_rights_holder7`）:**
- `FIELD_DEFS` の type を `'array'`（nested未対応） → `'rightsHolder'` に変更
- `renderOneRightsHolder()` + `renderRightsHolderField()` 専用レンダラーを新設
  - 権利者名（配列、名前+言語、追加・削除可）
  - 権利者識別子（配列、識別子+Scheme+URI、追加・削除可）
- `buildEmptyMetadata()` に構造付き空エントリを追加

**5. APCフィールドの除外:**
- `requirements.md` の取り込み対象外フィールドに準拠
- `EXCLUDED_KEYS` に `'item_30002_apc5'` を追加
- `JPCOAR_LINKS` から `item_30002_apc5` エントリを削除
- `TITLE_MAPS` から `subitem_apc` を削除
- `mapToItemType` から APC マッピングを削除
- `FIELD_DEFS` から APC エントリを削除
- `buildEmptyMetadata()` から APC エントリを削除

**6. 参照用列（ヒントセル）の追加:**
- 旧ツール（`make_tsv.html`）の「候補値（参照用）」列に相当する機能を新ツールに移植
- CSS: `.hint-cell` スタイル追加（破線枠、薄背景、max-width 220px、ellipsis 切り詰め）
- `escHtml()`: HTMLエスケープ関数を新設
- `renderHint()`: URL自動リンク化関数を新設（旧ツールと同等仕様）
- `showHints` グローバルフラグ: API取得時 `true`、空値表示時 `false`
- `createFieldRow()` 拡張: フラグ有効時、非空・非readonly・非selectフィールドにヒントセルを自動挿入
  - ラベルと入力欄の間に配置（入力欄の横）
  - `title` 属性に全文テキストを設定（ホバーで確認可能）
  - URL含有時はクリック可能リンクとして表示
- `fetchData()` に `showHints = true` を追加（APIデータ取得後に参照値を表示）
- `showEmptyFields()` に `showHints = false` を追加（空値表示では参照値を非表示）
- 個別レンダラーの変更不要（`createFieldRow()` で一元的に処理）

---

### OpenAlex API Key 設定機能 ✅（2026-02-17）

**背景:** 2026年2月13日以降、OpenAlex APIはAPIキーなしでの利用にテストクレジット（100回）の制限を設け、超過時にHTTP 409を返すようになった（[Issue #1](https://github.com/tzhaya/jc-import-file-maker/issues/1)）。

**実装内容:**
1. **`CONFIG` 定数の追加（STEP 2 定数セクション冒頭）:**
   - `CONFIG.API_KEY`: OpenAlex APIキーを設定する定数
   - デフォルト値 `"YOUR_API_KEY"`（未設定状態）
2. **未設定時の警告バナー（`#apikey-warning`）:**
   - `#input-area` 内に黄色背景の警告 div を追加
   - ページ読み込み時に `CONFIG.API_KEY` が未設定（`"YOUR_API_KEY"` または空）の場合に表示
3. **`fetchOpenAlex()` のAPIキー送信対応:**
   - `CONFIG.API_KEY` が有効値の場合、リクエストURLに `?api_key=<key>` パラメータを付与
   - 未設定の場合は従来通りパラメータなしで送信
4. **409エラーの専用ハンドリング:**
   - `resp.status === 409` の場合、利用回数制限超過の専用エラーメッセージを表示
   - APIキー取得先URLを含むガイダンスメッセージ

**検証:** APIキー設定時のリクエストURL確認（`?api_key=` 付与）、未設定時の警告表示確認済み

---

### 同一助成機関・複数award対応 ✅（2026-02-17）

**背景:** Crossref APIでは1つのfunderに複数のaward番号が含まれることがある（例: JSPSが4つのaward番号を持つケース）。従来の`buildFunders()`は`awards[0]`のみ取得し、2番目以降を破棄していた。

**実装内容:**
1. **`buildFunders()` 関数の修正:**
   - `.map()` → `.flatMap()` に変更
   - 内部ヘルパー `buildEntry(awardNum)` を導入し、各awardごとに同一funder情報を持つエントリを生成
   - award 0件の場合は空awardで1エントリ（従来と同じ動作）

**影響範囲:** `buildFunders()` のみ。`mapToItemType()`、`renderFundingField()`、`renderOneFunder()` は配列を走査するだけなので変更不要。

**検証:** DOI `10.1002/advs.202512896` でJSPSが4エントリ、FORESTが2エントリ、計6エントリが助成情報に表示されることを確認。

---

### DOI RA判定機能 ✅（2026-02-17）

**背景:** Issue #4（JaLC DOI対応）の前提として、DOIの登録機関（Registration Authority）を判定し、RAに応じて処理を分岐する仕組みが必要（[Issue #5](https://github.com/tzhaya/jc-import-file-maker/issues/5)）。

**実装内容:**
1. **`fetchDoiRA(doi)` 関数の追加（セクション 3.0）:**
   - `https://doi.org/doiRA/{DOI}` APIを呼び出してRAを判定
   - DOIが存在しない場合は「入力されたDOIは存在しません。」エラーを表示
   - 返却値: RA名文字列（"Crossref", "JaLC", "DataCite" 等）
2. **`fetchCrossrefData(doi)` 関数の抽出（セクション 3.5）:**
   - 既存の `fetchData()` 内の Crossref + OpenAlex + ROR 取得 → マッピング → レンダリングのロジックを独立関数に切り出し
3. **`fetchData()` のRA分岐ロジック（セクション 3.6）:**
   - DOI正規化後、まず `fetchDoiRA()` でRAを判定
   - `Crossref` → 既存の `fetchCrossrefData()` を呼び出し
   - `JaLC` → 未対応メッセージを表示（Issue #6 で実装予定）
   - その他 → サポート外メッセージを表示

**検証:** Crossref DOI (`10.1016/j.advnut.2025.100480`) で既存動作維持を確認。JaLC DOI (`10.11209/jim.27.85`) で未対応メッセージ表示を確認。

---

### KAKEN連携（CiNii Research Projects API）✅（2026-02-18）

**背景:** Crossref の funder 情報に JSPS（日本学術振興会）が含まれる場合、科研費の課題名と KAKEN 課題ページ URL を自動取得して助成情報フィールドに入力する機能が必要（[Issue #2](https://github.com/tzhaya/jc-import-file-maker/issues/2), [Issue #7](https://github.com/tzhaya/jc-import-file-maker/issues/7)）。

**実装計画:** `docs/Implementation_KAKEN.md` に詳細記載。

**実装内容:**
1. **`CONFIG` 定数の変更:**
   - `API_KEY` → `OpenAlex_API_KEY` にリネーム
   - `CiNii_API_KEY` を新規追加（任意設定）
2. **`fetchOpenAlex()` の CONFIG参照先変更:** `CONFIG.API_KEY` → `CONFIG.OpenAlex_API_KEY`
3. **`fetchKaken(awardNumber)` 関数の新規追加（セクション 3.5）:**
   - award番号から `JP` プレフィックスを除去
   - CiNii Research Projects API を日本語・英語で並列呼び出し（`Promise.all`）
   - 課題名（日英）と KAKEN 課題ページ URL を返却
   - 日英タイトルが同一の場合は日本語のみ
4. **`buildFunders()` の async化:**
   - `flatMap` → `Promise.all` + `map` + `flat()` に変更（async対応）
   - JSPS判定: `funderDoi === '10.13039/501100001691'` かつ `CiNii_API_KEY` 設定済み
   - JSPS funder の各 award 番号で `fetchKaken()` を呼び出し
   - 取得した課題名を `subitem_award_titles`、KAKEN URL を `subitem_award_uri` に設定
   - KAKEN取得失敗時は `console.warn` のみで Crossref データを保持
5. **`mapToItemType()` の async化:** `buildFunders` の `await` 対応
6. **`fetchCrossrefData()` の修正:** `mapToItemType` 呼び出しに `await` 追加
7. **APIキー未設定警告の変更:** `CONFIG.API_KEY` → `CONFIG.OpenAlex_API_KEY`

**検証:**
- DOI `10.1016/j.advnut.2025.100480`: JSPS助成のaward番号でKAKEN連携が発動、日本語のみの課題名とURLが正しく入力されることを確認
- DOI `10.1002/advs.202512896`: 複数のJSPS funder award番号で、日英両方の課題名が正しく取得されることを確認

---

### NCID自動取得（CiNii Research Books API）✅（2026-02-19）

**背景:** Crossref APIから取得したISSN情報をもとに、CiNii Research OpenSearch API (books) を呼び出してNCID（NACSIS-CAT書誌ID）を自動取得し、収録物識別子（`source_identifier22`）フィールドに追加する機能が必要（[Issue #3](https://github.com/tzhaya/jc-import-file-maker/issues/3)）。

**実装内容:**
1. **`fetchNcid(issns)` 関数の新規追加（セクション 3.5.1）:**
   - ISSNの配列を受け取り、CiNii Research OpenSearch API（books）を順番に呼び出し
   - `CiNii_API_KEY` 設定時は `appid` パラメータを付与（任意、未設定でも動作）
   - レスポンスの `items[0]['dc:identifier']` から `@type === 'cir:NCID'` の `@value` を抽出
   - 最初にNCIDが見つかった時点でreturn、エラー時はスキップして次のISSNを試行
2. **`mapToItemType()` 内のNCID取得呼び出し（ISSN処理直後）:**
   - ISSN取得後、全ISSNを `fetchNcid()` に渡してNCIDを取得
   - NCIDが取得できた場合、`sourceIdentifiers` に `{ subitem_source_identifier: ncid, subitem_source_identifier_type: 'NCID', _ncidUrl: 'https://ci.nii.ac.jp/ncid/{ncid}' }` を追加
3. **NCID参照リンクの表示（ヒントセル）:**
   - `createFieldRow()` に `extra.hintOverride` パラメータを追加し、指定時はフィールド値の代わりにカスタムヒントを表示
   - `renderItemFields()` で `_ncidUrl` プロパティがある場合、CiNii書誌ページへのクリック可能なリンクを参照欄に表示

**検証:**
- DOI `10.1016/j.advnut.2025.100480`: 収録物識別子にPISSN/EISSNに加えてNCIDが自動追加されることを確認
- DOI `10.1104/pp.106.4.1707`: NCIDの参照欄に `https://ci.nii.ac.jp/ncid/AA00775335` のリンクが表示されることを確認

---

### DOI必須項目バッジ表示 ✅（2026-02-22）

**背景:** JaLC DOI / Crossref DOI の登録要件（JPCOAR/JaLC対照表 付録 ver.1.5）をユーザーが参照しながら入力できるよう、各フィールドのセクションヘッダーに必須・条件付必須のバッジを動的に表示する機能が必要（[Issue #15](https://github.com/tzhaya/jc-import-file-maker/issues/15)）。

**実装計画:** `docs/Implementation_doi_badges.md` に詳細記載。

**実装内容:**
1. **CSS: `.doi-badge` 4クラスの追加（L341-354）:**
   - `.jalc-required`: 青系・実線ボーダー（必須）
   - `.jalc-conditional`: 青系・破線ボーダー（条件付必須）
   - `.crossref-required`: 赤系・実線ボーダー（必須）
   - `.crossref-conditional`: 赤系・破線ボーダー（条件付必須）
2. **`DOI_REQUIREMENTS` 定数の追加（L549~）:**
   - 12フィールドの必須レベルマッピング（article/book別）
   - 対象: title0, creator2, publisher10, date11, resource_type13, identifier16, identifier_registration17, relation18, source_identifier22, source_title23, volume_number24, page_start27
   - 各エントリに `jalc`/`crossref` の必須レベル（`'required'`/`'conditional'`/`null`）と備考（`jalc_note`/`crossref_note`）を定義
3. **`getDoiCategory(resourceType)` 関数の追加:**
   - 資源タイプ文字列 → `'article'` / `'book'` / `null` に変換
   - article系: `conference paper`, `departmental bulletin paper`, `journal article`, `review article`, `data paper`, `editorial`, `article`, `newspaper`, `software paper`, `other`
   - book系: `book`, `book part`, `technical report`, `research report`, `report`, `thesis`, `bachelor thesis`, `master thesis`, `doctoral thesis`
4. **`getCurrentDoiCategory()` 関数の追加:**
   - DOM から `item_30002_resource_type13` セクションの select 値を取得して `getDoiCategory()` に渡す
5. **`createDoiBadges(fieldKey, category)` 関数の追加:**
   - fieldKey と category から `DOI_REQUIREMENTS` を参照してバッジ HTML 文字列を生成
   - `title` 属性に備考テキストを設定（ツールチップ）
6. **`updateDoiBadges()` 関数の追加:**
   - 全 `.field-section` ヘッダーの既存バッジを除去し、現在のカテゴリに応じたバッジを再挿入
   - `.summary` 要素の直前に挿入
7. **`renderItemFields()` の修正:**
   - `resourcetype` フィールドの `onChange` ハンドラ内で `updateDoiBadges()` を呼び出し
8. **`renderAll()` の修正:**
   - 末尾で `updateDoiBadges()` を呼び出し、初期表示（API取得後）でもバッジを反映

**検証:**
- `journal article` 選択時: タイトル・出版者・日付・巻・開始ページ等に `[JaLC必須]` `[Crossref必須]` バッジ表示
- `book` 選択時: 巻・開始ページのバッジ消失、関連情報に `[Crossref必須]` 表示
- `image` 等（対象外）: 全バッジ消去
- バッジホバー: ツールチップで備考表示（例: `Crossref: xml:lang必須`）
- DOI取得後の自動設定: API取得後の資源タイプ自動設定でもバッジが正しく表示

---

### CiNii識別子UI簡素化 ✅（2026-02-19）

**背景:** CiNii ID用の特別UI（hidden scheme + 専用入力欄 + CiNiiで検索ボタン）が実装されていたが、検索URLが誤っており動作しなかった。特別UIを廃止して標準の識別子UIに統合し、Scheme選択時の自動URI設定と正しい検索リンクを実装。

**実装内容:**
1. **CiNiiプレースホルダの削除（`mapToItemType()` 内）:**
   - 著者ごとに自動追加していた空のCiNiiエントリ `{ nameIdentifier: '', nameIdentifierScheme: 'CiNii', nameIdentifierURI: '' }` を削除
   - CiNii IDは手動でSchemeから選択する運用に変更
2. **CiNii特別UIの廃止と標準UIへの統合（`renderOnePerson()` 内）:**
   - hidden の Scheme/URI + 専用 CiNii ID 入力欄を廃止
   - 全識別子で統一された標準UI（識別子 / Scheme セレクト / URI テキスト）を使用
3. **Scheme onChange ハンドラの追加:**
   - Scheme セレクトで「CiNii」を選択した場合、URI フィールドに `https://ci.nii.ac.jp/nrid/` を自動セット（URIが空の場合のみ）
   - 「CiNiiで検索」ボタンの表示/非表示を切り替え
4. **CiNii検索URLの修正:**
   - 旧URL `https://cir.nii.ac.jp/ja/researchers/search?q=` → 新URL `https://cir.nii.ac.jp/researchers?q=`
   - 検索クエリ: 姓 名（`familyName givenName`、スペースは`%20`にURLエンコード）、取得不可時は creatorName/contributorName にフォールバック
5. **新規追加テンプレートへの反映:**
   - 識別子の「＋」ボタンで新規追加する際のテンプレートにも同じ onChange ハンドラと検索ボタンを設定

**検証:**
- Scheme で CiNii を選択 → URI に `https://ci.nii.ac.jp/nrid/` が自動セットされることを確認
- CiNii 選択時に「CiNiiで検索」ボタンが表示され、正しいURL `https://cir.nii.ac.jp/researchers?q=...` で開くことを確認
- 他のScheme選択時は検索ボタンが非表示であることを確認

---

### Chrome拡張化 + OPF API連携 ✅（2026-03-10）

**背景:** 以下の3つのAPIがCORS非対応のためブラウザから直接アクセスできず、機能が無効化・コメントアウトされていた（[Issue #70](https://github.com/tzhaya/jc-import-file-maker/issues/70)）。また、Open Policy Finder API連携の実装（PR [#61](https://github.com/tzhaya/jc-import-file-maker/pull/61)・[Issue #50](https://github.com/tzhaya/jc-import-file-maker/issues/50)）がCORS制約により単体では動作不可だった。
- KAKEN XML API (`https://kaken.nii.ac.jp/opensearch/`)
- JaLC API (`https://api.japanlinkcenter.org/`)
- Open Policy Finder API (`https://api.openpolicyfinder.jisc.ac.uk/`)

さらに、OpenAlex・CiNii の APIキーがHTMLソースにハードコードされており、Git管理に課題があった。

**実装内容:**

1. **`manifest.json` 新規作成（Manifest V3）:**
   - `permissions`: `storage`, `sidePanel`
   - `host_permissions`: KAKEN/JaLC/OPF の各APIエンドポイント
   - `side_panel.default_path`: `make_jc_importer.html`（ツールバーボタンでサイドパネルとして起動）
   - `options_page`: `options.html`

2. **`background.js` 新規作成（Service Worker）:**
   - `chrome.sidePanel.setPanelBehavior()` でツールバーボタンクリック時にサイドパネルを開く
   - `chrome.runtime.onMessage.addListener()` で `{ type: 'FETCH', url, options }` メッセージを受信し、CORS制約なしでAPIを呼び出してレスポンスを返す

3. **`options.html` 新規作成（APIキー管理 UI）:**
   - OpenAlex API Key / CiNii API Key / OPF API Key の3項目を入力フォームで設定
   - `chrome.storage.local.set()` で保存、読み込みは `chrome.storage.local.get()`
   - 保存時に「保存しました」フィードバック表示

4. **`make_jc_importer.html` の更新:**
   - **`CONFIG` に `OPF_API_KEY` を追加**
   - **`loadConfig()` 関数を追加:** `chrome.storage.local.get()` でAPIキーを読み込みCONFIGを更新。拡張外環境ではno-op
   - **`extensionFetch()` 関数を追加:** Chrome拡張利用可能時は `chrome.runtime.sendMessage()` 経由でService WorkerにfetchをProxy。不可時は通常の `fetch()` にフォールバック
   - **KAKEN XML API 有効化:** `fetchKakenXml()` 内の `fetch()` を `extensionFetch()` に変更。`buildFunders()` の3箇所のコメントアウトを解除して有効化
   - **JaLC API 有効化:** `fetchJaLC()` 内の `fetch()` を `extensionFetch()` に変更。`fetchData()` の `ra === 'JaLC'` 分岐でChrome拡張利用可能時に `fetchJaLCData(doi)` を呼び出すよう変更（不可時は「拡張版のみ対応」メッセージ）
   - **OPF API 連携（PR #61 対応）:**
     - `fetchOpenPolicyFinder(issns)`: `extensionFetch()` でOPF APIを呼び出し、ISSNを順次試行
     - `updateOpfStatus(issns)`: OPF取得を実行し、info-barのバッジを更新（取得中→見つかった/なし）
     - `openOpfModal()` / `closeOpfModal()` / `renderOpfModal()`: OPFポリシーモーダルの表示制御
     - info-bar に「📋 OAポリシー」バッジを追加（クリックでモーダル表示）
     - `#opf-modal` HTML要素をHTMLに追加
     - Escキーハンドラで `closeOpfModal()` も対象に追加
     - `fetchCrossrefData()` / `fetchJaLCData()` にOPF呼び出しを追加
   - **`fetchData()` に `await loadConfig()` を追加**

5. **`funder_lookup.html` の更新:**
   - `loadConfig()` と `extensionFetch()` を追加（`make_jc_importer.html` と同様）
   - `fetchKakenXml()` 内の `fetch()` を `extensionFetch()` に変更
   - `lookupOne()` 内のKAKEN XML API呼び出しのコメントアウトを解除
   - `doSearch()` の先頭に `await loadConfig()` を追加

**検証方法:**
- Chrome拡張として読み込み（`chrome://extensions/` → デベロッパーモード → パッケージ化されていない拡張機能を読み込む）
- `options.html` で各APIキーを設定・保存
- サイドパネルで `make_jc_importer.html` を開き、Crossref DOIで KAKEN XML API / OPF API が動作すること
- JaLC DOIでメタデータ取得が動作すること
- 通常ブラウザ（拡張なし）での既存動作が維持されること

---

## 未完了タスク

### Phase 2: TSVエクスポート機能（未着手）
- `collectMetadata()`: DOM から metadata オブジェクトを再構築
- `generateTsv()`: metadata → TSV 行へ変換（`tsv_headers.json` 準拠）
- ダウンロードボタン実装

---

## 参照ファイル一覧

| ファイル | 用途 |
|---------|------|
| `Implementation_phase1.md` | 実装計画（6ステップ） |
| `requirements.md` | 要件定義 |
| `ItemType.json` | フィールド構造・titleMap |
| `sample.json` | 出力データ構造の確認用 |
| `samples/Crossref/j.advnut.2025.100480.json` | Crossref サンプルデータ |
| `samples/OpenAlex/openalex.org_W4412424744.json` | OpenAlex サンプルデータ |
| `samples/ror.org_005pdtr14.json` | ROR v2 サンプルデータ |
| `resource_type_vocabulary.md` | 資源タイプ語彙 |
| `accessrights.md` | アクセス権語彙 |
| `JPCOARschme_guide.md` | JPCOARスキーマリンク |
| `relatedIdentifier.md` | 関連識別子 統制語彙（OpenAlex ids照合用） |
| `make_tsv.html` | レイアウト・ロジック参考元 |

---

## 技術メモ

- **ROR v2 API**: `names[].types` に `"ror_display"` を含むエントリが機関表示名。`external_ids[type=isni].all[0]` でISNI取得（スペース含む → 除去必要）
- **Crossref type**: ハイフン区切り（例: `"journal-article"`）→ スペースに変換して `TITLE_MAPS.resourcetype` と照合
- **出版タイプ**: `oa_status` が `gold` または `hybrid` → `VoR`、それ以外 → `AM`
- **ORCID 出所判定**: Crossref `cr.author[].ORCID` が存在すれば採用（警告なし）。なければ OpenAlex `authorships[].author.orcid` を使用（`_warnOrcid: true`）
- **言語フラグ**: 自動設定した言語（英語仮設定）には `_warnLang: true` を付与 → ⚠ 要確認バッジで表示
- **コンソールエラー**: `g9nhm28jb13afdh.js` 等のエラーはブラウザ拡張機能由来。実装コードとは無関係
- **主題フィールド**: API取り込み対象外。`item_30002_subject8` は空配列（空要素1件）のみ設定
- **OpenAlex ids照合**: `oaJson.ids` のキーを大文字化して `relatedIdentifier.md` の識別子列と比較。`DOI`・`OpenAlex` は除外
- **JATS処理**: `processAbstract()` で7ステップ処理（改行削除→実体参照解除→先頭jats:title削除→セクションタイトル変換→タグ除去→スペース正規化）
- **空値時の言語設定**: テキスト値が空の場合は言語フィールドを含めない（`sample.json` の誤パターンに従わないこと）
- **APC除外**: `requirements.md` の取り込み対象外フィールドに準拠し、`EXCLUDED_KEYS` に追加。FIELD_DEFS・mapToItemType・TITLE_MAPS・JPCOAR_LINKS・buildEmptyMetadata からも全削除
- **位置情報**: 点（経度/緯度）、空間（矩形4値）、自由記述（テキスト配列）の3タイプを1エントリに格納。追加ボタンで複数エントリ追加可
- **会議記述**: 7サブセクション構造。開催国は ISO 3166-1 alpha-3 コード（249か国、`TITLE_MAPS.subitem_conference_country`）
- **権利者情報**: 権利者名（配列）+ 権利者識別子（配列）のネスト構造。`renderItemFields` の `t:'nested'` スキップ問題を専用レンダラーで解消
- **参照用列**: `showHints` フラグで制御。`createFieldRow()` がラベル→ヒント→入力欄の順で配置。selectフィールドはドロップダウン自体が値を表示するためヒント非表示。readonlyフィールド（URI自動連動等）もヒント不要のため非表示。[+ 追加]ボタンで新規追加したエントリは値が空のためヒント非表示（正しい挙動）
