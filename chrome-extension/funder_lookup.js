// ===== 設定 =====
const CONFIG = {
  // CiNii APIキー（任意）
  // CiNiiウェブAPI 利用登録 https://support.nii.ac.jp/ja/cinii/api/developer で取得したキーを貼り付けてください
  // Chrome拡張版では options.html で設定できます
  CiNii_API_KEY: "YOUR_CiNii_API_KEY",
};

// ===== Chrome拡張: chrome.storage.local からAPIキーを読み込む =====
async function loadConfig() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  try {
    const stored = await chrome.storage.local.get(['CiNii_API_KEY']);
    if (stored.CiNii_API_KEY) CONFIG.CiNii_API_KEY = stored.CiNii_API_KEY;
  } catch { /* 拡張外環境では無視 */ }
}

// ===== Chrome拡張: CORS非対応APIへのfetchをService Worker経由でプロキシ =====
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

// ===== JSPS 助成機関定数 =====
const JSPS_FUNDER_DOI = '10.13039/501100001691';
const JSPS_FUNDER_NAMES = [
  { subitem_funder_name: '日本学術振興会',                                  subitem_funder_name_language: 'ja' },
  { subitem_funder_name: 'Japan Society for the Promotion of Science', subitem_funder_name_language: 'en' },
];
// 科研費課題番号パターン判定
function isKakenhi(awardNumber) {
  if (!awardNumber) return false;
  const num = awardNumber.replace(/^JP/i, '');
  return /^\d{2}[A-Z]{1,2}\d{4,5}$/i.test(num);
}

const KAKENHI_FUNDING_STREAM = [
  { fundingStream: '科学研究費助成事業',                                    fundingStreamLang: 'ja' },
  { fundingStream: 'Grants-in-Aid for Scientific Research (KAKENHI)', fundingStreamLang: 'en' },
];

// ===== fetchJgn（make_jc_importer.html より移植・拡張） =====
async function fetchJgn(awardNumber) {
  const url = `https://api.crossref.org/works/10.52926/${encodeURIComponent(awardNumber)}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const item = data.message;
    if (item.type !== 'grant') return null;

    const project = item.project?.[0] || {};

    // 課題名
    const projectTitles = project['project-title'] || [];
    const titles = projectTitles
      .filter(t => t.title)
      .map(t => ({
        subitem_award_title:          t.title,
        subitem_award_title_language: t.language || '',
      }));

    // 助成機関情報: project.funding[].funder から取得
    const funding = project.funding?.[0] || {};
    const funderObj = funding.funder || {};
    let funderNames = [];
    let funderDoi = '';
    if (funderObj.name) {
      funderNames = [{ subitem_funder_name: funderObj.name, subitem_funder_name_language: 'en' }];
    }
    // funder.id[] から DOI を取得
    const funderIdEntry = (funderObj.id || []).find(x => x['id-type'] === 'DOI');
    if (funderIdEntry) {
      funderDoi = funderIdEntry.id || '';
    }
    // フォールバック: funding.funder が無い場合は publisher を使用
    if (!funderNames.length && item.publisher) {
      funderNames = [{ subitem_funder_name: item.publisher, subitem_funder_name_language: 'en' }];
    }

    // プログラム情報（scheme）: issue #34 JPCOAR 2.0 fundingStream
    const fundingStreams = funding.scheme
      ? [{ fundingStream: funding.scheme, fundingStreamLang: '' }]
      : [];

    // プログラム情報識別子: 課題番号からJGN_fundingStreamコードを抽出
    // JP{alphabetic code}{digits} → {code}（例: JPMJPR2125 → MJPR）
    const codeMatch = awardNumber.match(/^JP([A-Z]+)\d/i);
    const fundingStreamId = codeMatch ? codeMatch[1].toUpperCase() : '';

    return { titles, kakenUrl: `https://doi.org/10.52926/${awardNumber}`, funderNames, funderDoi, fundingStreams, fundingStreamId };
  } catch {
    return null;
  }
}

