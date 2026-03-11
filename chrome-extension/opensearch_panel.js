// ===== Chrome 拡張環境検出 & fetch ラッパー =====
const IS_CHROME_EXTENSION = typeof chrome !== 'undefined'
  && !!chrome.runtime
  && !!chrome.runtime.sendMessage;

if (IS_CHROME_EXTENSION) {
  const _originalFetch = window.fetch.bind(window);
  window.fetch = function(url, options) {
    if (options && options.method && options.method !== 'GET') {
      return _originalFetch(url, options);
    }
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'fetch', url: url.toString() },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(response.text),
          });
        }
      );
    });
  };
}
// ================================================

// ===== 通信先ホスト制限 =====
const ALLOWED_HOST_PATTERN = /\.repo\.nii\.ac\.jp$/i;
const ALLOWED_HOSTS_EXTRA = new Set([
  'repository.nii.ac.jp',
  'd-repo.ier.hit-u.ac.jp',
  'repository.lib.tottori-u.ac.jp',
  'ismrepo.ism.ac.jp',
  'repository.ninjal.ac.jp',
  'ir.soken.ac.jp',
  'repository.dl.itc.u-tokyo.ac.jp',
  'teapot.lib.ocha.ac.jp',
  'kutarr.kochi-tech.ac.jp',
  'ir.jikei.ac.jp',
  'ir.kagoshima-u.ac.jp',
  'amcor.asahikawa-med.ac.jp',
  'repository.ffpri.go.jp',
  'repository.jircas.go.jp',
  'repository.naro.go.jp',
  'ir.ide.go.jp',
  'repo.qst.go.jp',
  'repo-tkfd.jp',
]);

function isAllowedHost(repoUrl) {
  let parsed;
  try { parsed = new URL(repoUrl); } catch { return false; }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname;
  return ALLOWED_HOST_PATTERN.test(host) || ALLOWED_HOSTS_EXTRA.has(host);
}
// ===========================

// 資源タイプ語彙
const RESOURCE_TYPES = [
  { en: 'conference paper',        ja: '会議発表論文' },
  { en: 'data paper',              ja: 'データ論文' },
  { en: 'departmental bulletin paper', ja: '紀要論文' },
  { en: 'editorial',               ja: 'エディトリアル' },
  { en: 'journal article',         ja: '学術雑誌論文' },
  { en: 'newspaper',               ja: '新聞' },
  { en: 'periodical',              ja: '逐次刊行物' },
  { en: 'review article',          ja: 'レビュー論文' },
  { en: 'software paper',          ja: 'ソフトウェア論文' },
  { en: 'article',                 ja: '記事' },
  { en: 'book',                    ja: '図書' },
  { en: 'book part',               ja: '図書（部分）' },
  { en: 'cartographic material',   ja: '地図資料' },
  { en: 'map',                     ja: '地図' },
  { en: 'conference object',       ja: '会議発表資料' },
  { en: 'conference proceedings',  ja: '会議録' },
  { en: 'conference poster',       ja: '会議発表ポスター' },
  { en: 'dataset',                 ja: 'データセット' },
  { en: 'interview',               ja: 'インタビュー' },
  { en: 'image',                   ja: 'イメージ' },
  { en: 'still image',             ja: '静止画' },
  { en: 'moving image',            ja: '動画' },
  { en: 'video',                   ja: '録画資料' },
  { en: 'lecture',                 ja: '講演' },
  { en: 'patent',                  ja: '特許' },
  { en: 'internal report',         ja: '内部報告書' },
  { en: 'report',                  ja: '報告書' },
  { en: 'research report',         ja: '研究報告書' },
  { en: 'technical report',        ja: 'テクニカルレポート' },
  { en: 'policy report',           ja: 'ポリシーレポート' },
  { en: 'report part',             ja: '報告書（部分）' },
  { en: 'working paper',           ja: 'ワーキングペーパー' },
  { en: 'data management plan',    ja: 'データ管理計画' },
  { en: 'sound',                   ja: '音声・音楽' },
  { en: 'thesis',                  ja: '学位論文' },
  { en: 'bachelor thesis',         ja: '学士論文' },
  { en: 'master thesis',           ja: '修士論文' },
  { en: 'doctoral thesis',         ja: '博士論文' },
  { en: 'interactive resource',    ja: 'インタラクティブリソース' },
  { en: 'learning object',         ja: '教材' },
  { en: 'manuscript',              ja: '手稿' },
  { en: 'musical notation',        ja: '楽譜' },
  { en: 'research proposal',       ja: '研究計画書' },
  { en: 'software',                ja: 'ソフトウェア' },
  { en: 'technical documentation', ja: '技術文書' },
  { en: 'workflow',                ja: 'ワークフロー' },
  { en: 'other',                   ja: 'その他' },
];

