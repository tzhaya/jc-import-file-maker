# Chrome拡張（MV3）作業時のルール

このディレクトリ（`chrome-extension/`）のファイルを扱うときに適用する。

## 正本とビルド（最重要）
- `shared.js` / `tsv_headers_template.js` / `make_jc_importer.js` / `funder_lookup.js` / `openalex_panel.js` / `weko3_opensearch_core.js` は **リポジトリ直下の正本から `npm run build` で生成されるコピー**（`openalex_panel.js` の正本は `openalex_lookup.js`）。**このディレクトリ内で直接編集しない。** 正本を編集して `npm run build` を実行する
- 直接編集してよいのは拡張専用ファイルのみ: `background.js` / `options.js` / `options.html` / `opensearch_panel.js` / 各パネルHTML（`panel.html` / `funder_panel.html` / `openalex_panel.html` / `opensearch_panel.html`）/ `manifest.json` / `icons/`
- `manifest.json` の `version` はリリース時のみ更新する（`docs/release_procedure.md`）

## Manifest V3 / CSP の制約
- Manifest V3 では CSP により `onclick` 等のインラインイベントハンドラが動作しない
- ボタンのイベントは JS 側で `addEventListener` により登録する（標準版・拡張版とも同じ書き方に統一済み）
- 拡張版のみに存在するボタン（例: `get-doi-from-page`）の配線は、正本JS内で要素の存在チェックでガードする

## テスト用ブロックを削除しないこと（#192・#237）
`make_jc_importer.js` / `openalex_panel.js`（正本 `openalex_lookup.js`）/ `opensearch_panel.js` には
Node の `node:test` から `require` するためのガードが恒常的に存在する
（詳細は `docs/developer_docs.md` のユニットテスト節）。リファクタリング時に消さないこと:
- 先頭 CONFIG フォールバックの `typeof window !== 'undefined'` ガード
- DOM配線・初期化を包む `if (typeof document !== 'undefined') { … }` ガード
- 末尾の `if (typeof module !== 'undefined' && module.exports) { module.exports = { … }; }`
