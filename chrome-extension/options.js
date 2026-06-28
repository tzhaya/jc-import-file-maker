const keys = ['defaultRepositoryUrl', 'defaultIndexId', 'defaultPosIndex', 'OpenAlex_API_KEY', 'CiNii_API_KEY', 'OPF_API_KEY', 'defaultRorId', 'defaultOpenalexDays'];
const inputs = {
  defaultRepositoryUrl: document.getElementById('default-repo-url'),
  defaultIndexId:       document.getElementById('default-index-id'),
  defaultPosIndex:      document.getElementById('default-pos-index'),
  OpenAlex_API_KEY:     document.getElementById('openalex-key'),
  CiNii_API_KEY:        document.getElementById('cinii-key'),
  OPF_API_KEY:          document.getElementById('opf-key'),
  defaultRorId:         document.getElementById('default-ror-id'),
  defaultOpenalexDays:  document.getElementById('default-openalex-days'),
};

// 保存済みの値を読み込む
chrome.storage.local.get(keys, (stored) => {
  keys.forEach(k => {
    if (stored[k]) inputs[k].value = stored[k];
  });
});

// 保存ボタン
document.getElementById('save-btn').addEventListener('click', () => {
  const data = {};
  keys.forEach(k => { data[k] = inputs[k].value.trim(); });
  chrome.storage.local.set(data, () => {
    const status = document.getElementById('status');
    status.classList.add('show');
    setTimeout(() => status.classList.remove('show'), 2000);
  });
});
