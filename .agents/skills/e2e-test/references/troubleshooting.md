# E2Eトラブルシューティング

- `file://`からAPIへ接続できない場合は、Chromiumが`--disable-web-security`付きで起動しているか確認する。
- mainは`#metadata-fields`の子要素、openalexは`#result-tbody tr`を完了条件にする。
- mainの描画後は助成情報などの非同期取得を待つ。
- API失敗、タイムアウト、ページ例外は成功扱いにせず、入力値と対象を添えて報告する。
- Chrome拡張限定機能はこの標準HTMLスクリプトでは検証できない。
