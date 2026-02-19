# DOI必須項目バッジ表示機能の実装計画

## Context
`docs/JPCOAR_JaLC_Crossref_requirements.md` に整理されたJaLC DOI / Crossref DOIの必須項目情報を、
HTMLフォームのセクションヘッダーに色付きタグ+ツールチップとして表示する。
資源タイプ（ジャーナルアーティクル系 / 書籍系）に応じてバッジを動的に切り替える。

## 対象ファイル
- `make_jc_importer.html` — 唯一の変更対象

## 実装ステップ

### Step 1: DOI必須要件データ定数を追加（~527行付近、JPCOAR_LINKSの後）

`DOI_REQUIREMENTS` 定数を追加。キーは FIELD_DEFS の key、値は別表ごとの必須レベルを持つ。

```js
// 別表2-1/3-1: ジャーナルアーティクル系、別表2-3/3-2: 書籍系
// 値: 'required'=必須, 'conditional'=条件付必須, null=任意/対象外
const DOI_REQUIREMENTS = {
  'item_30002_title0':                    { article: { jalc: 'required', crossref: 'required' }, book: { jalc: 'required', crossref: 'required' } },
  'item_30002_creator2':                  { article: { jalc: 'conditional', crossref: 'conditional' }, book: { jalc: 'conditional', crossref: 'conditional' } },
  'item_30002_publisher10':               { article: { jalc: 'required', crossref: 'required' }, book: { jalc: 'required', crossref: 'required' } },
  'item_30002_date11':                    { article: { jalc: 'required', crossref: 'required' }, book: { jalc: 'required', crossref: 'required' } },
  'item_30002_resource_type13':           { article: { jalc: 'required', crossref: 'required' }, book: { jalc: 'required', crossref: 'required' } },
  'item_30002_identifier16':             { article: { jalc: 'required', crossref: 'required' }, book: { jalc: 'required', crossref: 'required' } },
  'item_30002_identifier_registration17':{ article: { jalc: 'required', crossref: 'required' }, book: { jalc: 'required', crossref: 'required' } },
  'item_30002_source_identifier22':      { article: { jalc: null, crossref: 'required' }, book: null },
  'item_30002_source_title23':           { article: { jalc: null, crossref: 'required' }, book: null },
  'item_30002_volume_number24':          { article: { jalc: 'required', crossref: 'required' }, book: null },
  'item_30002_page_start27':             { article: { jalc: 'required', crossref: 'required' }, book: null },
  // 書籍のみ: ISBN (relation内) は別途備考で対応
};
```

加えて、ツールチップ用の備考情報も含める（例: `note: 'Crossref: xml:lang必須'`）。

### Step 2: 資源タイプ→別表カテゴリ判定関数を追加

```js
function getDoiCategory(resourceType) {
  const bookTypes = ['book','book part','technical report','research report','report',
                     'thesis','bachelor thesis','master thesis','doctoral thesis'];
  const articleTypes = ['conference paper','departmental bulletin paper','journal article',
                        'review article','data paper','editorial','article','newspaper',
                        'software paper','other'];
  if (articleTypes.includes(resourceType)) return 'article';
  if (bookTypes.includes(resourceType)) return 'book';
  return null; // 該当なし → バッジ非表示
}
```

### Step 3: CSSスタイル追加（`<style>`セクション内）

```css
.doi-badge {
  display: inline-block;
  font-size: 0.7em;
  font-weight: normal;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 4px;
  cursor: help;
  vertical-align: middle;
}
.doi-badge.jalc-required { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
.doi-badge.jalc-conditional { background: #e3f2fd; color: #1565c0; border: 1px dashed #90caf9; }
.doi-badge.crossref-required { background: #fce4ec; color: #c62828; border: 1px solid #ef9a9a; }
.doi-badge.crossref-conditional { background: #fce4ec; color: #c62828; border: 1px dashed #ef9a9a; }
```

### Step 4: バッジ生成関数を追加

```js
function createDoiBadges(fieldKey, category) {
  const req = DOI_REQUIREMENTS[fieldKey];
  if (!req) return '';
  const catReq = req[category];
  if (!catReq) return '';
  let html = '';
  if (catReq.jalc) {
    const cls = catReq.jalc === 'required' ? 'jalc-required' : 'jalc-conditional';
    const label = catReq.jalc === 'required' ? 'JaLC必須' : 'JaLC条件付';
    const tip = catReq.jalc_note || (catReq.jalc === 'required' ? 'JaLC DOI登録に必須' : 'JaLC DOI: 条件付必須');
    html += `<span class="doi-badge ${cls}" title="${tip}">${label}</span>`;
  }
  if (catReq.crossref) {
    const cls = catReq.crossref === 'required' ? 'crossref-required' : 'crossref-conditional';
    const label = catReq.crossref === 'required' ? 'Crossref必須' : 'Crossref条件付';
    const tip = catReq.crossref_note || (catReq.crossref === 'required' ? 'Crossref DOI登録に必須' : 'Crossref DOI: 条件付必須');
    html += `<span class="doi-badge ${cls}" title="${tip}">${label}</span>`;
  }
  return html;
}
```

