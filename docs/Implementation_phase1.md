# JAIRO Cloud インポート用TSV生成ツール 実装計画（Phase 1: データ取り込みと表示）

## Context

DOI を入力して Crossref / OpenAlex / ROR API から書誌メタデータを取得し、JAIRO Cloud の ItemType.json の構造に変換して、アコーディオン付きの編集可能なテーブルに表示するシングルページ HTML アプリケーションを新規作成する。
TSV エクスポート機能は次バージョン(Phase 2)で実装するため、本 Phase では **データ取得→マッピング→表示・編集** に集中する。

---

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `make_jc_importer.html` | **新規作成**（メインアプリケーション） |
| `ItemType.json` | 読み取り参照（titleMap、フィールド構造） |
| `tsv_headers.json` | 読み取り参照（将来の TSV 出力用、今回は未使用） |
| `resource_type_vocabulary.md` | 参照（資源タイプ→URI マッピングデータ） |
| `accessrights.md` | 参照（アクセス権→URI マッピングデータ） |
| `JPCOARschme_guide.md` | 参照（フィールド名リンク先 URL） |
| `sample.json` | 参照（出力データ構造の確認用） |
| `relatedIdentifier.md` | 参照（関連識別子 統制語彙） |
| `make_tsv.html` | 参照（ロジックの参考元） |

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│  make_jc_importer.html（単一 HTML ファイル）       │
│                                                   │
│  ┌──── HTML ────┐  ┌──── CSS ────┐  ┌── JS ──┐  │
│  │ DOI入力エリア  │  │ スタイル定義 │  │ モジュール│  │
│  │ 情報バー      │  │             │  │        │  │
│  │ プレビューテーブル│ │             │  │        │  │
│  └──────────────┘  └─────────────┘  └────────┘  │
│                                                   │
│  JS モジュール構成:                                 │
│  1. 定数・マスターデータ (EXCLUDED_KEYS, RESOURCE_TYPE_MAP, etc.)│
│  2. API 取得層 (fetchCrossref, fetchOpenAlex, fetchRor)│
│  3. データマッピング層 (mapToItemType, buildAuthors)    │
│  4. UI レンダリング層 (renderAccordionTable)           │
│  5. 入力支援 (select menus, auto-URI, warnings)       │
│  6. 動的追加・削除 (addNestedItem, removeNestedItem)   │
└─────────────────────────────────────────────────┘
```

---

## 実装ステップ

### Step 1: HTML 骨格と CSS スタイル

**HTMLレイアウト構造:**

```
<body>
  <h1>JAIRO Cloud インポート用TSV生成ツール</h1>

  <!-- DOI入力エリア -->
  <div id="input-area">
    <input id="doi-input"> + <button id="fetch-btn">
    <button id="empty-btn">  ← 空値で全フィールド表示（テスト用）
    <input id="pos-index-input" value="1718256617194">
    <div id="loading">
    <div id="error-msg">
    <div id="info-bar">  ← DOIリンク + OAバッジ
  </div>

  <!-- メタデータプレビュー -->
  <div id="preview-area">
    <h2>メタデータ確認・編集</h2>
    <div id="system-fields">  ← システム管理フィールド（テーブル形式）
    <div id="metadata-fields"> ← メタデータフィールド（アコーディオンテーブル）
  </div>
</body>
```

**CSS要件:**
- make_tsv.html のスタイルを踏襲（配色: `#2c5f2e` 系）
- アコーディオン用スタイル: 左ボーダー + インデント（ネストレベルごとに `margin-left` 増加）
- 展開/折りたたみアイコン（▶/▼）
- `[+ 追加]` / `[− 削除]` ボタンスタイル
- 折りたたみ時の概要表示スタイル

### Step 2: 定数・マスターデータ定義

JS に以下のデータをインライン定義する:

1. **除外フィールドリスト** (`EXCLUDED_KEYS`)
   - requirements.md「取り込み対象外のフィールド」に記載の 13 キー
   - `title_i18n_temp` 関連も除外
   - `authorInputButton` も除外

2. **資源タイプ語彙マッピング** (`RESOURCE_TYPE_MAP`)
   - `resource_type_vocabulary.md` から生成
   - `{ "conference paper": "http://purl.org/coar/resource_type/c_5794", ... }`
   - Crossref の `message.type` のハイフンをスペースに置換して照合

3. **アクセス権マッピング** (`ACCESS_RIGHTS_MAP`)
   - `accessrights.md` から生成
   - `{ "open access": "http://purl.org/coar/access_right/c_abf2", ... }`

4. **JPCOAR リンクマッピング** (`JPCOAR_LINKS`)
   - `JPCOARschme_guide.md` から生成
   - `{ "タイトル": "https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/1", ... }`

5. **titleMap データ**
   - `ItemType.json` から言語・タイプ等の選択肢を抽出しインライン定義
   - 例: 言語選択肢 `["ja","ja-Kana","en","fr","it","de","es","zh-cn","zh-tw","ru","la","ms","eo","ar","el","ko"]`

### Step 3: API 取得層

make_tsv.html の既存ロジックを参考に、3 つの API フェッチ関数を実装:

#### 3.1 `fetchCrossref(doi)` → Promise<Object>
- URL: `https://api.crossref.org/works/${doi}`
- 返却: `response.message`
- エラー処理: 404 → "DOI が見つかりません"

