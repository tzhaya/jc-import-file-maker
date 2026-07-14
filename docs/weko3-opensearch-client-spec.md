# WEKO3 OpenSearch クライアント改良仕様書

## 1. 文書情報

- 対象リポジトリ: `tzhaya/jc-import-file-maker`
- 対象画面: `chrome-extension/opensearch_panel.html`
- 対象ロジック: `chrome-extension/opensearch_panel.js`
- 対象API: WEKO3 OpenSearch API
- APIパス: `/api/opensearch/search`
- 主目的: JAIRO Cloud / WEKO3 リポジトリを対象に、作成者検索を含む複数条件検索を行い、JPCOAR形式の結果を表示する
- 想定実装者: AIコーディングエージェントまたは人間の開発者

## 2. 背景

現行画面は、次の3項目のみを検索条件として提供している。

- タイトル: `title`
- 内容記述: `des`
- 資源タイプ: `type`

現行実装は検索時に次の固定パラメータを付与する。

- `format=jpcoar`
- `size=20`
- `page=<ページ番号>`

実環境テストにより、少なくとも次の追加パラメータが利用可能であることを確認した。

- 作成者: `creator`

また、作成者名の区切り記号に表記差があっても検索できるケースが確認された。

## 3. 実環境で確認済みの挙動

### 3.1 JIRCAS機関リポジトリ

対象:

```text
https://jircas.repo.nii.ac.jp/
```

検索例:

```text
https://jircas.repo.nii.ac.jp/api/opensearch/search?creator=HAYASHI%2C%20Takanori
```

確認結果:

- `hits.total = 4`
- 登録された作成者名 `HAYASHI, Takanori` を含む4件を取得
- JSONレスポンスでは作成者情報が主に次の場所に格納される
  - `hits.hits[].metadata.creator.creatorName`
  - `hits.hits[].metadata._item_metadata.<creator field>.attribute_value_mlt`

### 3.2 筑波大学リポジトリ

対象:

```text
https://tsukuba.repo.nii.ac.jp/
```

検索例:

```text
https://tsukuba.repo.nii.ac.jp/api/opensearch/search?creator=%E6%9E%97%20%E8%B3%A2%E7%B4%80&size=100
```

確認結果:

- `林 賢紀` で検索可能
- 登録データに `林 賢紀` と `林, 賢紀` が混在していても、双方を含む結果が返る
- 空白区切りとカンマ付き表記で、同一の検索結果になることを確認
- `creator` は厳密な文字列完全一致ではなく、解析済み検索フィールドに対するAND検索として動作すると考えられる

## 4. 改良方針

### 4.1 必須改良

現行検索フォームに「作成者」入力欄を追加する。

表示ラベル:

```text
作成者
```

HTML要素ID:

```text
q-creator
```

送信するAPIパラメータ:

```text
creator
```

### 4.2 将来拡張を考慮した設計

検索条件の取得とURL構築を、項目ごとの個別 `if` 文ではなく、定義配列またはマッピングオブジェクトを用いて処理できる構造へ変更する。

推奨例:

```javascript
const SEARCH_FIELDS = [
  { elementId: 'q-title', param: 'title' },
  { elementId: 'q-creator', param: 'creator' },
  { elementId: 'q-des', param: 'des' },
  { elementId: 'q-type', param: 'type' },
];
```

検索条件取得:

```javascript
function collectQuery() {
  return Object.fromEntries(
    SEARCH_FIELDS
      .map(({ elementId, param }) => [
        param,
        document.getElementById(elementId)?.value?.trim() || '',
      ])
      .filter(([, value]) => value)
  );
}
```

URL生成:

```javascript
function buildUrl(query, page) {
  const repoUrl = document.getElementById('repo-url').value.trim();
  const base = new URL(repoUrl).origin + '/';

  const params = new URLSearchParams({
    format: 'jpcoar',
    size: String(PAGE_SIZE),
    page: String(page),
  });

  Object.entries(query).forEach(([key, value]) => {
    if (value !== '') params.set(key, value);
  });

  return `${base}api/opensearch/search?${params.toString()}`;
}
```

