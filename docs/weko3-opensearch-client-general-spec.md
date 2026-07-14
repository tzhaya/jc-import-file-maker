# WEKO3 OpenSearch クライアント汎用仕様書

## 1. 文書の目的

本書は、WEKO3 / JAIRO Cloud の OpenSearch API を利用するクライアントを、新規作成または改修するための汎用仕様書である。

対象とするクライアント形態は限定しない。

- Webアプリケーション
- Chrome拡張機能
- デスクトップアプリケーション
- コマンドラインツール
- Excel / Power Query
- Power Automate
- Python、JavaScript、TypeScript等によるバッチ処理
- 他システムとの検索連携機能

本書は、AIコーディングエージェントが実装計画、コード生成、テスト、レビューを行う際の入力仕様として利用できるように記述する。

> **実測による補足（2026-07-14・Issue #237）:** 言語検索のクエリパラメータは `language` ではなく `lang` である。また、`format=jpcoar` のリクエストに独自の `Accept` ヘッダーを付けると、JIRCAS・筑波大学の実環境でHTTP 406となることを確認した。現行クライアントはブラウザ既定のヘッダーで取得する。検索項目の実装範囲は6章を参照すること。

---

## 2. 対象API

### 2.1 基本エンドポイント

```text
https://<repository-host>/api/opensearch/search
```

例:

```text
https://jircas.repo.nii.ac.jp/api/opensearch/search
https://tsukuba.repo.nii.ac.jp/api/opensearch/search
```

### 2.2 HTTPメソッド

```text
GET
```

### 2.3 基本リクエスト形式

```text
https://<repository-host>/api/opensearch/search?<parameter>=<value>&...
```

### 2.4 HTTPS

クライアントは原則としてHTTPSのみを許可する。

---

## 3. 基本設計方針

クライアントは次の原則に従う。

1. リポジトリのホスト名と検索条件からURLを安全に構築する。
2. 検索値はクライアント側で過度に正規化しない。
3. 検索パラメータは定義駆動で管理する。
4. レスポンス形式の差異を吸収する層を設ける。
5. UI、通信、パース、表示を分離する。
6. リポジトリごとの差異を設定で扱えるようにする。
7. APIエラー、ネットワークエラー、解析エラーを区別する。
8. 検索条件とページング状態を保持する。
9. ユーザー入力およびレスポンス値を安全に表示する。
10. 実環境テストを自動化できる構造とする。

---

## 4. レスポンス形式

WEKO3 OpenSearch APIは、指定により複数形式を返す。

### 4.1 JSON

`format` を指定しない場合の標準レスポンスとして利用できる。

例:

```text
/api/opensearch/search?creator=HAYASHI%2C%20Takanori
```

代表的な構造:

```json
{
  "aggregations": {},
  "hits": {
    "hits": [
      {
        "id": 2000483,
        "created": "2024-09-06T02:13:35.414390+00:00",
        "updated": "2024-10-04T01:31:21.084557+00:00",
        "metadata": {
          "control_number": "2000483",
          "title": ["..."],
          "creator": {
            "creatorName": ["..."]
          }
        }
      }
    ],
    "total": 4
  },
  "links": {}
}
```

### 4.2 JPCOAR

```text
format=jpcoar
```

例:

```text
/api/opensearch/search?creator=HAYASHI%2C%20Takanori&format=jpcoar
```

用途:

- 機関間で比較的統一されたメタデータ構造を扱う
- JPCOARスキーマ要素を直接取得する
- 内部JSON構造への依存を減らす

### 4.3 Atom

```text
format=atom
```

### 4.4 RSS

```text
format=rss
```

### 4.5 推奨方針

新規クライアントでは次のいずれかを選択する。

#### 推奨A: JPCOAR

次の場合に適する。

- 書誌情報を標準化された要素で扱いたい
- 異なるWEKO3機関間の互換性を重視する
- XML処理が可能

#### 推奨B: JSON

次の場合に適する。

- JavaScript等で簡単に扱いたい
- WEKO3内部の変換済みメタデータを利用したい
- 検索結果一覧の構築を優先する