#### 3.2 `fetchOpenAlex(doi)` → Promise<Object>
- URL: `https://api.openalex.org/works/doi:${doi}`
- 返却: レスポンス全体
- OA ステータスの抽出: `open_access.oa_status`

#### 3.3 `fetchRorDetails(rorId)` → Promise<Object>
- URL: `https://api.ror.org/v2/organizations/${rorId}`
- ISNI 抽出: `external_ids[type=isni].all[0]`（スペース除去）
- ror_display 名抽出: `names[types includes "ror_display"].value`
- 返却: `{ isni, rorDisplayName, rorId }`

#### 3.4 `fetchAllRorData(oaJson)` → Promise<Map>
- OpenAlex の `authorships[].institutions[].ror` からユニークな ROR URI を抽出
- 各 ROR に対して `fetchRorDetails()` を並列実行
- 返却: `Map<rorUri, { isni, rorDisplayName }>`

#### 3.5 メイン取得フロー `fetchData()`
```
1. DOI 正規化（prefix/suffix 形式に変換）
2. Promise.all([fetchCrossref(doi), fetchOpenAlex(doi)])
3. await fetchAllRorData(oaJson)
4. mapToItemType(crJson, oaJson, rorMap)
5. renderAll(mappedData)
6. 情報バー表示（DOIリンク、OAバッジ）
```

#### 3.6 空値テスト表示 `showEmptyFields()`

API を呼ばず、ItemType.json のフィールド定義から全対象フィールドを空値で生成し表示する。

```
1. ItemType.json の form 配列を走査
2. EXCLUDED_KEYS に該当するフィールドはスキップ
3. 各フィールドについて空の metadata オブジェクトを構築
   - 配列フィールド: 要素1つ（中身は空文字列）を持つ配列
   - 単一フィールド: 空文字列
   - ネスト構造: 末端まで空値で展開
4. システムフィールドはデフォルト値を設定（pos_index, pubdate 等）
5. renderAll(emptyMetadata) で表示
```

**用途:**
- 全フィールドの表示・レイアウトを API 接続なしで確認
- select メニュー・アコーディオン・追加/削除ボタンの動作テスト
- 手動入力のみでメタデータを作成するワークフロー

### Step 4: データマッピング層

Crossref / OpenAlex / ROR のレスポンスを `sample.json` の構造（ItemType 形式）に変換する。

#### 4.1 メタデータ内部データモデル

マッピング結果を以下の JavaScript オブジェクトとして保持:

```javascript
const metadata = {
  // システムフィールド
  system: {
    id: '',
    uri: '',
    path: '',
    pos_index: '1718256617194',
    publish_status: 'private',
    feedback_mail: '',
    cnri: '',
    doi_ra: '',
    doi: '',
    edit_mode: 'Keep',
    pubdate: todayStr()
  },
  // メタデータフィールド（ItemType 準拠）
  item_30002_title0: [ { subitem_title: '...', subitem_title_language: 'en' } ],
  item_30002_creator2: [ { creatorType: 'Author', creatorNames: [...], nameIdentifiers: [...], creatorAffiliations: [...] } ],
  // ... 以下、sample.json の構造に準拠
};
```

#### 4.2 フィールドごとのマッピングルール

| 対象フィールド | ソース | マッピングロジック |
|---|---|---|
| **タイトル** (`item_30002_title0`) | `cr.title[0]` | タイトル文字列、言語="en" |
| **作成者** (`item_30002_creator2`) | Crossref + OpenAlex + ROR | → Step 4.3 で詳述 |
| **アクセス権** (`item_30002_access_rights4`) | 固定値 | "open access" + URI 自動設定 |
| **権利情報** (`item_30002_rights6`) | `cr.license[vor].URL` + `cr.assertion[Copyright]` | requirements.md の仕様通り |
| **内容記述** (`item_30002_description9`) | `cr.abstract` | JATS構造解析処理（→ Step 4.6 で詳述）、type="Abstract"、lang="en" |
| **出版者** (`item_30002_publisher10`) | `cr.publisher` | 言語="en" |
| **日付** (`item_30002_date11`) | `cr.published-online` or `cr.published-print` | type="Issued" |
| **言語** (`item_30002_language12`) | 固定 | "eng" |
| **資源タイプ** (`item_30002_resource_type13`) | `cr.type` | RESOURCE_TYPE_MAP で照合→URI 自動設定 |
| **関連情報** (`item_30002_relation18`) | `cr.DOI` + OpenAlex `ids` | → Step 4.5 で詳述 |
| **収録物識別子** (`item_30002_source_identifier22`) | `cr.ISSN`, `cr.issn-type` | ISSN/EISSN 判定 |
| **収録物名** (`item_30002_source_title23`) | `cr.container-title[0]` | 言語="en" |
| **巻・号・ページ** | `cr.volume`, `cr.issue`, `cr.page` | 直接マッピング |
| **書誌情報** (`item_30002_bibliographic_information29`) | 上記の複合 | 雑誌名 + 巻 + 号 + ページ + 発行日 |
| **助成情報** (`item_30002_funding_reference21`) | `cr.funder[]` | → Step 4.4 で詳述 |
| **主題** (`item_30002_subject8`) | なし（API取り込み対象外） | 空の編集可能フィールドを準備。OpenAlex keywords は著者キーワードではないため取り込まない |
| **出版タイプ** (`item_30002_version_type15`) | OA判定 | Gold OA → VoR、それ以外 → AM |
| **OA ステータス** | `oa.open_access.oa_status` | バッジ表示のみ（データには含めない） |

