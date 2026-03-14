# Issue #84: ファイル情報（file35）入力UI実装

## 概要

TSVインポート時に必要な **ファイル情報（`item_30002_file35`）** フィールドの入力UIを実装する。ユーザーがローカルファイルを選択すると、ファイル名・サイズ・MIMEタイプを自動取得し、その他のメタデータ（アクセス権、公開日、ライセンス等）を手動入力できるようにする。

## 背景・目的

- JAIRO Cloud への一括登録TSVに `item_30002_file35` と `file_path` が必要
- 現在この入力UIが未実装のため、ファイル情報列がTSVに出力されない
- ファイル本体のアップロードは行わず、メタデータ取得のみに `<input type="file">` を使用

## file35 サブフィールド一覧

| サブフィールド | UIタイプ | ファイル選択で自動設定 | デフォルト値 |
|---|---|---|---|
| `file_path` (トップレベル) | text | `recid_{id}/{filename}` | — |
| `accessrole` | select | — | `open_access` |
| `date[0].dateType` | select | — | `Available` |
| `date[0].dateValue` | date | 公開日から | today |
| `displaytype` | select | — | `detail` |
| `fileDate[0].fileDateType` | select | — | — |
| `fileDate[0].fileDateValue` | date | — | — |
| `filename` | text | ✅ ファイル名 | — |
| `filesize[0].value` | text | ✅ サイズ (例: 1.9 MB) | — |
| `format` | text | ✅ MIMEタイプ | — |
| `groups` | text | — | — |
| `licensefree` | textarea | — | — |
| `licensetype` | select | — | — |
| `url.label` | text | — | — |
| `url.objectType` | select | — | `fulltext` |
| `url.url` | text | — | — |
| `version` | text | — | — |

## 影響範囲

| ファイル | 変更箇所 | 行番号目安 |
|---------|---------|-----------|
| `make_jc_importer.html` | TITLE_MAPS にselect選択肢追加 | ~703-823 |
| 同上 | FIELD_DEFS に `file` タイプエントリ追加 | ~2750-2882 |
| 同上 | `renderOneFile()` 新規関数 | renderOneFunder (~3687) 付近 |
| 同上 | `renderFileField()` 新規関数 | renderFundingField 付近 |
| 同上 | `renderAll()` switch に `case 'file'` 追加 | ~4232-4262 |
| 同上 | `buildEmptyMetadata()` に file35 初期値追加 | ~4277-4340 |
| 同上 | `collectFileField()` 新規関数 | collectFundingField (~4546) 付近 |
| 同上 | `collectFromDOM()` switch に `case 'file'` 追加 | ~4743-4754 |
| 同上 | `buildFilePreview()` 新規関数 | buildFundingPreview (~5075) 付近 |
| 同上 | プレビュー switch に `case 'file'` 追加 | ~5212-5215 |
| 同上 | `TSV_EXCL_SUFFIXES` から file35 除去 | ~4770-4773 |
| 同上 | `file_path` のTSV出力対応 | TSV生成処理付近 |
| `chrome-extension/make_jc_importer.js` | 上記変更の同期 | — |
| `chrome-extension/panel.html` | 更新概要テーブル更新 | — |

## 実装ステップ

### Step 1: TITLE_MAPS にselect選択肢を追加

以下のマップ定数を追加する:

```javascript
const FILE_ACCESSROLE_MAP = {
  'open_access': 'オープンアクセス',
  'open_date': '日付指定公開',
  'open_login': 'ログインユーザーのみ',
  'open_no': '非公開'
};

const FILE_DISPLAYTYPE_MAP = {
  'detail': '詳細表示',
  'simple': 'シンプル表示',
  'preview': 'プレビュー'
};

const FILE_OBJECT_TYPE_MAP = {
  'abstract': 'abstract',
  'fulltext': 'fulltext',
  'summary': 'summary',
  'thumbnail': 'thumbnail',
  'other': 'other'
};

const FILE_LICENSE_TYPE_MAP = {
  'license_no': 'ライセンスなし',
  'license_free': '自由入力',
  'license_0': 'CC BY 4.0',
  'license_1': 'CC BY-SA 4.0',
  'license_2': 'CC BY-ND 4.0',
  'license_3': 'CC BY-NC 4.0',
  'license_4': 'CC BY-NC-SA 4.0',
  'license_5': 'CC BY-NC-ND 4.0',
  'license_6': 'CC BY 3.0',
  'license_7': 'CC BY-SA 3.0',
  'license_8': 'CC BY-ND 3.0',
  'license_9': 'CC BY-NC 3.0',
  'license_10': 'CC BY-NC-SA 3.0',
  'license_11': 'CC BY-NC-ND 3.0',
  'license_12': 'CC0'
};
```

