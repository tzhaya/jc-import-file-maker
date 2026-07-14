// サイドパネル（extension page）は host_permissions 登録済みホストへ直接 fetch 可能。
// Service Worker プロキシは不要。
const IS_CHROME_EXTENSION = typeof chrome !== 'undefined' && !!chrome.runtime;

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

// 資源タイプ語彙（docs/resource_type_vocabulary.md と同期）
const RESOURCE_TYPES = [
  { en: 'conference paper', ja: '会議発表論文', status: 'v1.0' },
  { en: 'data paper', ja: 'データ論文', status: 'v1.0' },
  { en: 'departmental bulletin paper', ja: '紀要論文', status: 'v1.0' },
  { en: 'editorial', ja: 'エディトリアル', status: 'v1.0' },
  { en: 'journal', ja: '学術雑誌', status: 'v2.0' },
  { en: 'journal article', ja: '学術雑誌論文', status: 'v1.0' },
  { en: 'newspaper', ja: '新聞', status: 'v1.0' },
  { en: 'other periodical', ja: 'その他の逐次刊行物', status: 'v2.0' },
  { en: 'review article', ja: 'レビュー論文', status: 'v1.0' },
  { en: 'software paper', ja: 'ソフトウェア論文', status: 'v1.0' },
  { en: 'article', ja: '記事', status: 'v1.0' },
  { en: 'periodical', ja: '逐次刊行物', status: 'v1.0only' },
  { en: 'book', ja: '図書', status: 'v1.0' },
  { en: 'book part', ja: '図書（部分）', status: 'v1.0' },
  { en: 'cartographic material', ja: '地図資料', status: 'v1.0' },
  { en: 'map', ja: '地図', status: 'v1.0' },
  { en: 'conference output', ja: '会議資料', status: 'v1.0' },
  { en: 'conference presentation', ja: '会議発表スライド', status: 'v2.0' },
  { en: 'conference proceedings', ja: '会議録', status: 'v1.0' },
  { en: 'conference poster', ja: '会議発表ポスター', status: 'v1.0' },
  { en: 'aggregated data', ja: '集計データ', status: 'v2.0' },
  { en: 'clinical trial data', ja: '臨床試験データ', status: 'v2.0' },
  { en: 'compiled data', ja: '編集データ', status: 'v2.0' },
  { en: 'dataset', ja: 'データセット', status: 'v1.0' },
  { en: 'encoded data', ja: '符号化データ', status: 'v2.0' },
  { en: 'experimental data', ja: '実験データ', status: 'v2.0' },
  { en: 'genomic data', ja: 'ゲノムデータ', status: 'v2.0' },
  { en: 'geospatial data', ja: '地理空間データ', status: 'v2.0' },
  { en: 'laboratory notebook', ja: '実験ノート', status: 'v2.0' },
  { en: 'measurement and test data', ja: '測定・評価データ', status: 'v2.0' },
  { en: 'observational data', ja: '観測データ', status: 'v2.0' },
  { en: 'recorded data', ja: '記録データ', status: 'v2.0' },
  { en: 'simulation data', ja: 'シミュレーションデータ', status: 'v2.0' },
  { en: 'survey data', ja: '調査データ', status: 'v2.0' },
  { en: 'image', ja: 'イメージ', status: 'v1.0' },
  { en: 'still image', ja: '静止画', status: 'v1.0' },
  { en: 'moving image', ja: '動画', status: 'v1.0' },
  { en: 'video', ja: '録画資料', status: 'v1.0' },
  { en: 'lecture', ja: '講演', status: 'v1.0' },
  { en: 'design patent', ja: '意匠特許', status: 'v2.0' },
  { en: 'patent', ja: '特許', status: 'v1.0' },
  { en: 'PCT application', ja: 'PCT出願', status: 'v2.0' },
  { en: 'plant patent', ja: '植物特許', status: 'v2.0' },
  { en: 'plant variety protection', ja: '育成者権', status: 'v2.0' },
  { en: 'software patent', ja: 'ソフトウェア特許', status: 'v2.0' },
  { en: 'trademark', ja: '商標', status: 'v2.0' },
  { en: 'utility model', ja: '実用新案', status: 'v2.0' },
  { en: 'internal report', ja: '内部報告書', status: 'v1.0only' },
  { en: 'report', ja: '報告書', status: 'v1.0' },
  { en: 'research report', ja: '研究報告書', status: 'v1.0' },
  { en: 'technical report', ja: 'テクニカルレポート', status: 'v1.0' },
  { en: 'policy report', ja: 'ポリシーレポート', status: 'v1.0' },
  { en: 'report part', ja: '報告書（部分）', status: 'v1.0only' },
  { en: 'working paper', ja: 'ワーキングペーパー', status: 'v1.0' },
  { en: 'data management plan', ja: 'データ管理計画', status: 'v1.0' },
  { en: 'sound', ja: '音声・音楽', status: 'v1.0' },
  { en: 'thesis', ja: '学位論文', status: 'v1.0' },
  { en: 'bachelor thesis', ja: '学士論文', status: 'v1.0' },
  { en: 'master thesis', ja: '修士論文', status: 'v1.0' },
  { en: 'doctoral thesis', ja: '博士論文', status: 'v1.0' },
  { en: 'commentary', ja: '論評', status: 'v2.0' },
  { en: 'design', ja: 'デザイン', status: 'v2.0' },
  { en: 'industrial design', ja: '工業デザイン', status: 'v2.0' },
  { en: 'interactive resource', ja: 'インタラクティブリソース', status: 'v1.0' },
  { en: 'layout design', ja: 'レイアウト設計', status: 'v2.0' },
  { en: 'learning object', ja: '教材', status: 'v1.0' },
  { en: 'manuscript', ja: '手稿', status: 'v1.0' },
  { en: 'musical notation', ja: '楽譜', status: 'v1.0' },
  { en: 'peer review', ja: '査読', status: 'v2.0' },
  { en: 'research proposal', ja: '研究計画書', status: 'v1.0' },
  { en: 'research protocol', ja: '研究プロトコル', status: 'v2.0' },
  { en: 'software', ja: 'ソフトウェア', status: 'v1.0' },
  { en: 'source code', ja: 'ソースコード', status: 'v2.0' },
  { en: 'technical documentation', ja: '技術文書', status: 'v1.0' },
  { en: 'transcription', ja: '文字起こし', status: 'v2.0' },
  { en: 'workflow', ja: 'ワークフロー', status: 'v1.0' },
  { en: 'other', ja: 'その他', status: 'v1.0' },
  { en: 'interview', ja: 'インタビュー', status: 'v1.0only' },
];