#### 4.3 作成者マッピング（最重要・最複雑）

```
Crossref author[] + OpenAlex authorships[] + ROR Map → item_30002_creator2[]

各著者について:
  1. creatorType: "Author"
  2. creatorNames: [{ creatorName: "Family, Given", creatorNameLang: "en", creatorNameType: "Personal" }]
  3. familyNames: [{ familyName, familyNameLang: "en" }]
  4. givenNames: [{ givenName, givenNameLang: "en" }]
  5. nameIdentifiers (ORCID):
     - 優先順位: Crossref cr.author[].ORCID → OpenAlex oa.authorships[].author.orcid
     - OpenAlex由来の場合: warn フラグ = true（⚠ 要確認）
     - scheme: "ORCID", URI: "https://orcid.org/{id}"
  6. creatorAffiliations[]:
     - OpenAlex authorships[].institutions[] から取得
     - 各 institution の ROR ID で rorMap を参照
     - affiliationNames: [{ affiliationName: rorDisplayName, affiliationNameLang: "en" }]
     - affiliationNameIdentifiers: [
         { identifier: isni, scheme: "ISNI", URI: "https://isni.org/isni/{isni}" },
         { identifier: rorId, scheme: "ROR", URI: "https://ror.org/{rorId}" }
       ]
```

**著者マッチング:**
- Crossref と OpenAlex の著者を姓（family name）で照合
- 一致しない場合は位置（インデックス）で対応

#### 4.4 助成情報マッピング

```
Crossref funder[] → item_30002_funding_reference21[]

各 funder について:
  1. subitem_funder_names: [{ name: funder.name, lang: "en" }]
  2. subitem_funder_identifiers:
     - funder.DOI があれば: { identifier: "https://doi.org/{DOI}", type: "Crossref Funder" }
  3. subitem_award_numbers:
     - funder.award[0] があれば: { number: award, uri: "" }
  4. subitem_award_titles: [] (Crossref には課題名がないため空)
```

#### 4.5 関連情報マッピング

Crossref DOI に加え、OpenAlex `ids` から追加識別子を照合・追加する。

```
item_30002_relation18[] の構築:

1. Crossref DOI エントリ:
   - subitem_relation_type: "isIdenticalTo"
   - subitem_relation_type_id:
     - subitem_relation_type_select: "DOI"
     - subitem_relation_type_id_text: "https://doi.org/{DOI}"
   - subitem_relation_name: []  ← テキストがないので空配列

2. OpenAlex ids エントリ（DOI, OpenAlex は除外）:
   - oaJson.ids の各 key を大文字に変換
   - relatedIdentifier.md の「識別子」列と照合
   - 一致する場合にエントリを追加:
     - subitem_relation_type: "isIdenticalTo"
     - subitem_relation_type_id:
       - subitem_relation_type_select: key.toUpperCase() (例: "PMID")
       - subitem_relation_type_id_text: ids[key] の値 (例: "https://pubmed.ncbi.nlm.nih.gov/40653270")
     - subitem_relation_name: []  ← テキストがないので空配列
```

**照合ルール:**
- OpenAlex `ids` のキーを大文字化して `relatedIdentifier.md` の識別子列と比較
- `DOI` と `OpenAlex` は無視（DOI は Crossref 側で処理済み）
- `relatedIdentifier.md` に定義のない識別子タイプは無視

#### 4.6 内容記述の JATS 処理

Crossref API の `abstract` フィールドには JATS XML タグがエスケープされた状態で含まれることが多い。
単純なタグ除去ではなく、以下の段階的処理を行う:

```javascript
function processAbstract(raw) {
  // 1. 改行コードを削除
  let text = raw.replace(/\r?\n/g, '');

  // 2. エスケープされた実体参照を解除
  //    &lt; → <, &gt; → >, &amp; → &, &apos; → ', &quot; → "

  // 3. 先頭の <jats:title>...</jats:title> を削除
  //    例: <jats:title>Abstract</jats:title> → 除去

  // 4. <jats:sec> 内の <jats:title>...</jats:title> を "TITLE: " 形式に変換
  //    例: <jats:title>IMPORTANT</jats:title> → "IMPORTANT: "

  // 5. <jats:sec> 内の <jats:p>...</jats:p> のテキストを取り込む

  // 6. 残存する全タグを除去

  // 7. 半角スペースが連続する場合は1つに統一
  text = text.replace(/ {2,}/g, ' ').trim();

  return text;
}
```

#### 4.7 言語設定ルール

全フィールド共通の言語設定ルール:

- API から言語情報が得られない場合は `"en"` を仮設定し `_warnLang: true` を付与
- **テキスト値が空の場合は言語を設定しない**（空配列 `[]` またはエントリ自体を省略）
  - 例: `subitem_relation_name` にテキストがない場合 → `subitem_relation_name: []`
  - `sample.json` に同パターンの誤った例があるが、これに従わない

### Step 5: UI レンダリング層（アコーディオンテーブル）