`TITLE_MAPS` に `accessrole`, `displaytype`, `objectType`, `licensetype` キーで登録。既存の `DATE_TYPE_MAP` を `date[0].dateType` と `fileDate[0].fileDateType` で共用する。

### Step 2: licensetype 自動設定用マッピング定数

権利情報リソースURIから `licensetype` を自動設定するためのマッピング:

```javascript
const CC_URI_TO_LICENSE_TYPE = {
  'https://creativecommons.org/licenses/by/4.0': 'license_0',
  'https://creativecommons.org/licenses/by-sa/4.0': 'license_1',
  'https://creativecommons.org/licenses/by-nd/4.0': 'license_2',
  'https://creativecommons.org/licenses/by-nc/4.0': 'license_3',
  'https://creativecommons.org/licenses/by-nc-sa/4.0': 'license_4',
  'https://creativecommons.org/licenses/by-nc-nd/4.0': 'license_5',
  'https://creativecommons.org/licenses/by/3.0': 'license_6',
  'https://creativecommons.org/licenses/by-sa/3.0': 'license_7',
  'https://creativecommons.org/licenses/by-nd/3.0': 'license_8',
  'https://creativecommons.org/licenses/by-nc/3.0': 'license_9',
  'https://creativecommons.org/licenses/by-nc-sa/3.0': 'license_10',
  'https://creativecommons.org/licenses/by-nc-nd/3.0': 'license_11',
  'https://creativecommons.org/publicdomain/zero/1.0': 'license_12'
};
```

- 判定方法: `startsWith()` による前方一致
- 対応サフィックス: `/deed.ja`, `/deed.en`, `/deed`, 末尾スラッシュの有無

### Step 3: FIELD_DEFS に file35 エントリ追加

```javascript
{
  key: 'item_30002_file35',
  label: 'ファイル情報',
  type: 'file',
  sum: arr => {
    if (!Array.isArray(arr) || !arr.length) return '';
    const names = arr.map(f => f.filename || '').filter(Boolean);
    return names.length ? names.join(', ') : `${arr.length}件`;
  }
}
```

### Step 4: formatFileSize() ヘルパー追加

```javascript
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}
```

### Step 5: renderOneFile() — 1ファイル分のUI描画

既存の `renderOneFunder()` パターンを踏襲:

- `createNestedItem()` でアコーディオンラッパー生成
- `<input type="file">` を配置し、`change` イベントで以下を自動設定:
  - `filename` ← `File.name`
  - `filesize[0].value` ← `formatFileSize(File.size)`
  - `format` ← `File.type || 'application/octet-stream'`
- 各サブフィールドを `createFieldRow()` で描画
- `licensetype` が `license_free` の場合のみ `licensefree` textarea を表示（`change` イベントで表示切替）
- `date[0].dateValue` のデフォルト値: 今日の日付

### Step 6: licensetype 自動設定ロジック

権利情報（`item_30002_rights12`）の `subitem_rights_resource` の値を参照:

- CC URIに前方一致 → `CC_URI_TO_LICENSE_TYPE` で `licensetype` を自動設定
- file35 の各エントリに適用
- ユーザーが手動変更した場合は上書きしない（初期設定時のみ適用）
- 実装方法: `renderOneFile()` 内で権利情報フィールドの現在値を参照して初期設定

### Step 7: renderFileField() — 複数ファイル対応セクション描画

既存の `renderFundingField()` パターンを踏襲:

- 「ファイルを追加」ボタンで `renderOneFile()` を動的追加
- 削除ボタンで個別エントリ削除

### Step 8: renderAll() に case 追加

```javascript
case 'file':
  sectionEl = renderFileField(def, value);
  break;
```

### Step 9: buildEmptyMetadata() に file35 初期値追加

```javascript
metadata.item_30002_file35 = [];
```

### Step 10: collectFileField() — DOM→JSON変換

`collectFundingField()` パターンを踏襲。各 `.nested-item.level-1` から以下を収集:

| フィールド | 収集方法 |
|-----------|---------|
| `filename`, `format`, `groups`, `version`, `licensefree` | テキスト値 |
| `accessrole`, `displaytype`, `licensetype` | select値 |
| `filesize` | `[{ value: ... }]` |
| `date` | `[{ dateType: ..., dateValue: ... }]` |
| `fileDate` | `[{ fileDateType: ..., fileDateValue: ... }]` |
| `url` | `{ url: ..., label: ..., objectType: ... }` |

### Step 11: collectFromDOM() に case 追加

```javascript
case 'file':
  metadata[def.key] = collectFileField(section);
  break;
```

`file_path` の収集: file35 の各エントリから `recid_{id}/{filename}` 形式で `file_path` 配列を生成し、`metadata.file_path` に格納。

### Step 12: TSV出力対応

- `TSV_EXCL_SUFFIXES` から `file35` を除去
- `file_path` のTSVヘッダ・値出力を追加
- file35 の各サブフィールドをTSVヘッダテンプレートに対応する形式で展開

TSVヘッダ（16列）:
```
.metadata.item_30002_file35[0].accessrole
.metadata.item_30002_file35[0].date[0].dateType
.metadata.item_30002_file35[0].date[0].dateValue
.metadata.item_30002_file35[0].displaytype
.metadata.item_30002_file35[0].fileDate[0].fileDateType
.metadata.item_30002_file35[0].fileDate[0].fileDateValue
.metadata.item_30002_file35[0].filename
.metadata.item_30002_file35[0].filesize[0].value
.metadata.item_30002_file35[0].format
.metadata.item_30002_file35[0].groups
.metadata.item_30002_file35[0].licensefree
.metadata.item_30002_file35[0].licensetype
.metadata.item_30002_file35[0].url.label
.metadata.item_30002_file35[0].url.objectType
.metadata.item_30002_file35[0].url.url
.metadata.item_30002_file35[0].version
```

システムフィールド: `.file_path[0]`

### Step 13: buildFilePreview() — プレビュー表示

`buildFundingPreview()` パターンを踏襲:

- テーブル列: #, ファイル名, サイズ, 形式, アクセス権, ライセンス
- プレビュー switch に `case 'file'` を追加

### Step 14: Chrome拡張同期

- `chrome-extension/make_jc_importer.js` に全変更を反映（CONFIGセクションのAPIキーは保持）
- `chrome-extension/panel.html` の更新概要テーブルを更新

## データ構造

```javascript
// metadata 内の構造
item_30002_file35: [
  {
    filename: 'document.pdf',
    format: 'application/pdf',
    filesize: [{ value: '1.9 MB' }],
    accessrole: 'open_access',
    displaytype: 'detail',
    licensetype: 'license_0',
    licensefree: '',
    version: '',
    groups: '',
    url: {
      url: '',
      label: '',
      objectType: 'fulltext'
    },
    date: [{ dateType: 'Available', dateValue: '2026-03-14' }],
    fileDate: [{ fileDateType: '', fileDateValue: '' }]
  }
]

// file_path（トップレベル）
file_path: ['recid_12345/document.pdf']
```

## テスト方針

1. **ファイル選択テスト**: PDFファイルを選択し、filename/filesize/format が自動設定されることを確認
2. **MIME判定テスト**: `.pdf`（application/pdf）、`.docx`、拡張子なしファイル（application/octet-stream フォールバック）
3. **licensetype自動設定テスト**: 権利情報に CC BY 4.0 URI を入力 → licensetype が `license_0` に設定されることを確認
4. **複数ファイルテスト**: 2件以上のファイルを追加・削除し、UIとデータ収集が正常に動作すること
5. **TSVエクスポートテスト**: file35 列と file_path が正しくTSVに出力されること
6. **プレビューテスト**: ファイル情報がプレビューモーダルに表示されること
7. **E2Eテスト**: デフォルトDOIでテスト実行し、既存機能に影響がないことを確認

## 注意事項

- **ファイル本体はアップロードしない** — `<input type="file">` はメタデータ（名前・サイズ・MIME）取得のみに使用。実際のファイルアップロードはWEKO側で行う
- **file_path 形式**: `recid_{id}/{filename}` — `{id}` はWEKOのレコードIDだが、TSV作成時点では不明な場合がある。ユーザーが手動入力できるようにする
- **既存フィールドへの影響なし** — file35 は新規追加のため、既存のCrossref/JaLCデータ取得フローには影響しない
- **CC URIの前方一致**: `/deed.ja`, `/deed.en`, `/deed`, 末尾スラッシュの有無に対応するため、`startsWith()` で判定
