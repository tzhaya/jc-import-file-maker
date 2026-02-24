# Issue #17 実装計画: 識別子からの機関名逆引き

## Context

助成情報・所属機関の識別子（ROR, Crossref Funder ID）から機関名をAPIで逆引きし、
入力済み名称との差異を警告・上書きできる機能を追加する。

- 対象識別子: **ROR**（所属機関 + 助成機関）、**Crossref Funder**（助成機関）
- 対象外: ISNI, GRID, Ringgold（APIなし）、ORCID（後日実装）

---

## 修正対象ファイル

- `make_jc_importer.html` のみ（単一ファイル構成）

---

## Step 1: CSS 追加（~L354 直前）

`.lookup-result` クラスを `<style>` セクション末尾に追加:

```css
/* ===== 識別子逆引き結果エリア ===== */
.lookup-result {
  margin: 2px 16px 4px;
  font-size: 0.82em;
  min-height: 1.2em;
}
.lookup-result.ok   { color: #2e7d32; }
.lookup-result.warn { color: #e65100; }
.lookup-result.err  { color: #c62828; }
```

---

## Step 2: API 関数追加（~L979 直後、`fetchAllRorData` の前）

### `fetchRorNamesAll(rorUri)`

ROR v2 API で `ror_display` + `label` タイプの全名称を取得。

```javascript
async function fetchRorNamesAll(rorUri) {
  const rorId = rorUri.replace(/^https?:\/\/ror\.org\//i, '').replace(/\/$/, '');
  const resp = await fetch(`https://api.ror.org/v2/organizations/${encodeURIComponent(rorId)}`);
  if (!resp.ok) throw new Error(`ROR APIエラー: ${resp.status}`);
  const data = await resp.json();
  return (data.names || [])
    .filter(n => Array.isArray(n.types) && (n.types.includes('ror_display') || n.types.includes('label')))
    .map(n => ({ name: n.value, lang: n.lang || '' }));
}
```

### `fetchCrossrefFunderDetails(funderUri)`

Crossref Funders API で主名称を取得。
`funderUri` は `https://doi.org/10.13039/...` 形式で保存されている。

```javascript
async function fetchCrossrefFunderDetails(funderUri) {
  const doi = funderUri.replace(/^https?:\/\/doi\.org\//i, '');
  const resp = await fetch(`https://api.crossref.org/funders/${encodeURIComponent(doi)}`);
  if (!resp.ok) throw new Error(`Crossref Funders APIエラー: ${resp.status}`);
  const data = await resp.json();
  const name = data.message?.name || '';
  // alt-names は言語タグなしのため上書き対象外（表示のみ）
  const altNames = (data.message?.['alt-names'] || []).join(', ');
  return name
    ? [{ name, lang: 'en', _altNames: altNames }]
    : [];
}
```

---

## Step 3: 共通ヘルパー関数 `attachLookupUi()` 追加（~`renderOnePerson` 直前）

- ボタンは呼び出し元が生成し識別子フィールド行にインライン配置（既存の CiNii 検索ボタンと同パターン）
- 結果エリアのみ `attachLookupUi` が生成して `resultContainer` に追加する
- Crossref Funder の `_altNames` は結果テキストに参考表示するが上書き対象外

```javascript
/**
 * 識別子逆引きUI（結果エリアのみ生成・ボタンイベントを設定）
 * @param {object} opts
 *   btn           - 呼び出し元が生成した「名称を確認」ボタン要素（フィールド行にインライン配置済み）
 *   resultContainer - 結果エリアを appendChild する DOM 要素
 *   fetchNames    - async () => [{ name, lang, _altNames? }] を返す関数
 *   getVisible    - () => boolean: ボタン表示可否
 *   getTargetCont - () => DOM 要素（名称 entry-group が入るコンテナ）
 *   nameFld       - fieldKey 名（例: 'affiliationName'）
 *   langFld       - fieldKey 名（例: 'affiliationNameLang'）
 *   nameLabel     - 名称フィールドのラベル（例: '所属機関名'）
 *   langLabel     - 言語フィールドのラベル（例: '言語'）
 * @returns { updateVisibility: fn }
 */