#### 5.1 レンダリング方針

`metadata` オブジェクトを走査し、`ItemType.json` のフィールド定義と照合しながら、以下のルールで HTML を動的生成する:

1. **除外フィールド** (`EXCLUDED_KEYS`) に該当するキーはスキップ
2. **`authorInputButton`** は表示しない
3. トップレベルのフィールドごとにセクションを作成
4. 配列フィールド（`[]` 付き）はアコーディオンで展開可能
5. 各フィールドの `title_i18n.ja` を日本語ラベルとして使用
6. `titleMap` があるフィールドは `<select>` メニューで表示
7. それ以外は `<input type="text">` または `<textarea>`（内容記述など長文フィールド）

#### 5.2 アコーディオンUI構造

```html
<!-- Level 0: トップレベルフィールド -->
<div class="field-section" data-key="item_30002_creator2">
  <div class="section-header" onclick="toggleAccordion(this)">
    <span class="toggle-icon">▼</span>
    <a href="https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/3" target="_blank">作成者</a>
    <span class="summary">（Shiratori, Sakiko 他 5名）</span>  ← 折りたたみ時に表示
  </div>

  <!-- Level 1: 各作成者 -->
  <div class="accordion-content">
    <div class="nested-item" data-index="0">
      <div class="item-header">
        <span class="toggle-icon">▼</span>
        作成者[0]: Shiratori, Sakiko
        <button class="btn-delete" onclick="removeItem(...)">− 削除</button>
      </div>
      <div class="item-content">
        <!-- 作成者タイプ -->
        <div class="field-row" data-depth="1">
          <label>作成者タイプ</label>
          <input type="text" value="Author">
        </div>
        <!-- 作成者姓名 -->
        <div class="field-row" data-depth="1">
          <label>姓名</label>
          <input type="text" value="Shiratori, Sakiko">
          <select>言語選択</select>
        </div>

        <!-- Level 2: 作成者所属（アコーディオン） -->
        <div class="nested-section" data-key="creatorAffiliations">
          <div class="nested-header">
            <span class="toggle-icon">▼</span>
            作成者所属
            <button class="btn-add" onclick="addItem(...)">+ 追加</button>
          </div>

          <!-- Level 2 各所属 -->
          <div class="nested-item" data-index="0">
            <div class="item-header">
              作成者所属[0]
              <button class="btn-delete">− 削除</button>
            </div>

            <!-- Level 3: 所属機関名 -->
            <div class="nested-section">
              所属機関名
              <button class="btn-add">+ 追加</button>
              <div class="field-row" data-depth="3">
                <label>所属機関名</label>
                <input value="Japan International Research Center...">
                <select>言語選択</select>
              </div>
            </div>

            <!-- Level 3: 所属機関識別子 -->
            <div class="nested-section">
              所属機関識別子
              <button class="btn-add">+ 追加</button>
              <!-- Level 4 各識別子 -->
              <div class="field-row" data-depth="3">
                <label>所属機関識別子</label>
                <input value="0000000121078171">
                <select>Scheme選択 (ISNI/ROR/GRID...)</select>
                <input value="https://isni.org/isni/..."> ← URI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="btn-add" onclick="addItem('item_30002_creator2')">+ 作成者を追加</button>
  </div>
</div>
```

#### 5.3 視覚的階層表現

| ネストレベル | 左ボーダー色 | インデント | アイコン |
|---|---|---|---|
| Level 0（トップ） | なし | 0px | なし |
| Level 1（配列要素） | `#4caf50` | 16px | 📦 |
| Level 2（子配列） | `#81c784` | 32px | 📍 |
| Level 3（孫配列） | `#a5d6a7` | 48px | 📎 |
| Level 4（曾孫） | `#c8e6c9` | 64px | ・ |

#### 5.4 システムフィールドの表示

requirements.md の「システムフィールドの表示と入力」テーブルに基づき、プレビューエリアの上部に専用セクションを設ける:

```
┌───────────────────────────────────────────────────────┐
│ システム（管理フィールド）                               │
├──────────────────┬──────────────┬──────────────────────┤
│ フィールド名       │ 候補値        │ 値（編集可能）        │
├──────────────────┼──────────────┼──────────────────────┤
│ .id              │              │ [         ]          │
│ .uri             │              │ [         ]          │
│ .IndexID[0]      │              │ [         ]          │
│ .POS_INDEX[0]    │ 1718256617194│ [1718256617194]      │
│ .PUBLISH_STATUS  │ private/public│ [private  ▼]        │  ← select
│ .FEEDBACK_MAIL[0]│              │ [         ]          │
│ .CNRI            │              │ [         ]          │
│ .DOI_RA          │ JaLC/Crossref│ [         ▼]        │  ← select
│ .DOI             │              │ [         ]          │
│ Keep/Upgrade     │ Keep/Upgrade │ [Keep     ▼]        │  ← select
│ 公開日            │ YYYY-MM-DD  │ [2026-02-14]        │  ← 実行日自動設定
└──────────────────┴──────────────┴──────────────────────┘
```

#### 5.5 入力支援機能

