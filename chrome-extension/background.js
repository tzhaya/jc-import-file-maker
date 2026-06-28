// JAIRO Cloud インポート支援ツール — Service Worker
// CORS非対応APIへのリクエストをプロキシし、サイドパネルを初期化します。

// サイドパネルをツールバーボタンクリックで開く設定
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// fetch プロキシの許可ホスト（CORS 非対応 API のみ）
// ここに列挙したホストだけを Service Worker 経由でプロキシする。
// WEKO3 リポジトリ等の host_permissions 登録済みホストは、サイドパネル（extension page）が
// 直接 fetch できるため、ここには含めない。
// ワイルドカード追加禁止: 追加する場合は対象 API のドメインを個別に列挙すること。
const ALLOWED_HOSTS = [
  'https://kaken.nii.ac.jp/',
  'https://api.japanlinkcenter.org/',
  'https://api.openpolicyfinder.jisc.ac.uk/',
];

// fetch プロキシ: HTML側からのメッセージを受信してCORS制約なしでAPIを呼び出す
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type !== 'FETCH') return false;

  // ホワイトリストチェック: 許可されたホストのみプロキシ
  if (!ALLOWED_HOSTS.some(host => req.url.startsWith(host))) {
    sendResponse({ error: `Blocked: ${new URL(req.url).host} is not in the allowed hosts list` });
    return true;
  }

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
