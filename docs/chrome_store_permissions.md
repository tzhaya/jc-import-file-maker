# Chrome Web Store 権限の正当化（Permission Justification）

Chrome Web Store 審査向けに、本拡張機能が要求する各権限の理由をまとめます。
審査フォームの "Permission justification" 欄への記載内容としてそのまま利用できます。

---

## `storage`

**用途**: 利用者が設定画面（options.html）で入力した API キー（OpenAlex / CiNii / Open Policy Finder）をブラウザのローカルストレージ（`chrome.storage.local`）に保存するために使用します。

**必要な理由**: API キーはセッションをまたいで保持する必要があり、ブラウザの `chrome.storage.local` が最適な手段です。外部サーバーには送信しません。

---

## `sidePanel`

**用途**: ツールバーボタンクリック時にサイドパネルを開き、メタデータ取得・TSV 生成 UI を表示するために使用します。

**必要な理由**: 電子ジャーナルのページを表示しながら操作できるよう、サイドパネル形式の UI を採用しています。

---

## `scripting`

**用途**: 利用者が「ページから DOI 取得」ボタンを押したときに限り、現在表示中のタブのページから DOI を示す meta タグ（`citation_doi` / `prism.doi` / `DOI` / `dc.identifier`）および schema.org JSON-LD の identifier を読み取るために使用します。

**必要な理由**: 電子ジャーナル掲載ページの DOI を自動入力する機能（`chrome.scripting.executeScript`）に必須です。

**安全策**:
- 利用者がボタンを押したときのみ実行し、バックグラウンドでの自動実行はしません。
- 読み取るのは DOI を示す meta タグ・JSON-LD identifier の値のみです。ページ本文・フォーム・閲覧履歴は読みません。
- 取得した DOI 文字列は入力欄にセットするだけで、外部サーバーには送信しません。
- `http:`/`https:` 以外の特権ページ（`chrome://` 等）では実行しません。

---

## `optional_host_permissions`: `https://*/*`, `http://*/*`

**用途**: `scripting` 権限で `chrome.scripting.executeScript` を実行する対象ページのホスト権限として使用します。利用者が「ページから DOI 取得」ボタンを押したときに `chrome.permissions.request()` で実行時に要求します（インストール時には要求しません）。

**必要な理由**: 電子ジャーナルは出版社ごとにドメインが異なり、事前にすべてのドメインを列挙することが不可能です。そのため広いホストパターン（`https://*/*`）を optional_host_permissions として宣言し、実際の許可はユーザー操作時に取得しています。

**安全策**:
- `optional_host_permissions` のため、インストール時ではなく利用者の明示的な操作（ボタン押下）時にブラウザが許可確認ダイアログを表示します。
- 許可後も読み取るのは DOI の meta タグ・JSON-LD identifier のみです。
- 取得した情報は入力欄へのセットのみに使用し、外部へ送信しません。
- 許可はブラウザの設定（拡張機能の管理画面）からいつでも取り消せます。

---

## `host_permissions`（固定ホスト群）

**用途**: 以下の学術 API・機関リポジトリへの CORS 制約なしアクセスに使用します。利用者がメタデータ取得・検索機能を実行したときに限り、対象ドメインへリクエストします。

| ホスト | 用途 |
|---|---|
| `https://kaken.nii.ac.jp/*` | 科研費課題情報取得（KAKEN API） |
| `https://api.japanlinkcenter.org/*` | DOI メタデータ取得（JaLC API） |
| `https://api.openpolicyfinder.jisc.ac.uk/*` | OA ポリシー取得（Open Policy Finder API） |
| `https://*.repo.nii.ac.jp/*` 他 WEKO3 リポジトリ | 機関リポジトリ OpenSearch 検索・登録済み照合 |

**必要な理由**: 上記 API は CORS 制約のため通常のウェブページから直接呼び出せません。Chrome 拡張の `host_permissions` によって Service Worker（`background.js`）または extension page（サイドパネル）から CORS 制約なしでアクセスしています。

**安全策**:
- Service Worker 経由の fetch proxy は `ALLOWED_HOSTS`（`background.js` 内）で3ホストのみに限定しており、ホワイトリスト外のホストは `Blocked` エラーを返します。
- WEKO3 リポジトリ等への直接 fetch はサイドパネル（extension page）から行います。
- 利用者が機能を実行したときのみリクエストします。常時監視やバックグラウンドポーリングはしません。
- 問い合わせ内容は利用者が入力した DOI・課題番号・ISSN など書誌情報のみです。個人情報・閲覧履歴は送信しません。