**select メニュー:**
- titleMap ありのフィールドは `<select>` を生成
- 言語選択: ja, ja-Kana, en, fr, it, de, es, zh-cn, zh-tw, ru, la, ms, eo, ar, el, ko
- 資源タイプ: titleMap + RESOURCE_TYPE_MAP からの URI 自動設定
- アクセス権: titleMap + ACCESS_RIGHTS_MAP からの URI 自動設定
- その他: 各フィールドの titleMap に定義された選択肢

**資源タイプ連動:**
```javascript
// 資源タイプ select の onChange
function onResourceTypeChange(selectEl) {
  const selectedValue = selectEl.value;
  const uri = RESOURCE_TYPE_MAP[selectedValue] || '';
  // 対応する resourceuri フィールドに自動設定
  document.querySelector('[data-key="resourceuri"]').value = uri;
}
```

**アクセス権連動:**
```javascript
function onAccessRightChange(selectEl) {
  const selectedValue = selectEl.value;
  const uri = ACCESS_RIGHTS_MAP[selectedValue] || '';
  document.querySelector('[data-key="subitem_access_right_uri"]').value = uri;
}
```

**警告表示（⚠ 要確認）:**
- ORCID が OpenAlex 由来の場合: `⚠ 要確認` (title="OpenAlexから取得した値です。正確か確認してください")
- 言語を自動設定した場合: `⚠ 要確認` (title="仮に英語として設定しています。正確か確認してください")

**JPCOARリンク:**
- フィールド名のラベルを `<a href="..." target="_blank">` でリンク化
- `JPCOAR_LINKS` マッピングを参照

### Step 6: 動的追加・削除機能

#### 6.1 汎用追加関数

```javascript
function addNestedItem(parentKey, templateData) {
  // 1. metadata オブジェクトの該当配列に空テンプレートを追加
  // 2. 新しい DOM 要素を生成（アコーディオン項目）
  // 3. 追加ボタンの直前に挿入
  // 4. インデックス番号を更新
}
```

**追加可能なセクション:**
- 作成者 (`item_30002_creator2[]`)
- 作成者所属 (`creatorAffiliations[]`)
- 所属機関名 (`affiliationNames[]`)
- 所属機関識別子 (`affiliationNameIdentifiers[]`)
- 寄与者 (`item_30002_contributor3[]`) — 同構造
- 主題 (`item_30002_subject8[]`)
- 権利情報 (`item_30002_rights6[]`)
- 収録物識別子 (`item_30002_source_identifier22[]`)
- 助成情報 (`item_30002_funding_reference21[]`)
- 関連情報 (`item_30002_relation18[]`)
- その他の繰り返し可能フィールド

#### 6.2 汎用削除関数

```javascript
function removeNestedItem(parentKey, index) {
  // 1. 確認ダイアログ表示
  // 2. metadata オブジェクトから該当要素を splice
  // 3. DOM 要素を削除
  // 4. 残りの要素のインデックスを振り直し
}
```

#### 6.3 展開/折りたたみ

```javascript
function toggleAccordion(headerEl) {
  const content = headerEl.nextElementSibling;
  const icon = headerEl.querySelector('.toggle-icon');
  const summary = headerEl.querySelector('.summary');

  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.textContent = '▼';
    summary.style.display = 'none';
  } else {
    content.style.display = 'none';
    icon.textContent = '▶';
    // 概要を更新して表示
    summary.textContent = buildSummary(headerEl);
    summary.style.display = 'inline';
  }
}
```

**概要表示の生成:**
- 作成者: 最初の著者名 + "他 N名"
- 所属: 機関名の最初の値
- 助成: 助成機関名の最初の値

---

## 実装順序

| # | タスク | 依存 | 推定規模 |
|---|--------|------|---------|
| 1 | HTML骨格 + CSS スタイル定義 | なし | 小 |
| 2 | 定数・マスターデータ定義（JS） | なし | 中 |
| 3 | API 取得層（fetchCrossref, fetchOpenAlex, fetchRorDetails, fetchAllRorData） | なし | 中 |
| 4 | データマッピング層（mapToItemType, buildAuthors） | 2, 3 | 大 |
| 5 | システムフィールド表示 | 1, 4 | 小 |
| 6 | アコーディオンUI基盤（展開/折りたたみ、ネスト表現） | 1 | 中 |
| 7 | メタデータフィールドレンダリング（全フィールド走査・表示） | 2, 4, 6 | 大 |
| 8 | select メニュー生成（titleMap 対応） | 2, 7 | 中 |
| 9 | 資源タイプ・アクセス権の URI 自動連動 | 2, 8 | 小 |
| 10 | 動的追加・削除機能 | 6, 7 | 大 |
| 11 | 警告表示（⚠ 要確認） | 7 | 小 |
| 12 | JPCOAR リンク付与 | 2, 7 | 小 |
| 13 | OA ステータスバッジ表示 | 3 | 小 |
| 14 | DOI入力正規化 + DOIリンク表示 | 1 | 小 |
| 15 | 空値テスト表示ボタン（showEmptyFields） | 2, 6, 7 | 中 |
| 16 | 結合テスト + サンプルDOIでの動作確認 | 全て | 中 |

---

## 検証方法

