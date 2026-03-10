// JAIRO Cloud インポート支援ツール — Service Worker
// CORS非対応APIへのリクエストをプロキシし、サイドパネルを初期化します。

// サイドパネルをツールバーボタンクリックで開く設定
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// fetch プロキシ: HTML側からのメッセージを受信してCORS制約なしでAPIを呼び出す
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type !== 'FETCH') return false;

  fetch(req.url, req.options || {})
    .then(async (r) => {
      const text = await r.text();
      sendResponse({ ok: r.ok, status: r.status, text });
    })
    .catch((e) => {
      sendResponse({ error: e.message });
    });

  return true; // 非同期レスポンスを示すためにtrueを返す
});