// JPCOAR 要素の日本語ラベル
const FIELD_LABELS = {
  title:                  'タイトル',
  creator:                '作成者',
  creatorName:            '氏名',
  familyName:             '姓',
  givenName:              '名',
  contributor:            '寄与者',
  accessRights:           'アクセス権',
  rights:                 '権利',
  subject:                '件名',
  description:            '内容記述',
  publisher:              '出版者',
  date:                   '日付',
  language:               '言語',
  type:                   '資源タイプ',
  version:                'バージョン',
  identifierRegistration: '識別子登録',
  sourceIdentifier:       '収録物識別子',
  sourceTitle:            '収録物名',
  volume:                 '巻',
  issue:                  '号',
  numPages:               'ページ数',
  pageStart:              '開始ページ',
  pageEnd:                '終了ページ',
  conference:             '会議情報',
  file:                   'ファイル',
  URI:                    'ファイル URL',
  mimeType:               'MIME タイプ',
  extent:                 'サイズ',
};

// サマリー行に表示済みのため展開ビューでスキップするフィールド
const SUMMARY_FIELDS = new Set([
  'title', 'creator',
  'sourceTitle', 'volume', 'issue', 'pageStart', 'pageEnd',
  'file',
]);

const PAGE_SIZE = 20;
const NS_RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

let state = { page: 1, query: {}, totalResults: 0 };

// ---- ユーティリティ ----

function xmlLang(el) {
  return el.getAttribute('xml:lang') || '';
}

function children(parent, localName) {
  return Array.from(parent.children).filter(e => e.localName === localName);
}

function pickByLang(els, lang) {
  return els.find(e => xmlLang(e) === lang)
    || els.find(e => !xmlLang(e))
    || els[0]
    || null;
}

// ---- URL 構築 ----

function buildUrl(query, page) {
  const repoUrl = document.getElementById('repo-url').value.trim();
  const base = new URL(repoUrl).origin + '/';
  const params = new URLSearchParams({ format: 'jpcoar', size: PAGE_SIZE, page });
  if (query.title) params.set('title', query.title);
  if (query.des)   params.set('des',   query.des);
  if (query.type)  params.set('type',  query.type);
  return `${base}api/opensearch/search?${params}`;
}

// ---- XML パース ----

function parseXML(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('XML解析エラー');

  const getNum = (localName, fallback) => {
    const el = Array.from(xml.getElementsByTagName('*')).find(e => e.localName === localName);
    return parseInt(el?.textContent || fallback, 10);
  };
  const totalResults = getNum('totalResults', 0);
  const startIndex   = getNum('startIndex', 1);

  const descriptions = xml.getElementsByTagNameNS(NS_RDF, 'Description');
  const items = Array.from(descriptions).map(parseItem);

  return { totalResults, startIndex, items };
}

function parseItem(desc) {
  const itemUrl = desc.getAttributeNS(NS_RDF, 'about') || desc.getAttribute('rdf:about') || '';
  const jpcoarEl = desc.firstElementChild;
  if (!jpcoarEl) return { itemUrl, titles: [], creators: [], sourceTitle: '', volume: '', issue: '', pageStart: '', pageEnd: '', issuedDate: '', files: [], jpcoarEl: null };

  const byName = n => children(jpcoarEl, n);

  const titles = byName('title').map(el => ({ text: el.textContent.trim(), lang: xmlLang(el) }));
  const primaryLang = titles[0]?.lang || '';

  const creators = byName('creator').map(creatorEl => {
    const cc = Array.from(creatorEl.children);
    const names = cc.filter(e => e.localName === 'creatorName');
    const nameEl = pickByLang(names, primaryLang);
    if (nameEl) return nameEl.textContent.trim();

    const fam = pickByLang(cc.filter(e => e.localName === 'familyName'), primaryLang)?.textContent.trim() || '';
    const giv = pickByLang(cc.filter(e => e.localName === 'givenName'),  primaryLang)?.textContent.trim() || '';
    return [fam, giv].filter(Boolean).join(', ') || null;
  }).filter(Boolean);

  const sourceTitle = byName('sourceTitle')[0]?.textContent.trim() || '';
  const volume      = byName('volume')[0]?.textContent.trim() || '';
  const issue       = byName('issue')[0]?.textContent.trim() || '';
  const pageStart   = byName('pageStart')[0]?.textContent.trim() || '';
  const pageEnd     = byName('pageEnd')[0]?.textContent.trim() || '';

  const issuedDate = byName('date')
    .find(e => e.getAttribute('dateType') === 'Issued')
    ?.textContent.trim() || '';

  const files = byName('file').map(fileEl => {
    const fc = Array.from(fileEl.children);
    const uriEl = fc.find(e => e.localName === 'URI' || e.localName === 'uri');
    const dcTitle = fc.find(e => e.localName === 'title');
    const label = dcTitle?.textContent.trim() || uriEl?.getAttribute('label') || '(ファイル)';
    const url   = uriEl?.textContent.trim() || '';
    return url ? { label, url } : null;
  }).filter(Boolean);

  return { itemUrl, titles, creators, sourceTitle, volume, issue, pageStart, pageEnd, issuedDate, files, jpcoarEl };
}