// ===== fetchKakenXml（KAKEN XML API） =====
// NOTE: KAKEN XML API は CORS 非対応のため、Chrome拡張の extensionFetch() 経由で呼び出します。
async function fetchKakenXml(awardNumber) {
  if (!CONFIG.CiNii_API_KEY || CONFIG.CiNii_API_KEY === 'YOUR_CiNii_API_KEY') return null;

  const projectId = awardNumber.replace(/^JP/i, '');
  const url = `https://kaken.nii.ac.jp/opensearch/?appid=${encodeURIComponent(CONFIG.CiNii_API_KEY)}&qb=${encodeURIComponent(projectId)}&format=xml`;

  try {
    const resp = await extensionFetch(url);
    if (!resp.ok) return null;

    const text = await resp.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'application/xml');
    if (xmlDoc.querySelector('parsererror')) return null;

    const award = xmlDoc.querySelector('grantAward');
    if (!award) return null;

    const normalizedValue = award.querySelector('identifier[type="nationalAwardNumber"] normalizedValue')?.textContent?.trim() || '';
    const kakenUrl = award.querySelector('urlList url')?.textContent?.trim() || '';

    const titles = [];
    award.querySelectorAll('summary').forEach(summary => {
      const lang = summary.getAttribute('xml:lang') || '';
      const titleText = summary.querySelector('title')?.textContent?.trim() || '';
      if (titleText && (lang === 'ja' || lang === 'en')) {
        if (!titles.some(t => t.subitem_award_title === titleText)) {
          titles.push({ subitem_award_title: titleText, subitem_award_title_language: lang });
        }
      }
    });

    const allAwardNumbers = [];
    award.querySelectorAll('summary awardNumber').forEach(el => {
      const num = el.getAttribute('awardNumber');
      if (num) allAwardNumbers.push(num);
    });

    return { titles, kakenUrl, funderNames: [], funderDoi: '', fundingStreams: [], normalizedValue, allAwardNumbers };
  } catch (e) {
    console.warn(`KAKEN XML API エラー (${awardNumber}):`, e.message);
    return null;
  }
}

// ===== fetchKakenCiNii（CiNii Research OpenSearch、フォールバック用） =====
async function fetchKakenCiNii(awardNumber) {
  const projectId = awardNumber.replace(/^JP/i, '');
  const appidParam = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY'
    ? `&appid=${encodeURIComponent(CONFIG.CiNii_API_KEY)}` : '';

  const [jaResp, enResp] = await Promise.all([
    fetch(`https://cir.nii.ac.jp/opensearch/v2/projects?format=json&projectId=${encodeURIComponent(projectId)}${appidParam}`),
    fetch(`https://cir.nii.ac.jp/opensearch/v2/projects?format=json&projectId=${encodeURIComponent(projectId)}&lang=en${appidParam}`),
  ]);

  if (!jaResp.ok || !enResp.ok) return null;

  const jaData = await jaResp.json();
  const enData = await enResp.json();

  if (!jaData.items?.length) return null;

  const jaTitle = jaData.items[0].title || '';
  const enTitle = enData.items?.[0]?.title || '';
  const kakenUrl = jaData.items[0]['dc:source']?.[0]?.['@id'] || '';

  const titles = [];
  if (jaTitle) {
    titles.push({ subitem_award_title: jaTitle, subitem_award_title_language: 'ja' });
  }
  if (enTitle && enTitle !== jaTitle) {
    titles.push({ subitem_award_title: enTitle, subitem_award_title_language: 'en' });
  }

  return { titles, kakenUrl, funderNames: [], funderDoi: '', fundingStreams: [] };
}