1. **サンプル DOI でのテスト**: `10.1016/j.advnut.2025.100480`
   - ブラウザで `make_jc_importer.html` を開く
   - DOI を入力して「データ取得」をクリック
   - 以下を確認:
     - DOI リンクが正しく表示される
     - OA バッジが表示される
     - 全著者（Shiratori, Sakiko 他）が作成者セクションに表示される
     - 各著者の所属機関が表示される（ISNI, ROR 識別子付き）
     - ORCID が正しく表示される（OpenAlex 由来の場合は ⚠ 付き）
     - 資源タイプが "journal article" で URI が自動設定される
     - アクセス権が "open access" で URI が自動設定される
     - 権利情報（Copyright + ライセンス URL）が表示される
     - 関連情報に DOI リンクが設定される（OpenAlex に PMID 等があれば追加エントリも表示される）
     - 主題は空の編集可能フィールドが表示される（API から取り込まれない）
     - 内容記述のアブストラクトが JATS タグなしのプレーンテキストで表示される
     - 助成情報（3件）が表示される
     - 書誌情報（雑誌名、巻、号、開始ページ）が表示される

2. **UI 操作テスト**:
   - アコーディオンの展開/折りたたみが動作する
   - 折りたたみ時に概要が表示される
   - [+ 追加] で新しい項目が追加される
   - [− 削除] で項目が削除される
   - select メニューで選択値が変更できる
   - 資源タイプ変更時に URI が連動する
   - テキスト入力が編集可能

3. **`sample.json` との照合**:
   - 表示されるデータが `sample.json` の構造と一致することを手動確認
   - 特に `item_30002_creator2` の nested 構造が正しいこと

4. **DOI 入力形式テスト**:
   - `10.1016/j.advnut.2025.100480` → 正常動作
   - `doi:10.1016/j.advnut.2025.100480` → 正常動作
   - `https://doi.org/10.1016/j.advnut.2025.100480` → 正常動作

---

## STEP 5 詳細実装計画（UIレンダリング層）

### アーキテクチャ
- **FIELD_DEFS配列**: 全フィールドの表示順・ラベル・型・サブフィールド定義を宣言的に定義
- **ヘルパー関数**: DOM生成の共通処理（セクション、フィールド行、ネスト項目）
- **汎用レンダラー**: 配列フィールド(renderArrayField)とオブジェクトフィールド(renderObjectField)の2種
- **専用レンダラー**: 複雑なネスト構造を持つフィールド用（creator, contributor, relation, funding, biblio）
- **renderAll(metadata)**: メイン関数。FIELD_DEFSを走査しtype別にレンダラーへ振り分け
- **buildEmptyMetadata()**: 空値テスト表示用の空メタデータオブジェクト生成

### フィールド分類

| 型 | フィールド | レンダラー |
|---|---|---|
| array | title, alt_title, rights, rights_holder, subject, description, publisher, date, language, identifier, source_identifier, source_title, temporal, geolocation, conference | renderArrayField |
| object | access_rights, apc, resource_type, version, version_type, id_registration, volume, issue, pages, page_start, page_end | renderObjectField |
| creator | creator2 | renderPersonField(isCreator=true) |
| contributor | contributor3 | renderPersonField(isCreator=false) |
| relation | relation18 | renderRelationField |
| funding | funding_reference21 | renderFundingField |
| biblio | bibliographic_information29 | renderBiblioField |

### 専用レンダラーのネスト構造

**renderPersonField (creator/contributor共通)**:
- Level 1: 各人物[i] — アコーディオン
  - フィールド行: creatorType / contributorType
  - Level 2: 姓名[] — ネストセクション
  - Level 2: 姓[] — ネストセクション
  - Level 2: 名[] — ネストセクション
  - Level 2: 識別子[] — ネストセクション
  - Level 2: 所属[] — ネストセクション
    - Level 3: 所属機関名[] — ネストセクション
    - Level 3: 所属機関識別子[] — ネストセクション
      - Level 4: 各識別子[j] — アコーディオン

**renderRelationField**:
- Level 1: 各関連情報[i] — アコーディオン
  - フィールド行: relation_type (select)
  - フィールド行: relation_type_select (select)
  - フィールド行: relation_type_id_text (text)
  - Level 2: 関連名称[] — ネストセクション

**renderFundingField**:
- Level 1: 各助成情報[i] — アコーディオン
  - Level 2: 助成機関名[] — ネストセクション
  - フィールド行: 助成機関識別子 (text)
  - フィールド行: 助成機関識別子タイプ (select)
  - フィールド行: 研究課題番号 (text)
  - フィールド行: 研究課題番号URI (text)
  - Level 2: 研究課題名[] — ネストセクション

**renderBiblioField**:
- 単一オブジェクト（配列ではない）
  - Level 2: 雑誌名[] — ネストセクション
  - フィールド行: 巻, 号, 開始ページ, 終了ページ, ページ数 (text)
  - フィールド行: 発行日 (text) + 発行日タイプ (select)

### 入力支援機能
- **select メニュー**: TITLE_MAPSのキーを参照してbuildSelect()で生成
- **URI連動**: 資源タイプ・アクセス権のselect変更時、対応するURIフィールドを自動更新
- **警告バッジ**: `_warnLang`→「仮に英語として設定」、`_warnOrcid`→「OpenAlexから取得」
- **JPCOARリンク**: JPCOAR_LINKSからフィールドラベルをリンク化

