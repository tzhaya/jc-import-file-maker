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

    // ===== システム（管理フィールド）・リポジトリURLの初期値（任意） =====
    // よく使う登録先インデックスやリポジトリURLを設定すると、フォームに初期値として入力されます。
    // Chrome拡張版では options.html で設定できます（このファイルの編集は不要です）。

    // リポジトリURL（repo-host）。TSVのスキーマURL置換に使用
    // Chrome拡張版では OpenSearch の「デフォルトリポジトリ URL」と共用します
    DEFAULT_REPOSITORY_URL: "",

    // .IndexID[0]（.metadata.path[0]）アイテムの登録先インデックスID  例: 1697430475875
    DEFAULT_INDEX_ID: "",

    // .POS_INDEX[0]（.pos_index[0]）インデックス名パス（人間可読）  例: 学術雑誌論文
    DEFAULT_POS_INDEX: "",
};

// ===== Chrome拡張: chrome.storage.local からAPIキーを読み込む =====
async function loadConfig() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  try {
    const stored = await chrome.storage.local.get([
      'OpenAlex_API_KEY', 'CiNii_API_KEY', 'OPF_API_KEY',
      'defaultRepositoryUrl', 'defaultIndexId', 'defaultPosIndex',
    ]);
    if (stored.OpenAlex_API_KEY) CONFIG.OpenAlex_API_KEY = stored.OpenAlex_API_KEY;
    if (stored.CiNii_API_KEY)    CONFIG.CiNii_API_KEY    = stored.CiNii_API_KEY;
    if (stored.OPF_API_KEY)      CONFIG.OPF_API_KEY      = stored.OPF_API_KEY;
    // システム（管理フィールド）・リポジトリURLの初期値（リポジトリURLは OpenSearch の既定値と共用）
    if (stored.defaultRepositoryUrl) CONFIG.DEFAULT_REPOSITORY_URL = stored.defaultRepositoryUrl;
    if (stored.defaultIndexId)       CONFIG.DEFAULT_INDEX_ID       = stored.defaultIndexId;
    if (stored.defaultPosIndex)      CONFIG.DEFAULT_POS_INDEX      = stored.defaultPosIndex;
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

// ===== 作業中データ（下書き）の保存/復元（#162） =====
// Chrome拡張版は chrome.storage.local、スタンドアロンHTML版は localStorage に保存する。
// 保存形: { version, savedAt, repoHost, currentBatchIndex, allMetadata }
const DRAFT_KEY = 'wipDraft';
const DRAFT_VERSION = 1;

function isExtensionStorage() {
  return typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage;
}

// 下書きを保存。quota超過等は例外を投げるので呼び出し側で握る。
async function saveDraft(obj) {
  const payload = { version: DRAFT_VERSION, savedAt: new Date().toISOString(), ...obj };
  if (isExtensionStorage()) {
    await chrome.storage.local.set({ [DRAFT_KEY]: payload });
  } else {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }
}

// 下書きを読み込む。無い／バージョン不一致／破損時は null。
async function loadDraft() {
  try {
    let d;
    if (isExtensionStorage()) {
      const r = await chrome.storage.local.get([DRAFT_KEY]);
      d = r[DRAFT_KEY];
    } else {
      const json = localStorage.getItem(DRAFT_KEY);
      d = json ? JSON.parse(json) : null;
    }
    if (!d || d.version !== DRAFT_VERSION) return null;
    return d;
  } catch {
    return null;
  }
}

// 下書きを削除。
async function clearDraft() {
  try {
    if (isExtensionStorage()) {
      await chrome.storage.local.remove([DRAFT_KEY]);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch { /* 失敗しても致命的ではないため無視 */ }
}
