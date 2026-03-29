// ===== 共通設定（CONFIG） =====
// APIキーを使用する場合は、各プレースホルダーをご自身のキーに置き換えてください。
// Chrome拡張版では options.html で設定できます（このファイルの編集は不要です）。
const CONFIG = {
    // OpenAlex APIキー（任意）
    // https://openalex.org/settings/api からご自身のキーを取得して貼り付けてください
    OpenAlex_API_KEY: "YOUR_OpenAlex_API_KEY",

    // CiNii APIキー（任意）
    // CiNiiウェブAPI 利用登録 https://support.nii.ac.jp/ja/cinii/api/developer で取得したキーを貼り付けてください
    CiNii_API_KEY: "YOUR_CiNii_API_KEY",

    // Open Policy Finder APIキー（任意・Chrome拡張版のみ有効）
    // https://openpolicyfinder.jisc.ac.uk/ で取得できます
    OPF_API_KEY: "YOUR_OPF_API_KEY",
};

// ===== Chrome拡張: chrome.storage.local からAPIキーを読み込む =====
async function loadConfig() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  try {
    const stored = await chrome.storage.local.get(['OpenAlex_API_KEY', 'CiNii_API_KEY', 'OPF_API_KEY']);
    if (stored.OpenAlex_API_KEY) CONFIG.OpenAlex_API_KEY = stored.OpenAlex_API_KEY;
    if (stored.CiNii_API_KEY)    CONFIG.CiNii_API_KEY    = stored.CiNii_API_KEY;
    if (stored.OPF_API_KEY)      CONFIG.OPF_API_KEY      = stored.OPF_API_KEY;
  } catch { /* 拡張外環境では無視 */ }
}

// ===== Chrome拡張: CORS非対応APIへのfetchをService Worker経由でプロキシ =====
// 拡張外（通常ブラウザ）では通常のfetch()にフォールバック
async function extensionFetch(url, options = {}) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    const result = await chrome.runtime.sendMessage({ type: 'FETCH', url, options });
    if (result.error) throw new Error(result.error);
    return {
      ok: result.ok,
      status: result.status,
      text: () => Promise.resolve(result.text),
      json: () => Promise.resolve(JSON.parse(result.text)),
    };
  }
  return fetch(url, options);
}