## 5. 機能要件

### FR-01 作成者入力欄

検索フォームに作成者入力欄を追加する。

```html
<div class="form-row">
  <label for="q-creator">作成者</label>
  <input
    type="text"
    id="q-creator"
    autocomplete="off"
    placeholder="例: 林 賢紀 / HAYASHI, Takanori"
  >
</div>
<p class="form-hint">
  姓名の空白・カンマの有無はリポジトリ側の解析により吸収される場合があります。
</p>
```

### FR-02 検索条件への追加

`doSearch()` が次の値を取得すること。

```javascript
creator: document.getElementById('q-creator').value.trim()
```

### FR-03 URLへの反映

作成者が入力されている場合のみ、URLに `creator` を追加する。

入力:

```text
林 賢紀
```

生成URL:

```text
https://tsukuba.repo.nii.ac.jp/api/opensearch/search?format=jpcoar&size=20&page=1&creator=%E6%9E%97+%E8%B3%A2%E7%B4%80
```

`URLSearchParams` による空白の `+` エンコードは許容する。`%20` でも同義である。

### FR-04 複数条件検索

複数の入力項目が指定された場合は、各パラメータを同一リクエストに含める。

例:

```text
creator=林 賢紀
type=journal article
```

生成例:

```text
/api/opensearch/search?format=jpcoar&size=20&page=1&creator=%E6%9E%97+%E8%B3%A2%E7%B4%80&type=journal+article
```

WEKO3側では原則として条件間はANDとして処理される。

### FR-05 最低1条件の検証

検索可能条件は次の4項目とする。

- `title`
- `creator`
- `des`
- `type`

すべて空の場合のみ、次のエラーを表示する。

```text
検索条件を1つ以上入力してください。
```

### FR-06 Enterキー検索

次の入力欄でEnterキーを押した場合、1ページ目から検索を実行する。

- `q-title`
- `q-creator`
- `q-des`

### FR-07 ページング

ページ遷移時は、初回検索時の条件を保持する。

現行実装はページ遷移時にDOMから条件を再取得しているため、検索後に入力欄を書き換えると、次ページで検索条件が変わる可能性がある。

改良後は次のいずれかを採用する。

推奨方式:

```javascript
async function doSearch(page = 1, useCurrentForm = page === 1) {
  if (useCurrentForm) {
    state.query = collectQuery();
  }
  const query = state.query;
  // ...
}
```

ページング:

```javascript
prevBtn.addEventListener('click', () => doSearch(currentPage - 1, false));
nextBtn.addEventListener('click', () => doSearch(currentPage + 1, false));
```

### FR-08 検索中の二重実行防止

検索中は検索ボタンを無効化する。現行挙動を維持する。

### FR-09 結果表示

`format=jpcoar` を維持し、既存のXML解析・カード表示を継続利用する。

作成者は既存の `parseItem()` でJPCOARの `creator` / `creatorName` から取得できるため、結果表示側の必須変更はない。

## 6. 対応検索パラメータ

### 6.1 UIで提供するパラメータ

| パラメータ | UI | 必須 | 状態 |
|---|---|---:|---|
| `title` | テキスト入力 | いいえ | 既存 |
| `creator` | テキスト入力 | いいえ | 新規 |
| `des` | テキスト入力 | いいえ | 既存 |
| `type` | 選択リスト | いいえ | 既存 |
| `format` | 非表示固定値 | はい | `jpcoar` |
| `size` | 非表示固定値 | はい | `20` |
| `page` | ページング制御 | はい | 1以上 |

### 6.2 将来追加可能な検索パラメータ

WEKO3ソースコード上では、次の検索項目も候補となる。

| パラメータ | 意味 |
|---|---|
| `publisher` | 出版者 |
| `cname` | 寄与者 |
| `itemtype` | WEKOアイテムタイプ |
| `mimetype` | ファイルMIMEタイプ |
| `language` | 言語 |
| `srctitle` | 収録物名 |
| `spatial` | 地理的位置 |
| `temporal` | 時間的範囲 |
| `version` | バージョン種別 |
| `dissno` | 学位論文番号 |
| `degreename` | 学位名 |
| `dgname` | 学位授与機関名 |
| `subject` | 主題 |
| `id` | 識別子 |
| `license` | ライセンス |
| `wid` | 作成者名識別子 |
| `iid` | インデックスツリーID |
| `exact_title_match` | タイトル完全一致指定 |

