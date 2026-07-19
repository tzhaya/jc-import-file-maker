// CONFIG, loadConfig(), extensionFetch() は shared.js で定義
if (typeof CONFIG === 'undefined') {
  console.warn('shared.js が読み込めませんでした。APIキーなしで動作します。');
  window.CONFIG = { OpenAlex_API_KEY: '', CiNii_API_KEY: '', OPF_API_KEY: '' };
  window.loadConfig = async function() {};
  window.extensionFetch = function(url, options) { return fetch(url, options); };
  document.addEventListener('DOMContentLoaded', () => {
    const h1 = document.querySelector('h1');
    if (h1) h1.insertAdjacentHTML('afterend',
      '<div style="background:#fff3cd;border:1px solid #ffc107;padding:8px 14px;border-radius:6px;margin-bottom:10px;font-size:0.9em;color:#856404;">' +
      '⚠ <code>shared.js</code> が見つかりません。APIキーなしで動作しています。' +
      '<code>shared.js</code> を同じフォルダに配置してください。</div>');
  });
}

// ===== DOI 正規化 =====
function normalizeDoi(raw) {
  return raw.trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim();
}

// ===== DOI 形式の検証 =====
function isValidDoi(doi) {
  return typeof doi === 'string' && doi.length <= 256 && /^10\.\d{4,9}\/\S+$/.test(doi);
}

// ===== 現在のタブのmetaタグからDOIを取得（Chrome拡張専用） =====
// 戻り値: { doi } または { error: <ユーザー向けメッセージ> }
//
// 【広いホスト権限（https://*/*, http://*/*）が必要な理由】
// 電子ジャーナルのドメインは出版社ごとに異なり事前列挙できないため、
// optional_host_permissions として広いパターンを宣言している。
// この権限はインストール時ではなく、ユーザーがボタンを押したときに
// chrome.permissions.request() で実行時要求する（初回のみ確認ダイアログ）。
//
// 【安全策】
// - ユーザー操作を起点とし、自動実行しない。
// - executeScript で読み取るのは DOI を示す meta タグ・JSON-LD identifier のみ。
//   ページ本文・フォーム値・閲覧履歴は読まず、外部へ送信しない。
// - http:/https: 以外の特権ページ（chrome:// 等）では実行を拒否する。
async function getDoiFromCurrentTab() {
  try {
    // ページのDOMを読み取るための権限を最初に要求（ユーザージェスチャー保持のため最初のawaitにする）。
    // 初回のみ許可ダイアログ、許可後は同一ブラウザで再確認不要。
    // この権限付与後でないと chrome.tabs.query() が tab.url を返さない点に注意。
    const granted = await chrome.permissions.request({ origins: ['https://*/*', 'http://*/*'] });
    if (!granted) return { error: 'ページの読み取りが許可されませんでした。許可するとページからDOIを取得できます。' };
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return { error: 'アクティブなタブが見つかりませんでした。' };
    // 特権ページ（chrome:// 等）では実行不可。tab.url は権限付与後に読める
    if (tab.url) {
      try {
        const u = new URL(tab.url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return { error: 'このページではDOIを取得できません。通常のウェブページで実行してください。' };
        }
      } catch { /* URL解析失敗時はそのまま実行を試みる */ }
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // func はページコンテキストへシリアライズされ外部スコープを参照できないため、ロジックを自己完結させる
        const DOI_GUARD = /^(doi:|https?:\/\/(dx\.)?doi\.org\/|10\.\d{4,9}\/)/i;
        const selectors = [
          'meta[name="citation_doi" i]',
          'meta[name="prism.doi" i]',
          'meta[name="DOI" i]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.content?.trim()) return el.content.trim();
        }
        // dc.identifier はDOI形式（doi: / doi.org / 素の 10.xxxx）のみ採用
        const dcId = document.querySelector('meta[name="dc.identifier" i]');
        if (dcId?.content && DOI_GUARD.test(dcId.content)) {
          return dcId.content.trim();
        }
        // JSON-LD（schema.org ScholarlyArticle）の identifier をフォールバックとして採用
        const isSchemaOrg = (ctx) => {
          if (!ctx) return false;
          const vals = Array.isArray(ctx) ? ctx : [ctx];
          return vals.some(v => typeof v === 'string' && /^https?:\/\/schema\.org\/?$/i.test(v.trim()));
        };
        const hasType = (t, target) => {
          const arr = Array.isArray(t) ? t : [t];
          return arr.some(x => typeof x === 'string' && x.toLowerCase() === target.toLowerCase());
        };
        // identifier（文字列 / PropertyValue / それらの配列）から最初のDOI文字列を取り出す
        const extractIdentifier = (idf) => {
          const items = Array.isArray(idf) ? idf : [idf];
          for (const it of items) {
            if (typeof it === 'string' && DOI_GUARD.test(it.trim())) return it.trim();
            if (it && typeof it === 'object') {
              const v = it.value ?? it['@value'];
              if (typeof v === 'string' && DOI_GUARD.test(v.trim())) return v.trim();
            }
          }
          return null;
        };
        // @graph 入れ子も平坦化して全ノードを収集
        const collect = (node, out) => {
          if (!node) return;
          if (Array.isArray(node)) { node.forEach(n => collect(n, out)); return; }
          if (typeof node === 'object') {
            out.push(node);
            if (node['@graph']) collect(node['@graph'], out);
          }
        };
        const blocks = document.querySelectorAll('script[type="application/ld+json" i]');
        for (const block of blocks) {
          let data;
          try { data = JSON.parse(block.textContent); } catch { continue; }
          const roots = Array.isArray(data) ? data : [data];
          for (const root of roots) {
            if (!root || typeof root !== 'object' || !isSchemaOrg(root['@context'])) continue;
            const nodes = [];
            collect(root, nodes);
            for (const n of nodes) {
              if (hasType(n['@type'], 'ScholarlyArticle')) {
                const found = extractIdentifier(n.identifier);
                if (found) return found;
              }
            }
          }
        }
        return null;
      },
    });
    const raw = results?.[0]?.result ?? null;
    if (!raw) return { error: 'このページからDOIを取得できませんでした（DOIのmetaタグ・JSON-LDが見つかりません）。' };
    const doi = normalizeDoi(raw);
    if (!isValidDoi(doi)) return { error: 'このページのDOIを正しく認識できませんでした。' };
    return { doi };
  } catch (e) {
    console.warn('getDoiFromCurrentTab failed:', e);
    return { error: 'DOIの取得中にエラーが発生しました。' };
  }
}