// ===== fmtVal（make_jc_importer.html より移植） =====
function fmtVal(v, lang) {
  if (!v) return '';
  let s = String(v);
  if (/^https?:\/\//.test(s)) {
    s = '<a href="' + s.replace(/"/g, '&quot;') + '" target="_blank" class="pv-link">' + s.replace(/</g, '&lt;') + '</a>';
  } else {
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (lang) s += ' <span style="color:#888">(' + lang + ')</span>';
  return s;
}

// ===== 1件の課題番号を検索 =====
async function lookupOne(awardNumber) {
  const hasCiNiiKey = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY';

  // KAKEN XML API（Chrome拡張経由でCORS回避）
  if (hasCiNiiKey) {
    const kakenXmlResult = await fetchKakenXml(awardNumber);
    if (kakenXmlResult) {
      // 補助金番号の検出
      let supplementaryWarning = '';
      const canonicalNumber = kakenXmlResult.normalizedValue || awardNumber;
      if (kakenXmlResult.normalizedValue) {
        const inputNorm = /^JP/i.test(awardNumber) ? awardNumber.toUpperCase() : 'JP' + awardNumber.toUpperCase();
        if (inputNorm !== kakenXmlResult.normalizedValue.toUpperCase()) {
          supplementaryWarning = `研究課題番号に「補助金の研究課題番号」が入力されたため「研究課題番号」に変更しました（${awardNumber} → ${canonicalNumber}）`;
        }
      }
      return {
        award: awardNumber,
        source: 'KAKEN',
        funderNames: JSPS_FUNDER_NAMES.map(n => ({...n})),
        funderDoi: JSPS_FUNDER_DOI,
        funderIdType: 'Crossref Funder',
        awardNumber: canonicalNumber,
        awardUri: kakenXmlResult.kakenUrl,
        titles: kakenXmlResult.titles,
        fundingStreams: KAKENHI_FUNDING_STREAM,
        supplementaryWarning,
      };
    }
  }

  // JGN フォールバック（JP接頭辞あり）
  if (/^JP/i.test(awardNumber)) {
    const jgnResult = await fetchJgn(awardNumber);
    if (jgnResult) {
      return {
        award: awardNumber,
        source: 'JGN',
        funderNames: jgnResult.funderNames,
        funderDoi: jgnResult.funderDoi,
        funderIdType: jgnResult.funderDoi ? 'Crossref Funder' : '',
        awardNumber: awardNumber,
        awardUri: jgnResult.kakenUrl,
        titles: jgnResult.titles,
        fundingStreams: jgnResult.fundingStreams,
        fundingStreamId: jgnResult.fundingStreamId || '',
        fundingStreamIdType: jgnResult.fundingStreamId ? 'JGN_fundingStream' : '',
      };
    }
  }

  // CiNii Research OpenSearch フォールバック（KAKEN XML・JGN いずれも失敗時）
  {
    const ciNiiResult = await fetchKakenCiNii(awardNumber);
    if (ciNiiResult) {
      return {
        award: awardNumber,
        source: 'KAKEN',
        funderNames: JSPS_FUNDER_NAMES.map(n => ({...n})),
        funderDoi: JSPS_FUNDER_DOI,
        funderIdType: 'Crossref Funder',
        awardNumber: awardNumber,
        awardUri: ciNiiResult.kakenUrl,
        titles: ciNiiResult.titles,
        fundingStreams: KAKENHI_FUNDING_STREAM,
      };
    }
  }

  const nistepHint = /^JP[A-Z]/i.test(awardNumber)
    ? '<a href="https://www.nistep.go.jp/taikei/" target="_blank" class="pv-link">最新の体系的番号一覧（NISTEP）</a>から目視で確認できます。'
    : '';
  const strippedNumber = awardNumber.replace(/^JP/i, '');
  const kakenSearchHint = /^\d+[A-Z]/i.test(strippedNumber)
    ? '補助金番号の可能性があります。<a href="https://kaken.nii.ac.jp/ja/search/?qb=' + encodeURIComponent(strippedNumber) + '" target="_blank" class="pv-link">KAKENで検索</a>して正規の研究課題番号を確認してください。'
    : '';
  const noKeyHint = !hasCiNiiKey ? 'CiNii APIキーが設定されていません。' : '';
  return { award: awardNumber, source: null, error: noKeyHint || '該当なし（JGN・KAKEN いずれも見つかりません）', nistepHint: noKeyHint ? '' : nistepHint, kakenSearchHint };
}

// ===== 結果カードを生成 =====
function buildResultCards(results) {
  return results.map((r, i) => {
    if (r.error) {
      return '<div class="result-card error-card">'
        + '<div class="result-card-header">#' + i + ' ' + fmtVal(r.award) + '</div>'
        + '<div class="result-card-body"><table class="pv-table">'
        + '<tr><td style="color:#c62828">' + fmtVal(r.error)
        + (r.kakenSearchHint ? '<br>' + r.kakenSearchHint : '')
        + (r.nistepHint ? '<br>' + r.nistepHint : '') + '</td></tr>'
        + '</table></div></div>';
    }
    if (r.loading) {
      return '<div class="result-card loading-card">'
        + '<div class="result-card-header">#' + i + ' ' + fmtVal(r.award) + '</div>'
        + '<div class="result-card-body"><table class="pv-table">'
        + '<tr><td style="color:#888;font-style:italic">検索中...</td></tr>'
        + '</table></div></div>';
    }

    const names = (r.funderNames || [])
      .filter(n => n.subitem_funder_name)
      .map(n => fmtVal(n.subitem_funder_name, n.subitem_funder_name_language))
      .join('<br>');

    const funderIdUrl = r.funderDoi ? 'https://doi.org/' + r.funderDoi : '';

    const titles = (r.titles || [])
      .filter(t => t.subitem_award_title)
      .map(t => fmtVal(t.subitem_award_title, t.subitem_award_title_language))
      .join('<br>');

    let rows = '';
    rows += '<tr><th>助成機関識別子</th><td>' + fmtVal(funderIdUrl) + '</td></tr>';
    rows += '<tr><th>助成機関名</th><td>' + names + '</td></tr>';
    rows += '<tr><th>プログラム情報識別子</th><td>'
      + fmtVal(r.fundingStreamId)
      + (r.fundingStreamIdType ? ' <span style="color:#888">(' + r.fundingStreamIdType + ')</span>' : '')
      + '</td></tr>';
    const streams = (r.fundingStreams || [])
      .filter(s => s.fundingStream)
      .map(s => fmtVal(s.fundingStream, s.fundingStreamLang))
      .join('<br>');
    rows += '<tr><th>プログラム情報</th><td>' + streams + '</td></tr>';
    rows += '<tr><th>研究課題番号</th><td>' + fmtVal(r.awardNumber) + '</td></tr>';
    if (r.supplementaryWarning) {
      rows += '<tr><td colspan="2" style="color:#e65100;font-size:0.85em">⚠ ' + r.supplementaryWarning.replace(/</g, '&lt;') + '</td></tr>';
    }
    rows += '<tr><th>研究課題番号URI</th><td>' + fmtVal(r.awardUri) + '</td></tr>';
    rows += '<tr><th>研究課題名</th><td>' + titles + '</td></tr>';

    return '<div class="result-card">'
      + '<div class="result-card-header">#' + i + ' ' + fmtVal(r.award)
      + '<span class="source-badge">' + r.source + '</span></div>'
      + '<div class="result-card-body"><table class="pv-table">' + rows + '</table></div></div>';
  }).join('');
}

// ===== 検索結果の保持（TSV出力用） =====
let lastResults = [];

// ===== 入力から課題番号を抽出（自動判定） =====
function extractAwardNumbers(input) {
  const numbers = [];
  const seen = new Set();
  for (const line of input.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/\s/.test(trimmed)) {
      // スペースを含む行: Acknowledgementsテキストとして JP... パターンを抽出
      const matches = trimmed.match(/JP[A-Za-z0-9]+/g) || [];
      for (const m of matches) {
        if (!seen.has(m)) { seen.add(m); numbers.push(m); }
      }
    } else {
      // スペースなし: 課題番号として扱う
      if (!seen.has(trimmed)) { seen.add(trimmed); numbers.push(trimmed); }
    }
  }
  return numbers;
}

// ===== メイン検索処理 =====
async function doSearch() {
  await loadConfig();  // Chrome拡張のstorage.localからAPIキーを読み込む
  const input = document.getElementById('award-input').value.trim();
  if (!input) return;

  const numbers = extractAwardNumbers(input);

  if (!numbers.length) return;

  const btn = document.getElementById('search-btn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  btn.disabled = true;

  // 初期状態: 全件ローディング表示
  const results = numbers.map(n => ({ award: n, loading: true }));
  resultEl.innerHTML = buildResultCards(results);
  statusEl.textContent = `検索中... (0/${numbers.length})`;

  // 1件ずつ順番に検索（API負荷軽減）
  for (let i = 0; i < numbers.length; i++) {
    try {
      results[i] = await lookupOne(numbers[i]);
    } catch (e) {
      results[i] = { award: numbers[i], error: 'エラー: ' + e.message };
    }
    statusEl.textContent = `検索中... (${i + 1}/${numbers.length})`;
    resultEl.innerHTML = buildResultCards(results);
  }

  statusEl.textContent = `完了（${numbers.length} 件）`;
  btn.disabled = false;

  // 成功結果がある場合、TSV出力セクションを表示
  lastResults = results;
  const hasSuccess = results.some(r => !r.error && !r.loading);
  document.getElementById('tsv-section').style.display = hasSuccess ? '' : 'none';
  document.getElementById('tsv-output').innerHTML = '';
}

// ===== TSV列定義（weko3_property_key_naming.md 準拠） =====
const FUNDING_COLUMNS = [
  // [subItemPath, jaLabel, dataExtractor, jpcoar]
  ['.subitem_award_numbers.subitem_award_number',      '.研究課題番号.研究課題番号',           r => r.awardNumber || '',  '1.0'],
  ['.subitem_award_numbers.subitem_award_number_type',  '.研究課題番号.研究課題番号タイプ',     r => '',                   '1.0'],
  ['.subitem_award_numbers.subitem_award_uri',          '.研究課題番号.研究課題番号URI',        r => r.awardUri || '',     '1.0'],
  ['.subitem_award_titles[0].subitem_award_title',          '.研究課題名[0].研究課題名',   r => (r.titles || [])[0]?.subitem_award_title || '',          '1.0'],
  ['.subitem_award_titles[0].subitem_award_title_language', '.研究課題名[0].言語',         r => (r.titles || [])[0]?.subitem_award_title_language || '', '1.0'],
  ['.subitem_funder_identifiers.subitem_funder_identifier',      '.助成機関識別子.助成機関識別子', r => r.funderDoi ? 'https://doi.org/' + r.funderDoi : '', '1.0'],
  ['.subitem_funder_identifiers.subitem_funder_identifier_type', '.助成機関識別子.識別子タイプ',   r => r.funderIdType || '',                                 '1.0'],
  ['.subitem_funder_names[0].subitem_funder_name',          '.助成機関名[0].助成機関名', r => (r.funderNames || [])[0]?.subitem_funder_name || '',          '1.0'],
  ['.subitem_funder_names[0].subitem_funder_name_language', '.助成機関名[0].言語',       r => (r.funderNames || [])[0]?.subitem_funder_name_language || '', '1.0'],
  // JPCOAR 2.0 のみ
  ['.subitem_funding_stream_identifiers.subitem_funding_stream_identifier',          '.プログラム情報識別子.プログラム情報識別子',         r => r.fundingStreamId || '',     '2.0'],
  ['.subitem_funding_stream_identifiers.subitem_funding_stream_identifier_type',     '.プログラム情報識別子.プログラム情報識別子タイプ',   r => r.fundingStreamIdType || '', '2.0'],
  ['.subitem_funding_stream_identifiers.subitem_funding_stream_identifier_type_uri', '.プログラム情報識別子.プログラム情報識別子タイプURI', r => '',                          '2.0'],
  ['.subitem_funding_streams[0].subitem_funding_stream',          '.プログラム情報[0].プログラム情報', r => (r.fundingStreams || [])[0]?.fundingStream || '',     '2.0'],
  ['.subitem_funding_streams[0].subitem_funding_stream_language', '.プログラム情報[0].言語',           r => (r.fundingStreams || [])[0]?.fundingStreamLang || '', '2.0'],
];

const DEFAULT_PREFIX = '.metadata.item_30002_funding_reference21';
const DEFAULT_LABEL  = '助成情報';

// ===== テンプレート解析 =====
function parseTsvTemplate(text) {
  const result = { prefix: DEFAULT_PREFIX, label: DEFAULT_LABEL, warn: '' };
  if (!text.trim()) return result;

  const lines = text.split(/\r?\n/);

  // 2行目を探す: .metadata.item_XXX[N].subitem_award_numbers を含む行
  let row2 = null, row2idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/\.metadata\.[^\t]*subitem_award_numbers/.test(lines[i])) {
      row2 = lines[i];
      row2idx = i;
      break;
    }
  }

  if (!row2) {
    result.warn = '助成情報のフィールドが見つかりませんでした。デフォルト値を使用します。';
    return result;
  }

  // プレフィックスを抽出
  const cols2 = row2.split('\t');
  let prefixCol = -1;
  for (let j = 0; j < cols2.length; j++) {
    const m = cols2[j].match(/^(\.metadata\.[^\[]+)\[\d+\]\.subitem_award_numbers/);
    if (m) {
      result.prefix = m[1];
      prefixCol = j;
      break;
    }
  }

  // 3行目からトップレベルラベルを抽出
  if (row2idx + 1 < lines.length) {
    const row3 = lines[row2idx + 1];
    const cols3 = row3.split('\t');
    if (prefixCol >= 0 && prefixCol < cols3.length) {
      const lm = cols3[prefixCol].match(/^([^\[]+)\[/);
      if (lm) result.label = lm[1];
    }
  }

  return result;
}

// ===== JPCOARバージョン注記 =====
function updateJpcoarNote() {
  const ver = document.querySelector('input[name="jpcoar-version"]:checked').value;
  document.getElementById('jpcoar-note').style.display = ver === '1.0' ? '' : 'none';
}

// ===== TSV生成 =====
function generateTsv() {
  const successResults = lastResults.filter(r => !r.error && !r.loading);
  if (!successResults.length) return;

  const ver = document.querySelector('input[name="jpcoar-version"]:checked').value;
  const templateText = document.getElementById('tsv-template').value;
  const parsed = parseTsvTemplate(templateText);

  let startIdx = parseInt(document.getElementById('tsv-start-index').value, 10) || 0;

  const prefix = parsed.prefix;
  const label = parsed.label;

  // バージョンに応じて列をフィルタ
  const cols = ver === '1.0'
    ? FUNDING_COLUMNS.filter(c => c[3] === '1.0')
    : FUNDING_COLUMNS;

  // TSV行を構築
  const tsvRows = [];

  // 1行目: 空
  tsvRows.push(cols.map(() => '').join('\t'));

  // 2行目: プロパティキー（各結果ごとに [N], [N+1], ... を展開）
  const row2 = [];
  for (let i = 0; i < successResults.length; i++) {
    const n = startIdx + i;
    for (const col of cols) {
      row2.push(prefix + '[' + n + ']' + col[0]);
    }
  }
  tsvRows.push(row2.join('\t'));

  // 3行目: 日本語ラベル
  const row3 = [];
  for (let i = 0; i < successResults.length; i++) {
    const n = startIdx + i;
    for (const col of cols) {
      row3.push(label + '[' + n + ']' + col[1]);
    }
  }
  tsvRows.push(row3.join('\t'));

  // データ行: 1行（全結果を横に展開）
  const dataRow = [];
  for (const r of successResults) {
    for (const col of cols) {
      dataRow.push(col[2](r));
    }
  }
  tsvRows.push(dataRow.join('\t'));

  const tsvString = tsvRows.join('\n');

  // プレビューHTML Table
  const colCount = cols.length * successResults.length;
  let html = '';
  if (parsed.warn) {
    html += '<div class="tsv-warn">⚠ ' + parsed.warn + '</div>';
  }
  html += '<div class="tsv-preview-wrap"><table><thead>';
  // 1行目（空）
  html += '<tr>';
  for (let i = 0; i < colCount; i++) html += '<th></th>';
  html += '</tr>';
  // 2行目（プロパティキー）
  html += '<tr>';
  for (const v of row2) html += '<th>' + escHtml(v) + '</th>';
  html += '</tr>';
  // 3行目（日本語ラベル）
  html += '<tr>';
  for (const v of row3) html += '<th>' + escHtml(v) + '</th>';
  html += '</tr>';
  html += '</thead><tbody><tr>';
  for (const v of dataRow) html += '<td>' + escHtml(v) + '</td>';
  html += '</tr></tbody></table></div>';
  html += '<button class="btn-copy" id="tsv-copy-btn">クリップボードにコピー</button>';

  const outputEl = document.getElementById('tsv-output');
  outputEl.innerHTML = html;
  outputEl.dataset.tsv = tsvString;

  // コピーボタンのイベントリスナー
  document.getElementById('tsv-copy-btn').addEventListener('click', function() { copyTsvToClipboard(this); });
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== クリップボードにコピー =====
async function copyTsvToClipboard(btn) {
  const tsv = document.getElementById('tsv-output').dataset.tsv;
  if (!tsv) return;
  try {
    await navigator.clipboard.writeText(tsv);
    const orig = btn.textContent;
    btn.textContent = 'コピーしました';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  } catch (e) {
    alert('クリップボードへのコピーに失敗しました: ' + e.message);
  }
}

// ===== 更新チェック =====
(async function checkForUpdate() {
  const LOCAL_VERSION = '2026-03-13';
  try {
    const res = await fetch('https://api.github.com/repos/tzhaya/jc-import-file-maker/commits?path=funder_lookup.html&per_page=1');
    if (!res.ok) return;
    const commits = await res.json();
    if (!commits.length) return;
    const remoteDate = commits[0].commit.committer.date.slice(0, 10);
    if (remoteDate > LOCAL_VERSION) {
      const el = document.getElementById('update-check');
      if (el) {
        el.innerHTML = ' &nbsp;| &nbsp;<a href="https://github.com/tzhaya/jc-import-file-maker" target="_blank" '
          + 'style="color:#c62828; font-weight:bold; text-decoration:none;">'
          + '🔔 更新版があります（' + remoteDate + '）</a>';
      }
    }
  } catch (_) { /* オフライン時は静かに無視 */ }
})();

// ===== イベントリスナー登録（Chrome拡張CSP対応） =====
document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('tsv-generate-btn').addEventListener('click', generateTsv);
document.querySelectorAll('input[name="jpcoar-version"]').forEach(radio => {
  radio.addEventListener('change', updateJpcoarNote);
});
