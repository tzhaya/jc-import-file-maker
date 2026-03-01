# Issue #42 実装計画: 関連情報（relation）の取得改善

## Context

関連情報（`item_30002_relation18`）について以下2点を改善する:

1. **DOI の URL 形式統一**: Crossref `relation` から取得した DOI が素のテキスト（例: `10.1101/...`）で格納されるが、入力 DOI や OpenAlex ids は URL 形式（`https://doi.org/...`）。形式を統一する。
2. **関連名称の自動取得**: `subitem_relation_name` が常に空配列 `[]` のまま。DOI タイプの関連エントリについて、Crossref パスでは Crossref API、JaLC パスでは JaLC API からタイトルを取得して設定する。

---

## 修正対象ファイル

- `make_jc_importer.html` のみ（単一ファイル構成）

---

## Step 1: タイトル取得関数の新設（~L1142 `fetchJaLC()` 直後）

### 1a. `fetchRelationTitle()` — Crossref パス用

関連 DOI のタイトルと言語を Crossref API から取得する軽量関数。

```javascript
/**
 * 関連DOIのタイトルと言語を Crossref API から取得
 * @param {string} doi - DOI（URL形式でも素のDOIでも可）
 * @returns {Promise<{title: string, lang: string}|null>}
 */
async function fetchRelationTitle(doi) {
  const bareDoi = doi.replace(/^https?:\/\/doi\.org\//i, '');
  try {
    const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(bareDoi)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const msg = data.message || {};
    const title = (msg.title || [])[0] || '';
    const lang = msg.language || 'en';
    return title ? { title, lang } : null;
  } catch {
    return null;
  }
}
```

### 1b. `fetchRelationTitleJaLC()` — JaLC パス用

関連 DOI のタイトルを JaLC API から取得。JaLC DOI は Crossref に情報がないため、JaLC API を使用する。
JaLC の `title_list` は多言語対応（`[{ title, lang }, ...]`）なので、最初のタイトルを返す。

```javascript
/**
 * 関連DOIのタイトルと言語を JaLC API から取得
 * @param {string} doi - DOI（URL形式でも素のDOIでも可）
 * @returns {Promise<{title: string, lang: string}|null>}
 */
async function fetchRelationTitleJaLC(doi) {
  const bareDoi = doi.replace(/^https?:\/\/doi\.org\//i, '');
  try {
    const resp = await fetch(`https://api.japanlinkcenter.org/v2/dois/${encodeURIComponent(bareDoi)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const titles = (json.data || {}).title_list || [];
    const first = titles[0];
    return first?.title ? { title: first.title, lang: first.lang || 'ja' } : null;
  } catch {
    return null;
  }
}
```

**設計ポイント**:
- 両関数ともエラー時は `null` を返し silent fail（呼び出し元で graceful degradation）
- `fetchCrossref()` / `fetchJaLC()` を再利用しない理由: 既存関数は 404 で throw するが、関連 DOI の取得失敗は正常系
- JaLC の `title_list` は多言語だが、最初の 1 件を採用（通常は主タイトル）
- JaLC のデフォルト言語は `ja`（日本語 DOI が主）

---

## Step 2: `mapToItemType()` の relation 部分修正（L1893-1971）

### 2a. IIFE 廃止・直接コード展開

現在 `item_30002_relation18` は IIFE `(() => { ... })()` で構築されているが、`await` を使用するため IIFE を廃止し、`mapToItemType()` 本体に直接展開する。`mapToItemType()` 自体は既に async なのでそのまま `await` が使える。

**変更前** (L1893):
```javascript
item_30002_relation18: (() => {
  const VALID_RELATION_ID_TYPES = new Set([...]);
  const relations = [];
  // ... 構築処理 ...
  return relations;
})(),
```

**変更後**:
```javascript
item_30002_relation18: await (async () => {
  const VALID_RELATION_ID_TYPES = new Set([...]);
  const relations = [];
  // ... 構築処理（Step 2b, 2c の変更含む）...
  return relations;
})(),
```

> オブジェクトリテラル内で `await` を使うため `async` IIFE に変更。メタデータオブジェクト全体の構造を維持。

### 2b. DOI URL 形式統一（セクション4内）

**変更前** (L1960-1964):
```javascript
relations.push({
  subitem_relation_type: jpcoarRelType,
  subitem_relation_type_id: {
    subitem_relation_type_id_text: id,
    subitem_relation_type_select: jpcoarIdType,
  },
  subitem_relation_name: [],
});
```

**変更後**:
```javascript
const idText = jpcoarIdType === 'DOI' && !/^https?:\/\//i.test(id)
  ? `https://doi.org/${id}` : id;