クライアント内部ではレスポンスを共通モデルへ変換すること。

---

## 5. 基本パラメータ

| パラメータ | 型 | 説明 |
|---|---:|---|
| `format` | string | `jpcoar`、`atom`、`rss`。省略時はJSON |
| `size` | integer | 1ページ当たりの取得件数 |
| `page` | integer | ページ番号。通常は1始まり |
| `sort` | string | 並び順。環境設定に依存する場合がある |

例:

```text
/api/opensearch/search?format=jpcoar&size=20&page=1
```

---

## 6. 検索パラメータ

### 6.1 現行クライアントの標準検索項目

Issue #237で実装した標準検索項目は次のとおりである。

| パラメータ | 意味 | UI | 備考 |
|---|---|---|---|
| `keyword` | メタデータ・全文横断検索 | テキスト | 標準検索の先頭に配置 |
| `title` | タイトル | テキスト | `exact_title_match`と組み合わせ可能 |
| `exact_title_match` | タイトル完全一致指定 | チェックボックス | タイトル入力時だけ`true`を送信 |
| `creator` | 作成者・著者 | テキスト | 入力表記は前後空白以外を変更しない |
| `des` | 内容記述・抄録 | テキスト |  |
| `type` | 資源タイプ | 選択 | 既存語彙全78件から選択し英語名を送信 |
| `id` + `id_attr` | ID検索 | ID値＋ID種別 | 必ず対で指定する |

現行クライアントには「入力をクリア」ボタンを置く。検索条件、完全一致指定、ID種別、並べ替えを初期化し、リポジトリURL・検索済み結果・ページングstateは維持する。通信は行わず、検索中は操作できない。

### 6.2 現行クライアントの詳細検索項目

詳細検索は初期状態で折りたたんで表示する。

| パラメータ | 意味 | UI | 備考 |
|---|---|---|---|
| `subject` | 主題 | テキスト |  |
| `publisher` | 出版者 | テキスト |  |
| `lang` | 言語 | テキスト | 実機で有効性を確認。`language`は使用しない |
| `srctitle` | 収録物名 | テキスト |  |
| `wid` | 作成者名識別子 | テキスト | ORCID、WEKO著者ID等。有効な体系は機関依存 |

### 6.3 現行クライアントで実装しない検索項目

APIには次の検索パラメータが定義されているが、Issue #237ではUI・URL生成とも対象外とする。

| パラメータ | 意味 | 対象外とする理由・補足 |
|---|---|---|
| `version` | バージョン種別 | 4機関で`VoR` / `AM` / `P`等がすべてHTTP 200・0件。動作環境確認後に再検討 |
| `mimetype` | ファイルMIMEタイプ | 今回の標準・詳細検索の対象外 |
| `itemtype` | WEKOアイテムタイプ | 今回の標準・詳細検索の対象外 |
| `cname` | 寄与者 | 今回の「その他の検索項目」は実装しない |
| `spatial` | 地理的位置 | 同上 |
| `temporal` | 時間的範囲 | 同上 |
| `dissno` | 学位論文番号 | 同上 |
| `degreename` | 学位名 | 同上 |
| `dgname` | 学位授与機関名 | 同上 |
| `license` | ライセンス | 同上 |
| `iid` | インデックスツリーID | 同上 |

### 6.4 識別子検索

識別子検索では、値と種別を組み合わせる。

現行クライアントはID値とID種別の片方だけでは通信しない。検索可否は機関・識別子種別・検索インデックス設定に依存し、完全一致や1件だけの応答は保証しない。

代表例:

```text
id=<identifier-value>&id_attr=<identifier-type>
```

識別子種別候補:

- `DOI`
- `selfDOI`
- `ISBN`
- `ISSN`
- `NCID`
- `PMID`
- `NAID`
- `ICHUSHI`
- `URI`
- `fullTextURL`
- `identifier`

例:

```text
/api/opensearch/search?id=10.1234/example&id_attr=DOI
```

### 6.5 日付範囲

代表的なパラメータ:

```text
dategranted_from
dategranted_to
filedate_from
filedate_to
date_range1_from
date_range1_to
...
date_range5_from
date_range5_to
```

開始値と終了値の双方を指定する。

例:

```text
/api/opensearch/search?dategranted_from=2020-01-01&dategranted_to=2025-12-31
```

これらはAPIに定義されているが、現行クライアントでは実装しない。`date_range1`～`date_range5`の意味が機関・アイテムタイプのマッピングに依存し、JPCOARのIssued / Availableと固定対応しないためである。レコード作成日時`_created`の範囲検索も非対応であり、`createdate`はソート専用として扱う。

### 6.6 数値範囲

```text
integer_range1_from
integer_range1_to
...
integer_range5_from
integer_range5_to

float_range1_from
float_range1_to
...
float_range5_from
float_range5_to
```

現行クライアントでは実装しない。

### 6.7 地理検索

距離検索:

```text
geo_point1_lat
geo_point1_lon
geo_point1_distance
```

形状検索:

```text
geo_shape1_lat
geo_shape1_lon
geo_shape1_distance
```

例:

```text
/api/opensearch/search?geo_point1_lat=35.68&geo_point1_lon=139.76&geo_point1_distance=10km
```

現行クライアントでは実装しない。

### 6.8 汎用テキスト項目

```text
text1
text2
...
text30
```

これらは機関ごとのアイテムタイプマッピングに依存する。汎用UIでは原則として非表示とし、上級者向け設定または機関別設定で扱う。

現行クライアントでは実装しない。

---

## 7. 検索語の処理

### 7.1 基本原則

クライアントは検索語を原則そのまま送信する。

次の変換を自動で行わない。

- 姓名順の変更
- カンマの追加または削除
- 全角・半角の強制変換
- 大文字・小文字の強制変換
- 漢字からローマ字への変換
- 著者名の分割
- ストップワード除去

### 7.2 作成者名

次のような表記をそのまま許可する。

```text
林 賢紀
林, 賢紀
HAYASHI, Takanori
Takanori Hayashi
```

WEKO3側の解析により、空白区切りとカンマ付き表記が同一結果になる場合がある。

クライアントは特定環境での挙動を全環境共通とは仮定しない。

### 7.3 OR検索

検索値に次を含めるとOR検索として解釈される場合がある。

```text
term1 OR term2
term1 | term2
```

クライアントがOR検索UIを提供する場合は、内部表現を次の形式へ変換する。

```text
term1 OR term2
```

### 7.4 AND検索

複数パラメータを同一リクエストに含めた場合、通常はAND条件として扱う。

例:

```text
creator=林 賢紀
type=journal article
```

---

## 8. `q` と `keyword` の扱い

### 8.1 `keyword`

横断検索・全文検索には `keyword` を利用する。

特に `format` 指定時は、検索語として `keyword` が利用される実装がある。

例:

```text
/api/opensearch/search?keyword=WebAPI&format=jpcoar
```

### 8.2 `q`

`q` は通常検索語ではなく、インデックスID指定として処理される場合がある。

汎用検索欄に `q` を使用してはならない。

インデックス検索を明示的に実装する場合のみ利用する。

---

## 9. クライアント内部モデル

レスポンス形式に依存しない共通モデルを定義する。

推奨例:

```typescript
type RepositorySearchResult = {
  total: number;
  page: number;
  pageSize: number;
  items: RepositoryItem[];
};

type RepositoryItem = {
  id: string;
  url?: string;
  titles: LocalizedValue[];
  creators: Creator[];
  descriptions: LocalizedValue[];
  subjects: Subject[];
  publisher: LocalizedValue[];
  resourceTypes: string[];
  languages: string[];
  issuedDate?: string;
  sourceTitles: LocalizedValue[];
  volume?: string;
  issue?: string;
  pageStart?: string;
  pageEnd?: string;
  identifiers: Identifier[];
  files: RepositoryFile[];
  raw?: unknown;
};

type LocalizedValue = {
  value: string;
  language?: string;
};

type Creator = {
  displayNames: LocalizedValue[];
  familyNames?: LocalizedValue[];
  givenNames?: LocalizedValue[];
  identifiers?: Identifier[];
  affiliations?: LocalizedValue[];
};

type Subject = {
  value: string;
  language?: string;
  scheme?: string;
};

type Identifier = {
  value: string;
  type?: string;
  uri?: string;
};

type RepositoryFile = {
  url: string;
  label?: string;
  mimeType?: string;
  size?: string;
  objectType?: string;
};
```