const SEARCH_FIELDS = [
  { elementId: 'q-keyword', param: 'keyword' },
  { elementId: 'q-title', param: 'title' },
  { elementId: 'q-creator', param: 'creator' },
  { elementId: 'q-des', param: 'des' },
  { elementId: 'q-type', param: 'type' },
  { elementId: 'q-subject', param: 'subject' },
  { elementId: 'q-publisher', param: 'publisher' },
  { elementId: 'q-language', param: 'lang' },
  { elementId: 'q-srctitle', param: 'srctitle' },
  { elementId: 'q-wid', param: 'wid' },
];

const ID_ATTRS = ['DOI', 'selfDOI', 'ISBN', 'ISSN', 'NCID', 'PMID', 'NAID', 'ICHUSHI', 'URI', 'fullTextURL', 'identifier'];
const ALLOWED_QUERY_PARAMS = new Set([
  ...SEARCH_FIELDS.map(({ param }) => param),
  'exact_title_match', 'id', 'id_attr',
]);

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

let state = { page: 1, query: {}, sort: '', repoOrigin: '', totalResults: 0 };

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

// ---- 検索条件・URL構築 ----

function normalizeQuery(raw) {
  const query = {};
  SEARCH_FIELDS.forEach(({ param }) => {
    const value = typeof raw[param] === 'string' ? raw[param].trim() : '';
    if (value) query[param] = value;
  });

  if (query.title && raw.exactTitleMatch) query.exact_title_match = 'true';
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const idAttr = typeof raw.idAttr === 'string' ? raw.idAttr.trim() : '';
  if (id) query.id = id;
  if (idAttr) query.id_attr = idAttr;
  return query;
}

function validateQuery(query) {
  if (query.id && !query.id_attr) {
    return { ok: false, code: 'missing-id-attr', message: 'ID種別を選択してください。', focusId: 'q-id-attr' };
  }
  if (query.id_attr && !query.id) {
    return { ok: false, code: 'missing-id', message: 'IDを入力してください。', focusId: 'q-id' };
  }
  const hasSearchCondition = Object.keys(query).some(key => key !== 'exact_title_match');
  if (!hasSearchCondition) {
    return { ok: false, code: 'empty-query', message: '検索条件を 1 つ以上入力してください。', focusId: null };
  }
  return { ok: true, code: null, message: '', focusId: null };
}

function buildUrl(repoOrigin, query, page, sort = '') {
  const base = new URL(repoOrigin).origin + '/';
  const params = new URLSearchParams({ format: 'jpcoar', size: String(PAGE_SIZE), page: String(page) });
  Object.entries(query).forEach(([key, value]) => {
    if (ALLOWED_QUERY_PARAMS.has(key) && value !== '') params.set(key, String(value));
  });
  if (sort === 'createdate' || sort === '-createdate') params.set('sort', sort);
  return `${base}api/opensearch/search?${params.toString()}`;
}

function normalizeJpcoarItemOrder(items) {
  // WEKO3のformat=jpcoarはJSONのヒット順をページ内で逆順に列挙する
  // （JIRCAS・筑波大学で2026-07-14実測）。APIの指定順へ戻して表示する。
  return [...items].reverse();
}

function fetchJpcoar(url, fetchImpl = fetch) {
  // format=jpcoarをURLで指定するため、WEKO3が406を返し得る独自Acceptヘッダーは付けない。
  return fetchImpl(url);
}