// ---- レンダリング ----

function renderResults(data) {
  const { totalResults, startIndex, items } = data;

  if (totalResults === 0) {
    document.getElementById('result-info').textContent = '検索結果はありませんでした。';
    document.getElementById('result-list').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
    document.getElementById('results-section').classList.remove('hidden');
    return;
  }

  const endIndex = startIndex + items.length - 1;
  document.getElementById('result-info').textContent =
    `${totalResults.toLocaleString()} 件中 ${startIndex}〜${endIndex} 件目`;

  const list = document.getElementById('result-list');
  list.innerHTML = '';
  items.forEach(item => list.appendChild(renderItem(item)));

  renderPagination(totalResults, state.page);
  document.getElementById('results-section').classList.remove('hidden');
  window.scrollTo({ top: document.getElementById('results-section').offsetTop - 16, behavior: 'smooth' });
}

function renderItem(item) {
  const { itemUrl, titles, creators, sourceTitle, volume, issue, pageStart, pageEnd, issuedDate, files, jpcoarEl } = item;

  const card = document.createElement('div');
  card.className = 'item-card';

  const titleBtn = document.createElement('button');
  titleBtn.className = 'item-title';
  titleBtn.textContent = titles[0]?.text || '(タイトルなし)';
  card.appendChild(titleBtn);

  const parts = [];
  if (creators.length > 0) parts.push(creators.join('; '));
  const bib = buildBiblio(sourceTitle, volume, issue, pageStart, pageEnd, issuedDate);
  if (bib) parts.push(bib);
  if (parts.length > 0) {
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = parts.join('  ');
    card.appendChild(meta);
  }

  if (files.length > 0) {
    const filesDiv = document.createElement('div');
    filesDiv.className = 'item-files';
    files.forEach(f => {
      const a = document.createElement('a');
      a.href = f.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = `[${f.label}]`;
      filesDiv.appendChild(a);
    });
    card.appendChild(filesDiv);
  }

  if (itemUrl) {
    const urlDiv = document.createElement('div');
    urlDiv.className = 'item-url';
    const a = document.createElement('a');
    a.href = itemUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = itemUrl;
    urlDiv.appendChild(a);
    card.appendChild(urlDiv);
  }

  const detail = document.createElement('div');
  detail.className = 'item-detail hidden';
  if (jpcoarEl) detail.appendChild(renderExpandedFields(jpcoarEl));
  card.appendChild(detail);

  titleBtn.addEventListener('click', () => {
    const isOpen = titleBtn.classList.toggle('open');
    detail.classList.toggle('hidden', !isOpen);
  });

  return card;
}

function buildBiblio(sourceTitle, volume, issue, pageStart, pageEnd, issuedDate) {
  if (!sourceTitle && !issuedDate) return '';
  let s = sourceTitle;
  if (volume) {
    s += ' ' + volume;
    if (issue) s += '(' + issue + ')';
  }
  if (pageStart) {
    s += ', ' + pageStart;
    if (pageEnd) s += '-' + pageEnd;
  }
  if (issuedDate) s += ', ' + issuedDate;
  return s;
}

// ---- 展開フィールド ----