relations.push({
  subitem_relation_type: jpcoarRelType,
  subitem_relation_type_id: {
    subitem_relation_type_id_text: idText,
    subitem_relation_type_select: jpcoarIdType,
  },
  subitem_relation_name: [],
});
```

### 2c. 関連名称の自動取得（セクション4 の後、`return relations;` の前）

`isIdenticalTo` 以外の DOI エントリを収集し、`Promise.all` で並列にタイトル取得する。

```javascript
// 5) DOI タイプの関連エントリにタイトルを設定（isIdenticalTo は自身の識別子なので除外）
const doiRelEntries = [];
relations.forEach((rel, i) => {
  if (rel.subitem_relation_type !== 'isIdenticalTo'
      && rel.subitem_relation_type_id.subitem_relation_type_select === 'DOI') {
    doiRelEntries.push({ index: i, doi: rel.subitem_relation_type_id.subitem_relation_type_id_text });
  }
});
const titles = await Promise.all(doiRelEntries.map(e => fetchRelationTitle(e.doi)));
doiRelEntries.forEach((e, i) => {
  if (titles[i]) {
    relations[e.index].subitem_relation_name = [{
      subitem_relation_name_text: titles[i].title,
      subitem_relation_name_language: titles[i].lang,
    }];
  }
});
```

**対象外の理由**:
- `isIdenticalTo`: 自身の DOI・OpenAlex IDs・ISBN — 自論文の識別子なので名称取得不要

---

## Step 3: `mapToItemTypeJaLC()` の relation 部分修正（L2136-2157）

### 3a. フィールド名修正 + DOI URL 形式統一

既存コードの JaLC API フィールド名が実際のレスポンスと不一致のため修正する。

JaLC API 実際のレスポンス:
```json
"relation_list": [
  { "content": "https://doi.org/10.34556/...", "type": "DOI", "relation": "hasVersion" },
  { "content": "https://example.com/...", "type": "URL", "relation": "hasVersion" }
]
```

**変更前** (L2145-2157):
```javascript
(jalcJson.relation_list || []).forEach(r => {
  const relType = r.relation_type || '';
  const idType  = r.identifier_type || '';
  const id      = r.related_identifier || r.url || '';
  if (!id) return;
  const jpcoarRelType = relType || 'isReferencedBy';
  const jpcoarIdType  = idType || 'URI';
  relations.push({
    subitem_relation_type: jpcoarRelType,
    subitem_relation_type_id: { subitem_relation_type_id_text: id, subitem_relation_type_select: jpcoarIdType },
    subitem_relation_name: [],
  });
});
```

**変更後**:
```javascript
(jalcJson.relation_list || []).forEach(r => {
  const relType = r.relation || '';
  const idType  = r.type || '';
  const id      = r.content || '';
  if (!id) return;
  const jpcoarRelType = relType || 'isReferencedBy';
  const jpcoarIdType  = idType || 'URI';
  const idText = jpcoarIdType === 'DOI' && !/^https?:\/\//i.test(id)
    ? `https://doi.org/${id}` : id;
  relations.push({
    subitem_relation_type: jpcoarRelType,
    subitem_relation_type_id: { subitem_relation_type_id_text: idText, subitem_relation_type_select: jpcoarIdType },
    subitem_relation_name: [],
  });
});
```

### 3b. 関連名称の自動取得（relation_list ループの後）

Step 2c と同じパターンだが、**JaLC API** を使用。`isIdenticalTo`（自身の DOI エントリ）を除外し、DOI タイプのエントリのタイトルを JaLC API から取得。

JaLC の `relation_list` にはタイトル情報が含まれないため、関連 DOI の `title_list` を `fetchRelationTitleJaLC()` で別途取得する。

```javascript
// DOI タイプの関連エントリにタイトルを設定（JaLC API 使用）
const doiRelEntries = [];
relations.forEach((rel, i) => {
  if (rel.subitem_relation_type !== 'isIdenticalTo'
      && rel.subitem_relation_type_id.subitem_relation_type_select === 'DOI') {
    doiRelEntries.push({ index: i, doi: rel.subitem_relation_type_id.subitem_relation_type_id_text });
  }
});
const relTitles = await Promise.all(doiRelEntries.map(e => fetchRelationTitleJaLC(e.doi)));
doiRelEntries.forEach((e, i) => {
  if (relTitles[i]) {
    relations[e.index].subitem_relation_name = [{
      subitem_relation_name_text: relTitles[i].title,
      subitem_relation_name_language: relTitles[i].lang,
    }];
  }
});
```

---

## パフォーマンス考慮

- relation 内の DOI 件数は通常 1〜3 件程度（`has-preprint`, `is-version-of` 等）
- `Promise.all` で並列リクエストするため、追加待ち時間は最大 1 リクエスト分程度
- エラー時は silent fail（null 返却）で既存動作に影響なし
- 既に `mapToItemType()` / `mapToItemTypeJaLC()` 内で多数の API コールが行われているため、追加の影響は軽微

---

## 行番号インパクト

| 修正箇所 | 追加行数目安 |
|---|---|
| `fetchRelationTitle()` 新設（~L1143） | +15行 |
| `fetchRelationTitleJaLC()` 新設（~L1158） | +16行 |
| `mapToItemType()` IIFE→async IIFE 化 | +1行 |
| `mapToItemType()` DOI URL 統一 | +2行 |
| `mapToItemType()` タイトル取得追加 | +13行 |
| `mapToItemTypeJaLC()` フィールド名修正 + DOI URL 統一 | +2行 |
| `mapToItemTypeJaLC()` タイトル取得追加 | +13行 |
| **合計** | **~+62行** |

---

## 検証方法

1. テスト用 DOI `10.1038/s41467-023-40773-1` でデータ取得
2. 関連情報セクションを確認:
   - `has-preprint` → `10.1101/2021.07.28.453724` が `https://doi.org/10.1101/2021.07.28.453724` として格納される
   - `subitem_relation_name` にプレプリントのタイトルが設定される
3. テスト用 DOI `10.1016/j.advnut.2025.100480` でもデータ取得し、relation がある場合に名称が設定されることを確認
4. 関連 DOI が存在しない場合（404）、`subitem_relation_name` は空配列のまま（既存動作と同じ）

---

## ブランチ・PR

- ブランチ: `feature/relation-improvement`
- PR前更新: README.md、make_jc_importer.html (version-info)、docs/requirements.md、docs/worklog.md、MEMORY.md