// ===== DOIからCrossref/OpenAlex経由で課題番号を取得 =====
// 戻り値: { awards: string[], errors: string[] }
async function fetchAwardsByDoi(doi) {
  const awards = new Set();
  const errors = [];
  try {
    const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (r.ok) {
      const data = await r.json();
      (data.message?.funder ?? []).forEach(f =>
        (f.award ?? []).forEach(a => { if (a.trim()) awards.add(a.trim()); })
      );
    } else if (r.status !== 404) {
      errors.push(`Crossref APIエラー (${r.status})`);
    }
  } catch (e) {
    console.warn('Crossref fetch failed:', e);
    errors.push('Crossref への接続に失敗しました');
  }
  try {
    let url = `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`;
    if (CONFIG.OpenAlex_API_KEY && CONFIG.OpenAlex_API_KEY !== 'YOUR_OpenAlex_API_KEY') {
      url += `?api_key=${encodeURIComponent(CONFIG.OpenAlex_API_KEY)}`;
    }
    const r2 = await fetch(url);
    if (r2.ok) {
      const data2 = await r2.json();
      (data2.grants ?? []).forEach(g => { if (g.award_id?.trim()) awards.add(g.award_id.trim()); });
    } else if (r2.status === 409) {
      errors.push('OpenAlex のAPIキーなし利用回数制限を超えました（設定画面でAPIキーを設定してください）');
    } else if (r2.status !== 404) {
      errors.push(`OpenAlex APIエラー (${r2.status})`);
    }
  } catch (e) {
    console.warn('OpenAlex fetch failed:', e);
    errors.push('OpenAlex への接続に失敗しました');
  }
  return { awards: [...awards], errors };
}