function renderExpandedFields(jpcoarEl) {
  const table = document.createElement('table');
  table.className = 'detail-table';

  Array.from(jpcoarEl.children).forEach(el => {
    const ln = el.localName;

    if (SUMMARY_FIELDS.has(ln)) return;
    if (ln === 'date' && el.getAttribute('dateType') === 'Issued') return;
    if (ln === 'conference' && !el.textContent.trim()) return;

    const label = FIELD_LABELS[ln] || ln;
    const td = document.createElement('td');

    if (ln === 'description') {
      const lang = xmlLang(el);
      const div = document.createElement('div');
      div.className = 'detail-desc';
      div.textContent = el.textContent.trim();
      td.appendChild(div);
      if (lang) appendLang(td, lang);

    } else if (ln === 'subject') {
      const lang   = xmlLang(el);
      const scheme = el.getAttribute('subjectScheme') || '';
      td.textContent = el.textContent.trim();
      const tag = [lang, scheme].filter(Boolean).join(', ');
      if (tag) appendLang(td, tag);

    } else if (ln === 'date') {
      const dateType = el.getAttribute('dateType') || '';
      td.textContent = el.textContent.trim();
      if (dateType) appendLang(td, dateType);

    } else if (ln === 'type') {
      td.textContent = el.textContent.trim();

    } else if (ln === 'identifierRegistration' || ln === 'sourceIdentifier') {
      const idType = el.getAttribute('identifierType') || '';
      td.textContent = el.textContent.trim();
      if (idType) appendLang(td, idType);

    } else if (ln === 'accessRights') {
      td.textContent = el.textContent.trim();

    } else {
      const elChildren = Array.from(el.children);
      if (elChildren.length === 0) {
        td.textContent = el.textContent.trim();
      } else {
        elChildren.forEach(c => {
          if (!c.textContent.trim()) return;
          const cLabel = FIELD_LABELS[c.localName] || c.localName;
          const lang   = xmlLang(c);
          const line   = document.createElement('div');
          line.textContent = `${cLabel}: ${c.textContent.trim()}`;
          if (lang) appendLang(line, lang);
          td.appendChild(line);
        });
      }
    }

    if (!td.textContent.trim() && !td.querySelector('a')) return;

    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = label;
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  });

  return table;
}

function appendLang(parent, tag) {
  const span = document.createElement('span');
  span.className = 'detail-lang';
  span.textContent = ` (${tag})`;
  parent.appendChild(span);
}

// ---- ページング ----

function renderPagination(totalResults, currentPage) {
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);
  const pag = document.getElementById('pagination');
  pag.innerHTML = '';
  if (totalPages <= 1) return;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '◀ 前へ';
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener('click', () => doSearch(currentPage - 1));
  pag.appendChild(prevBtn);

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${currentPage} / ${totalPages} ページ`;
  pag.appendChild(info);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = '次へ ▶';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener('click', () => doSearch(currentPage + 1));
  pag.appendChild(nextBtn);
}

// ---- 検索実行 ----

async function doSearch(page = 1) {
  const query = {
    title: document.getElementById('q-title').value.trim(),
    des:   document.getElementById('q-des').value.trim(),
    type:  document.getElementById('q-type').value,
  };
  const repoVal = document.getElementById('repo-url').value.trim();
  if (!repoVal) {
    showError('リポジトリ URL を入力してください。', 'warn');
    document.getElementById('repo-url').focus();
    return;
  }
  if (!isAllowedHost(repoVal)) {
    showError('このリポジトリ URL は許可されていません。JAIRO Cloud 利用機関の URL を入力してください。', 'warn');
    document.getElementById('repo-url').focus();
    return;
  }
  if (!query.title && !query.des && !query.type) {
    showError('検索条件を 1 つ以上入力してください。', 'warn');
    return;
  }

  state.page  = page;
  state.query = query;
  setLoading(true);
  hideError();

  try {
    const res = await fetch(buildUrl(query, page));
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    renderResults(parseXML(text));
  } catch (err) {
    const isCors = !IS_CHROME_EXTENSION && err instanceof TypeError && err.message === 'Failed to fetch';
    const msg = isCors
      ? 'CORS エラー: ブラウザが API へのアクセスをブロックしました。\n\nChrome 拡張版をご利用ください。'
      : `エラー: ${err.message}`;
    showError(msg, isCors ? 'cors' : 'warn');
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  document.getElementById('loading').classList.toggle('hidden', !on);
  document.getElementById('btn-search').disabled = on;
  if (on) document.getElementById('results-section').classList.add('hidden');
}

function showError(msg, type = 'warn') {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.className = type;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-msg').classList.add('hidden');
}

// ---- 初期化 ----

function init() {
  // options.html で設定したデフォルトリポジトリURLを読み込む
  if (IS_CHROME_EXTENSION) {
    chrome.storage.local.get('defaultRepositoryUrl', (stored) => {
      if (stored.defaultRepositoryUrl) {
        document.getElementById('repo-url').value = stored.defaultRepositoryUrl;
      }
    });
  }

  const select = document.getElementById('q-type');
  RESOURCE_TYPES.forEach(rt => {
    const opt = document.createElement('option');
    opt.value = rt.en;
    opt.textContent = `${rt.ja} (${rt.en})`;
    select.appendChild(opt);
  });

  document.getElementById('btn-search').addEventListener('click', () => doSearch(1));

  ['q-title', 'q-des'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch(1);
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
