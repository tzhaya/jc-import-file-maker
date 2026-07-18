# Chrome拡張（MV3）作業時のルール

このディレクトリ（`chrome-extension/`）のファイルを扱うときに適用する。

## Manifest V3 / CSP の制約
- Manifest V3 では CSP により `onclick` 等のインラインイベントハンドラが動作しない
- `make_jc_importer.html` → `chrome-extension/make_jc_importer.js` 同期時、ボタンのイベントは
  `addEventListener` で登録すること（`onclick` 属性は HTML版のみ有効）
- `make_jc_importer.js` の `init()` 関数（スクリプト末尾）で
  `loadConfig()` → APIキー警告チェック → ボタンイベント登録を行っている。
  新しいボタンを追加した場合はここにも登録が必要

## 本番→拡張の同期
- CONFIGセクションのAPIキーは置き換えず残すこと
- バージョン更新（`manifest.json` / `LOCAL_VERSION`）と「最終更新」反映の手順は
  PR前の `/prepare-pr` チェックリストを参照
- **テスト用ブロックを削除しないこと（#192・#237）**: `make_jc_importer.js` / `openalex_panel.js` / `opensearch_panel.js` には
  Node の `node:test` から `require` するためのガードが恒常的に存在する（HTML側には無い差分）。
  本番HTML→拡張JS同期の際に消さないよう注意（詳細は `docs/developer_docs.md` のユニットテスト節）:
  - 先頭 CONFIG フォールバックの `typeof window !== 'undefined'` ガード
  - DOM配線・初期化を包む `if (typeof document !== 'undefined') { … }` ガード
  - 末尾の `if (typeof module !== 'undefined' && module.exports) { module.exports = { … }; }`