---

## 10. URL構築

### 10.1 推奨実装

```javascript
function buildOpenSearchUrl(repositoryUrl, query, options = {}) {
  const {
    format = 'jpcoar',
    size = 20,
    page = 1,
  } = options;

  const origin = new URL(repositoryUrl).origin;
  const url = new URL('/api/opensearch/search', origin);

  if (format) url.searchParams.set('format', format);
  url.searchParams.set('size', String(size));
  url.searchParams.set('page', String(page));

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const normalized =
      typeof value === 'string'
        ? value.trim()
        : String(value);

    if (normalized !== '') {
      url.searchParams.set(key, normalized);
    }
  });

  return url.toString();
}
```

### 10.2 禁止事項

文字列連結だけでURLを組み立てない。

悪い例:

```javascript
const url = repo + '/api/opensearch/search?creator=' + creator;
```

理由:

- URLエンコード漏れ
- `?`、`&`、`#` を含む入力への脆弱性
- ベースURL末尾のスラッシュ差
- パス付きURLの誤処理

---

## 11. リポジトリURL検証

### 11.1 検証項目

- URLとして構文が正しい
- HTTPSである
- ホスト名が許可対象である
- ユーザー情報を含まない
- ポート番号を必要に応じて制限する
- APIパスはクライアント側で固定する

### 11.2 推奨

JAIRO Cloud専用クライアントでは次を許可する。

```regex
^[a-z0-9.-]+\.repo\.nii\.ac\.jp$
```

加えて、独自ドメイン利用機関を許可リストへ登録できる構造を持つ。

### 11.3 SSRF対策

サーバー側プロキシを実装する場合は、URLを利用者からそのまま受け取って任意ホストへアクセスしてはならない。

必須対策:

- ホスト許可リスト
- DNS再解決対策
- プライベートIP拒否
- リダイレクト先検証
- HTTP拒否
- タイムアウト
- レスポンスサイズ制限

---

## 12. 通信仕様

### 12.1 HTTPヘッダー

`format=jpcoar`を指定する場合も、独自の`Accept`ヘッダーは付けず、ブラウザ既定のヘッダーで送信する。JIRCAS・筑波大学では、独自の`Accept`条件を付けるとHTTP 406となることを実測で確認している。

JSON:

```http
Accept: application/json
```

### 12.2 タイムアウト

推奨:

```text
10～30秒
```

ブラウザでは `AbortController` を利用する。

### 12.3 再試行

自動再試行対象:

- 一時的ネットワーク障害
- HTTP 429
- HTTP 502
- HTTP 503
- HTTP 504

再試行しない:

- HTTP 400
- HTTP 401
- HTTP 403
- HTTP 404
- XML / JSON解析エラー

指数バックオフを利用する。

### 12.4 レスポンスサイズ

大量取得を避けるため、初期値は20件程度とする。

`size=10000` のような大量取得を通常UIから行わせない。

---

## 13. ページング

### 13.1 状態

クライアントは次を保持する。

```javascript
{
  query: {},
  page: 1,
  pageSize: 20,
  total: 0,
  repositoryUrl: ''
}
```

### 13.2 条件保持

ページ移動時にフォーム値を再取得してはならない。

最初に実行した検索条件を状態として保持し、その状態で次ページを取得する。

### 13.3 表示

```text
120件中 21～40件
2 / 6ページ
```

### 13.4 ページ番号

APIが1始まりであることを前提とする。

---

## 14. 検索フォーム

### 14.1 基本UI

最低限、次を設ける。

- リポジトリURL
- キーワード
- タイトル
- 作成者
- 内容記述
- 資源タイプ
- 検索ボタン
- 条件クリアボタン

### 14.2 詳細検索