// ===== DOI入力欄から課題番号を取得してテキストエリアに追記 =====
async function fetchAwardsByDoiFromInput() {
  const btn = document.getElementById('fetch-awards-by-doi');
  const raw = document.getElementById('doi-input-funder').value.trim();
  if (!raw) { alert('DOIを入力してください。'); return; }
  const doi = normalizeDoi(raw);
  if (!isValidDoi(doi)) { alert('DOIの形式が正しくありません（例: 10.1016/j.xxxx）。'); return; }
  const statusEl = document.getElementById('status');
  const ta = document.getElementById('award-input');
  if (btn) btn.disabled = true;
  statusEl.textContent = 'DOIから課題番号を検索中...';
  try {
    const { awards, errors } = await fetchAwardsByDoi(doi);
    statusEl.textContent = '';
    if (awards.length === 0) {
      alert(errors.length
        ? '課題番号を取得できませんでした:\n' + errors.join('\n')
        : 'このDOIから課題番号を取得できませんでした。');
      return;
    }
    // 既存の課題番号と重複しないものだけ追記
    const existing = new Set(ta.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean));
    const toAdd = awards.filter(a => !existing.has(a));
    if (toAdd.length === 0) {
      alert('取得した課題番号はすべて入力済みです。');
    } else {
      ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + toAdd.join('\n');
    }
    if (errors.length) console.warn('一部のAPIでエラーが発生しました:', errors);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ===== JSPS 助成機関定数 =====
const JSPS_FUNDER_DOI = '10.13039/501100001691';
const JSPS_FUNDER_NAMES = [
  { subitem_funder_name: '日本学術振興会',                                  subitem_funder_name_language: 'ja' },
  { subitem_funder_name: 'Japan Society for the Promotion of Science', subitem_funder_name_language: 'en' },
];
// 科研費課題番号パターン判定
// 形式: 2桁年度 + 1〜2桁アルファベット種目コード + 4〜5桁連番
// 例: 23KF0079（特別研究員奨励費）, 21H01234（基盤研究）, 15K12345
// JPプレフィックス付き（JP23KF0079）にも対応
function isKakenhi(awardNumber) {
  if (!awardNumber) return false;
  const num = awardNumber.replace(/^JP/i, '');
  return /^\d{2}[A-Z]{1,2}\d{4,5}$/i.test(num);
}

// AMED課題番号パターン判定
// 形式: 2桁年度 + 2〜3文字コード(英数小文字) + 5桁以上連番 + 任意接尾辞(英1文字+数字)
// 例: 24bm1123057h0001, 22ama121002
function isAmed(awardNumber) {
  if (!awardNumber) return false;
  return /^\d{2}[a-z0-9]{2,3}\d{5,}(?:[a-z]\d{1,4})?$/i.test(awardNumber);
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
        awardNumberType: 'JGN',
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
  // AMED ヒント
  const amedHint = isAmed(strippedNumber)
    ? 'AMED研究開発課題の可能性があります。<a href="https://amedfind.amed.go.jp/amed/" target="_blank" class="pv-link">AMED find</a>で検索して研究課題名を確認してください。'
    : '';
  // 厚生労働科研費ヒント（KAKENHI同一パターンだがKAKENで見つからなかった場合）
  const mhlwHint = (!amedHint && isKakenhi(awardNumber))
    ? '厚生労働科研費の可能性があります。<a href="https://mhlw-grants.niph.go.jp/" target="_blank" class="pv-link">厚生労働科学研究成果データベース</a>で検索して研究課題名を確認してください。'
    : '';
  const noKeyHint = !hasCiNiiKey ? 'CiNii APIキーが設定されていません。' : '';
  const errorMsg = noKeyHint
    ? noKeyHint + '該当なし（JGN・KAKEN いずれも見つかりません）'
    : '該当なし（JGN・KAKEN いずれも見つかりません）';
  return { award: awardNumber, source: null, error: errorMsg, nistepHint, kakenSearchHint, amedHint, mhlwHint };
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
        + (r.mhlwHint ? '<br>' + r.mhlwHint : '')
        + (r.amedHint ? '<br>' + r.amedHint : '')
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

// 科研費課題番号パターン（Ackテキスト抽出用、isKakenhi() と同一ルール）
// 厚生労働科研費（21HA2016 等）も同一形式のためマッチする
const KAKENHI_RE = /\b\d{2}[A-Z]{1,2}\d{4,5}\b/gi;

// AMED課題番号パターン（Ackテキスト抽出用）
// 形式: 2桁年度 + 2〜3文字コード(英数) + 5桁以上連番 + 任意接尾辞(英1文字+数字)
// 例: 24bm1123057h0001, 22ama121002, 223fa627001
const AMED_RE = /\b\d{2}[a-z0-9]{2,3}\d{5,}(?:[a-z]\d{1,4})?\b/gi;

// ===== 入力から課題番号を抽出（自動判定） =====
function extractAwardNumbers(input) {
  const numbers = [];
  const seen = new Set();
  const addUnique = (v) => { if (v && !seen.has(v)) { seen.add(v); numbers.push(v); } };

  for (const line of input.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[A-Za-z0-9._-]+$/.test(trimmed)) {
      // (A) 行全体が課題番号として妥当な文字のみ: そのまま1つの課題番号
      // （日本語等のマルチバイトを含む行は Case B/C の判定へ回す）
      addUnique(trimmed);
      continue;
    }

    // 課題番号以外の文字を含む行 → 区切りリストか Ack テキストか判定
    // 区切り文字は半角 ; , と全角 、 ， ； に対応
    const tokens = trimmed.split(/[;,、，；]/).map(t => t.trim()).filter(Boolean);
    const allLookLikeIds = tokens.length > 1
      && tokens.every(t => /^[A-Za-z0-9._-]+$/.test(t));

    if (allLookLikeIds) {
      // (B) セミコロン/カンマ区切りの課題番号リスト
      for (const t of tokens) addUnique(t);
    } else {
      // (C) Acknowledgementsテキスト: JP... + 科研費 + AMEDパターンを抽出
      // 体系的番号（JPCA24DA1234等）は常にJP付きのため JP[A-Za-z0-9]+ で対応済み
      const jpMatches = trimmed.match(/JP[A-Za-z0-9]+/g) || [];
      const kakenMatches = trimmed.match(KAKENHI_RE) || [];
      const amedMatches = trimmed.match(AMED_RE) || [];
      for (const m of jpMatches) addUnique(m);
      for (const m of kakenMatches) {
        // JP付きで既に抽出済みなら重複スキップ（JP21H04856 と 21H04856）
        if (!seen.has(m) && !seen.has('JP' + m)) addUnique(m);
      }
      for (const m of amedMatches) {
        if (!seen.has(m) && !seen.has('JP' + m)) addUnique(m);
      }
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
  ['.subitem_award_numbers.subitem_award_number_type',  '.研究課題番号.研究課題番号タイプ',     r => r.awardNumberType || '', '1.0'],
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
  const LOCAL_VERSION = '2026-07-19';
  try {
    const res = await fetch('https://api.github.com/repos/tzhaya/jc-import-file-maker/commits?path=funder_lookup.js&per_page=1');
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
// 「ページからDOI取得」はChrome拡張版（funder_panel.html）のみに存在するボタン
const getDoiBtnFunder = document.getElementById('get-doi-from-page-funder');
if (getDoiBtnFunder) getDoiBtnFunder.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const res = await getDoiFromCurrentTab();
    if (res.doi) {
      document.getElementById('doi-input-funder').value = res.doi;
    } else {
      alert(res.error);
    }
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('fetch-awards-by-doi').addEventListener('click', fetchAwardsByDoiFromInput);

document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('tsv-generate-btn').addEventListener('click', generateTsv);
document.querySelectorAll('input[name="jpcoar-version"]').forEach(radio => {
  radio.addEventListener('change', updateJpcoarNote);
});

// 検索結果内の外部リンクは現在のアクティブタブ内で開く（#150・#228）
// Chrome拡張のサイドパネルでは target="_blank" や新規タブのフォアグラウンド作成で
// タブが切り替わり、パネルが既定ページ（panel.html）にリセットされてしまうため、
// chrome.tabs.update で現在のタブをリンク先へ遷移させる（タブが切り替わらないため
// パネルの表示状態が保持される）。遷移できない特殊タブでは背面タブにフォールバック。
// スタンドアロン版（chrome未定義）では target="_blank" がそのまま機能するためこのハンドラは登録しない。
if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
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
