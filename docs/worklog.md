# 作業ログ: make_jc_importer.html 実装記録

最終更新: 2026-02-19（CiNii識別子UI簡素化）

## プロジェクト概要
JAIRO Cloud インポート用TSV生成ツール (`make_jc_importer.html`) の新規実装。
DOI を入力して Crossref / OpenAlex / ROR API から書誌メタデータを取得し、JAIRO Cloud の ItemType 構造に変換してアコーディオン付き編集可能テーブルに表示するシングルページ HTML アプリ。

実装計画: `Implementation_phase1.md`
対象ファイル: `make_jc_importer.html`（新規作成）
現在のファイル規模: **約2546行**（STEP 1〜6 + クリーンアップ＋フィールド補完＋参照用列 + APIキー設定 + RA判定 + KAKEN連携 + NCID取得）

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
| `j.advnut.2025.100480.json` | Crossref サンプルデータ |
| `openalex.org_W4412424744.json` | OpenAlex サンプルデータ |
| `ror.org_005pdtr14.json` | ROR v2 サンプルデータ |
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