### サマリー表示（折りたたみ時）
- 作成者/寄与者: 「Shiratori, Sakiko 他5名」
- 主題: 「food-based dietary... 他4件」
- 内容記述: 先頭50文字 + "…"
- 日付: 「2025-07-11 (Issued)」
- その他: 最初の値を表示

### 実装手順

1. STEP 5 コード挿入（STEP 4の後、Enter キーハンドラーの前）
   - `let currentMetadata = null;`
   - FIELD_DEFS 定義
   - ヘルパー関数: `createSection()`, `createFieldRow()`, `createNestedItem()`, `createNestedSectionHeader()`
   - 汎用レンダラー: `renderArrayField()`, `renderObjectField()`
   - 専用レンダラー: `renderPersonField()`, `renderRelationField()`, `renderFundingField()`, `renderBiblioField()`
   - `renderAll(metadata)`
   - `buildEmptyMetadata()`

2. fetchData() 更新
   - 現在のフォールバック処理（デモ表示）を削除し、`renderAll(metadata)` を直接呼び出すように変更

3. showEmptyFields() 更新
   - `buildEmptyMetadata()` + `renderAll()` を使用するように変更

4. 追加/削除ボタン
   - STEP 5では表示のみ（onclick = event.stopPropagation()）。実際の動作はSTEP 6で実装

---

## STEP 6 詳細実装計画（動的追加・削除機能）

### 背景・方針

**Direct DOM manipulation**（メタデータオブジェクト非更新）を採用:
- `currentMetadata` は初期レンダリング時のスナップショットであり、DOM編集後と非同期
- Add/Delete は DOM を直接操作し `currentMetadata` は更新しない
- Phase 2 (TSV出力) で実装する `collectMetadata()` が DOM から値を読み取る設計

### 現状の各関数のボタン状態

| 関数 | 削除ボタン | 追加ボタン |
|------|-----------|-----------|
| `createNestedItem(label, level)` | あり（stopPropのみ） | なし（外部で createAddButton） |
| `createNestedSectionHeader(label, level)` | ヘッダーに追加ボタン（stopPropのみ） | — |
| `createAddButton(label)` | なし | あり（stopPropのみ） |
| `renderArrayField` | createNestedItem を使用（Level 1） | createAddButton を使用 |
| `renderPersonField` | サブ配列エントリはフラットな field-row のみ | createAddButton のみ |

### 変更 1: CSS に `.entry-group` スタイル追加

```css
.entry-group {
  border-left: 2px solid #e0e0e0;
  margin: 4px 0 4px 16px;
  padding: 4px 0 4px 8px;
}
.btn-delete-inline {
  display: block;
  margin: 4px 0;
  font-size: 0.8em;
  padding: 2px 10px;
}
```

### 変更 2: 削除ヘルパー関数追加（STEP 5 コードの前後に挿入）

```javascript
function removeNestedItemEl(el) {
  const parent = el.parentElement;
  el.remove();
  renumberItems(parent);
}
function renumberItems(container) {
  container.querySelectorAll(':scope > .nested-item').forEach((item, idx) => {
    const lbl = item.querySelector(':scope > .item-header .item-label');
    if (lbl) lbl.textContent = lbl.textContent.replace(/\[\d+\]/, `[${idx}]`);
  });
}
```

### 変更 3: `createNestedItem` 削除ボタン配線

```javascript
// before:
delBtn.onclick = function(e) { e.stopPropagation(); };
// after:
delBtn.onclick = function(e) { e.stopPropagation(); if (confirm('削除しますか？')) removeNestedItemEl(item); };
```

→ `renderArrayField` / `renderRelationField` / `renderFundingField` の Level-1 アイテム削除が即座に動作

### 変更 4: `createNestedSectionHeader` に `onAdd` コールバック引数追加

```javascript
// シグネチャ変更: showAdd → onAdd（関数またはnull）
function createNestedSectionHeader(label, level, onAdd) {
  // ...
  addBtn.onclick = onAdd
    ? function(e) { e.stopPropagation(); onAdd(content); }
    : function(e) { e.stopPropagation(); };
}
```

### 変更 5: `createAddButton` に `onAdd` 引数追加

```javascript
function createAddButton(label, onAdd) {
  // ...
  btn.onclick = onAdd
    ? function(e) { e.stopPropagation(); onAdd(); }
    : function(e) { e.stopPropagation(); };
}
```

### 変更 6: `createEntryGroup` ヘルパー追加

姓名・姓・名・所属機関名など、サブ配列の各エントリをグルーピングし削除ボタン付きで表示するための軽量ラッパー。

```javascript
function createEntryGroup() {
  const grp = document.createElement('div');
  grp.className = 'entry-group';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete btn-delete-inline';
  delBtn.textContent = '− 削除';
  delBtn.onclick = function(e) { e.stopPropagation(); if (confirm('削除しますか？')) grp.remove(); };
  return { grp, delBtn };
}
// 使い方:
//   const { grp, delBtn } = createEntryGroup();
//   grp.appendChild(createFieldRow(...));  // フィールド行を追加
//   grp.appendChild(delBtn);               // 削除ボタンを最後に追加
//   cont.appendChild(grp);
```

### 変更 7: `renderPersonField` の大幅変更（メイン実装）

#### 7-a: forEach 本体を `renderOnePerson(person, idx, keys)` に切り出し

`renderPersonField` の `arr.forEach(...)` 本体を独立関数化。再利用可能にする。