折りたたみ可能な詳細条件として次を提供できる。

- 出版者
- 主題
- 言語
- 収録物名
- 識別子
- MIMEタイプ
- 学位名
- 学位授与機関
- 日付範囲

### 14.3 入力検証

最低1つの検索条件を要求する。

エラー例:

```text
検索条件を1つ以上入力してください。
```

### 14.4 Enterキー

テキスト入力欄でEnterキーを押した場合、1ページ目から検索する。

### 14.5 検索条件表示

結果画面に実行した条件を表示する。

例:

```text
作成者: 林 賢紀
資源タイプ: journal article
```

---

## 15. 結果表示

### 15.1 一覧表示

最低限、次を表示する。

- タイトル
- 作成者
- 発行日
- 収録物名
- 巻号頁
- 資源タイプ
- レコードURL
- ファイルURL

### 15.2 詳細表示

展開可能な詳細欄に次を表示する。

- 抄録
- 主題
- 出版者
- 言語
- 識別子
- 権利
- アクセス権
- バージョン
- 助成情報
- 会議情報
- 学位情報

### 15.3 多言語値

言語コードを保持する。

例:

```text
タイトル: 機械利用可能なインターフェースの整備 (ja)
Title: Development of machine-readable interfaces (en)
```

### 15.4 ファイル

複数ファイルを表示できること。

表示候補:

- ラベル
- URL
- MIMEタイプ
- サイズ
- objectType

---

## 16. エラー処理

### 16.1 エラー分類

| 分類 | 例 |
|---|---|
| 入力エラー | URL未入力、検索条件なし |
| URLエラー | 無効なURL、HTTP |
| 許可エラー | 未許可ホスト |
| 通信エラー | DNS、タイムアウト、CORS |
| HTTPエラー | 403、404、500 |
| 解析エラー | 不正XML、不正JSON |
| データエラー | 必須項目欠落 |
| 上限エラー | 大量結果、レスポンス過大 |

### 16.2 利用者向けメッセージ

例:

```text
検索APIへの接続に失敗しました。
リポジトリURLとOpenSearch APIの提供状況を確認してください。
```

### 16.3 開発者向けログ

ログに含める。

- エラー種別
- HTTPステータス
- リポジトリホスト
- 使用パラメータ名
- レスポンスContent-Type
- 解析失敗位置

検索語や個人情報をログへ出す場合は、運用ポリシーに従う。

---

## 17. セキュリティ

### 17.1 XSS

APIレスポンス値を `innerHTML` で表示しない。

利用する。

- `textContent`
- DOM API
- HTMLエスケープ済みテンプレート

### 17.2 外部リンク

```html
target="_blank"
rel="noopener noreferrer"
```

### 17.3 URLスキーム

ファイルURLおよびレコードURLは原則として `https:` のみ許可する。

### 17.4 Content-Type

レスポンスの `Content-Type` を確認する。

期待例:

- `application/json`
- `application/xml`
- `text/xml`
- `application/rdf+xml`

### 17.5 XML

XML外部実体参照を行わないパーサを利用する。

---

## 18. CORS

### 18.1 ブラウザクライアント

ブラウザから直接アクセスできるかは、対象リポジトリのCORS設定に依存する。

### 18.2 Chrome拡張

`host_permissions` に対象ホストを登録することで直接アクセスできる構成がある。

### 18.3 サーバープロキシ

CORS回避のためにプロキシを設ける場合は、SSRF対策を必須とする。

### 18.4 エラー判定

CORSエラーと一般的なネットワークエラーはブラウザ上で区別できない場合がある。

メッセージ例:

```text
リポジトリへの接続に失敗しました。CORS設定またはネットワーク接続を確認してください。
```

---

## 19. 機関差への対応

### 19.1 差異が生じる要素

- アイテムタイプ
- メタデータマッピング
- 汎用フィールド
- 作成者表記
- 言語コード
- 資源タイプ値
- OpenSearch提供バージョン
- レスポンス内部構造
- 検索インデックス設定
- ソート設定

### 19.2 設定モデル