function getResultRange(page, itemCount) {
  const startIndex = (page - 1) * PAGE_SIZE + 1;
  return { startIndex, endIndex: startIndex + itemCount - 1 };
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
  const descriptions = xml.getElementsByTagNameNS(NS_RDF, 'Description');
  const items = normalizeJpcoarItemOrder(Array.from(descriptions).map(parseItem));

  return { totalResults, items };
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
  const { totalResults, items } = data;

  if (totalResults === 0) {
    document.getElementById('result-info').textContent = '検索結果はありませんでした。';
    document.getElementById('result-list').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
    document.getElementById('results-section').classList.remove('hidden');
    return;
  }

  // WEKO3は2ページ目以降もstartIndex=1を返す環境があるため、ページ番号から算出する。
  const { startIndex, endIndex } = getResultRange(state.page, items.length);
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
  prevBtn.addEventListener('click', () => loadPage(currentPage - 1, true));
  pag.appendChild(prevBtn);

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${currentPage} / ${totalPages} ページ`;
  pag.appendChild(info);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = '次へ ▶';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener('click', () => loadPage(currentPage + 1, true));
  pag.appendChild(nextBtn);
}

// ---- 検索実行 ----

function collectRawQuery() {
  const raw = {};
  SEARCH_FIELDS.forEach(({ elementId, param }) => {
    raw[param] = document.getElementById(elementId).value;
  });
  raw.exactTitleMatch = document.getElementById('q-exact-title').checked;
  raw.id = document.getElementById('q-id').value;
  raw.idAttr = document.getElementById('q-id-attr').value;
  return raw;
}

function clearSearchForm(doc = document) {
  // 検索済みstate・結果は維持する。ページングは初回検索時のstateを使い続ける。
  SEARCH_FIELDS.forEach(({ elementId }) => {
    doc.getElementById(elementId).value = '';
  });
  doc.getElementById('q-exact-title').checked = false;
  doc.getElementById('q-id').value = '';
  doc.getElementById('q-id-attr').value = '';
  doc.getElementById('q-sort').value = '';
  doc.getElementById('advanced-search').open = false;
  hideError(doc);
  doc.getElementById('q-keyword').focus();
}

function startSearch() {
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

  const query = normalizeQuery(collectRawQuery());
  const validation = validateQuery(query);
  if (!validation.ok) {
    showError(validation.message, 'warn');
    if (validation.focusId) document.getElementById(validation.focusId).focus();
    return;
  }

  state = {
    page: 1,
    query: { ...query },
    sort: document.getElementById('q-sort').value,
    repoOrigin: new URL(repoVal).origin,
    totalResults: 0,
  };
  loadPage(1);
}

async function loadPage(page, isPaging = false) {
  if (!state.repoOrigin || !validateQuery(state.query).ok) return;
  const previousPage = state.page;
  state.page = page;
  setLoading(true, !isPaging);
  if (isPaging) document.getElementById('pagination').classList.add('hidden');
  hideError();

  try {
    const res = await fetchJpcoar(buildUrl(state.repoOrigin, state.query, page, state.sort));
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    const data = parseXML(text);
    state.totalResults = data.totalResults;
    renderResults(data);
  } catch (err) {
    if (isPaging) state.page = previousPage;
    showError(`エラー: ${err.message}`, 'warn');
  } finally {
    setLoading(false);
    if (isPaging) document.getElementById('pagination').classList.remove('hidden');
  }
}

function setLoading(on, hideResults = true) {
  document.getElementById('loading').classList.toggle('hidden', !on);
  document.getElementById('btn-search').disabled = on;
  document.getElementById('btn-clear-search').disabled = on;
  if (on && hideResults) document.getElementById('results-section').classList.add('hidden');
}

function showError(msg, type = 'warn') {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.className = type;
  el.classList.remove('hidden');
}

function hideError(doc = document) {
  doc.getElementById('error-msg').classList.add('hidden');
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
    const suffix = rt.status === 'v2.0' ? '【v2.0追加】' : rt.status === 'v1.0only' ? '【v1.0のみ】' : '';
    opt.textContent = `${rt.ja} (${rt.en})${suffix}`;
    select.appendChild(opt);
  });

  const idAttrSelect = document.getElementById('q-id-attr');
  ID_ATTRS.forEach(value => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    idAttrSelect.appendChild(opt);
  });

  document.getElementById('btn-search').addEventListener('click', startSearch);
  document.getElementById('btn-clear-search').addEventListener('click', () => clearSearchForm());

  document.querySelectorAll('#search-section input[type="text"], #repo-url').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') startSearch();
    });
  });
}

if (typeof document !== 'undefined') {
  // サイドパネルで外部リンクを開いても検索結果を失わないよう、現在のタブを遷移させる。
  // 遷移できない特殊タブでは背面タブにフォールバックする（#150・#201・#228と同型）。
  if (IS_CHROME_EXTENSION) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (/^https?:\/\//i.test(href)) {
        e.preventDefault();
        chrome.tabs.update({ url: href }).catch(() => chrome.tabs.create({ url: href, active: false }));
      }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildUrl,
    normalizeQuery,
    validateQuery,
    normalizeJpcoarItemOrder,
    fetchJpcoar,
    getResultRange,
    clearSearchForm,
    RESOURCE_TYPES,
    SEARCH_FIELDS,
    ID_ATTRS,
  };
}