これらは今回の必須実装範囲には含めない。将来追加する場合も、`SEARCH_FIELDS` 定義への追記だけでURLへ反映できる設計とする。

## 7. 非機能要件

### NFR-01 URL検証

次を満たすリポジトリURLのみ許可する。

- HTTPS
- `*.repo.nii.ac.jp`
- 既存の追加許可ホスト一覧に含まれるホスト

ユーザー入力URLのパス部分は無視し、`new URL(repoUrl).origin` を基点とする現行仕様を維持する。

### NFR-02 XSS対策

検索結果の表示には `innerHTML` でメタデータ値を挿入しない。

- `textContent`
- `createElement`
- `setAttribute`

を使用する現行方針を維持する。

### NFR-03 外部リンク

結果URLおよびファイルURLは次を設定する。

```javascript
a.target = '_blank';
a.rel = 'noopener';
```

### NFR-04 エラー処理

最低限、次を区別して利用者へ表示する。

- リポジトリURL未入力
- 許可されていないホスト
- 検索条件未入力
- HTTPエラー
- XML解析エラー
- ネットワークエラー

推奨メッセージ:

```text
検索APIへの接続に失敗しました。リポジトリURLとOpenSearch APIの提供状況を確認してください。
```

開発者向け詳細は `console.error()` に記録してよいが、画面には安全なメッセージのみ表示する。

### NFR-05 後方互換性

既存の次の機能を壊さないこと。

- タイトル検索
- 内容記述検索
- 資源タイプ検索
- JPCOAR XML解析
- 検索結果カード
- ファイルリンク
- 詳細展開
- ページング
- デフォルトリポジトリURL読込

## 8. UI仕様

表示順序:

1. リポジトリURL
2. タイトル
3. 作成者
4. 内容記述
5. 資源タイプ
6. 検索ボタン

推奨補足:

```text
作成者名は、例「林 賢紀」「林, 賢紀」「HAYASHI, Takanori」の形式で入力できます。
```

レスポンシブ動作は現行CSSを維持する。

## 9. 変更対象

### 9.1 `opensearch_panel.html`

必須変更:

- `q-creator` 入力欄を追加
- 必要に応じて入力例のヒントを追加

### 9.2 `opensearch_panel.js`

必須変更:

- `SEARCH_FIELDS` 定義を追加
- `collectQuery()` を追加
- `buildUrl()` を汎用化
- 未入力判定を `Object.keys(query).length === 0` に変更
- Enterキー対象に `q-creator` を追加
- ページング時に `state.query` を保持

## 10. 推奨実装例

```javascript
const SEARCH_FIELDS = [
  { elementId: 'q-title', param: 'title' },
  { elementId: 'q-creator', param: 'creator' },
  { elementId: 'q-des', param: 'des' },
  { elementId: 'q-type', param: 'type' },
];

function collectQuery() {
  const query = {};

  SEARCH_FIELDS.forEach(({ elementId, param }) => {
    const el = document.getElementById(elementId);
    const value = el?.value?.trim() || '';
    if (value) query[param] = value;
  });

  return query;
}

function buildUrl(query, page) {
  const repoUrl = document.getElementById('repo-url').value.trim();
  const base = new URL(repoUrl).origin + '/';

  const params = new URLSearchParams({
    format: 'jpcoar',
    size: String(PAGE_SIZE),
    page: String(page),
  });

  Object.entries(query).forEach(([key, value]) => {
    params.set(key, value);
  });

  return `${base}api/opensearch/search?${params.toString()}`;
}

async function doSearch(page = 1, refreshQuery = page === 1) {
  const repoVal = document.getElementById('repo-url').value.trim();

  if (!repoVal) {
    showError('リポジトリ URL を入力してください。', 'warn');
    document.getElementById('repo-url').focus();
    return;
  }

  if (!isAllowedHost(repoVal)) {
    showError(
      'このリポジトリ URL は許可されていません。JAIRO Cloud 利用機関の URL を入力してください。',
      'warn'
    );
    document.getElementById('repo-url').focus();
    return;
  }

  if (refreshQuery) {
    state.query = collectQuery();
  }

  if (Object.keys(state.query).length === 0) {
    showError('検索条件を 1 つ以上入力してください。', 'warn');
    return;
  }

  state.page = page;
  setLoading(true);
  hideError();

  try {
    const res = await fetch(buildUrl(state.query, page), {
      headers: {
        Accept: 'application/xml, application/rdf+xml, text/xml;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    renderResults(parseXML(text));
  } catch (err) {
    console.error(err);
    showError(`エラー: ${err.message}`, 'warn');
  } finally {
    setLoading(false);
  }
}
```