```json
{
  "repositoryUrl": "https://example.repo.nii.ac.jp/",
  "responseFormat": "jpcoar",
  "pageSize": 20,
  "enabledFields": [
    "keyword",
    "title",
    "creator",
    "des",
    "type"
  ],
  "customFields": [],
  "resourceTypes": [],
  "allowedHosts": []
}
```

### 19.3 動的機能検出

可能であれば、次を確認する。

```text
/api/opensearch/description.xml
```

ただし、description.xmlに全検索パラメータが記載されるとは限らない。実装上の対応項目と機関設定の双方を考慮する。

---

## 20. テスト仕様

### 20.1 単体テスト

#### URL生成

入力:

```javascript
repositoryUrl = 'https://tsukuba.repo.nii.ac.jp/'
query = { creator: '林 賢紀' }
```

期待:

- `/api/opensearch/search`
- `creator` が正しくエンコードされる
- `format`、`size`、`page` が含まれる

#### 特殊文字

対象:

```text
HAYASHI, Takanori
A & B
10.1234/example
```

#### URL末尾

対象:

```text
https://example.repo.nii.ac.jp
https://example.repo.nii.ac.jp/
https://example.repo.nii.ac.jp/some/path
```

すべて同じoriginのAPIへ接続する。

### 20.2 パーサテスト

対象:

- JSON
- JPCOAR XML
- 多言語タイトル
- 複数作成者
- 複数ファイル
- 欠落フィールド
- 空配列
- 不正XML
- 不正JSON

### 20.3 実環境テスト

#### JIRCAS

```text
https://jircas.repo.nii.ac.jp/api/opensearch/search?creator=HAYASHI%2C%20Takanori
```

期待:

- HTTP 200
- `hits.total = 4` が確認済み環境では4件
- 作成者に `HAYASHI, Takanori`

#### 筑波大学

```text
https://tsukuba.repo.nii.ac.jp/api/opensearch/search?creator=%E6%9E%97%20%E8%B3%A2%E7%B4%80&size=100
```

期待:

- HTTP 200
- `林 賢紀` と `林, 賢紀` の双方を含む結果
- 作成者名の区切り表記差をクライアント側で除外しない

### 20.4 回帰テスト

- `title`
- `creator`
- `des`
- `type`
- 複数条件
- ページング
- 0件
- HTTPエラー
- タイムアウト

---

## 21. AIエージェントへの実装指示

AIエージェントは次の順序で作業する。

1. 対象プロジェクトの構造を調査する。
2. UI、通信、パーサ、表示、状態管理の位置を特定する。
3. 現行テストを確認する。
4. 対応するレスポンス形式を確定する。
5. 検索フィールドを定義駆動へ変更する。
6. URL構築を `URL` / `URLSearchParams` ベースへ変更する。
7. 共通レスポンスモデルを定義する。
8. 作成者検索を追加する。
9. ページング条件保持を実装する。
10. 入力・通信・解析エラーを分離する。
11. 単体テストを追加する。
12. JIRCASおよび筑波大学で実環境テストを行う。
13. 既存機能の回帰テストを行う。
14. READMEまたは利用者向け説明を更新する。

AIエージェントは、ソースコードを確認せずに全置換してはならない。既存の設計、命名、セキュリティ制約、ビルド方式、テスト方式に合わせて差分を最小化する。

---

## 22. 実装完了条件

次をすべて満たすこと。

- リポジトリURLを安全に扱える
- OpenSearch URLを正しく生成できる
- `creator` を含む基本検索項目を利用できる
- 複数条件検索ができる
- JSONまたはJPCOARを共通モデルへ変換できる
- 多言語値を保持できる
- 複数作成者・複数ファイルを表示できる
- ページング時に検索条件を保持する
- 入力、通信、HTTP、解析エラーを処理できる
- XSSおよびSSRFへの対策がある
- JIRCASおよび筑波大学の確認済み検索を通過する
- 既存機能を破壊していない
- 自動テストまたは再現可能な手動テスト手順がある

---

## 23. 最小実装範囲

最初のリリースでは、次だけでもよい。