#### 7-b: 姓名/姓/名/所属機関名のサブ配列を `createEntryGroup` でラップ

各エントリを単純なフィールド行の羅列から、削除ボタン付きグループに変更:

```javascript
(person[namesKey] || []).forEach((n) => {
  const { grp, delBtn } = createEntryGroup();
  grp.appendChild(createFieldRow('姓名', n[nameKey] || '', 'text', null, { fieldKey: nameKey }));
  grp.appendChild(createFieldRow('言語', n[nameLangKey] || '', 'select', 'language', { fieldKey: nameLangKey, warn: n._warnLang, warnTitle: '...' }));
  grp.appendChild(createFieldRow('名前タイプ', n[nameTypeKey] || '', 'select', 'creatorNameType', { fieldKey: nameTypeKey }));
  grp.appendChild(delBtn);
  namesCont.appendChild(grp);
});
```

姓 (familyNames) / 名 (givenNames) / 所属機関名 (affiliationNames) も同様。

#### 7-c: `createNestedSectionHeader` に onAdd を渡す

各サブ配列セクションに追加ハンドラを設定:

```javascript
// 姓名セクション
const { wrapper: namesWrap, content: namesCont } = createNestedSectionHeader(
  namesLabel, 2,
  (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('姓名', '', 'text', null, { fieldKey: nameKey }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: nameLangKey }));
    grp.appendChild(createFieldRow('名前タイプ', '', 'select', 'creatorNameType', { fieldKey: nameTypeKey }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  }
);
```

姓・名・所属機関名・所属機関識別子・作成者識別子も同様のパターン。

#### 7-d: `createAddButton` に onAdd を渡す（作成者/寄与者の追加）

```javascript
content.appendChild(createAddButton(def.label, () => {
  const idx = content.querySelectorAll(':scope > .nested-item').length;
  const emptyPerson = {
    [typeKey]: '',
    [namesKey]: [{ [nameKey]: '', [nameLangKey]: '', [nameTypeKey]: '' }],
    familyNames: [{ familyName: '', familyNameLang: '' }],
    givenNames: [{ givenName: '', givenNameLang: '' }],
    nameIdentifiers: [],
    [affKey]: [],
  };
  const personEl = renderOnePerson(emptyPerson, idx, keysObj);
  content.insertBefore(personEl, content.lastChild);
}));
```

### 変更 8: `renderArrayField` の追加対応

```javascript
content.appendChild(createAddButton(def.label, () => {
  const newItem = {};
  def.fields.forEach(f => { newItem[f.k] = ''; });
  const idx = content.querySelectorAll(':scope > .nested-item').length;
  const { item: nestedItem, content: itemContent } = createNestedItem(`${def.label}[${idx}]`, 1);
  renderItemFields(newItem, def.fields, itemContent);
  content.insertBefore(nestedItem, content.lastChild);
}));
```

`renderRelationField` / `renderFundingField` も同様に `createAddButton` に onAdd を追加。

### スコープ外（Phase 2 以降）

- 削除後のサマリー更新（折りたたみ時ラベルの自動更新）
- `currentMetadata` のリアルタイム同期

### 実装順序

1. CSS: `.entry-group` / `.btn-delete-inline` 追加
2. `removeNestedItemEl()` + `renumberItems()` 関数追加
3. `createNestedItem` 削除ボタン配線変更
4. `createNestedSectionHeader` の第3引数を `onAdd` コールバックに変更
5. `createAddButton` の第2引数に `onAdd` コールバックを追加
6. `createEntryGroup()` ヘルパー追加
7. `renderPersonField` 内部を `renderOnePerson()` に切り出し + サブ配列エントリラップ + onAdd 設定
8. `renderArrayField` の追加対応
9. `renderRelationField` / `renderFundingField` の追加対応

### 検証

`10.1016/j.advnut.2025.100480` でデータ取得後:
1. 作成者[0] の「作成者姓名」で [+ 追加] → 空の姓名/言語/名前タイプ行グループが追加される
2. 追加グループの [− 削除] → そのグループだけ削除される
3. 作成者[0] の「作成者姓」「作成者名」「所属機関名」でも同様に追加・削除
4. [+ 作成者を追加] → 新しい作成者エントリ（Level 1 アコーディオン）が追加される
5. 作成者の [− 削除] → 削除 + インデックス再採番
6. タイトル・主題等 array フィールドでも追加/削除動作
7. 関連情報・助成情報で追加/削除動作
8. 空値表示モードでも全操作が動作

## 要修正項目

1. 権利者情報のネスト構造が未実装
make_jc_importer.html:1531-1535 で rightHolderNames が t: 'nested' に設定されていますが、renderItemFields（line 1791）で nested は continue でスキップされるため、権利者名のフィールドが表示されません。

2. フィールド APC の処理
- APCが支払われた場合、OpenAlex APIで得られるJSONのうち `apc_paid` に金額、通貨等が記録されるが確実で情報ではない。
- このため、[取り込み対象外のフィールド](/docs/requirements.md)に追加。 

3. 参照用列の追加
- [旧サンプル](/old/make_tsv.html)と同様に、フィールド名の次列に「取得地（参照用）」を追加し、取得した値を表示する。
- URLの場合はリンクを作成し、クリックすると別タブで表示して確認可能とする。