## 11. 受入テスト

### AT-01 日本語作成者名

入力:

```text
リポジトリURL: https://tsukuba.repo.nii.ac.jp/
作成者: 林 賢紀
```

期待:

- リクエストに `creator=林 賢紀` が含まれる
- 検索結果が0件ではない
- `林 賢紀` または `林, 賢紀` を作成者に含むレコードが表示される

### AT-02 カンマ付き日本語作成者名

入力:

```text
作成者: 林, 賢紀
```

期待:

- 検索が正常終了する
- 空白区切り検索と同等の結果になる環境では同一件数になる
- クライアント側でカンマを削除・変換しない

### AT-03 英語作成者名

入力:

```text
リポジトリURL: https://jircas.repo.nii.ac.jp/
作成者: HAYASHI, Takanori
```

期待:

- 検索が正常終了する
- 4件が返るテストデータ環境では4件を表示する
- `HAYASHI, Takanori` を作成者名に含む

### AT-04 複合条件

入力:

```text
作成者: 林 賢紀
資源タイプ: journal article
```

期待:

- URLに `creator` と `type` の双方が含まれる
- 条件に合致する結果のみ表示される

### AT-05 条件未入力

入力:

- リポジトリURLのみ
- 検索条件はすべて空

期待:

```text
検索条件を1つ以上入力してください。
```

APIリクエストは送信しない。

### AT-06 ページング条件保持

手順:

1. 作成者を入力して検索
2. 検索後に入力欄の文字を変更
3. 「次へ」を押す

期待:

- 次ページでは最初に実行した検索条件を使用する

### AT-07 特殊文字

入力:

```text
HAYASHI, Takanori
```

期待:

- カンマと空白が正しくURLエンコードされる
- JavaScript例外が発生しない

### AT-08 既存機能回帰

次を個別に実行する。

- タイトルのみ
- 内容記述のみ
- 資源タイプのみ

期待:

- 改良前と同様に検索できる

## 12. テスト時の確認項目

開発者ツールのNetworkタブで次を確認する。

- リクエスト先が `<origin>/api/opensearch/search`
- `format=jpcoar`
- `size=20`
- `page=1`
- 入力した検索パラメータ
- HTTPステータス200
- XMLレスポンスがJPCOARを含む
- `opensearch:totalResults` が画面件数と一致

## 13. 実装上の注意

1. 作成者名をクライアント側で正規化しすぎないこと。
   - 空白をカンマへ置換しない
   - カンマを削除しない
   - 姓名順を変更しない
   - 大文字小文字を変更しない

2. WEKO3側の検索解析に委ねること。
   - `林 賢紀`
   - `林, 賢紀`
   - `HAYASHI, Takanori`
   をそのまま送信する。

3. `exact_title_match` は作成者検索には使用しない。

4. `q` パラメータはインデックス検索として別処理される可能性があるため、このクライアントの作成者検索には使用しない。

5. JSONではなく `format=jpcoar` を維持する。
   - 現行のXMLパーサをそのまま利用できる
   - 異なるWEKO3環境間で内部JSON構造の差を受けにくい

## 14. 完了条件

次をすべて満たした時点で実装完了とする。