function attachLookupUi({ btn, resultContainer, fetchNames, getVisible, getTargetCont,
                          nameFld, langFld, nameLabel, langLabel }) {
  const resultEl = document.createElement('div');
  resultEl.className = 'lookup-result';
  resultContainer.appendChild(resultEl);

  const updateVisibility = () => {
    btn.style.display = getVisible() ? '' : 'none';
    if (!getVisible()) resultEl.textContent = '';
  };
  updateVisibility();

  btn.onclick = async (e) => {
    e.preventDefault();
    btn.disabled = true;
    resultEl.className = 'lookup-result';
    resultEl.textContent = '取得中...';
    try {
      const names = await fetchNames();
      if (!names.length) {
        resultEl.textContent = '名称が取得できませんでした。';
        return;
      }

      const targetCont = getTargetCont();
      const currentNames = [...targetCont.querySelectorAll(`[data-field-key="${nameFld}"] input`)]
        .map(el => el.value.trim()).filter(Boolean);
      const fetchedNames = names.map(n => n.name);
      const allMatch = fetchedNames.length === currentNames.length
        && fetchedNames.every(fn => currentNames.includes(fn));

      resultEl.innerHTML = '';
      const altInfo = names[0]?._altNames ? `（別名: ${names[0]._altNames}）` : '';
      const namesStr = names.map(n => `${n.name}${n.lang ? ' (' + n.lang + ')' : ''}`).join(', ');

      if (allMatch) {
        resultEl.className = 'lookup-result ok';
        resultEl.textContent = `✓ 一致確認: ${namesStr}${altInfo}`;
      } else {
        resultEl.className = 'lookup-result warn';
        const warnSpan = document.createElement('span');
        warnSpan.textContent = `⚠ 取得: ${namesStr}${altInfo} `;
        resultEl.appendChild(warnSpan);

        const overwriteBtn = document.createElement('button');
        overwriteBtn.textContent = '上書き';
        overwriteBtn.className = 'btn-add';
        overwriteBtn.onclick = () => {
          [...targetCont.querySelectorAll(':scope > .entry-group')].forEach(g => g.remove());
          names.forEach(({ name: nm, lang }) => {
            const { grp, delBtn } = createEntryGroup();
            grp.appendChild(createFieldRow(nameLabel, nm, 'text', null, { fieldKey: nameFld }));
            grp.appendChild(createFieldRow(langLabel, lang || 'en', 'select', 'language', { fieldKey: langFld }));
            grp.appendChild(delBtn);
            targetCont.appendChild(grp);
          });
          resultEl.className = 'lookup-result ok';
          resultEl.textContent = `✓ 上書きしました: ${namesStr}`;
        };
        resultEl.appendChild(overwriteBtn);
      }
    } catch (err) {
      resultEl.className = 'lookup-result err';
      resultEl.textContent = `エラー: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  };

  return { updateVisibility };
}
```

---

## Step 4: `renderOneAffiliation()` 修正（~L2282-2301）

所属機関識別子セクションで、各エントリ（既存・新規追加とも）に逆引きUIを追加。

**フィールド追加順序の制約:**
- `attachLookupUi` 内で `updateVisibility()` を初期化時に呼ぶため、Scheme select が DOM に存在してから呼び出す必要がある
- `let` による遅延バインディングパターンを使用する

### 既存エントリ（forEach ループ内）

ボタンはインライン（識別子フィールド行の末尾に追加）。CiNii 検索ボタンと同パターン。

```javascript
(aff[affIdKey] || []).forEach((aid, aidx) => {
  const { item: aidItem, content: aidContent } = createNestedItem(`所属機関識別子[${aidx}]`, 4);

  // (1) 識別子フィールド行を生成し、逆引きボタンをインライン追加
  const idRow = createFieldRow('識別子', aid[affIdField] || '', 'text', null, { fieldKey: affIdField });
  const lookupBtn = document.createElement('button');
  lookupBtn.textContent = '名称を確認';
  lookupBtn.className = 'btn-add';
  lookupBtn.style.display = 'none';   // 初期非表示、updateVisibility で更新
  idRow.appendChild(lookupBtn);       // フィールド行にインライン
  aidContent.appendChild(idRow);

  // (2) Scheme・URI フィールド行
  let updateAffLookup = () => {};  // 遅延バインディング
  aidContent.appendChild(createFieldRow('Scheme', aid[affIdSchemeField] || '', 'select',
    'affiliationNameIdentifierScheme', {
      fieldKey: affIdSchemeField,
      onChange: () => updateAffLookup(),
    }));
  aidContent.appendChild(createFieldRow('URI', aid[affIdUriField] || '', 'text', null, { fieldKey: affIdUriField }));

  // (3) Scheme select が DOM にある状態で attachLookupUi を呼ぶ
  const { updateVisibility } = attachLookupUi({
    btn: lookupBtn,
    resultContainer: aidContent,
    fetchNames: () => {
      const uriInput = aidContent.querySelector(`[data-field-key="${affIdUriField}"] input`);
      return fetchRorNamesAll(uriInput?.value || '');
    },
    getVisible: () => {
      const schemeEl = aidContent.querySelector(`[data-field-key="${affIdSchemeField}"] select`);
      return schemeEl?.value === 'ROR';
    },
    getTargetCont: () => anCont,
    nameFld: affNameField, langFld: affNameLangField,
    nameLabel: '所属機関名', langLabel: '言語',
  });
  updateAffLookup = updateVisibility;  // バインド完了

  aiCont.appendChild(aidItem);
});
```

### 新規追加（onAdd コールバック内）

forEach ループと同じパターンを使用。`anCont` はクロージャで参照可能。

---

## Step 5: `renderOneFunder()` 修正（~L2441-2444）

識別子行 + 識別子タイプ行の後に逆引きUIを追加。タイプ変更時に表示を切り替える。

Step 4 と同じく「ボタンをインライン配置 → Scheme/Type select を DOM 追加 → `attachLookupUi` 呼び出し」の順。

```javascript
// 助成機関識別子（fieldset）
const fId = funder.subitem_funder_identifiers || {};

// (1) 識別子フィールド行にボタンをインライン追加
const funderIdRow = createFieldRow('助成機関識別子', fId.subitem_funder_identifier || '', 'text', null,
  { fieldKey: 'subitem_funder_identifier' });
const funderLookupBtn = document.createElement('button');
funderLookupBtn.textContent = '名称を確認';
funderLookupBtn.className = 'btn-add';
funderLookupBtn.style.display = 'none';
funderIdRow.appendChild(funderLookupBtn);
fundContent.appendChild(funderIdRow);

// (2) タイプ行（変更時に updateFunderLookup 呼び出し）
let updateFunderLookup = () => {};
fundContent.appendChild(createFieldRow('識別子タイプ', fId.subitem_funder_identifier_type || '', 'select',
  'subitem_funder_identifier_type', {
    fieldKey: 'subitem_funder_identifier_type',
    onChange: () => updateFunderLookup(),
  }));

// (3) タイプ select が DOM にある状態で attachLookupUi
const { updateVisibility: updateFV } = attachLookupUi({
  btn: funderLookupBtn,
  resultContainer: fundContent,
  fetchNames: () => {
    const idInput = fundContent.querySelector('[data-field-key="subitem_funder_identifier"] input');
    const typeEl  = fundContent.querySelector('[data-field-key="subitem_funder_identifier_type"] select');
    const idVal   = idInput?.value || '';
    const typeVal = typeEl?.value  || '';
    if (typeVal === 'Crossref Funder') return fetchCrossrefFunderDetails(idVal);
    if (typeVal === 'ROR')             return fetchRorNamesAll(idVal);
    return Promise.resolve([]);
  },
  getVisible: () => {
    const typeEl = fundContent.querySelector('[data-field-key="subitem_funder_identifier_type"] select');
    return typeEl?.value === 'Crossref Funder' || typeEl?.value === 'ROR';
  },
  getTargetCont: () => fnCont,
  nameFld: 'subitem_funder_name', langFld: 'subitem_funder_name_language',
  nameLabel: '助成機関名', langLabel: '言語',
});
updateFunderLookup = updateFV;
```

---

## 行番号インパクト

| 修正箇所 | 追加行数目安 |
|---|---|
| CSS 追加（~L354） | +7行 |
| `fetchRorNamesAll()` 追加（~L981） | +8行 |
| `fetchCrossrefFunderDetails()` 追加（~L990） | +10行 |
| `attachLookupUi()` 追加（~L1960） | +55行 |
| `renderOneAffiliation()` 修正（~L2290） | +30行 |
| `renderOneFunder()` 修正（~L2455） | +25行 |
| **合計** | **~+135行** |

---

## 検証方法

1. テスト用 DOI `10.1016/j.advnut.2025.100480` でデータ取得
2. 所属機関セクション → 所属機関識別子 → Scheme を「ROR」に変更 → 「名称を確認」ボタンが表示される
3. ROR URI が入っている状態でボタンをクリック → API 結果と現在の名称を比較・表示
4. 助成情報セクション → 識別子タイプを「Crossref Funder」に変更 → 「名称を確認」ボタンが表示される
5. ボタンをクリック → API 取得名称と比較、不一致時は「上書き」ボタンが出る
6. 「上書き」で名称が更新されることを確認
7. 識別子タイプを「ISNI」や「Other」に変更 → ボタンが非表示になることを確認

---

## ブランチ・PR

- ブランチ: `feature/identifier-name-lookup`
- PR前更新: README.md、make_jc_importer.html (version-info)、docs/requirements.md、docs/worklog.md、MEMORY.md