- リポジトリURL
- `title`
- `creator`
- `des`
- `type`
- `format=jpcoar`
- `size`
- `page`
- 一覧表示
- ページング
- エラー表示

その後、次を段階的に追加する。

1. `keyword`
2. `publisher`
3. `subject`
4. `lang`
5. 識別子検索
6. 日付範囲
7. 機関別設定
8. JSON / JPCOAR切替
9. 検索結果エクスポート
10. 複数リポジトリ横断検索

---

## 24. 将来拡張

### 24.1 複数リポジトリ横断検索

各リポジトリへ並列リクエストし、共通モデルへ変換して統合する。

注意点:

- 同一レコード重複
- DOIによる同定
- ページング
- タイムアウト差
- 一部失敗時の表示
- 機関名表示

### 24.2 エクスポート

候補:

- CSV
- JSON
- JPCOAR XML
- RIS
- BibTeX
- Excel

### 24.3 検索履歴

保存対象:

- リポジトリURL
- 条件
- 実行日時
- 件数

個人名等を含むため、保存方針を明示する。

### 24.4 検索候補

- 資源タイプ候補
- 言語候補
- 過去入力
- 機関別アイテムタイプ

### 24.5 OpenSearch Description

description.xmlを読み込み、検索テンプレートやサービス名を表示する。ただし、実際の検索可能パラメータ一覧としては過信しない。

---

## 25. 参考リクエスト

### 作成者

```text
https://jircas.repo.nii.ac.jp/api/opensearch/search?creator=HAYASHI%2C%20Takanori
```

### 日本語作成者

```text
https://tsukuba.repo.nii.ac.jp/api/opensearch/search?creator=%E6%9E%97%20%E8%B3%A2%E7%B4%80&size=100
```

### タイトル

```text
https://example.repo.nii.ac.jp/api/opensearch/search?title=Open%20Access
```

### 作成者と資源タイプ

```text
https://example.repo.nii.ac.jp/api/opensearch/search?creator=Hayashi&type=journal%20article
```

### JPCOAR

```text
https://example.repo.nii.ac.jp/api/opensearch/search?creator=Hayashi&format=jpcoar&size=20&page=1
```

### DOI

```text
https://example.repo.nii.ac.jp/api/opensearch/search?id=10.1234%2Fexample&id_attr=DOI
```

---

## 26. 注意事項

- OpenSearchパラメータの有効性は、WEKO3のバージョン、設定、メタデータマッピングに依存する。
- ソースコード上で定義されていても、全機関で同じ検索結果になるとは限らない。
- `wid` は実装上、作成者名識別子に割り当てられている。
- `iid` はインデックスツリーIDに割り当てられている。
- 仕様書等で `Iid`、`lid` と記載されている場合でも、実装パラメータは小文字の `iid` として確認する。
- 作成者検索は完全一致検索ではない。
- `exact_title_match` はタイトル専用であり、作成者の完全一致には利用しない。
- 機関間互換性を重視する場合は、内部JSONよりJPCOAR形式を優先する。

## 検索パラメータとWEKO3／JPCOARフィールド対応表

以下は、OpenSearchクエリパラメータ、WEKO3検索インデックス上の対象フィールド、対応するJPCOARスキーマ要素の対応表である。

> 注意:
> - WEKO3検索フィールドは、WEKO3ソースコードの `WEKO_SEARCH_KEYWORDS_DICT` および検索処理に基づく。
> - JPCOAR要素は、検索結果のJPCOAR表現上で対応する概念を示す。
> - 「直接対応なし」は、WEKO3内部管理項目または検索動作指定であり、JPCOARに同名・同義の単一要素が存在しないことを示す。
> - アイテムタイプマッピングやWEKO3の設定により、実際の検索対象フィールドや値が異なる場合がある。

### 優先対応項目