- 作成者入力欄が追加されている
- `creator` パラメータを送信できる
- 日本語・英語・カンマ付きの作成者名で検索できる
- 複合条件検索ができる
- ページング時に検索条件が保持される
- 既存3検索項目が引き続き動作する
- JIRCASおよび筑波大学リポジトリで受入テストを通過する
- コンソールに未処理例外が出ない

## 検索パラメータとWEKO3／JPCOARフィールド対応表

以下は、OpenSearchクエリパラメータ、WEKO3検索インデックス上の対象フィールド、対応するJPCOARスキーマ要素の対応表である。

> 注意:
> - WEKO3検索フィールドは、WEKO3ソースコードの `WEKO_SEARCH_KEYWORDS_DICT` および検索処理に基づく。
> - JPCOAR要素は、検索結果のJPCOAR表現上で対応する概念を示す。
> - 「直接対応なし」は、WEKO3内部管理項目または検索動作指定であり、JPCOARに同名・同義の単一要素が存在しないことを示す。
> - アイテムタイプマッピングやWEKO3の設定により、実際の検索対象フィールドや値が異なる場合がある。

### 標準検索項目

初期の検索対象項目として表示する。

| OpenSearchパラメータ | 意味 | WEKO3検索フィールド | 対応するJPCOAR要素 | 対応上の注意 |
|---|---|---|---|---|
| `keyword` | メタデータ・全文横断検索 | `search_*`, `search_*.ja`, `content.attachment.content` | 単一要素への直接対応なし | 複数のJPCOAR由来検索フィールドと添付ファイル本文を横断検索する。`format` 指定時の全文検索語として利用される。 |
| `title` | タイトル | `search_title`, `search_title.ja` | `dc:title` | タイトルおよび言語別検索フィールドを検索する。 |
| `exact_title_match` | タイトル完全一致指定 | `title`, `alternative` に対する `term` 検索 | `dc:title`, `dcterms:alternative` | 検索対象フィールドではなく、`title` 検索の動作を切り替える真偽値パラメータ。`true` の場合に完全一致検索を行う。 |
| `creator` | 作成者・著者 | `search_creator`, `search_creator.ja` | `creator/creatorName` | 氏名全体を検索する。姓名区切りの空白・カンマは検索解析により吸収される場合がある。 |
| `des` | 内容記述・抄録 | `search_des`, `search_des.ja` | `datacite:description` | 抄録、内容記述等にマッピングされた検索フィールドを対象とする。 |
| `type` | 資源タイプ | `type.raw` | `dc:type` | 主にCOAR Resource Type等の資源タイプ値を対象とする。 |
| `id_attr` | 識別子種別指定 | DOI、ISBN、ISSN、NCID、PMID、URI等。JPCOARでは `identifierRegistration`、`sourceIdentifier`、`relation/relatedIdentifier`、`creator/nameIdentifier` 等に分散する。 |

### 詳細検索項目

「詳細検索」として、アコーディオンのクリック後に表示する。

| OpenSearchパラメータ | 意味 | WEKO3検索フィールド | 対応するJPCOAR要素 | 対応上の注意 |
|---|---|---|---|---|
| `subject` | 主題 | `subject` 配下。主題値は通常 `subject.value` | `subject` | `subjectScheme` を補助条件 `sbjscheme` で指定できる。 |
| `version` | バージョン種別 | `versionType` | `oaire:version/@versionType` | `AM`, `VoR` 等のCOAR Version Typeコードを指定する。JPCOAR要素値にはCOAR Version URIが入る場合がある。 |
| `publisher` | 出版者 | `search_publisher`, `search_publisher.ja` | `dc:publisher` | 出版者名を検索する。 |
| `language` | 言語 | `language` | `dc:language` | 通常は `jpn`, `eng` 等の言語コードを指定する。 |
| `srctitle` | 収録物名 | `sourceTitle`, `sourceTitle.ja` | `sourceTitle` | 掲載誌名、収録物名等を対象とする。 |
| `wid` | 作成者名識別子 | `creator.nameIdentifier` | `creator/nameIdentifier` | 仕様書上の説明と異なり、実装では作成者の識別子を検索する。ORCIDやWEKO著者ID等が対象になり得る。 |