### Step 5: `createSection()` を修正してバッジを挿入（~1555行）

現在の `createSection()` の `header.innerHTML` 生成部分にバッジHTMLを追加:

```js
function createSection(key, label, summaryText) {
  // ... 既存コード ...
  const category = getCurrentDoiCategory(); // 現在の資源タイプから判定
  const badges = createDoiBadges(key, category);
  header.innerHTML = `<span class="toggle-icon">▼</span>${labelHtml}${badges}<span class="summary">...</span>`;
  // ...
}
```

`getCurrentDoiCategory()` は DOM から現在の資源タイプを取得:
```js
function getCurrentDoiCategory() {
  const section = document.querySelector('.field-section[data-key="item_30002_resource_type13"]');
  const sel = section?.querySelector('select');
  return sel ? getDoiCategory(sel.value) : null;
}
```

### Step 6: 資源タイプ変更時のバッジ更新

資源タイプの `<select>` に change イベントを追加し、全セクションヘッダーのバッジを再描画する `updateDoiBadges()` 関数を実装。

```js
function updateDoiBadges() {
  const category = getCurrentDoiCategory();
  document.querySelectorAll('.field-section').forEach(section => {
    const key = section.dataset.key;
    const header = section.querySelector('.section-header');
    // 既存バッジを除去
    header.querySelectorAll('.doi-badge').forEach(b => b.remove());
    // 新バッジを挿入（summaryの前）
    const summary = header.querySelector('.summary');
    if (category) {
      const tmp = document.createElement('span');
      tmp.innerHTML = createDoiBadges(key, category);
      while (tmp.firstChild) header.insertBefore(tmp.firstChild, summary);
    }
  });
}
```

資源タイプの select に change リスナーを付ける箇所: `createFieldRow()` 内で `resourcetype` フィールドの select 生成時（既存の link 処理の近く）、または `renderAll()` 完了後に `addEventListener` を付与。

### Step 7: 初期表示時のバッジ反映

`renderAll()` の最後で `updateDoiBadges()` を呼び出し、APIデータ取得後の初期描画でもバッジを表示。

## DOI_REQUIREMENTS 全項目リスト（要件文書から）

| WEKO key | article jalc | article crossref | book jalc | book crossref | 備考 |
|----------|-------------|-----------------|-----------|--------------|------|
| title0 | required | required | required | required | Crossref: xml:lang必須 |
| creator2 | conditional | conditional | conditional | conditional | 作成者がある場合。Crossref: xml:lang必須 |
| publisher10 | required | required | required | required | Crossref: xml:lang="en"必須 |
| date11 | required | required | required | required | |
| resource_type13 | required | required | required | required | |
| identifier16 | required | required | required | required | |
| identifier_registration17 | required | required | required | required | |
| volume_number24 | required | required | ― | ― | |
| page_start27 | required | required | ― | ― | ない場合「none」 |
| source_identifier22 | ― | required | ― | ― | Crossrefのみ必須 |
| source_title23 | ― | required | ― | ― | Crossref: xml:lang="en"必須 |
| relation18 | ― | ― | ― | ISBN必須 | 書籍Crossref: ISBN必須(isIdenticalTo) |

注: `file35`（本文URL）は FIELD_DEFS に含まれていない（Phase 2 の TSV エクスポートで別扱い）ため、ここではバッジ対象外とする。

## 検証方法
1. ブラウザで `make_jc_importer.html` を開く
2. 資源タイプを「journal article」に変更 → タイトル、出版者、日付、巻、開始ページ等にバッジ表示を確認
3. 資源タイプを「book」に変更 → 巻・開始ページのバッジ消失、収録物識別子/名のバッジ消失を確認
4. 資源タイプを「image」等（対象外）に変更 → 全バッジ消失を確認
5. DOIを入力してAPI取得 → 資源タイプ自動設定後にバッジが正しく表示されることを確認
6. バッジにマウスホバー → ツールチップで備考表示を確認