| OpenSearchパラメータ | 意味 | WEKO3検索フィールド | 対応するJPCOAR要素 | 対応上の注意 |
|---|---|---|---|---|
| `keyword` | メタデータ・全文横断検索 | `search_*`, `search_*.ja`, `content.attachment.content` | 単一要素への直接対応なし | 複数のJPCOAR由来検索フィールドと添付ファイル本文を横断検索する。`format` 指定時の全文検索語として利用される。 |
| `title` | タイトル | `search_title`, `search_title.ja` | `dc:title` | タイトルおよび言語別検索フィールドを検索する。 |
| `creator` | 作成者・著者 | `search_creator`, `search_creator.ja` | `creator/creatorName` | 氏名全体を検索する。姓名区切りの空白・カンマは検索解析により吸収される場合がある。 |
| `des` | 内容記述・抄録 | `search_des`, `search_des.ja` | `datacite:description` | 抄録、内容記述等にマッピングされた検索フィールドを対象とする。 |
| `publisher` | 出版者 | `search_publisher`, `search_publisher.ja` | `dc:publisher` | 出版者名を検索する。 |
| `type` | 資源タイプ | `type.raw` | `dc:type` | 主にCOAR Resource Type等の資源タイプ値を対象とする。 |
| `lang` | 言語 | `language` | `dc:language` | 通常は `jpn`, `eng` 等の言語コードを指定する。クエリパラメータは`language`ではない。 |
| `subject` | 主題 | `subject` 配下。主題値は通常 `subject.value` | `subject` | `subjectScheme` を補助条件 `sbjscheme` で指定できる。 |
| `srctitle` | 収録物名 | `sourceTitle`, `sourceTitle.ja` | `sourceTitle` | 掲載誌名、収録物名等を対象とする。 |
| `mimetype` | ファイルMIMEタイプ | `file.mimeType` | `file/mimeType` | 例: `application/pdf`。ファイル情報に対応する。 |
| `itemtype` | WEKOアイテムタイプ | `itemtype.keyword` | 直接対応なし | WEKO3内部のアイテムタイプ名。JPCOARの資源タイプ `dc:type` とは別概念。 |

### その他の検索項目

| OpenSearchパラメータ | 意味 | WEKO3検索フィールド | 対応するJPCOAR要素 | 対応上の注意 |
|---|---|---|---|---|
| `cname` | 寄与者 | `search_contributor`, `search_contributor.ja` | `contributor/contributorName` | 寄与者名を検索する。 |
| `spatial` | 地理的位置 | `geoLocation.geoLocationPlace` | `datacite:geoLocation/datacite:geoLocationPlace` | 場所名による検索。 |
| `temporal` | 時間的範囲 | `temporal` | `dcterms:temporal` | 時間的範囲、時代区分等に対応する。 |
| `version` | バージョン種別 | `versionType` | `oaire:version/@versionType` | `AM`, `VoR` 等のCOAR Version Typeコードを指定する。JPCOAR要素値にはCOAR Version URIが入る場合がある。 |
| `dissno` | 学位論文番号 | `dissertationNumber` | `dissertationNumber` | 例: `甲第7955号`。 |
| `degreename` | 学位名 | `degreeName`, `degreeName.ja` | `degreeName` | 例: `博士（情報学）`。 |
| `dgname` | 学位授与機関名 | `dgName`, `dgName.ja` | `degreeGrantor/degreeGrantorName` | 学位授与機関名称を検索する。 |
| `license` | ライセンス | `content.licensetype.raw` | 直接対応なし | WEKO3のファイル管理用ライセンス種別を検索する。JPCOARの `rights` / `rightsURI` とは直接対応しない。 |
| `wid` | 作成者名識別子 | `creator.nameIdentifier` | `creator/nameIdentifier` | 仕様書上の説明と異なり、実装では作成者の識別子を検索する。ORCIDやWEKO著者ID等が対象になり得る。 |
| `iid` | インデックスツリーID | `path.tree` | 直接対応なし | WEKO3内部のインデックスツリーに対応する。JPCOARのメタデータ要素ではない。 |
| `exact_title_match` | タイトル完全一致指定 | `title`, `alternative` に対する `term` 検索 | `dc:title`, `dcterms:alternative` | 検索対象フィールドではなく、`title` 検索の動作を切り替える真偽値パラメータ。`true` の場合に完全一致検索を行う。 |

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