### その他の検索項目

| OpenSearchパラメータ | 意味 | WEKO3検索フィールド | 対応するJPCOAR要素 | 対応上の注意 |
|---|---|---|---|---|
| `mimetype` | ファイルMIMEタイプ | `file.mimeType` | `file/mimeType` | 例: `application/pdf`。ファイル情報に対応する。 |
| `itemtype` | WEKOアイテムタイプ | `itemtype.keyword` | 直接対応なし | WEKO3内部のアイテムタイプ名。JPCOARの資源タイプ `dc:type` とは別概念。 |
| `cname` | 寄与者 | `search_contributor`, `search_contributor.ja` | `contributor/contributorName` | 寄与者名を検索する。 |
| `spatial` | 地理的位置 | `geoLocation.geoLocationPlace` | `datacite:geoLocation/datacite:geoLocationPlace` | 場所名による検索。 |
| `temporal` | 時間的範囲 | `temporal` | `dcterms:temporal` | 時間的範囲、時代区分等に対応する。 |
| `dissno` | 学位論文番号 | `dissertationNumber` | `dissertationNumber` | 例: `甲第7955号`。 |
| `degreename` | 学位名 | `degreeName`, `degreeName.ja` | `degreeName` | 例: `博士（情報学）`。 |
| `dgname` | 学位授与機関名 | `dgName`, `dgName.ja` | `degreeGrantor/degreeGrantorName` | 学位授与機関名称を検索する。 |
| `license` | ライセンス | `content.licensetype.raw` | 直接対応なし | WEKO3のファイル管理用ライセンス種別を検索する。JPCOARの `rights` / `rightsURI` とは直接対応しない。 |
| `iid` | インデックスツリーID | `path.tree` | 直接対応なし | WEKO3内部のインデックスツリーに対応する。JPCOARのメタデータ要素ではない。 |


### 補助パラメータ

| パラメータ | 用途 | 関連フィールド／JPCOAR要素 |
|---|---|---|
| `sbjscheme` | 主題スキーム指定 | `subject.subjectScheme` / `subject/@subjectScheme` |
| `id_attr` | 識別子種別指定 | DOI、ISBN、ISSN、NCID、PMID、URI等。JPCOARでは `identifierRegistration`、`sourceIdentifier`、`relation/relatedIdentifier`、`creator/nameIdentifier` 等に分散する。 |
| `fd_attr` | ファイル日付種別指定 | `file.date.dateType` / `file/date/@dateType` |
| `format` | レスポンス形式指定 | `jpcoar`, `atom`, `rss`。省略時はJSON。 |
| `size` | 1ページ当たりの件数 | JPCOAR要素ではなくAPI制御値。 |
| `page` | ページ番号 | JPCOAR要素ではなくAPI制御値。 |

### `license` とJPCOAR `rights` の区別

`license` は、次のWEKO3内部フィールドを検索する。

```text
content.licensetype.raw
```

この値は、たとえば `license_0` のようなWEKO3内部コードである。一方、JPCOARの権利情報は通常、次のように表現される。

```xml
<rights rightsURI="https://creativecommons.org/licenses/by/4.0/">
  Creative Commons Attribution 4.0 International
</rights>
```

したがって、次は同一ではない。

| 概念 | 例 |
|---|---|
| WEKO3内部ライセンス種別 | `license_0` |
| JPCOAR権利表示 | `Creative Commons Attribution 4.0 International` |
| JPCOAR権利URI | `https://creativecommons.org/licenses/by/4.0/` |

現行OpenSearch実装には、JPCOARの `rights` 文字列または `rightsURI` を直接検索する専用パラメータは確認されていない。

### `version` の対応

`version` は次の対応になる。

```text
OpenSearch: version=AM
    ↓
WEKO3検索フィールド: versionType = "AM"
    ↓
JPCOAR: oaire:version/@versionType = "AM"
```

JPCOAR例:

```xml
<oaire:version versionType="AM">
  http://purl.org/coar/version/c_ab4af688f83e57aa
</oaire:version>
```
