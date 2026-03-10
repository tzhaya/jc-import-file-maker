// ================================================================
// STEP 2: 定数・マスターデータ定義
// ================================================================

const CONFIG = {
    // OpenAlex APIキー（任意）
    // https://openalex.org/settings/api からご自身のキーを取得して貼り付けてください
    // Chrome拡張版では options.html で設定できます
    OpenAlex_API_KEY: "YOUR_OpenAlex_API_KEY",

    // CiNii APIキー（任意）
    // CiNiiウェブAPI 利用登録 https://support.nii.ac.jp/ja/cinii/api/developer で取得したキーを貼り付けてください
    // Chrome拡張版では options.html で設定できます
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

// ===== OPF連携グローバル状態 =====
let lastOpfData   = null;   // 最後に取得したOPFデータ
let lastOpfStatus = 'none'; // 'none' | 'no-issn' | 'disabled' | 'not-found' | 'found'

// ===== 除外フィールドリスト =====
const EXCLUDED_KEYS = new Set([
  'item_30002_apc5',                // APC
  'item_30002_dissertation_number30',
  'item_30002_degree_name31',
  'item_30002_degree_grantor33',
  'item_30002_heading36',
  'system_identifier_doi',
  'system_identifier_hdl',
  'system_identifier_uri',
  'system_file',
  'item_1698624004',  // カタログ
  'item_1698624001',  // データセットシリーズ
  'item_1698624002',  // 原文の言語
  'item_1698624003',  // 大きさ
  'item_1698624008',  // 日付（リテラル）
  'item_1698624009',  // 所蔵機関
  'item_1698624010',  // 物理的形態
  'item_1698624006',  // 版
  'item_1698624007',  // 部編名
  'item_1698624005',  // 出版者情報
]);

// ===== 資源タイプ語彙マッピング =====
const RESOURCE_TYPE_MAP = {
  // ----- Articles -----
  'conference paper':         'http://purl.org/coar/resource_type/c_5794',
  'data paper':               'http://purl.org/coar/resource_type/c_beb9',
  'departmental bulletin paper': 'http://purl.org/coar/resource_type/c_6501',
  'editorial':                'http://purl.org/coar/resource_type/c_b239',
  'journal':                  'http://purl.org/coar/resource_type/c_0640',    // v2.0追加
  'journal article':          'http://purl.org/coar/resource_type/c_6501',
  'newspaper':                'http://purl.org/coar/resource_type/c_2fe3',
  'other periodical':         'http://purl.org/coar/resource_type/QX5C-AR31', // v2.0追加
  'periodical':               'http://purl.org/coar/resource_type/c_2659',    // v1.0のみ
  'review article':           'http://purl.org/coar/resource_type/c_dcae04bc',
  'software paper':           'http://purl.org/coar/resource_type/c_7bab',
  'article':                  'http://purl.org/coar/resource_type/c_6501',
  // ----- Books -----
  'book':                     'http://purl.org/coar/resource_type/c_2f33',
  'book part':                'http://purl.org/coar/resource_type/c_3248',
  // ----- Cartographic Material -----
  'cartographic material':    'http://purl.org/coar/resource_type/c_12cc',
  'map':                      'http://purl.org/coar/resource_type/c_12cd',
  // ----- Conference Output -----
  'conference output':        'http://purl.org/coar/resource_type/c_c94f',    // v2.0改称（旧: conference object）
  'conference object':        'http://purl.org/coar/resource_type/c_c94f',    // 後方互換
  'conference presentation':  'http://purl.org/coar/resource_type/R60J-J5BD', // v2.0追加
  'conference proceedings':   'http://purl.org/coar/resource_type/c_f744',
  'conference poster':        'http://purl.org/coar/resource_type/c_6670',
  // ----- Dataset -----
  'aggregated data':          'http://purl.org/coar/resource_type/ACF7-8YT9', // v2.0追加
  'clinical trial data':      'http://purl.org/coar/resource_type/c_cb28',    // v2.0追加
  'compiled data':            'http://purl.org/coar/resource_type/FXF3-D3G7', // v2.0追加
  'dataset':                  'http://purl.org/coar/resource_type/c_ddb1',
  'encoded data':             'http://purl.org/coar/resource_type/AM6W-6QAW', // v2.0追加
  'experimental data':        'http://purl.org/coar/resource_type/63NG-B465', // v2.0追加
  'genomic data':             'http://purl.org/coar/resource_type/A8F1-NPV9', // v2.0追加
  'geospatial data':          'http://purl.org/coar/resource_type/2H0M-X761', // v2.0追加
  'laboratory notebook':      'http://purl.org/coar/resource_type/H41Y-FW7B', // v2.0追加
  'measurement and test data':'http://purl.org/coar/resource_type/DD58-GFSX', // v2.0追加
  'observational data':       'http://purl.org/coar/resource_type/FF4C-28RK', // v2.0追加
  'recorded data':            'http://purl.org/coar/resource_type/CQMR-7K63', // v2.0追加
  'simulation data':          'http://purl.org/coar/resource_type/W2XT-7017', // v2.0追加
  'survey data':              'http://purl.org/coar/resource_type/NHD0-W6SY', // v2.0追加
  // ----- Image -----
  'interview':                'http://purl.org/coar/resource_type/c_26e4',    // v1.0のみ
  'image':                    'http://purl.org/coar/resource_type/c_c513',
  'still image':              'http://purl.org/coar/resource_type/c_ecc8',
  'moving image':             'http://purl.org/coar/resource_type/c_8a7e',
  'video':                    'http://purl.org/coar/resource_type/c_12ce',
  // ----- Lecture -----
  'lecture':                  'http://purl.org/coar/resource_type/c_8544',
  // ----- Patent -----
  'design patent':            'http://purl.org/coar/resource_type/C53B-JCY5', // v2.0追加
  'patent':                   'http://purl.org/coar/resource_type/c_15cd',
  'PCT application':          'http://purl.org/coar/resource_type/SB3Y-W4EH', // v2.0追加
  'plant patent':             'http://purl.org/coar/resource_type/Z907-YMBB', // v2.0追加
  'plant variety protection': 'http://purl.org/coar/resource_type/GPQ7-G5VE', // v2.0追加
  'software patent':          'http://purl.org/coar/resource_type/MW8G-3CR8', // v2.0追加
  'trademark':                'http://purl.org/coar/resource_type/H6QP-SC1X', // v2.0追加
  'utility model':            'http://purl.org/coar/resource_type/9DKX-KSAF', // v2.0追加
  // ----- Report -----
  'internal report':          'http://purl.org/coar/resource_type/c_18ww',    // v1.0のみ
  'report':                   'http://purl.org/coar/resource_type/c_93fc',
  'research report':          'http://purl.org/coar/resource_type/c_18ws',
  'technical report':         'http://purl.org/coar/resource_type/c_18gh',
  'policy report':            'http://purl.org/coar/resource_type/c_186u',
  'report part':              'http://purl.org/coar/resource_type/c_ba1f',    // v1.0のみ
  'working paper':            'http://purl.org/coar/resource_type/c_8042',
  'data management plan':     'http://purl.org/coar/resource_type/c_ab20',
  // ----- Sound -----
  'sound':                    'http://purl.org/coar/resource_type/c_18cc',
  // ----- Thesis -----
  'thesis':                   'http://purl.org/coar/resource_type/c_46ec',
  'bachelor thesis':          'http://purl.org/coar/resource_type/c_7a1f',
  'master thesis':            'http://purl.org/coar/resource_type/c_bdcc',
  'doctoral thesis':          'http://purl.org/coar/resource_type/c_db06',
  // ----- Other -----
  'commentary':               'http://purl.org/coar/resource_type/D97F-VB57', // v2.0追加
  'design':                   'http://purl.org/coar/resource_type/542X-3S04', // v2.0追加
  'industrial design':        'http://purl.org/coar/resource_type/JBNF-DYAD', // v2.0追加
  'interactive resource':     'http://purl.org/coar/resource_type/c_e9a0',
  'layout design':            'http://purl.org/coar/resource_type/BW7T-YM2G', // v2.0追加
  'learning object':          'http://purl.org/coar/resource_type/c_e059',
  'manuscript':               'http://purl.org/coar/resource_type/c_0040',
  'musical notation':         'http://purl.org/coar/resource_type/c_18cw',
  'peer review':              'http://purl.org/coar/resource_type/H9BQ-739P', // v2.0追加
  'research proposal':        'http://purl.org/coar/resource_type/c_baaf',
  'research protocol':        'http://purl.org/coar/resource_type/YZ1N-ZFT9', // v2.0追加
  'software':                 'http://purl.org/coar/resource_type/c_5ce6',
  'source code':              'http://purl.org/coar/resource_type/QH80-2R4E', // v2.0追加
  'technical documentation':  'http://purl.org/coar/resource_type/c_71bd',
  'transcription':            'http://purl.org/coar/resource_type/6NC7-GK9S', // v2.0追加
  'workflow':                 'http://purl.org/coar/resource_type/c_393c',
  'other':                    'http://purl.org/coar/resource_type/c_1843',
};

// ===== Crossref type → JPCOAR 資源タイプ マッピング =====
const CROSSREF_TYPE_MAP = {
  'edited-book':         'book',
  'monograph':           'book',
  'reference-book':      'book',
  'book-set':            'book',
  'book-series':         'book',
  'book-chapter':        'book part',
  'book-section':        'book part',
  'book-track':          'book part',
  'reference-entry':     'book part',
  'proceedings-article': 'conference paper',
  'proceedings':         'conference proceedings',
  'proceedings-series':  'conference proceedings',
  'dissertation':        'thesis',
  'posted-content':      'article',
  'peer-review':         'article',
  'report-series':       'report',
  'report-component':    'report part',
  'journal-volume':      'journal',
  'journal-issue':       'journal',
  'database':            'dataset',
  'standard':            'other',
  'component':           'other',
  'grant':               'other',
};

// ===== Crossref relation type → JPCOAR relation type マッピング =====
const CROSSREF_RELATION_TYPE_MAP = {
  'is-version-of':      'isVersionOf',
  'has-version':        'hasVersion',
  'is-preprint-of':     'isVersionOf',
  'has-preprint':       'hasVersion',
  'is-part-of':         'isPartOf',
  'has-part':           'hasPart',
  'is-referenced-by':   'isReferencedBy',
  'references':         'references',
  'is-format-of':       'isFormatOf',
  'has-format':         'hasFormat',
  'is-identical-to':    'isIdenticalTo',
  'is-supplement-to':   'isSupplementTo',
  'is-supplemented-by': 'isSupplementedBy',
  'replaces':           'replaces',
  'is-replaced-by':     'isReplacedBy',
  'is-cited-by':        'isCitedBy',
  'cites':              'Cites',
};

// ===== Crossref relation id-type → JPCOAR identifierType マッピング =====
const CROSSREF_RELATION_ID_TYPE_MAP = {
  'doi':   'DOI',
  'isbn':  'ISBN',
  'issn':  'ISSN',
  'uri':   'URI',
  'arxiv': 'arXiv',
  'pmid':  'PMID',
};

// ===== JaLC content_type → JPCOAR 資源タイプマッピング =====
const JALC_CONTENT_TYPE_MAP = {
  'JA': 'journal article',
  'BK': 'book',
  'RD': 'dataset',
  'EL': 'learning object',
  'GD': 'other',
};

// ===== 出版タイプ URI マッピング =====
const VERSION_TYPE_MAP = {
  'AO':   'http://purl.org/coar/version/c_b1a7d7d4d402bcce',
  'SMUR': 'http://purl.org/coar/version/c_71e4c1898caa6e32',
  'AM':   'http://purl.org/coar/version/c_ab4af688f83e57aa',
  'P':    'http://purl.org/coar/version/c_fa2ee174bc00049f',
  'VoR':  'http://purl.org/coar/version/c_970fb48d4fbd8a85',
  'CVoR': 'http://purl.org/coar/version/c_e19f295774971610',
  'EVoR': 'http://purl.org/coar/version/c_dc82b40f9837b551',
  'NA':   'http://purl.org/coar/version/c_be7fb7dd8ff6fe43',
};

// ===== JSPS 助成機関定数 =====
const JSPS_FUNDER_DOI = '10.13039/501100001691';
const JSPS_FUNDER_NAMES = [
  { subitem_funder_name: '日本学術振興会',                                  subitem_funder_name_language: 'ja' },
  { subitem_funder_name: 'Japan Society for the Promotion of Science', subitem_funder_name_language: 'en' },
];

// ===== アクセス権マッピング =====
const ACCESS_RIGHTS_MAP = {
  'embargoed access':       'http://purl.org/coar/access_right/c_f1cf',
  'metadata only access':   'http://purl.org/coar/access_right/c_14cb',
  'open access':            'http://purl.org/coar/access_right/c_abf2',
  'restricted access':      'http://purl.org/coar/access_right/c_16ec',
};

// ===== JPCOAR リンクマッピング（フィールドキー→スキーマURL）=====
const JPCOAR_LINKS = {
  'item_30002_title0':                    'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/1',
  'item_30002_alternative_title1':        'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/2',
  'item_30002_creator2':                  'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/3',
  'item_30002_contributor3':              'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/4',
  'item_30002_access_rights4':            'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/5',
  'item_30002_rights6':                   'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/7',
  'item_30002_rights_holder7':            'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/8',
  'item_30002_subject8':                  'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/9',
  'item_30002_description9':              'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/10',
  'item_30002_publisher10':               'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/11',
  'item_30002_date11':                    'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/12',
  'item_30002_language12':                'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/13',
  'item_30002_resource_type13':           'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/14',
  'item_30002_version14':                 'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/15',
  'item_30002_version_type15':            'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/16',
  'item_30002_identifier16':              'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/17',
  'item_30002_identifier_registration17': 'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/18',
  'item_30002_relation18':                'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/19',
  'item_30002_temporal19':                'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/20',
  'item_30002_geolocation20':             'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/21',
  'item_30002_funding_reference21':       'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/22',
  'item_30002_source_identifier22':       'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/23',
  'item_30002_source_title23':            'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/24',
  'item_30002_volume_number24':           'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/25',
  'item_30002_issue_number25':            'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/26',
  'item_30002_number_of_pages26':         'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/27',
  'item_30002_page_start27':              'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/28',
  'item_30002_page_end28':                'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/29',
  'item_30002_bibliographic_information29': 'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/24',
  'item_30002_conference34':              'https://schema.irdb.nii.ac.jp/ja/schema/1.0.2/34',
};

// ===== DOI必須要件マッピング（別表2-1/3-1: ジャーナルアーティクル系、別表2-3/3-2: 書籍系）=====
// article: conference paper, departmental bulletin paper, journal article, review article, 等
// book:    book, book part, technical report, research report, report, thesis, 等
// 値: 'required'=必須, 'conditional'=条件付必須, null=任意/対象外
const DOI_REQUIREMENTS = {
  'item_30002_title0':
    { article: { jalc: 'required',     crossref: 'required',     crossref_note: 'Crossref: xml:lang必須' },
      book:    { jalc: 'required',     crossref: 'required',     crossref_note: 'Crossref: xml:lang・"en"必須' } },
  'item_30002_creator2':
    { article: { jalc: 'conditional',  crossref: 'conditional',  jalc_note: '作成者がある場合必須', crossref_note: '作成者がある場合必須。Crossref: xml:lang必須' },
      book:    { jalc: 'conditional',  crossref: 'conditional',  jalc_note: '作成者がある場合必須', crossref_note: '作成者がある場合必須。Crossref: xml:lang必須' } },
  'item_30002_publisher10':
    { article: { jalc: 'required',     crossref: 'required',     crossref_note: 'Crossref: xml:lang="en"必須' },
      book:    { jalc: 'required',     crossref: 'required',     crossref_note: 'Crossref: xml:lang="en"必須' } },
  'item_30002_date11':
    { article: { jalc: 'required',     crossref: 'required' },
      book:    { jalc: 'required',     crossref: 'required' } },
  'item_30002_resource_type13':
    { article: { jalc: 'required',     crossref: 'required' },
      book:    { jalc: 'required',     crossref: 'required' } },
  'item_30002_identifier16':
    { article: { jalc: 'required',     crossref: 'required' },
      book:    { jalc: 'required',     crossref: 'required' } },
  'item_30002_identifier_registration17':
    { article: { jalc: 'required',     crossref: 'required' },
      book:    { jalc: 'required',     crossref: 'required' } },
  'item_30002_relation18':
    { article: null,
      book:    { jalc: null,           crossref: 'required',     crossref_note: 'Crossref: ISBN必須 (isIdenticalTo)' } },
  'item_30002_source_identifier22':
    { article: { jalc: null,           crossref: 'required',     crossref_note: 'Crossref DOIのみ必須' },
      book:    null },
  'item_30002_source_title23':
    { article: { jalc: null,           crossref: 'required',     crossref_note: 'Crossref: xml:lang="en"必須' },
      book:    null },
  'item_30002_volume_number24':
    { article: { jalc: 'required',     crossref: 'required' },
      book:    null },
  'item_30002_page_start27':
    { article: { jalc: 'required',     crossref: 'required',     jalc_note: 'ない場合「none」', crossref_note: 'ない場合「none」' },
      book:    null },
};

// ===== titleMap データ（ItemType.json から抽出）=====
const TITLE_MAPS = {
  // 言語（テキスト系フィールドの言語選択）
  language: [
    'ja','ja-Kana','en','fr','it','de','es','zh-cn','zh-tw','ru','la','ms','eo','ar','el','ko'
  ],
  // 本文言語（ISO 639-2/T コード）
  subitem_language: [
    'jpn','eng','aar','abk','afr','aka','amh','ara','arg','arm','asm','ava','ave','aym','aze',
    'bak','bam','bel','ben','bis','bod','bos','bre','bul','cat','ces','cha','che','chu','chv',
    'cor','cos','cre','cym','dan','deu','div','dzo','ell','epo','est','eus','ewe','fao','fas',
    'fij','fin','fra','fry','ful','gla','gle','glg','glv','grn','guj','hat','hau','heb','her',
    'hin','hmo','hrv','hun','hye','ibo','ido','iii','iku','ile','ina','ind','ipk','isl','ita',
    'jav','kal','kan','kas','kat','kau','kaz','khm','kik','kin','kir','kom','kon','kor','kua',
    'kur','lao','lat','lav','lim','lin','lit','ltz','lub','lug','mkd','mlg','mlt','mon','mri',
    'msa','mya','nau','nav','nbl','nde','ndo','nep','nno','nob','nor','nya','oci','oji','ori',
    'orm','oss','pan','pli','pol','por','pus','que','roh','ron','run','rus','sag','san','sin',
    'slk','slv','sme','smo','sna','snd','som','sot','spa','sqi','srd','srp','ssw','sun','swa',
    'swe','tah','tam','tat','tel','tgk','tgl','tha','tir','ton','tsn','tso','tuk','tur','twi',
    'uig','ukr','urd','uzb','ven','vie','vol','wln','wol','xho','yid','yor','zha','zho','zul'
  ],
  // 資源タイプ（ItemType.json の resourcetype titleMap）
  resourcetype: [
    'conference paper','data paper','departmental bulletin paper','editorial',
    'journal','journal article','newspaper','review article','other periodical',
    'software paper','article','book','book part','cartographic material','map',
    'conference output','conference presentation','conference proceedings','conference poster',
    'aggregated data','clinical trial data','compiled data','encoded data','experimental data',
    'genomic data','geospatial data','laboratory notebook','measurement and test data',
    'observational data','recorded data','simulation data','survey data',
    'dataset','image','still image','moving image','video',
    'lecture',
    'design patent','patent','PCT application','plant patent','plant variety protection',
    'software patent','trademark','utility model',
    'internal report','report','research report','technical report',
    'policy report','report part','working paper','data management plan',
    'sound','thesis','bachelor thesis','master thesis','doctoral thesis',
    'commentary','design','industrial design','interactive resource','layout design',
    'learning object','manuscript','musical notation','peer review',
    'research proposal','research protocol','software','source code',
    'technical documentation','transcription','workflow','other'
  ],
  // アクセス権
  subitem_access_right: ['embargoed access','metadata only access','open access','restricted access'],
  // 出版タイプ
  subitem_version_type: ['AO','SMUR','AM','P','VoR','CVoR','EVoR','NA'],
  // 内容記述タイプ
  subitem_description_type: ['Abstract','Methods','TableOfContents','TechnicalInfo','Other'],
  // 日付タイプ
  subitem_date_issued_type: ['Accepted','Available','Collected','Copyrighted','Created','Issued','Submitted','Updated','Valid'],
  // 書誌発行日タイプ
  bibliographicIssueDateType: ['Issued'],
  // 関連タイプ
  subitem_relation_type: [
    'isVersionOf','hasVersion','isPartOf','hasPart','isReferencedBy','references',
    'isFormatOf','hasFormat','isReplacedBy','replaces','isRequiredBy','requires',
    'isSupplementedBy','isSupplementTo','isIdenticalTo','isDerivedFrom','isSourceOf',
    'isCitedBy','Cites','inSeries'
  ],
  // 関連識別子タイプ
  subitem_relation_type_select: [
    'ARK','arXiv','DOI','HDL','ICHUSHI','ISBN','J-GLOBAL','Local',
    'PISSN','EISSN','ISSN','NAID','NCID','PMID','PURL','SCOPUS','URI','WOS','CRID'
  ],
  // 収録物識別子タイプ
  subitem_source_identifier_type: ['PISSN','EISSN','ISSN','NCID'],
  // 寄与者タイプ
  contributorType: [
    'ContactPerson','DataCollector','DataCurator','DataManager','Distributor','Editor',
    'HostingInstitution','Producer','ProjectLeader','ProjectManager','ProjectMember',
    'RelatedPerson','Researcher','ResearchGroup','Sponsor','Supervisor','WorkPackageLeader','Other'
  ],
  // 所属機関識別子スキーム
  affiliationNameIdentifierScheme: ['ISNI','ROR','GRID','kakenhi','Ringgold'],
  // 識別子タイプ（作成者/寄与者）
  nameIdentifierScheme: ['ORCID','CiNii','ISNI','J-GLOBAL'],
  // 識別子タイプ（作成者姓名タイプ）
  creatorNameType: ['Personal','Organizational'],
  // 識別子タイプ（識別子フィールド）
  subitem_identifier_type: ['DOI','HDL','URI','CRID'],
  // 助成機関識別子タイプ
  subitem_funder_identifier_type: ['Crossref Funder','ISNI','ROR','Other'],
  // 開催国（ISO 3166-1 alpha-3）
  subitem_conference_country: [
    'JPN','ABW','AFG','AGO','AIA','ALA','ALB','AND','ARE','ARG','ARM','ASM','ATA','ATF','ATG',
    'AUS','AUT','AZE','BDI','BEL','BEN','BES','BFA','BGD','BGR','BHR','BHS','BIH','BLM','BLR',
    'BLZ','BMU','BOL','BRA','BRB','BRN','BTN','BVT','BWA','CAF','CAN','CCK','CHE','CHL','CHN',
    'CIV','CMR','COD','COG','COK','COL','COM','CPV','CRI','CUB','CUW','CXR','CYM','CYP','CZE',
    'DEU','DJI','DMA','DNK','DOM','DZA','ECU','EGY','ERI','ESH','ESP','EST','ETH','FIN','FJI',
    'FLK','FRA','FRO','FSM','GAB','GBR','GEO','GGY','GHA','GIB','GIN','GLP','GMB','GNB','GNQ',
    'GRC','GRD','GRL','GTM','GUF','GUM','GUY','HKG','HMD','HND','HRV','HTI','HUN','IDN','IMN',
    'IND','IOT','IRL','IRN','IRQ','ISL','ISR','ITA','JAM','JEY','JOR','KAZ','KEN','KGZ','KHM',
    'KIR','KNA','KOR','KWT','LAO','LBN','LBR','LBY','LCA','LIE','LKA','LSO','LTU','LUX','LVA',
    'MAC','MAF','MAR','MCO','MDA','MDG','MDV','MEX','MHL','MKD','MLI','MLT','MMR','MNE','MNG',
    'MNP','MOZ','MRT','MSR','MTQ','MUS','MWI','MYS','MYT','NAM','NCL','NER','NFK','NGA','NIC',
    'NIU','NLD','NOR','NPL','NRU','NZL','OMN','PAK','PAN','PCN','PER','PHL','PLW','PNG','POL',
    'PRI','PRK','PRT','PRY','PSE','PYF','QAT','REU','ROU','RUS','RWA','SAU','SDN','SEN','SGP',
    'SGS','SHN','SJM','SLB','SLE','SLV','SMR','SOM','SPM','SRB','SSD','STP','SUR','SVK','SVN',
    'SWE','SWZ','SXM','SYC','SYR','TCA','TCD','TGO','THA','TJK','TKL','TKM','TLS','TON','TTO',
    'TUN','TUR','TUV','TWN','TZA','UGA','UKR','UMI','URY','USA','UZB','VAT','VCT','VEN','VGB',
    'VIR','VNM','VUT','WLF','WSM','YEM','ZAF','ZMB','ZWE',
  ],
};

// ===== 日付ユーティリティ =====
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ===== select メニュー生成ヘルパー =====
// values: 文字列配列 または {name, value}配列
// selected: 初期選択値
// onChange: 値変化時コールバック(value)
function buildSelect(values, selected, onChange) {
  const sel = document.createElement('select');
  for (const v of values) {
    const name  = (typeof v === 'object') ? v.name  : v;
    const value = (typeof v === 'object') ? v.value : v;
    const o = document.createElement('option');
    o.value = value;
    o.textContent = name;
    if (value === selected) o.selected = true;
    sel.appendChild(o);
  }
  if (onChange) sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

// ===== HTML エスケープ =====
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== 参照値（ヒント）レンダリング =====
// URL を自動リンク化して返す
function renderHint(val) {
  if (!val) return '';
  return String(val).split(/(\s+)/).map(part => {
    if (/^https?:\/\//.test(part))
      return `<a href="${escHtml(part)}" target="_blank">${escHtml(part)}</a>`;
    return escHtml(part);
  }).join('');
}

// 参照値表示フラグ（API取得時 true、空値表示時 false）
let showHints = false;

// ===== エラー表示 =====
function showError(msg) {
  const el = document.getElementById('error-msg');
  if (msg) { el.textContent = msg; el.style.display = 'block'; }
  else { el.style.display = 'none'; }
}

// ===== アコーディオン展開/折りたたみ =====
function toggleAccordion(headerEl) {
  const content = headerEl.nextElementSibling;
  const icon = headerEl.querySelector('.toggle-icon');
  const summary = headerEl.querySelector('.summary') || headerEl.querySelector('.item-summary');

  if (!content) return;
  if (content.style.display === 'none') {
    content.style.display = '';
    if (icon) icon.textContent = '▼';
    if (summary) summary.style.display = 'none';
  } else {
    content.style.display = 'none';
    if (icon) icon.textContent = '▶';
    if (summary) {
      summary.style.display = 'inline';
    }
  }
}

// ===== システムフィールド描画 =====
function renderSystemFields(systemData) {
  const tbody = document.getElementById('system-fields-body');
  tbody.innerHTML = '';

  const sysRows = [
    { label: '.id',                  hint: '新規登録時は空欄', key: 'sys_id',      type: 'text',   default: '' },
    { label: '.uri',                 hint: '新規登録時は空欄', key: 'sys_uri',     type: 'text',   default: '' },
    { label: '.IndexID[0]',          hint: '.metadata.path[0]', key: 'sys_path',  type: 'text',   default: '' },
    { label: '.POS_INDEX[0]',        hint: '1718256617194',    key: 'sys_pos',     type: 'text',   default: '' },
    { label: '.PUBLISH_STATUS',      hint: 'private / public', key: 'sys_status',  type: 'select', options: ['private','public'], default: 'private' },
    { label: '.FEEDBACK_MAIL[0]',    hint: '',                  key: 'sys_mail',   type: 'text',   default: '' },
    { label: '.CNRI',                hint: '',                  key: 'sys_cnri',   type: 'text',   default: '' },
    { label: '.DOI_RA',              hint: 'JaLC / Crossref',  key: 'sys_doi_ra',  type: 'select', options: ['','JaLC','Crossref'], default: '' },
    { label: '.DOI',                 hint: '',                  key: 'sys_doi',    type: 'text',   default: '' },
    { label: 'Keep/Upgrade Version', hint: 'Keep / Upgrade',   key: 'sys_edit',    type: 'select', options: ['Keep','Upgrade'], default: 'Keep' },
    { label: '公開日',               hint: 'YYYY-MM-DD',        key: 'sys_pubdate', type: 'text',   default: todayStr() },
  ];

  for (const row of sysRows) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = row.label;
    const tdHint = document.createElement('td');
    tdHint.textContent = row.hint;
    const tdVal = document.createElement('td');

    const val = (systemData && systemData[row.key] !== undefined) ? systemData[row.key] : row.default;

    if (row.type === 'select') {
      const sel = document.createElement('select');
      sel.dataset.key = row.key;
      for (const opt of row.options) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt || '（未設定）';
        if (opt === val) o.selected = true;
        sel.appendChild(o);
      }
      tdVal.appendChild(sel);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = val;
      inp.dataset.key = row.key;
      tdVal.appendChild(inp);
    }

    tr.appendChild(tdLabel);
    tr.appendChild(tdHint);
    tr.appendChild(tdVal);
    tbody.appendChild(tr);
  }
}

// ================================================================
// STEP 3: API 取得層
// ================================================================

// ===== DOI 正規化 =====
function normalizeDoi(raw) {
  return raw.trim()
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim();
}

// ===== 3.0 DOI RA判定 =====
async function fetchDoiRA(doi) {
  const resp = await fetch(`https://doi.org/doiRA/${encodeURIComponent(doi)}`);
  if (!resp.ok) throw new Error(`DOI RA判定APIエラー: ${resp.status}`);
  const data = await resp.json();
  const entry = data[0];
  if (!entry || entry.status) {
    throw new Error('入力されたDOIは存在しません。');
  }
  return entry.RA;
}

// ===== 3.1 Crossref API =====
async function fetchCrossref(doi) {
  const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!resp.ok) {
    if (resp.status === 404) throw new Error('DOIが見つかりません（Crossref 404）');
    throw new Error(`Crossref APIエラー: ${resp.status}`);
  }
  const data = await resp.json();
  return data.message;
}

// ===== 3.2 OpenAlex API =====
async function fetchOpenAlex(doi) {
  let url = `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`;
  if (CONFIG.OpenAlex_API_KEY && CONFIG.OpenAlex_API_KEY !== 'YOUR_OpenAlex_API_KEY') {
    url += `?api_key=${encodeURIComponent(CONFIG.OpenAlex_API_KEY)}`;
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 404) throw new Error('DOIがOpenAlexに見つかりません');
    if (resp.status === 409) throw new Error('OpenAlex API Keyなしでの利用回数の制限を超えました。https://openalex.org/pricing でAPI Keyを取得し、設定してください。');
    throw new Error(`OpenAlex APIエラー: ${resp.status}`);
  }
  return await resp.json();
}

// ===== 3.2b JaLC REST API =====
// NOTE: JaLC API は CORS 非対応のため、Chrome拡張の extensionFetch() 経由で呼び出します。
// 拡張なし環境ではCORSエラーになります。
async function fetchJaLC(doi) {
  const resp = await extensionFetch(`https://api.japanlinkcenter.org/v2/dois/${encodeURIComponent(doi)}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!resp.ok) {
    if (resp.status === 404) throw new Error('DOIが見つかりません（JaLC 404）');
    throw new Error(`JaLC APIエラー: ${resp.status}`);
  }
  const json = await resp.json();
  return json.data;
}

// ===== 3.2a 関連DOIタイトル取得（Crossref）=====
async function fetchRelationTitle(doi) {
  const bareDoi = doi.replace(/^https?:\/\/doi\.org\//i, '');
  try {
    const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(bareDoi)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const msg = data.message || {};
    const title = (msg.title || [])[0] || '';
    const lang = msg.language || 'en';
    return title ? { title, lang } : null;
  } catch {
    return null;
  }
}

// ===== 3.2b 関連DOIタイトル取得（JaLC）=====
async function fetchRelationTitleJaLC(doi) {
  const bareDoi = doi.replace(/^https?:\/\/doi\.org\//i, '');
  try {
    const resp = await extensionFetch(`https://api.japanlinkcenter.org/v2/dois/${encodeURIComponent(bareDoi)}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const titles = (json.data || {}).title_list || [];
    const first = titles[0];
    return first?.title ? { title: first.title, lang: first.lang || 'ja' } : null;
  } catch {
    return null;
  }
}

// ===== 3.3 ROR v2 API（単体） =====
// rorUri: "https://ror.org/005pdtr14" 形式
async function fetchRorDetails(rorUri) {
  // ROR ID 部分だけを抽出
  const rorId = rorUri.replace(/^https?:\/\/ror\.org\//i, '').replace(/\/$/, '');
  const resp = await fetch(`https://api.ror.org/v2/organizations/${encodeURIComponent(rorId)}`);
  if (!resp.ok) return { isni: '', rorDisplayName: '', rorId };

  const data = await resp.json();

  // ror_display タイプの名称を取得
  const rorDisplayEntry = (data.names || []).find(n =>
    Array.isArray(n.types) && n.types.includes('ror_display')
  );
  const rorDisplayName = rorDisplayEntry ? rorDisplayEntry.value : '';

  // ISNI 取得（スペース除去）
  const isniEntry = (data.external_ids || []).find(e => e.type === 'isni');
  const isni = isniEntry && isniEntry.all && isniEntry.all[0]
    ? isniEntry.all[0].replace(/\s+/g, '')
    : '';

  return { isni, rorDisplayName, rorId };
}

// ===== 3.3b ROR 逆引き: ror_display + label タイプの全名称を取得 =====
async function fetchRorNamesAll(rorUri) {
  const rorId = rorUri.replace(/^https?:\/\/ror\.org\//i, '').replace(/\/$/, '');
  const resp = await fetch(`https://api.ror.org/v2/organizations/${encodeURIComponent(rorId)}`);
  if (!resp.ok) throw new Error(`ROR APIエラー: ${resp.status}`);
  const data = await resp.json();
  return (data.names || [])
    .filter(n => Array.isArray(n.types) && (n.types.includes('ror_display') || n.types.includes('label')))
    .map(n => ({ name: n.value, lang: n.lang || '' }));
}

// ===== 3.3c Crossref Funders 逆引き: 主名称を取得 =====
async function fetchCrossrefFunderDetails(funderUri) {
  const doi = funderUri.replace(/^https?:\/\/doi\.org\//i, '');
  const resp = await fetch(`https://api.crossref.org/funders/${encodeURIComponent(doi)}`);
  if (!resp.ok) throw new Error(`Crossref Funders APIエラー: ${resp.status}`);
  const data = await resp.json();
  const name = data.message?.name || '';
  // alt-names は言語タグなしのため上書き対象外（表示のみ）
  const altNames = (data.message?.['alt-names'] || []).join(', ');
  return name
    ? [{ name, lang: 'en', _altNames: altNames }]
    : [];
}

// ===== 3.4 全著者の ROR データを並列取得 =====
async function fetchAllRorData(oaJson) {
  const rorMap = new Map(); // rorUri → { isni, rorDisplayName, rorId }

  const rorUris = new Set();
  for (const authorship of (oaJson.authorships || [])) {
    for (const inst of (authorship.institutions || [])) {
      if (inst.ror) rorUris.add(inst.ror);
    }
  }

  await Promise.all([...rorUris].map(async (rorUri) => {
    try {
      const info = await fetchRorDetails(rorUri);
      rorMap.set(rorUri, info);
    } catch {
      rorMap.set(rorUri, { isni: '', rorDisplayName: '', rorId: rorUri });
    }
  }));

  return rorMap;
}

// ===== 3.5 KAKEN XML API =====
// NOTE: KAKEN XML API は CORS 非対応のため、Chrome拡張の extensionFetch() 経由で呼び出します。
// 拡張なし環境ではCORSエラーになるため自動的にフォールバックします。
async function fetchKakenXml(awardNumber) {
  // CiNii APIキー必須
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

  // 正規課題番号
  const normalizedValue = award.querySelector('identifier[type="nationalAwardNumber"] normalizedValue')?.textContent?.trim() || '';

  // KAKEN URL
  const kakenUrl = award.querySelector('urlList url')?.textContent?.trim() || '';

  // 課題名（日英）
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

  // 全課題番号（参考用）
  const allAwardNumbers = [];
  award.querySelectorAll('summary awardNumber').forEach(el => {
    const num = el.getAttribute('awardNumber');
    if (num) allAwardNumbers.push(num);
  });

  return { titles, kakenUrl, funderNames: [], funderDoi: '', normalizedValue, allAwardNumbers };
  } catch (e) {
    console.warn(`KAKEN XML API エラー (${awardNumber}):`, e.message);
    return null;
  }
}

// ===== 3.5b CiNii Research KAKEN API（フォールバック用）=====
async function fetchKakenCiNii(awardNumber) {
  // JP プレフィックス除去
  const projectId = awardNumber.replace(/^JP/i, '');
  const appidParam = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY'
    ? `&appid=${encodeURIComponent(CONFIG.CiNii_API_KEY)}` : '';

  // 日本語・英語タイトルを並列取得
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

  // 日英タイトルが同一の場合は英語タイトルなし
  const titles = [];
  if (jaTitle) {
    titles.push({ subitem_award_title: jaTitle, subitem_award_title_language: 'ja' });
  }
  if (enTitle && enTitle !== jaTitle) {
    titles.push({ subitem_award_title: enTitle, subitem_award_title_language: 'en' });
  }

  return { titles, kakenUrl, funderNames: [], funderDoi: '' };
}

// ===== 3.5.2 Crossref JGN（Japan Grant Number）API =====
async function fetchJgn(awardNumber) {
  const url = `https://api.crossref.org/works/10.52926/${encodeURIComponent(awardNumber)}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;            // 404 → JGN未登録
    const data = await resp.json();
    const item = data.message;
    if (item.type !== 'grant') return null;

    const projectTitles = item.project?.[0]?.['project-title'] || [];
    const titles = projectTitles
      .filter(t => t.title)
      .map(t => ({
        subitem_award_title:          t.title,
        subitem_award_title_language: t.language || '',
      }));

    // 助成機関情報を抽出
    const funder = item.funder?.[0];
    const funderNames = funder?.name
      ? [{ subitem_funder_name: funder.name, subitem_funder_name_language: 'en' }]
      : [];
    const funderDoi = funder?.DOI || '';

    return { titles, kakenUrl: `https://doi.org/10.52926/${awardNumber}`, funderNames, funderDoi };
  } catch {
    return null;
  }
}

// ===== 3.5.1 CiNii Research NCID取得 =====
async function fetchNcid(issns) {
  const appidParam = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY'
    ? `&appid=${encodeURIComponent(CONFIG.CiNii_API_KEY)}` : '';
  for (const issn of issns) {
    const url = `https://cir.nii.ac.jp/opensearch/v2/books?issn=${encodeURIComponent(issn)}&format=json${appidParam}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!data.items?.length) continue;
      const ids = data.items[0]['dc:identifier'] || [];
      const ncidObj = ids.find(id => id['@type'] === 'cir:NCID');
      if (ncidObj?.['@value']) return ncidObj['@value'];
    } catch { continue; }
  }
  return null;
}

// ===== 3.5.2 Open Policy Finder API =====
// CORS非対応のため Chrome拡張の extensionFetch() 経由で呼び出します。
// 拡張なし環境では OPF 連携チェックボックスが無効化されるため、この関数は呼ばれません。
async function fetchOpenPolicyFinder(issns) {
  if (!CONFIG.OPF_API_KEY || CONFIG.OPF_API_KEY === 'YOUR_OPF_API_KEY') return null;
  console.log('[OPF] ISSNs:', issns);
  for (const issn of issns) {
    try {
      const params = new URLSearchParams({
        'item-type': 'publication',
        'format': 'Json',
        'identifier': issn,
      });
      const url = `https://api.openpolicyfinder.jisc.ac.uk/retrieve_by_id?${params}`;
      console.log('[OPF] Fetching:', url);
      const resp = await extensionFetch(url, { headers: { 'x-api-key': CONFIG.OPF_API_KEY } });
      console.log('[OPF] Response:', resp.status, resp.ok);
      if (!resp.ok) { const errBody = await resp.text(); console.log('[OPF] Not OK:', resp.status, errBody); continue; }
      const data = await resp.json();
      console.log('[OPF] Data:', JSON.stringify(data).slice(0, 500));
      if (data?.items?.length) return data;
      console.log('[OPF] No items in response');
    } catch (e) { console.log('[OPF] Error:', e.message); continue; }
  }
  return null;
}

// ===== 3.5.3 OPF ステータス更新・モーダル制御 =====
async function updateOpfStatus(issns) {
  const badge = document.getElementById('opf-badge');
  if (!badge) return;

  const hasKey = CONFIG.OPF_API_KEY && CONFIG.OPF_API_KEY !== 'YOUR_OPF_API_KEY';
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime?.id;

  if (!isExtension || !hasKey) {
    badge.style.display = 'none';
    lastOpfStatus = 'disabled';
    lastOpfData = null;
    return;
  }
  if (!issns.length) {
    badge.style.display = 'none';
    lastOpfStatus = 'no-issn';
    lastOpfData = null;
    return;
  }

  badge.textContent = '⏳ OAポリシー取得中…';
  badge.style.display = '';
  try {
    lastOpfData = await fetchOpenPolicyFinder(issns);
    if (lastOpfData) {
      lastOpfStatus = 'found';
      badge.textContent = '📋 OAポリシー';
      badge.style.background = '#e3f2fd';
      badge.style.color = '#1565c0';
    } else {
      lastOpfStatus = 'not-found';
      badge.textContent = '📋 OAポリシー（情報なし）';
      badge.style.background = '#f5f5f5';
      badge.style.color = '#999';
    }
  } catch (e) {
    lastOpfStatus = 'not-found';
    lastOpfData = null;
    badge.textContent = '📋 OAポリシー（取得失敗）';
    badge.style.background = '#f5f5f5';
    badge.style.color = '#999';
    console.warn('OPF取得失敗:', e.message);
  }
}

function openOpfModal() {
  const modal = document.getElementById('opf-modal');
  const body  = document.getElementById('opf-modal-body');
  body.innerHTML = renderOpfModal(lastOpfData, lastOpfStatus);
  modal.style.display = '';
}

function closeOpfModal() {
  document.getElementById('opf-modal').style.display = 'none';
}

function renderOpfModal(data, status) {
  if (status === 'disabled') return '<p>OPF APIキーが設定されていないか、Chrome拡張版でご利用ください。</p>';
  if (status === 'no-issn')  return '<p>ISSNが取得できなかったためOAポリシーを検索できません。</p>';
  if (!data?.items?.length)  return '<p>OAポリシー情報が見つかりませんでした。</p>';

  const item = data.items[0];
  let html = '';

  // 雑誌タイトル
  const title = item.title?.[0]?.title;
  if (title) html += `<p><strong>雑誌:</strong> ${escHtml(title)}</p>`;

  // 出版社
  const pubName = item.publishers?.[0]?.publisher?.name?.[0]?.name;
  if (pubName) html += `<p><strong>出版社:</strong> ${escHtml(pubName)}</p>`;

  // DOAJ
  const inDoaj = item.listed_in_doaj_phrases?.[0]?.value === 'yes';
  if (inDoaj) html += `<p><span style="background:#4caf50;color:#fff;border-radius:4px;padding:1px 6px;font-size:0.85em;">DOAJ</span> DOAJ収録誌</p>`;

  // OPF詳細リンク
  if (item.id) html += `<p style="font-size:0.85em;"><a href="https://v2.sherpa.ac.uk/id/publication/${item.id}" target="_blank" rel="noopener" style="color:#1565c0;">SHERPA/RoMEO で詳細を見る</a></p>`;

  const policies = item.publisher_policy || [];
  if (!policies.length) {
    html += '<p>ポリシー情報はありません。</p>';
    return html;
  }

  policies.forEach(pol => {
    const isProhibited = pol.open_access_prohibited === 'yes';
    const label = isProhibited ? '🔴 OA禁止' : (pol.internal_moniker || 'ポリシー');
    html += `<div style="border:1px solid #ddd; border-radius:6px; padding:12px; margin-bottom:12px;">`;
    html += `<div style="font-weight:bold; margin-bottom:6px;">📄 ${escHtml(label)}</div>`;

    // 参照URL
    if (pol.urls?.length) {
      const links = pol.urls.map(u =>
        `<a href="${escHtml(u.url)}" target="_blank" rel="noopener" style="color:#1565c0;">${escHtml(u.description || u.url)}</a>`
      ).join('<br>');
      html += `<p style="margin:4px 0; font-size:0.85em;">${links}</p>`;
    }

    // permitted_oa ルート（Published → Accepted → Submitted 順）
    const VERSION_ORDER = { published: 0, accepted: 1, submitted: 2 };
    const sortedOa = [...(pol.permitted_oa || [])].sort((a, b) => {
      const aV = Math.min(...(a.article_version || []).map(v => VERSION_ORDER[v] ?? 9));
      const bV = Math.min(...(b.article_version || []).map(v => VERSION_ORDER[v] ?? 9));
      return aV - bV;
    });
    const VERSION_BG = { published: '#e0ebe2', accepted: '#e8f0f7', submitted: '#fce8ed' };
    const VERSION_BADGE = { published: 'background:#4caf50;color:#fff', accepted: 'background:#1976d2;color:#fff', submitted: 'background:#e91e63;color:#fff' };
    sortedOa.forEach(oa => {
      const versionKeys = oa.article_version || [];
      const badges = (oa.article_version_phrases || []).map(v => {
        const st = VERSION_BADGE[v.value] || 'background:#9e9e9e;color:#fff';
        return `<span style="${st};border-radius:4px;padding:2px 8px;font-size:0.85em;font-weight:bold;">${escHtml(v.phrase)}</span>`;
      }).join(' ');
      const licenses = (oa.license || []).map(l => (l.license_phrases?.[0]?.phrase || l.license)).join(' / ');
      const locations = (oa.location?.location_phrases || []).map(l => l.phrase).join(', ');
      const embargo = oa.embargo?.amount ? `${oa.embargo.amount}ヶ月` : '';
      const conditions = oa.conditions || [];
      const bgColor = versionKeys.reduce((c, v) => VERSION_BG[v] || c, '#f8f9fa');
      const hasIR = (oa.location?.location || []).some(l => l === 'institutional_repository' || l === 'non_commercial_institutional_repository');

      html += `<div style="background:${bgColor}; border-radius:4px; padding:8px 10px; margin:6px 0; font-size:0.88em;${hasIR ? ' border-left:4px solid #ff9800;' : ''}">`;
      if (badges) html += `<p style="margin:2px 0 6px;">${badges}${hasIR ? ' <span style="background:#ff9800;color:#fff;border-radius:4px;padding:1px 6px;font-size:0.8em;margin-left:4px;">★ リポジトリ公開可</span>' : ''}</p>`;
      if (licenses) html += `<p style="margin:2px 0;"><strong>ライセンス:</strong> ${escHtml(licenses)}</p>`;
      if (locations) html += `<p style="margin:2px 0;"><strong>掲載先:</strong> ${escHtml(locations)}</p>`;
      if (embargo) html += `<p style="margin:2px 0;"><strong>エンバーゴ:</strong> ${escHtml(embargo)}</p>`;
      if (conditions.length) html += `<p style="margin:2px 0; color:#555;"><strong>条件:</strong> ${conditions.map(c => escHtml(c)).join('; ')}</p>`;
      html += `</div>`;
    });

    html += `</div>`;
  });
  return html;
}

// ===== 3.6 Crossref DOI データ取得 =====
async function fetchCrossrefData(doi) {
  // Crossref + OpenAlex を並列取得
  const [crJson, oaJson] = await Promise.all([
    fetchCrossref(doi),
    fetchOpenAlex(doi),
  ]);

  // ROR データを並列取得
  const rorMap = await fetchAllRorData(oaJson);

  // 情報バー表示
  const doiUrl = `https://doi.org/${doi}`;
  const doiLink = document.getElementById('doi-link');
  doiLink.href = doiUrl;
  doiLink.textContent = doiUrl;

  const oaStatus = oaJson.open_access?.oa_status || '';
  const isOa = oaJson.open_access?.is_oa || false;
  const badge = document.getElementById('oa-badge');
  badge.textContent = isOa
    ? (oaStatus === 'gold'   ? '🟡 Gold OA'
     : oaStatus === 'green'  ? '🟢 Green OA'
     : oaStatus === 'hybrid' ? '🔵 Hybrid OA'
     : '⚪ Other OA')
    : '🔴 Closed';
  badge.style.background = isOa ? '#4caf50' : '#999';
  document.getElementById('info-bar').style.display = 'flex';

  // マッピング → レンダリング
  const metadata = await mapToItemType(crJson, oaJson, rorMap);

  // ISSN抽出
  const issns = (metadata.item_30002_source_identifier22 || [])
    .filter(si => ['ISSN','PISSN','EISSN'].includes(si.subitem_source_identifier_type))
    .map(si => si.subitem_source_identifier);

  // OPF 参照リンク設定
  const opfRow = document.getElementById('opf-link-row');
  const opfAnchor = document.getElementById('opf-link');
  if (issns.length) {
    const searchUrl = `https://openpolicyfinder.jisc.ac.uk/search?search=${encodeURIComponent(issns[0])}&per_page=10&publication_page=1&publisher_page=1&funder_page=1`;
    opfAnchor.href = searchUrl;
    opfRow.style.display = '';
  } else {
    opfRow.style.display = 'none';
  }

  // OPF API 連携（Chrome拡張 + OPF_API_KEY 設定時のみ）
  await updateOpfStatus(issns);

  showHints = true;
  renderAll(metadata);
}

// ===== 3.6b JaLC 取得フロー =====
async function fetchJaLCData(doi) {
  const jalcJson = await fetchJaLC(doi);

  // 情報バー表示（OAバッジなし）
  const doiUrl = `https://doi.org/${doi}`;
  const doiLink = document.getElementById('doi-link');
  doiLink.href = doiUrl;
  doiLink.textContent = doiUrl;
  const badge = document.getElementById('oa-badge');
  badge.textContent = '⚪ Unknown';
  badge.style.background = '#999';
  document.getElementById('info-bar').style.display = 'flex';

  // マッピング → レンダリング
  const metadata = await mapToItemTypeJaLC(jalcJson);

  // ISSN抽出 + OPF API 連携
  const issns = (metadata.item_30002_source_identifier22 || [])
    .filter(si => ['ISSN','PISSN','EISSN'].includes(si.subitem_source_identifier_type))
    .map(si => si.subitem_source_identifier);
  await updateOpfStatus(issns);

  showHints = true;
  renderAll(metadata);
}

// ===== 3.7 メイン取得フロー =====
async function fetchData() {
  showError('');
  await loadConfig();  // Chrome拡張のstorage.localからAPIキーを読み込む
  const rawDoi = document.getElementById('doi-input').value.trim();
  if (!rawDoi) { showError('DOIを入力してください。'); return; }
  const doi = normalizeDoi(rawDoi);

  document.getElementById('info-bar').style.display = 'none';
  document.getElementById('opf-link-row').style.display = 'none';
  document.getElementById('preview-area').style.display = 'none';
  const loading = document.getElementById('loading');
  loading.style.display = 'block';

  try {
    // RA判定
    const ra = await fetchDoiRA(doi);

    if (ra === 'Crossref') {
      await fetchCrossrefData(doi);
    } else if (ra === 'JaLC') {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        await fetchJaLCData(doi);
      } else {
        showError('JaLC DOI のインポートはChrome拡張版のみ対応しています。拡張をインストールしてご利用ください。');
      }
    } else {
      showError(`この DOI の登録機関 (${ra}) は現在サポートされていません。`);
    }
  } catch (e) {
    showError(`エラー: ${e.message}`);
  } finally {
    loading.style.display = 'none';
  }
}

// ===== 3.8 空値テスト表示 =====
function showEmptyFields() {
  showError('');
  showHints = false;
  renderAll(buildEmptyMetadata());
}

// ================================================================
// STEP 4: データマッピング層
// ================================================================

// ===== 4.6 アブストラクト JATS 処理 =====
function processAbstract(raw) {
  if (!raw) return '';
  // 1. 改行コードを削除
  let text = raw.replace(/\r?\n/g, '');
  // 2. エスケープされた実体参照を解除
  text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
              .replace(/&apos;/g, "'").replace(/&quot;/g, '"');
  // 3. 先頭の <jats:title>...</jats:title> を削除
  text = text.replace(/^<jats:title>[^<]*<\/jats:title>/, '');
  // 4. <jats:sec> 内の <jats:title>...</jats:title> を "TITLE: " 形式に変換
  text = text.replace(/<jats:title>([^<]*)<\/jats:title>/g, '$1: ');
  // 5 & 6. 残存する全タグを除去（<jats:p> 等のテキストはそのまま取り込み）
  text = text.replace(/<[^>]+>/g, '');
  // 7. 連続スペースを1つに統一・trim
  text = text.replace(/ {2,}/g, ' ').trim();
  return text;
}

// ===== 日付パーツフォーマット =====
function formatDateParts(parts = []) {
  if (!parts.length) return '';
  if (parts.length >= 3) return `${parts[0]}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
  if (parts.length === 2) return `${parts[0]}-${String(parts[1]).padStart(2,'0')}`;
  return String(parts[0]);
}

// ===== 発行日取得 =====
function getPubDate(cr) {
  const parts = cr['published-online']?.['date-parts']?.[0]
    || cr['published-print']?.['date-parts']?.[0]
    || cr.published?.['date-parts']?.[0] || [];
  return formatDateParts(parts);
}

// ===== 4.3 著者マッピング =====
function buildAuthors(crAuthors, oaAuthorships, rorMap) {
  // OpenAlex 著者を姓で索引化
  const oaByFamily = {};
  const oaByIndex = [];
  (oaAuthorships || []).forEach((a, i) => {
    oaByIndex[i] = a;
    const dn = (a.author?.display_name || '').toLowerCase();
    // "Sakiko Shiratori" → last word as family
    const parts = dn.split(/\s+/);
    const familyKey = parts[parts.length - 1] || '';
    if (familyKey) oaByFamily[familyKey] = a;
  });

  return (crAuthors || []).map((crA, idx) => {
    const family = crA.family || '';
    const given  = crA.given  || '';
    const fullName = family && given ? `${family}, ${given}` : family || given;

    // OpenAlex エントリと照合（姓→インデックス順でフォールバック）
    const familyLower = family.toLowerCase();
    const oaEntry = oaByFamily[familyLower] || oaByIndex[idx] || null;

    // ORCID: Crossref 優先 → OpenAlex fallback（warn フラグ付き）
    const crOrcid = crA.ORCID || '';
    const oaOrcid = oaEntry?.author?.orcid || '';
    const orcidUri = crOrcid || oaOrcid || '';
    const orcidFromOA = !crOrcid && !!oaOrcid;
    const orcidId = orcidUri.replace(/^https?:\/\/orcid\.org\//i, '');

    // 所属: OpenAlex authorships[].institutions を使用
    const oaInsts = oaEntry?.institutions || [];
    const affiliations = oaInsts.map(inst => {
      const rorUri = inst.ror || '';
      const rorInfo = rorUri ? (rorMap.get(rorUri) || {}) : {};
      const dispName = rorInfo.rorDisplayName || inst.display_name || '';
      const isni     = rorInfo.isni || '';
      const rorId    = rorInfo.rorId || '';

      const affiliationNameIdentifiers = [];
      if (isni) affiliationNameIdentifiers.push({
        affiliationNameIdentifier:       isni,
        affiliationNameIdentifierScheme: 'ISNI',
        affiliationNameIdentifierURI:    `https://isni.org/isni/${isni}`,
      });
      if (rorId) affiliationNameIdentifiers.push({
        affiliationNameIdentifier:       rorId,
        affiliationNameIdentifierScheme: 'ROR',
        affiliationNameIdentifierURI:    `https://ror.org/${rorId}`,
      });

      return {
        affiliationNames: dispName
          ? [{ affiliationName: dispName, affiliationNameLang: 'en', _warnLang: true }]
          : [],
        affiliationNameIdentifiers,
      };
    });

    const nameIdentifiers = orcidId
      ? [{ nameIdentifier: orcidId, nameIdentifierScheme: 'ORCID', nameIdentifierURI: `https://orcid.org/${orcidId}`, _warnOrcid: orcidFromOA }]
      : [];

    return {
      creatorType: 'Author',
      creatorNames: [{ creatorName: fullName, creatorNameLang: 'en', creatorNameType: 'Personal', _warnLang: true }],
      familyNames:  family ? [{ familyName: family, familyNameLang: 'en', _warnLang: true }] : [],
      givenNames:   given  ? [{ givenName:  given,  givenNameLang:  'en', _warnLang: true }] : [],
      nameIdentifiers,
      creatorAffiliations: affiliations,
    };
  });
}

// ===== 4.3b JaLC 著者マッピング =====
function buildJaLCAuthors(jalcCreators) {
  return (jalcCreators || []).map(cr => {
    // 多言語名を構築
    const creatorNames = [];
    const familyNames  = [];
    const givenNames   = [];
    (cr.names || []).forEach(n => {
      const family = n.last_name  || '';
      const given  = n.first_name || '';
      const lang   = n.lang || '';
      const fullName = family && given ? `${family}, ${given}` : family || given;
      if (fullName) {
        creatorNames.push({ creatorName: fullName, creatorNameLang: lang, creatorNameType: 'Personal' });
      }
      if (family) familyNames.push({ familyName: family, familyNameLang: lang });
      if (given)  givenNames.push({ givenName: given, givenNameLang: lang });
    });

    // 研究者ID（e-Rad / ORCID）
    const nameIdentifiers = [];
    (cr.researcher_id_list || []).forEach(rid => {
      const idType = (rid.type || '').toUpperCase();
      if (idType === 'ORCID') {
        const orcidId = (rid.id_code || '').replace(/^https?:\/\/orcid\.org\//i, '');
        if (orcidId) nameIdentifiers.push({
          nameIdentifier: orcidId, nameIdentifierScheme: 'ORCID',
          nameIdentifierURI: `https://orcid.org/${orcidId}`,
        });
      } else if (idType === 'ERAD' || idType === 'E-RAD') {
        if (rid.id_code) nameIdentifiers.push({
          nameIdentifier: rid.id_code, nameIdentifierScheme: 'e-Rad',
          nameIdentifierURI: `https://kaken.nii.ac.jp/search/?qe=${rid.id_code}`,
        });
      }
    });

    // 所属: affiliation_list から直接取得（ROR API不要）
    const affiliations = (cr.affiliation_list || []).map(aff => {
      const affiliationNames = (aff.affiliation_name_list || []).map(an => ({
        affiliationName: an.affiliation_name || '',
        affiliationNameLang: an.lang || '',
      })).filter(an => an.affiliationName);

      const affiliationNameIdentifiers = [];
      (aff.affiliation_identifier_list || []).forEach(aid => {
        const idType = (aid.type || '').toUpperCase();
        const idVal  = aid.affiliation_identifier || '';
        if (!idVal) return;
        if (idType === 'ROR') {
          const rorId = idVal.replace(/^https?:\/\/ror\.org\//i, '').replace(/\/$/, '');
          affiliationNameIdentifiers.push({
            affiliationNameIdentifier: rorId,
            affiliationNameIdentifierScheme: 'ROR',
            affiliationNameIdentifierURI: `https://ror.org/${rorId}`,
          });
        } else if (idType === 'ISNI') {
          affiliationNameIdentifiers.push({
            affiliationNameIdentifier: idVal,
            affiliationNameIdentifierScheme: 'ISNI',
            affiliationNameIdentifierURI: `https://isni.org/isni/${idVal}`,
          });
        } else if (idType === 'GRID' || idType === 'WIKIDATA') {
          affiliationNameIdentifiers.push({
            affiliationNameIdentifier: idVal,
            affiliationNameIdentifierScheme: idType,
            affiliationNameIdentifierURI: '',
          });
        }
      });

      return { affiliationNames, affiliationNameIdentifiers };
    });

    return {
      creatorType: 'Author',
      creatorNames,
      familyNames,
      givenNames,
      nameIdentifiers,
      creatorAffiliations: affiliations,
    };
  });
}

// ===== 4.4 助成情報マッピング =====
async function buildFunders(crFunders) {
  const entries = await Promise.all((crFunders || []).map(async (f) => {
    const name      = f.name  || '';
    const funderDoi = f.DOI   || '';
    const awards    = f.award || [];

    // JSPS判定: funder DOI が JSPS（APIキー不要）
    const isJsps = funderDoi === JSPS_FUNDER_DOI;

    const buildEntry = async (awardNum) => {
      const obj = {};
      obj.subitem_funder_names = name
        ? [{ subitem_funder_name: name, subitem_funder_name_language: 'en' }]
        : [];

      if (funderDoi) {
        obj.subitem_funder_identifiers = {
          subitem_funder_identifier:      `https://doi.org/${funderDoi}`,
          subitem_funder_identifier_type: 'Crossref Funder',
        };
      } else {
        obj.subitem_funder_identifiers = { subitem_funder_identifier: '', subitem_funder_identifier_type: '' };
      }

      const hasCiNiiKey = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY';
      let kakenResult = null;

      // KAKEN XML API（Chrome拡張経由でCORS回避）
      if (hasCiNiiKey && isJsps && awardNum) {
        try {
          kakenResult = await fetchKakenXml(awardNum);
        } catch (e) {
          console.warn(`KAKEN XML取得失敗 (${awardNum}):`, e.message);
        }
      }

      // JGN連携: award が JP で始まる場合（JST助成金等）
      if (!kakenResult && awardNum && /^JP/i.test(awardNum)) {
        try {
          kakenResult = await fetchJgn(awardNum);
        } catch (e) {
          console.warn(`JGN取得失敗 (${awardNum}):`, e.message);
        }
      }

      // CiNii Research OpenSearch フォールバック（KAKEN XML・JGN いずれも失敗時）
      if (!kakenResult && isJsps && awardNum) {
        try {
          kakenResult = await fetchKakenCiNii(awardNum);
        } catch (e) {
          console.warn(`KAKEN CiNii取得失敗 (${awardNum}):`, e.message);
        }
      }

      // KAKEN/JGN 結果から助成機関名・識別子を補完（既存値がある場合は上書きしない）
      if (kakenResult) {
        if (!obj.subitem_funder_names.length) {
          obj.subitem_funder_names = kakenResult.funderNames?.length
            ? kakenResult.funderNames
            : JSPS_FUNDER_NAMES.map(n => ({...n}));
        }
        if (!obj.subitem_funder_identifiers.subitem_funder_identifier) {
          const doi = kakenResult.funderDoi || JSPS_FUNDER_DOI;
          obj.subitem_funder_identifiers = {
            subitem_funder_identifier:      `https://doi.org/${doi}`,
            subitem_funder_identifier_type: 'Crossref Funder',
          };
        }
      }

      // 補助金番号の検出と修正
      let correctedAwardNum = awardNum;
      if (kakenResult?.normalizedValue) {
        const inputNorm = /^JP/i.test(awardNum) ? awardNum.toUpperCase() : 'JP' + awardNum.toUpperCase();
        if (inputNorm !== kakenResult.normalizedValue.toUpperCase()) {
          correctedAwardNum = kakenResult.normalizedValue;
          obj._supplementaryWarning = `研究課題番号に「補助金の研究課題番号」が入力されたため「研究課題番号」に変更しました（${awardNum} → ${kakenResult.normalizedValue}）`;
        }
      }

      obj.subitem_award_numbers = {
        subitem_award_number:      correctedAwardNum,
        subitem_award_number_type: '',
        subitem_award_uri:         kakenResult?.kakenUrl || '',
      };

      obj.subitem_award_titles = kakenResult?.titles || [];
      return obj;
    };

    if (awards.length === 0) return [await buildEntry('')];
    return Promise.all(awards.map(aw => buildEntry(aw)));
  }));

  return entries.flat();
}

// ===== 4.4b JaLC 助成情報マッピング =====
async function buildJaLCFunders(jalcFundList) {
  const entries = await Promise.all((jalcFundList || []).map(async (f) => {
    // 助成機関名（多言語）
    const funderNames = (f.funder_name || []).map(fn => ({
      subitem_funder_name: fn.funder_name || '',
      subitem_funder_name_language: fn.lang || '',
    })).filter(fn => fn.subitem_funder_name);

    // 助成機関識別子（FundRef DOI 抽出）
    let funderDoi = '';
    (f.funder_identifier_list || []).forEach(fi => {
      if ((fi.type || '').toLowerCase() === 'fundref' && fi.funder_identifier) {
        // "http://dx.doi.org/10.13039/..." → "10.13039/..."
        const m = fi.funder_identifier.match(/\b(10\.\d{4,}\/\S+)/);
        if (m) funderDoi = m[1];
      }
    });
    const isJsps = funderDoi === JSPS_FUNDER_DOI;

    const funderIdentifiers = funderDoi
      ? { subitem_funder_identifier: `https://doi.org/${funderDoi}`, subitem_funder_identifier_type: 'Crossref Funder' }
      : { subitem_funder_identifier: '', subitem_funder_identifier_type: '' };

    // 課題番号を収集（カンマ区切りを分割）
    const awardNumbers = [];
    (f.award_number_group_list || []).forEach(ag => {
      (ag.award_number_list || []).forEach(an => {
        const raw = an.award_number || '';
        if (!raw) return;
        // カンマ区切りの場合は分割
        raw.split(/[,、]\s*/).forEach(num => {
          const trimmed = num.trim();
          if (trimmed) awardNumbers.push(trimmed);
        });
      });
    });

    const buildEntry = async (awardNum) => {
      const obj = { subitem_funder_names: funderNames, subitem_funder_identifiers: funderIdentifiers };

      const hasCiNiiKey = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY';
      let kakenResult = null;

      // KAKEN XML API（Chrome拡張経由でCORS回避）
      if (hasCiNiiKey && isJsps && awardNum) {
        try { kakenResult = await fetchKakenXml(awardNum); } catch (e) {
          console.warn(`KAKEN XML取得失敗 (${awardNum}):`, e.message);
        }
      }

      // JGN連携: award が JP で始まる場合
      if (!kakenResult && awardNum && /^JP/i.test(awardNum)) {
        try { kakenResult = await fetchJgn(awardNum); } catch (e) {
          console.warn(`JGN取得失敗 (${awardNum}):`, e.message);
        }
      }

      // CiNii Research OpenSearch フォールバック（KAKEN XML・JGN いずれも失敗時）
      if (!kakenResult && isJsps && awardNum) {
        try { kakenResult = await fetchKakenCiNii(awardNum); } catch (e) {
          console.warn(`KAKEN CiNii取得失敗 (${awardNum}):`, e.message);
        }
      }

      // KAKEN/JGN 結果から助成機関名・識別子を補完（既存値がある場合は上書きしない）
      if (kakenResult) {
        if (!obj.subitem_funder_names.length) {
          obj.subitem_funder_names = kakenResult.funderNames?.length
            ? kakenResult.funderNames
            : JSPS_FUNDER_NAMES.map(n => ({...n}));
        }
        if (!obj.subitem_funder_identifiers.subitem_funder_identifier) {
          const doi = kakenResult.funderDoi || JSPS_FUNDER_DOI;
          obj.subitem_funder_identifiers = {
            subitem_funder_identifier:      `https://doi.org/${doi}`,
            subitem_funder_identifier_type: 'Crossref Funder',
          };
        }
      }

      // 補助金番号の検出と修正
      let correctedAwardNum = awardNum;
      if (kakenResult?.normalizedValue) {
        const inputNorm = /^JP/i.test(awardNum) ? awardNum.toUpperCase() : 'JP' + awardNum.toUpperCase();
        if (inputNorm !== kakenResult.normalizedValue.toUpperCase()) {
          correctedAwardNum = kakenResult.normalizedValue;
          obj._supplementaryWarning = `研究課題番号に「補助金の研究課題番号」が入力されたため「研究課題番号」に変更しました（${awardNum} → ${kakenResult.normalizedValue}）`;
        }
      }

      obj.subitem_award_numbers = {
        subitem_award_number:      correctedAwardNum,
        subitem_award_number_type: '',
        subitem_award_uri:         kakenResult?.kakenUrl || '',
      };
      obj.subitem_award_titles = kakenResult?.titles || [];
      return obj;
    };

    if (awardNumbers.length === 0) return [await buildEntry('')];
    return Promise.all(awardNumbers.map(aw => buildEntry(aw)));
  }));

  return entries.flat();
}

// ===== 4.1 メインマッピング関数 =====
async function mapToItemType(crJson, oaJson, rorMap) {
  const doi           = crJson.DOI || '';
  const pubDate       = getPubDate(crJson);
  const acceptedDate  = formatDateParts(crJson.accepted?.['date-parts']?.[0] || []);
  const submittedDate = formatDateParts(crJson.submitted?.['date-parts']?.[0] || []);
  const isOa       = oaJson.open_access?.is_oa   || false;
  const oaStatus   = oaJson.open_access?.oa_status || '';
  const isGoldOa   = isOa && (oaStatus === 'gold' || oaStatus === 'hybrid');

  // ===== タイトル =====
  const title = (crJson.title || [])[0] || '';

  // ===== 作成者 =====
  const creators = buildAuthors(crJson.author || [], oaJson.authorships || [], rorMap);

  // ===== 権利情報 =====
  const rights = [];
  // 1) vor ライセンス URL
  const vorLicense = (crJson.license || []).find(l => l['content-version'] === 'vor');
  if (vorLicense) {
    rights.push({
      subitem_rights:          '',
      subitem_rights_language: 'en',
      subitem_rights_resource: vorLicense.URL,
    });
  }
  // 2) Copyright assertion
  (crJson.assertion || []).filter(a => a.label === 'Copyright').forEach(a => {
    rights.push({
      subitem_rights:          a.value,
      subitem_rights_language: 'en',
      subitem_rights_resource: '',
    });
  });

  // ===== 主題（API取り込み対象外: 空の編集可能フィールドを準備するのみ）=====
  const subjects = [{
    subitem_subject:          '',
    subitem_subject_language: '',
    subitem_subject_scheme:   '',
    subitem_subject_uri:      '',
  }];

  // ===== 資源タイプ =====
  const crTypeRaw     = crJson.type || '';
  const crTypeLabel   = crTypeRaw.replace(/-/g, ' ');
  const resourcetype  = TITLE_MAPS.resourcetype.includes(crTypeLabel)
    ? crTypeLabel
    : (CROSSREF_TYPE_MAP[crTypeRaw] || '');
  const resourceuri   = resourcetype ? (RESOURCE_TYPE_MAP[resourcetype] || '') : '';

  // ===== 出版タイプ =====
  const versionType     = isGoldOa ? 'VoR' : 'AM';
  const versionResource = isGoldOa
    ? 'http://purl.org/coar/version/c_970fb48d4fbd8a85'
    : 'http://purl.org/coar/version/c_ab4af688f83e57aa';

  // ===== ISSN =====
  const sourceIdentifiers = [];
  (crJson['issn-type'] || []).forEach(i => {
    const itype = i.type === 'electronic' ? 'EISSN' : i.type === 'print' ? 'PISSN' : 'ISSN';
    sourceIdentifiers.push({ subitem_source_identifier: i.value, subitem_source_identifier_type: itype });
  });
  if (!sourceIdentifiers.length) {
    (crJson.ISSN || []).forEach(i => sourceIdentifiers.push({ subitem_source_identifier: i, subitem_source_identifier_type: 'ISSN' }));
  }

  // ===== NCID (CiNii Research) =====
  const allIssns = sourceIdentifiers.map(si => si.subitem_source_identifier);
  if (allIssns.length) {
    const ncid = await fetchNcid(allIssns);
    if (ncid) {
      sourceIdentifiers.push({ subitem_source_identifier: ncid, subitem_source_identifier_type: 'NCID', _ncidUrl: `https://ci.nii.ac.jp/ncid/${ncid}` });
    }
  }

  // ===== 収録物名 =====
  const containerTitle = (crJson['container-title'] || [])[0] || '';

  // ===== 書誌情報 =====
  const pageStr = crJson.page || '';
  const pageParts = pageStr.split('-');
  const pageStart = pageParts[0] || '';
  const pageEnd   = pageParts[1] || '';

  // ===== メタデータオブジェクト =====
  const metadata = {
    // ----- システムフィールド -----
    system: {
      id:             '',
      uri:            '',
      path:           '',
      pos_index:      '',
      publish_status: 'private',
      feedback_mail:  '',
      cnri:           '',
      doi_ra:         '',
      doi:            '',
      edit_mode:      'Keep',
      pubdate:        todayStr(),
    },

    // ----- タイトル -----
    item_30002_title0: title
      ? [{ subitem_title: title, subitem_title_language: 'en', _warnLang: true }]
      : [],

    // ----- その他のタイトル（空）-----
    item_30002_alternative_title1: [],

    // ----- 作成者 -----
    item_30002_creator2: creators,

    // ----- 寄与者（空）-----
    item_30002_contributor3: [],

    // ----- アクセス権 -----
    item_30002_access_rights4: {
      subitem_access_right:     'open access',
      subitem_access_right_uri: 'http://purl.org/coar/access_right/c_abf2',
    },

    // ----- 権利情報 -----
    item_30002_rights6: rights,

    // ----- 権利者情報（空）-----
    item_30002_rights_holder7: [],

    // ----- 主題 -----
    item_30002_subject8: subjects,

    // ----- 内容記述 -----
    item_30002_description9: crJson.abstract
      ? [{ subitem_description: processAbstract(crJson.abstract), subitem_description_language: 'en', subitem_description_type: 'Abstract' }]
      : [],

    // ----- 出版者 -----
    item_30002_publisher10: crJson.publisher
      ? [{ subitem_publisher: crJson.publisher, subitem_publisher_language: 'en' }]
      : [],

    // ----- 日付 -----
    item_30002_date11: [
      pubDate       && { subitem_date_issued_datetime: pubDate,       subitem_date_issued_type: 'Issued' },
      acceptedDate  && { subitem_date_issued_datetime: acceptedDate,  subitem_date_issued_type: 'Accepted' },
      submittedDate && { subitem_date_issued_datetime: submittedDate, subitem_date_issued_type: 'Submitted' },
    ].filter(Boolean),

    // ----- 言語 -----
    item_30002_language12: [{ subitem_language: 'eng' }],

    // ----- 資源タイプ -----
    item_30002_resource_type13: { resourcetype, resourceuri },

    // ----- バージョン情報（空）-----
    item_30002_version14: { subitem_version: '' },

    // ----- 出版タイプ -----
    item_30002_version_type15: {
      subitem_version_resource: versionResource,
      subitem_version_type:     versionType,
    },

    // ----- 識別子（空）-----
    item_30002_identifier16: [],

    // ----- ID登録（空）-----
    item_30002_identifier_registration17: { subitem_identifier_reg_text: '', subitem_identifier_reg_type: '' },

    // ----- 関連情報 -----
    item_30002_relation18: await (async () => {
      // relatedIdentifier.md に定義された識別子タイプ
      const VALID_RELATION_ID_TYPES = new Set([
        'ARK','ARXIV','DOI','HDL','ICHUSHI','ISBN','J-GLOBAL','LOCAL',
        'PISSN','EISSN','ISSN','NAID','NCID','PMID','PURL','SCOPUS','URI','WOS',
      ]);
      const relations = [];
      // 1) Crossref DOI エントリ
      if (doi) {
        relations.push({
          subitem_relation_type: 'isIdenticalTo',
          subitem_relation_type_id: {
            subitem_relation_type_id_text: `https://doi.org/${doi}`,
            subitem_relation_type_select: 'DOI',
          },
          subitem_relation_name: [],
        });
      }
      // 2) OpenAlex ids から追加エントリ（DOI・OpenAlex キーは除外）
      const oaIds = oaJson.ids || {};
      Object.entries(oaIds).forEach(([key, value]) => {
        const upperKey = key.toUpperCase();
        if (upperKey === 'DOI' || upperKey === 'OPENALEX') return;
        if (!VALID_RELATION_ID_TYPES.has(upperKey)) return;
        relations.push({
          subitem_relation_type: 'isIdenticalTo',
          subitem_relation_type_id: {
            subitem_relation_type_id_text: upperKey === 'PMID'
              ? value.replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, '') : value,
            subitem_relation_type_select: upperKey,
          },
          subitem_relation_name: [],
        });
      });
      // 3) Crossref ISBN エントリ（book 系）
      const isbnEntries = crJson['isbn-type'] || [];
      if (isbnEntries.length) {
        isbnEntries.forEach(i => {
          relations.push({
            subitem_relation_type: 'isIdenticalTo',
            subitem_relation_type_id: {
              subitem_relation_type_id_text: i.value,
              subitem_relation_type_select: 'ISBN',
            },
            subitem_relation_name: [],
          });
        });
      } else {
        (crJson.ISBN || []).forEach(isbn => {
          relations.push({
            subitem_relation_type: 'isIdenticalTo',
            subitem_relation_type_id: {
              subitem_relation_type_id_text: isbn,
              subitem_relation_type_select: 'ISBN',
            },
            subitem_relation_name: [],
          });
        });
      }
      // 4) Crossref relation エントリ（全資源タイプ）
      Object.entries(crJson.relation || {}).forEach(([crRelType, items]) => {
        const jpcoarRelType = CROSSREF_RELATION_TYPE_MAP[crRelType];
        if (!jpcoarRelType) return;
        (items || []).forEach(item => {
          const jpcoarIdType = CROSSREF_RELATION_ID_TYPE_MAP[(item['id-type'] || '').toLowerCase()];
          if (!jpcoarIdType) return;
          const id = item.id || '';
          if (!id) return;
          const idText = jpcoarIdType === 'DOI' && !/^https?:\/\//i.test(id)
            ? `https://doi.org/${id}`
            : jpcoarIdType === 'PMID'
              ? id.replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, '')
              : id;
          relations.push({
            subitem_relation_type: jpcoarRelType,
            subitem_relation_type_id: {
              subitem_relation_type_id_text: idText,
              subitem_relation_type_select: jpcoarIdType,
            },
            subitem_relation_name: [],
          });
        });
      });
      // 5) DOI タイプの関連エントリにタイトルを設定（isIdenticalTo は自身の識別子なので除外）
      const doiRelEntries = [];
      relations.forEach((rel, i) => {
        if (rel.subitem_relation_type !== 'isIdenticalTo'
            && rel.subitem_relation_type_id.subitem_relation_type_select === 'DOI') {
          doiRelEntries.push({ index: i, doi: rel.subitem_relation_type_id.subitem_relation_type_id_text });
        }
      });
      const relTitles = await Promise.all(doiRelEntries.map(e => fetchRelationTitle(e.doi)));
      doiRelEntries.forEach((e, i) => {
        if (relTitles[i]) {
          relations[e.index].subitem_relation_name = [{
            subitem_relation_name_text: relTitles[i].title,
            subitem_relation_name_language: relTitles[i].lang,
          }];
        }
      });
      return relations;
    })(),

    // ----- 時間的範囲（空）-----
    item_30002_temporal19: [],

    // ----- 位置情報（空）-----
    item_30002_geolocation20: [],

    // ----- 助成情報 -----
    item_30002_funding_reference21: await buildFunders(crJson.funder),

    // ----- 収録物識別子 -----
    item_30002_source_identifier22: sourceIdentifiers,

    // ----- 収録物名 -----
    item_30002_source_title23: containerTitle
      ? [{ subitem_source_title: containerTitle, subitem_source_title_language: 'en' }]
      : [],

    // ----- 巻 -----
    item_30002_volume_number24: { subitem_volume: crJson.volume || '' },

    // ----- 号 -----
    item_30002_issue_number25: { subitem_issue: crJson.issue || '' },

    // ----- ページ数（空）-----
    item_30002_number_of_pages26: { subitem_number_of_pages: '' },

    // ----- 開始ページ -----
    item_30002_page_start27: { subitem_start_page: pageStart },

    // ----- 終了ページ -----
    item_30002_page_end28: { subitem_end_page: pageEnd },

    // ----- 書誌情報 -----
    item_30002_bibliographic_information29: containerTitle ? {
      bibliographicIssueDates: pubDate
        ? { bibliographicIssueDate: pubDate, bibliographicIssueDateType: 'Issued' }
        : {},
      bibliographicIssueNumber:    crJson.issue   || '',
      bibliographicVolumeNumber:   crJson.volume  || '',
      bibliographicPageStart:      pageStart,
      bibliographicPageEnd:        pageEnd,
      bibliographicNumberOfPages:  '',
      bibliographic_titles: [{
        bibliographic_title:     containerTitle,
        bibliographic_titleLang: 'en',
      }],
    } : null,

    // ----- 会議記述（空）-----
    item_30002_conference34: [],
  };

  return metadata;
}

// ===== 4.1b JaLC メインマッピング関数 =====
async function mapToItemTypeJaLC(jalcJson) {
  const doi = jalcJson.doi || '';

  // ===== 発行日 =====
  const pd = jalcJson.publication_date || {};
  const pubYear  = pd.publication_year  || '';
  const pubMonth = pd.publication_month || '';
  const pubDay   = pd.publication_day   || '';
  let pubDate = pubYear;
  if (pubMonth) pubDate += `-${String(pubMonth).padStart(2, '0')}`;
  if (pubMonth && pubDay) pubDate += `-${String(pubDay).padStart(2, '0')}`;

  // date_list から追加日付（Accepted / Submitted）
  const dateEntries = [
    pubDate && { subitem_date_issued_datetime: pubDate, subitem_date_issued_type: 'Issued' },
  ];
  (jalcJson.date_list || []).forEach(d => {
    const dt = d.date || '';
    const tp = (d.type || '').toLowerCase();
    if (!dt) return;
    if (tp === 'accepted')  dateEntries.push({ subitem_date_issued_datetime: dt, subitem_date_issued_type: 'Accepted' });
    if (tp === 'submitted') dateEntries.push({ subitem_date_issued_datetime: dt, subitem_date_issued_type: 'Submitted' });
  });

  // ===== タイトル（多言語）=====
  const titles = (jalcJson.title_list || []).map(t => ({
    subitem_title: t.title || '',
    subitem_title_language: t.lang || '',
  })).filter(t => t.subitem_title);

  // ===== 作成者 =====
  const creators = buildJaLCAuthors(jalcJson.creator_list);

  // ===== 権利情報 =====
  const rights = (jalcJson.rights_list || []).map(r => ({
    subitem_rights:          r.rights || '',
    subitem_rights_language: '',
    subitem_rights_resource: r.uri || '',
  }));

  // ===== 主題（キーワード）=====
  const subjects = (jalcJson.subject_list || []).map(s => ({
    subitem_subject:          s.subject || '',
    subitem_subject_language: s.lang || '',
    subitem_subject_scheme:   '',
    subitem_subject_uri:      '',
  }));
  if (!subjects.length) {
    subjects.push({ subitem_subject: '', subitem_subject_language: '', subitem_subject_scheme: '', subitem_subject_uri: '' });
  }

  // ===== 資源タイプ =====
  const contentType  = jalcJson.content_type || '';
  const resourcetype = JALC_CONTENT_TYPE_MAP[contentType] || '';
  const resourceuri  = resourcetype ? (RESOURCE_TYPE_MAP[resourcetype] || '') : '';

  // ===== ISSN =====
  const sourceIdentifiers = [];
  (jalcJson.journal_id_list || []).forEach(j => {
    if ((j.type || '').toUpperCase() !== 'ISSN') return;
    const issnType = (j.issn_type || '').toLowerCase();
    const itype = issnType === 'online' ? 'EISSN' : issnType === 'print' ? 'PISSN' : 'ISSN';
    sourceIdentifiers.push({ subitem_source_identifier: j.journal_id || '', subitem_source_identifier_type: itype });
  });

  // ===== NCID =====
  const allIssns = sourceIdentifiers.map(si => si.subitem_source_identifier);
  if (allIssns.length) {
    const ncid = await fetchNcid(allIssns);
    if (ncid) {
      sourceIdentifiers.push({ subitem_source_identifier: ncid, subitem_source_identifier_type: 'NCID', _ncidUrl: `https://ci.nii.ac.jp/ncid/${ncid}` });
    }
  }

  // ===== 収録物名（多言語）=====
  const sourceTitles = (jalcJson.journal_title_name_list || []).map(jt => ({
    subitem_source_title: jt.journal_title_name || '',
    subitem_source_title_language: jt.lang || '',
  })).filter(st => st.subitem_source_title);

  // ===== 内容記述（抄録等）=====
  const descriptions = (jalcJson.description_list || []).filter(d => {
    const tp = (d.type || '').toLowerCase();
    return tp === 'abstract' || tp === '';
  }).map(d => ({
    subitem_description:          d.description || '',
    subitem_description_language: d.lang || '',
    subitem_description_type:     'Abstract',
  }));

  // ===== 出版者（多言語）=====
  const publishers = (jalcJson.publisher_list || []).map(p => ({
    subitem_publisher: p.publisher_name || '',
    subitem_publisher_language: p.lang || '',
  })).filter(p => p.subitem_publisher);

  // ===== 書誌情報 =====
  const volume    = jalcJson.volume     || '';
  const issue     = jalcJson.issue      || '';
  const firstPage = jalcJson.first_page || '';
  const lastPage  = jalcJson.last_page  || '';

  // ===== 言語 (ISO 639-1 → ISO 639-2) =====
  const LANG_MAP = { 'ja': 'jpn', 'en': 'eng', 'zh': 'zho', 'ko': 'kor', 'fr': 'fra', 'de': 'deu', 'es': 'spa', 'pt': 'por', 'ru': 'rus', 'it': 'ita' };
  const contentLang = jalcJson.content_language || '';
  const lang639_2 = LANG_MAP[contentLang] || contentLang;

  // ===== 関連情報 =====
  const relations = [];
  if (doi) {
    relations.push({
      subitem_relation_type: 'isIdenticalTo',
      subitem_relation_type_id: { subitem_relation_type_id_text: `https://doi.org/${doi}`, subitem_relation_type_select: 'DOI' },
      subitem_relation_name: [],
    });
  }
  (jalcJson.relation_list || []).forEach(r => {
    const relType = r.relation || '';
    const idType  = r.type || '';
    const id      = r.content || '';
    if (!id) return;
    const jpcoarRelType = relType || 'isReferencedBy';
    const jpcoarIdType  = idType || 'URI';
    const idText = jpcoarIdType === 'DOI' && !/^https?:\/\//i.test(id)
      ? `https://doi.org/${id}` : id;
    relations.push({
      subitem_relation_type: jpcoarRelType,
      subitem_relation_type_id: { subitem_relation_type_id_text: idText, subitem_relation_type_select: jpcoarIdType },
      subitem_relation_name: [],
    });
  });
  // DOI タイプの関連エントリにタイトルを設定（JaLC API 使用、isIdenticalTo は自身の識別子なので除外）
  const doiRelEntries = [];
  relations.forEach((rel, i) => {
    if (rel.subitem_relation_type !== 'isIdenticalTo'
        && rel.subitem_relation_type_id.subitem_relation_type_select === 'DOI') {
      doiRelEntries.push({ index: i, doi: rel.subitem_relation_type_id.subitem_relation_type_id_text });
    }
  });
  const relTitles = await Promise.all(doiRelEntries.map(e => fetchRelationTitleJaLC(e.doi)));
  doiRelEntries.forEach((e, i) => {
    if (relTitles[i]) {
      relations[e.index].subitem_relation_name = [{
        subitem_relation_name_text: relTitles[i].title,
        subitem_relation_name_language: relTitles[i].lang,
      }];
    }
  });

  // ===== メタデータオブジェクト =====
  const metadata = {
    system: {
      id: '', uri: '', path: '', pos_index: '',
      publish_status: 'private', feedback_mail: '',
      cnri: '', doi_ra: '', doi: '',
      edit_mode: 'Keep', pubdate: todayStr(),
    },

    item_30002_title0: titles,
    item_30002_alternative_title1: [],
    item_30002_creator2: creators,
    item_30002_contributor3: [],

    item_30002_access_rights4: {
      subitem_access_right:     'open access',
      subitem_access_right_uri: 'http://purl.org/coar/access_right/c_abf2',
    },

    item_30002_rights6: rights,
    item_30002_rights_holder7: [],
    item_30002_subject8: subjects,
    item_30002_description9: descriptions,
    item_30002_publisher10: publishers,
    item_30002_date11: dateEntries.filter(Boolean),
    item_30002_language12: lang639_2 ? [{ subitem_language: lang639_2 }] : [],
    item_30002_resource_type13: { resourcetype, resourceuri },
    item_30002_version14: { subitem_version: '' },
    item_30002_version_type15: { subitem_version_resource: '', subitem_version_type: '' },
    item_30002_identifier16: [],
    item_30002_identifier_registration17: { subitem_identifier_reg_text: '', subitem_identifier_reg_type: '' },
    item_30002_relation18: relations,
    item_30002_temporal19: [],
    item_30002_geolocation20: [],
    item_30002_funding_reference21: await buildJaLCFunders(jalcJson.fund_list),
    item_30002_source_identifier22: sourceIdentifiers,
    item_30002_source_title23: sourceTitles,
    item_30002_volume_number24: { subitem_volume: volume },
    item_30002_issue_number25: { subitem_issue: issue },
    item_30002_number_of_pages26: { subitem_number_of_pages: '' },
    item_30002_page_start27: { subitem_start_page: firstPage },
    item_30002_page_end28: { subitem_end_page: lastPage },

    item_30002_bibliographic_information29: sourceTitles.length ? {
      bibliographicIssueDates: pubDate
        ? { bibliographicIssueDate: pubDate, bibliographicIssueDateType: 'Issued' }
        : {},
      bibliographicIssueNumber:   issue,
      bibliographicVolumeNumber:  volume,
      bibliographicPageStart:     firstPage,
      bibliographicPageEnd:       lastPage,
      bibliographicNumberOfPages: '',
      bibliographic_titles: sourceTitles.map(st => ({
        bibliographic_title:     st.subitem_source_title,
        bibliographic_titleLang: st.subitem_source_title_language,
      })),
    } : null,

    item_30002_conference34: [],
  };

  return metadata;
}

// ================================================================
// STEP 5: UI レンダリング層
// ================================================================

// ===== 5.1 フィールド定義 =====
// type: 'array','object','creator','contributor','relation','funding','biblio'
// fields 内: k=キー, l=ラベル, t=入力型, o=TITLE_MAPSキー, w=警告フラグキー, ro=読取専用
const FIELD_DEFS = [
  { key: 'item_30002_title0', label: 'タイトル', type: 'array',
    fields: [
      { k: 'subitem_title', l: 'タイトル', t: 'text' },
      { k: 'subitem_title_language', l: '言語', t: 'select', o: 'language', w: '_warnLang' },
    ],
    sum: a => a?.[0]?.subitem_title || '' },
  { key: 'item_30002_alternative_title1', label: 'その他のタイトル', type: 'array',
    fields: [
      { k: 'subitem_alternative_title', l: 'その他のタイトル', t: 'text' },
      { k: 'subitem_alternative_title_language', l: '言語', t: 'select', o: 'language' },
    ],
    sum: a => a?.[0]?.subitem_alternative_title || '' },
  { key: 'item_30002_creator2', label: '作成者', type: 'creator',
    sum: a => { if (!a?.length) return ''; const n = a[0]?.creatorNames?.[0]?.creatorName || ''; return a.length > 1 ? `${n} 他${a.length-1}名` : n; } },
  { key: 'item_30002_contributor3', label: '寄与者', type: 'contributor',
    sum: a => { if (!a?.length) return ''; const n = a[0]?.contributorNames?.[0]?.contributorName || ''; return a.length > 1 ? `${n} 他${a.length-1}名` : n; } },
  { key: 'item_30002_access_rights4', label: 'アクセス権', type: 'object',
    fields: [
      { k: 'subitem_access_right', l: 'アクセス権', t: 'select', o: 'subitem_access_right', link: { tgt: 'subitem_access_right_uri', map: ACCESS_RIGHTS_MAP } },
      { k: 'subitem_access_right_uri', l: 'アクセス権URI', t: 'text', ro: true },
    ],
    sum: o => o?.subitem_access_right || '' },
  { key: 'item_30002_rights6', label: '権利情報', type: 'array',
    fields: [
      { k: 'subitem_rights', l: '権利情報', t: 'text' },
      { k: 'subitem_rights_language', l: '言語', t: 'select', o: 'language' },
      { k: 'subitem_rights_resource', l: '権利情報リソースURL', t: 'text' },
    ],
    sum: a => a?.[0]?.subitem_rights || a?.[0]?.subitem_rights_resource || '' },
  { key: 'item_30002_rights_holder7', label: '権利者情報', type: 'rightsHolder',
    sum: a => { if (!a?.length) return ''; const n = a[0]?.rightHolderNames?.[0]?.rightHolderName || ''; return a.length > 1 ? `${n} 他${a.length-1}件` : n; } },
  { key: 'item_30002_subject8', label: '主題', type: 'array',
    fields: [
      { k: 'subitem_subject', l: '主題', t: 'text' },
      { k: 'subitem_subject_language', l: '言語', t: 'select', o: 'language' },
      { k: 'subitem_subject_scheme', l: '主題Scheme', t: 'text' },
      { k: 'subitem_subject_uri', l: '主題URI', t: 'text' },
    ],
    sum: a => { if (!a?.length) return ''; const f = a[0]?.subitem_subject || ''; return a.length > 1 ? `${f} 他${a.length-1}件` : f; } },
  { key: 'item_30002_description9', label: '内容記述', type: 'array',
    fields: [
      { k: 'subitem_description', l: '内容記述', t: 'textarea' },
      { k: 'subitem_description_language', l: '言語', t: 'select', o: 'language' },
      { k: 'subitem_description_type', l: '内容記述タイプ', t: 'select', o: 'subitem_description_type' },
    ],
    sum: a => { const d = a?.[0]?.subitem_description || ''; return d.length > 50 ? d.substring(0,50)+'…' : d; } },
  { key: 'item_30002_publisher10', label: '出版者', type: 'array',
    fields: [
      { k: 'subitem_publisher', l: '出版者', t: 'text' },
      { k: 'subitem_publisher_language', l: '言語', t: 'select', o: 'language' },
    ],
    sum: a => a?.[0]?.subitem_publisher || '' },
  { key: 'item_30002_date11', label: '日付', type: 'array',
    fields: [
      { k: 'subitem_date_issued_datetime', l: '日付', t: 'text' },
      { k: 'subitem_date_issued_type', l: '日付タイプ', t: 'select', o: 'subitem_date_issued_type' },
    ],
    sum: a => a?.[0] ? `${a[0].subitem_date_issued_datetime||''} (${a[0].subitem_date_issued_type||''})` : '' },
  { key: 'item_30002_language12', label: '言語', type: 'array',
    fields: [{ k: 'subitem_language', l: '言語', t: 'select', o: 'subitem_language' }],
    sum: a => a?.[0]?.subitem_language || '' },
  { key: 'item_30002_resource_type13', label: '資源タイプ', type: 'object',
    fields: [
      { k: 'resourcetype', l: '資源タイプ', t: 'select', o: 'resourcetype', link: { tgt: 'resourceuri', map: RESOURCE_TYPE_MAP } },
      { k: 'resourceuri', l: '資源タイプ識別子', t: 'text', ro: true },
    ],
    sum: o => o?.resourcetype || '' },
  { key: 'item_30002_version14', label: 'バージョン情報', type: 'object',
    fields: [{ k: 'subitem_version', l: 'バージョン情報', t: 'text' }],
    sum: o => o?.subitem_version || '' },
  { key: 'item_30002_version_type15', label: '出版タイプ', type: 'object',
    fields: [
      { k: 'subitem_version_type', l: '出版タイプ', t: 'select', o: 'subitem_version_type', link: { tgt: 'subitem_version_resource', map: VERSION_TYPE_MAP } },
      { k: 'subitem_version_resource', l: '出版タイプリソース', t: 'text', ro: true },
    ],
    sum: o => o?.subitem_version_type || '' },
  { key: 'item_30002_identifier16', label: '識別子', type: 'array',
    fields: [
      { k: 'subitem_identifier_uri', l: '識別子', t: 'text' },
      { k: 'subitem_identifier_type', l: '識別子タイプ', t: 'select', o: 'subitem_identifier_type' },
    ],
    sum: a => a?.[0]?.subitem_identifier_uri || '' },
  { key: 'item_30002_identifier_registration17', label: 'ID登録', type: 'object',
    fields: [
      { k: 'subitem_identifier_reg_text', l: 'ID登録テキスト', t: 'text' },
      { k: 'subitem_identifier_reg_type', l: 'ID登録タイプ', t: 'text' },
    ],
    sum: o => o?.subitem_identifier_reg_text || '' },
  { key: 'item_30002_relation18', label: '関連情報', type: 'relation',
    sum: a => a?.[0]?.subitem_relation_type_id?.subitem_relation_type_id_text || '' },
  { key: 'item_30002_temporal19', label: '時間的範囲', type: 'array',
    fields: [
      { k: 'subitem_temporal_text', l: '時間的範囲', t: 'text' },
      { k: 'subitem_temporal_language', l: '言語', t: 'select', o: 'language' },
    ],
    sum: a => a?.[0]?.subitem_temporal_text || '' },
  { key: 'item_30002_geolocation20', label: '位置情報', type: 'geolocation',
    sum: a => { if (!a?.length) return ''; const p = a[0]?.subitem_geolocation_place?.[0]?.subitem_geolocation_place_text || ''; return a.length > 1 ? `${p} 他${a.length-1}件` : p; } },
  { key: 'item_30002_funding_reference21', label: '助成情報', type: 'funding',
    sum: a => { if (!a?.length) return ''; const n = a[0]?.subitem_funder_names?.[0]?.subitem_funder_name || ''; return a.length > 1 ? `${n} 他${a.length-1}件` : n; } },
  { key: 'item_30002_source_identifier22', label: '収録物識別子', type: 'array',
    fields: [
      { k: 'subitem_source_identifier', l: '収録物識別子', t: 'text' },
      { k: 'subitem_source_identifier_type', l: '収録物識別子タイプ', t: 'select', o: 'subitem_source_identifier_type' },
    ],
    sum: a => a?.map(i => `${i.subitem_source_identifier_type||''}:${i.subitem_source_identifier||''}`).join(', ') || '' },
  { key: 'item_30002_source_title23', label: '収録物名', type: 'array',
    fields: [
      { k: 'subitem_source_title', l: '収録物名', t: 'text' },
      { k: 'subitem_source_title_language', l: '言語', t: 'select', o: 'language' },
    ],
    sum: a => a?.[0]?.subitem_source_title || '' },
  { key: 'item_30002_volume_number24', label: '巻', type: 'object',
    fields: [{ k: 'subitem_volume', l: '巻', t: 'text' }],
    sum: o => o?.subitem_volume || '' },
  { key: 'item_30002_issue_number25', label: '号', type: 'object',
    fields: [{ k: 'subitem_issue', l: '号', t: 'text' }],
    sum: o => o?.subitem_issue || '' },
  { key: 'item_30002_number_of_pages26', label: 'ページ数', type: 'object',
    fields: [{ k: 'subitem_number_of_pages', l: 'ページ数', t: 'text' }],
    sum: o => o?.subitem_number_of_pages || '' },
  { key: 'item_30002_page_start27', label: '開始ページ', type: 'object',
    fields: [{ k: 'subitem_start_page', l: '開始ページ', t: 'text' }],
    sum: o => o?.subitem_start_page || '' },
  { key: 'item_30002_page_end28', label: '終了ページ', type: 'object',
    fields: [{ k: 'subitem_end_page', l: '終了ページ', t: 'text' }],
    sum: o => o?.subitem_end_page || '' },
  { key: 'item_30002_bibliographic_information29', label: '書誌情報', type: 'biblio',
    sum: o => o?.bibliographic_titles?.[0]?.bibliographic_title || '' },
  { key: 'item_30002_conference34', label: '会議記述', type: 'conference',
    sum: a => { if (!a?.length) return ''; const n = a[0]?.subitem_conference_names?.[0]?.subitem_conference_name || ''; return a.length > 1 ? `${n} 他${a.length-1}件` : n; } },
];

// ===== STEP 6: 動的削除ヘルパー =====

function removeNestedItemEl(el) {
  const parent = el.parentElement;
  el.remove();
  renumberItems(parent);
}

function renumberItems(container) {
  container.querySelectorAll(':scope > .nested-item').forEach((item, idx) => {
    const lbl = item.querySelector(':scope > .item-header .item-label');
    if (lbl) lbl.textContent = lbl.textContent.replace(/\[\d+\]/, `[${idx}]`);
  });
}

// ===== 5.2 DOM生成ヘルパー =====

// トップレベルセクション（アコーディオン）
// ===== DOI必須項目バッジ =====

// 資源タイプ → 別表カテゴリ（'article' | 'book' | null）
function getDoiCategory(resourceType) {
  const bookTypes = ['book','book part','technical report','research report','report',
                     'thesis','bachelor thesis','master thesis','doctoral thesis'];
  const articleTypes = ['conference paper','departmental bulletin paper','journal article',
                        'review article','data paper','editorial','article','newspaper',
                        'software paper','other'];
  if (articleTypes.includes(resourceType)) return 'article';
  if (bookTypes.includes(resourceType)) return 'book';
  return null;
}

// 現在の資源タイプセクションから判定
function getCurrentDoiCategory() {
  const section = document.querySelector('.field-section[data-key="item_30002_resource_type13"]');
  const sel = section && section.querySelector('select');
  return sel ? getDoiCategory(sel.value) : null;
}

// fieldKey + category からバッジHTML文字列を生成
function createDoiBadges(fieldKey, category) {
  const req = DOI_REQUIREMENTS[fieldKey];
  if (!req) return '';
  const catReq = req[category];
  if (!catReq) return '';
  let html = '';
  if (catReq.jalc) {
    const cls   = catReq.jalc === 'required' ? 'jalc-required' : 'jalc-conditional';
    const label = catReq.jalc === 'required' ? 'JaLC必須' : 'JaLC条件付';
    const tip   = (catReq.jalc_note || (catReq.jalc === 'required' ? 'JaLC DOI登録に必須' : 'JaLC DOI: 条件付必須')).replace(/"/g, '&quot;');
    html += `<span class="doi-badge ${cls}" title="${tip}">${label}</span>`;
  }
  if (catReq.crossref) {
    const cls   = catReq.crossref === 'required' ? 'crossref-required' : 'crossref-conditional';
    const label = catReq.crossref === 'required' ? 'Crossref必須' : 'Crossref条件付';
    const tip   = (catReq.crossref_note || (catReq.crossref === 'required' ? 'Crossref DOI登録に必須' : 'Crossref DOI: 条件付必須')).replace(/"/g, '&quot;');
    html += `<span class="doi-badge ${cls}" title="${tip}">${label}</span>`;
  }
  return html;
}

// 全セクションヘッダーのバッジを現在の資源タイプに合わせて更新
function updateDoiBadges() {
  const category = getCurrentDoiCategory();
  document.querySelectorAll('.field-section').forEach(function(section) {
    const key    = section.dataset.key;
    const header = section.querySelector('.section-header');
    if (!header) return;
    header.querySelectorAll('.doi-badge').forEach(function(b) { b.remove(); });
    if (category) {
      const summary = header.querySelector('.summary');
      const tmp = document.createElement('span');
      tmp.innerHTML = createDoiBadges(key, category);
      while (tmp.firstChild) header.insertBefore(tmp.firstChild, summary);
    }
  });
}

function createSection(key, label, summaryText) {
  const section = document.createElement('div');
  section.className = 'field-section';
  section.dataset.key = key;
  const header = document.createElement('div');
  header.className = 'section-header';
  const jpcoarUrl = JPCOAR_LINKS[key];
  const labelHtml = jpcoarUrl
    ? `<a href="${jpcoarUrl}" target="_blank">${label}</a>`
    : label;
  header.innerHTML = `<span class="toggle-icon">▼</span>${labelHtml}<span class="summary">${summaryText ? '（'+summaryText+'）' : ''}</span>`;
  header.onclick = function() { toggleAccordion(this); };
  const content = document.createElement('div');
  content.className = 'accordion-content';
  section.appendChild(header);
  section.appendChild(content);
  return { section, content, header };
}

// フィールド行
function createFieldRow(label, value, inputType, selectOptsKey, extra) {
  extra = extra || {};
  const row = document.createElement('div');
  row.className = 'field-row';
  if (extra.fieldKey) row.dataset.fieldKey = extra.fieldKey;
  const lbl = document.createElement('span');
  lbl.className = 'field-label';
  lbl.textContent = label;
  row.appendChild(lbl);

  // 参照値（ヒント）セル: API取得時のみ、非空・非readonly・非selectフィールドに表示
  const hintVal = extra.hintOverride || value;
  if (showHints && hintVal && !extra.readonly && inputType !== 'select') {
    const hint = document.createElement('span');
    hint.className = 'hint-cell';
    hint.title = String(hintVal);
    hint.innerHTML = renderHint(hintVal);
    row.appendChild(hint);
  }

  if (inputType === 'textarea') {
    const ta = document.createElement('textarea');
    ta.value = value || '';
    row.appendChild(ta);
  } else if (inputType === 'select' && selectOptsKey) {
    const opts = TITLE_MAPS[selectOptsKey] || [];
    const sel = buildSelect(opts, value || '', extra.onChange || null);
    row.appendChild(sel);
  } else {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value || '';
    if (extra.readonly) inp.readOnly = true;
    row.appendChild(inp);
  }

  if (extra.warn) {
    const badge = document.createElement('span');
    badge.className = 'warn-badge';
    badge.title = extra.warnTitle || '要確認';
    badge.textContent = '⚠ 要確認';
    row.appendChild(badge);
  }
  return row;
}

// ネスト項目（Level 1+ アコーディオン）
function createNestedItem(label, level) {
  const item = document.createElement('div');
  item.className = `nested-item level-${level}`;
  const icons = ['', '📦', '📍', '📎', '·'];
  const icon = icons[Math.min(level, 4)] || '';
  const header = document.createElement('div');
  header.className = 'item-header';
  header.innerHTML = `<span class="toggle-icon">▼</span>${icon ? '<span class="level-icon">'+icon+'</span>' : ''}<span class="item-label">${label}</span><span class="item-summary"></span>`;
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete';
  delBtn.textContent = '− 削除';
  delBtn.onclick = function(e) { e.stopPropagation(); if (confirm('削除しますか？')) removeNestedItemEl(item); };
  header.appendChild(delBtn);
  header.onclick = function() { toggleAccordion(this); };
  const content = document.createElement('div');
  content.className = 'item-content';
  item.appendChild(header);
  item.appendChild(content);
  return { item, content, header };
}

// ネストセクションヘッダー（Level 2+ サブセクション）
// onAdd: 関数を渡すと追加ボタンのクリック時に onAdd(content) を呼び出す
//        false を渡すと追加ボタンを非表示
//        省略/null の場合はボタンを表示するが noop
function createNestedSectionHeader(label, level, onAdd) {
  const wrapper = document.createElement('div');
  wrapper.className = `nested-item level-${level}`;
  const icons = ['', '📦', '📍', '📎', '·'];
  const icon = icons[Math.min(level, 4)] || '';
  const header = document.createElement('div');
  header.className = 'nested-section-header';
  header.innerHTML = `<span class="toggle-icon">▼</span>${icon ? '<span class="level-icon">'+icon+'</span>' : ''}<span>${label}</span>`;
  const content = document.createElement('div');
  content.className = 'nested-section-content';
  if (onAdd !== false) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.textContent = '+ 追加';
    addBtn.onclick = onAdd
      ? function(e) { e.stopPropagation(); onAdd(content); }
      : function(e) { e.stopPropagation(); };
    header.appendChild(addBtn);
  }
  header.onclick = function() { toggleAccordion(this); };
  wrapper.appendChild(header);
  wrapper.appendChild(content);
  return { wrapper, content };
}

// 追加ボタン（onAdd を渡すとクリック時に実行）
function createAddButton(label, onAdd) {
  const btn = document.createElement('button');
  btn.className = 'btn-add';
  btn.style.cssText = 'margin: 8px 16px; display: block;';
  btn.textContent = `+ ${label}を追加`;
  btn.onclick = onAdd
    ? function(e) { e.stopPropagation(); onAdd(); }
    : function(e) { e.stopPropagation(); };
  return btn;
}

// エントリグループ（姓名・識別子等サブ配列1件を削除ボタン付きでラップ）
function createEntryGroup() {
  const grp = document.createElement('div');
  grp.className = 'entry-group';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn-delete btn-delete-inline';
  delBtn.textContent = '− 削除';
  delBtn.onclick = function(e) { e.stopPropagation(); if (confirm('削除しますか？')) grp.remove(); };
  return { grp, delBtn };
}

// FIELD_DEFS の fields 定義から1アイテムのフィールド行群を生成
function renderItemFields(itemData, fieldsDef, container) {
  for (const f of fieldsDef) {
    if (f.t === 'nested') continue; // nested は個別処理
    const val = itemData[f.k] || '';
    const isWarn = f.w && itemData[f.w];
    const warnTitle = f.w === '_warnLang' ? '仮に英語として設定しています。正確か確認してください'
                    : f.w === '_warnOrcid' ? 'OpenAlexから取得した値です。正確か確認してください'
                    : '要確認';
    let onChange = null;
    if (f.link) {
      onChange = (newVal) => {
        const parent = container.closest('.accordion-content, .item-content') || container;
        const targetRow = parent.querySelector(`[data-field-key="${f.link.tgt}"]`);
        if (targetRow) {
          const inp = targetRow.querySelector('input');
          if (inp) inp.value = f.link.map[newVal] || '';
        }
        if (f.k === 'resourcetype') updateDoiBadges();
      };
    }
    const row = createFieldRow(f.l, val, f.t, f.o, {
      fieldKey: f.k,
      readonly: f.ro,
      warn: isWarn,
      warnTitle,
      onChange,
      hintOverride: itemData._ncidUrl && f.k === 'subitem_source_identifier' ? itemData._ncidUrl : null,
    });
    container.appendChild(row);
  }
}

// ===== 5.3 汎用レンダラー =====

// 配列フィールド
function renderArrayField(def, items) {
  const arr = Array.isArray(items) ? items : [];
  const summaryText = def.sum(arr);
  const { section, content } = createSection(def.key, def.label, summaryText);

  if (!def.fields || !def.fields.length) {
    if (!arr.length) {
      const msg = document.createElement('div');
      msg.style.cssText = 'padding:8px 16px;color:#999;font-size:0.85em';
      msg.textContent = '（データなし）';
      content.appendChild(msg);
    }
    content.appendChild(createAddButton(def.label));
    return section;
  }

  arr.forEach((item, idx) => {
    const firstVal = item[def.fields[0].k] || '';
    const label = `${def.label}[${idx}]${firstVal ? ': '+firstVal.substring(0,40) : ''}`;
    const { item: nestedItem, content: itemContent } = createNestedItem(label, 1);
    renderItemFields(item, def.fields, itemContent);
    content.appendChild(nestedItem);
  });

  content.appendChild(createAddButton(def.label, () => {
    const newItem = {};
    def.fields.forEach(f => { if (f.t !== 'nested') newItem[f.k] = ''; });
    const idx = content.querySelectorAll(':scope > .nested-item').length;
    const firstVal = '';
    const label = `${def.label}[${idx}]`;
    const { item: nestedItem, content: itemContent } = createNestedItem(label, 1);
    renderItemFields(newItem, def.fields, itemContent);
    content.insertBefore(nestedItem, content.lastChild);
  }));
  return section;
}

// オブジェクトフィールド
function renderObjectField(def, obj) {
  const data = obj || {};
  const summaryText = def.sum(data);
  const { section, content } = createSection(def.key, def.label, summaryText);
  renderItemFields(data, def.fields, content);
  return section;
}

// ===== 5.4 専用レンダラー =====

// ----- 識別子逆引きUI（結果エリアのみ生成・ボタンイベントを設定）-----
/**
 * @param {object} opts
 *   btn           - 呼び出し元が生成した「名称を確認」ボタン要素（フィールド行にインライン配置済み）
 *   resultContainer - 結果エリアを appendChild する DOM 要素
 *   fetchNames    - async () => [{ name, lang, _altNames? }] を返す関数
 *   getVisible    - () => boolean: ボタン表示可否
 *   getTargetCont - () => DOM 要素（名称 entry-group が入るコンテナ）
 *   nameFld       - fieldKey 名（例: 'affiliationName'）
 *   langFld       - fieldKey 名（例: 'affiliationNameLang'）
 *   nameLabel     - 名称フィールドのラベル（例: '所属機関名'）
 *   langLabel     - 言語フィールドのラベル（例: '言語'）
 * @returns { updateVisibility: fn }
 */
function attachLookupUi({ btn, resultContainer, fetchNames, getVisible, getTargetCont,
                          nameFld, langFld, nameLabel, langLabel }) {
  const resultEl = document.createElement('div');
  resultEl.className = 'lookup-result';
  resultContainer.appendChild(resultEl);

  const updateVisibility = () => {
    btn.style.display = getVisible() ? '' : 'none';
    if (!getVisible()) resultEl.textContent = '';
  };
  updateVisibility();

  btn.onclick = async (e) => {
    e.preventDefault();
    btn.disabled = true;
    resultEl.className = 'lookup-result';
    resultEl.textContent = '取得中...';
    try {
      const names = await fetchNames();
      if (!names.length) {
        resultEl.textContent = '名称が取得できませんでした。';
        return;
      }

      const targetCont = getTargetCont();
      const currentNames = [...targetCont.querySelectorAll(`[data-field-key="${nameFld}"] input`)]
        .map(el => el.value.trim()).filter(Boolean);
      const fetchedNames = names.map(n => n.name);
      const allMatch = fetchedNames.length === currentNames.length
        && fetchedNames.every(fn => currentNames.includes(fn));

      resultEl.innerHTML = '';
      const altInfo = names[0]?._altNames ? `（別名: ${names[0]._altNames}）` : '';
      const namesStr = names.map(n => `${n.name}${n.lang ? ' (' + n.lang + ')' : ''}`).join(', ');

      if (allMatch) {
        resultEl.className = 'lookup-result ok';
        resultEl.textContent = `✓ 一致確認: ${namesStr}${altInfo}`;
      } else {
        resultEl.className = 'lookup-result warn';
        const warnSpan = document.createElement('span');
        warnSpan.textContent = `⚠ 取得: ${namesStr}${altInfo} `;
        resultEl.appendChild(warnSpan);

        const overwriteBtn = document.createElement('button');
        overwriteBtn.textContent = '上書き';
        overwriteBtn.className = 'btn-add';
        overwriteBtn.onclick = () => {
          [...targetCont.querySelectorAll(':scope > .entry-group')].forEach(g => g.remove());
          names.forEach(({ name: nm, lang }) => {
            const { grp, delBtn } = createEntryGroup();
            grp.appendChild(createFieldRow(nameLabel, nm, 'text', null, { fieldKey: nameFld }));
            grp.appendChild(createFieldRow(langLabel, lang || 'en', 'select', 'language', { fieldKey: langFld }));
            grp.appendChild(delBtn);
            targetCont.appendChild(grp);
          });
          resultEl.className = 'lookup-result ok';
          resultEl.textContent = `✓ 上書きしました: ${namesStr}`;
        };
        resultEl.appendChild(overwriteBtn);
      }
    } catch (err) {
      resultEl.className = 'lookup-result err';
      resultEl.textContent = `エラー: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  };

  return { updateVisibility };
}

// ----- 作成者/寄与者: 1人分のDOM生成 -----
function renderOnePerson(person, idx, keys) {
  const {
    def, isCreator, typeLabel, typeKey, typeSelectOpts,
    namesLabel, namesKey, nameKey, nameLangKey, nameTypeKey,
    affKey, affLabel, affNameKey, affNameField, affNameLangField,
    affIdKey, affIdField, affIdSchemeField, affIdUriField,
  } = keys;

  const dispName = person[namesKey]?.[0]?.[nameKey] || '';
  const itemLabel = `${def.label}[${idx}]${dispName ? ': '+dispName : ''}`;
  const { item: personItem, content: personContent } = createNestedItem(itemLabel, 1);

  // タイプ
  if (typeSelectOpts) {
    personContent.appendChild(createFieldRow(typeLabel, person[typeKey] || '', 'select', typeSelectOpts, { fieldKey: typeKey }));
  } else {
    personContent.appendChild(createFieldRow(typeLabel, person[typeKey] || '', 'text', null, { fieldKey: typeKey }));
  }

  // 姓名
  const { wrapper: namesWrap, content: namesCont } = createNestedSectionHeader(namesLabel, 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('姓名', '', 'text', null, { fieldKey: nameKey }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: nameLangKey }));
    grp.appendChild(createFieldRow('名前タイプ', '', 'select', 'creatorNameType', { fieldKey: nameTypeKey }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (person[namesKey] || []).forEach(n => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('姓名', n[nameKey] || '', 'text', null, { fieldKey: nameKey }));
    grp.appendChild(createFieldRow('言語', n[nameLangKey] || '', 'select', 'language', {
      fieldKey: nameLangKey, warn: n._warnLang, warnTitle: '仮に英語として設定しています。正確か確認してください'
    }));
    grp.appendChild(createFieldRow('名前タイプ', n[nameTypeKey] || '', 'select', 'creatorNameType', { fieldKey: nameTypeKey }));
    grp.appendChild(delBtn);
    namesCont.appendChild(grp);
  });
  personContent.appendChild(namesWrap);

  // 姓
  const familyLabel = isCreator ? '作成者姓' : '寄与者姓';
  const { wrapper: famWrap, content: famCont } = createNestedSectionHeader(familyLabel, 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('姓', '', 'text', null, { fieldKey: 'familyName' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'familyNameLang' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (person.familyNames || []).forEach(fn => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('姓', fn.familyName || '', 'text', null, { fieldKey: 'familyName' }));
    grp.appendChild(createFieldRow('言語', fn.familyNameLang || '', 'select', 'language', {
      fieldKey: 'familyNameLang', warn: fn._warnLang, warnTitle: '仮に英語として設定しています。正確か確認してください'
    }));
    grp.appendChild(delBtn);
    famCont.appendChild(grp);
  });
  personContent.appendChild(famWrap);

  // 名
  const givenLabel = isCreator ? '作成者名' : '寄与者名';
  const { wrapper: givWrap, content: givCont } = createNestedSectionHeader(givenLabel, 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('名', '', 'text', null, { fieldKey: 'givenName' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'givenNameLang' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (person.givenNames || []).forEach(gn => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('名', gn.givenName || '', 'text', null, { fieldKey: 'givenName' }));
    grp.appendChild(createFieldRow('言語', gn.givenNameLang || '', 'select', 'language', {
      fieldKey: 'givenNameLang', warn: gn._warnLang, warnTitle: '仮に英語として設定しています。正確か確認してください'
    }));
    grp.appendChild(delBtn);
    givCont.appendChild(grp);
  });
  personContent.appendChild(givWrap);

  // 識別子（ORCID等）
  const idLabel = isCreator ? '作成者識別子' : '寄与者識別子';
  const { wrapper: idWrap, content: idCont } = createNestedSectionHeader(idLabel, 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('識別子', '', 'text', null, { fieldKey: 'nameIdentifier' }));

    const addSearchBtn = document.createElement('button');
    addSearchBtn.textContent = 'CiNiiで検索';
    addSearchBtn.className = 'btn-add';
    addSearchBtn.style.marginLeft = '8px';
    addSearchBtn.style.display = 'none';
    addSearchBtn.onclick = (e) => {
      e.preventDefault();
      const family = person.familyNames?.[0]?.familyName || '';
      const given = person.givenNames?.[0]?.givenName || '';
      const searchName = (family && given) ? `${family} ${given}`
        : (person.creatorNames?.[0]?.creatorName || person.contributorNames?.[0]?.contributorName || '');
      if (searchName) {
        window.open(`https://cir.nii.ac.jp/researchers?q=${encodeURIComponent(searchName)}`, '_blank');
      } else {
        alert('著者名が入力されていません。');
      }
    };

    const onAddSchemeChange = (val) => {
      const uriInput = grp.querySelector('[data-field-key="nameIdentifierURI"] input');
      if (val === 'CiNii' && uriInput && !uriInput.value) {
        uriInput.value = 'https://ci.nii.ac.jp/nrid/';
      }
      addSearchBtn.style.display = val === 'CiNii' ? '' : 'none';
    };

    grp.appendChild(createFieldRow('Scheme', '', 'select', 'nameIdentifierScheme', {
      fieldKey: 'nameIdentifierScheme', onChange: onAddSchemeChange
    }));
    grp.appendChild(createFieldRow('URI', '', 'text', null, { fieldKey: 'nameIdentifierURI' }));
    grp.appendChild(addSearchBtn);
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (person.nameIdentifiers || []).forEach(ni => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('識別子', ni.nameIdentifier || '', 'text', null, { fieldKey: 'nameIdentifier' }));

    // CiNii検索ボタン（Scheme が CiNii のときのみ表示）
    const searchBtn = document.createElement('button');
    searchBtn.textContent = 'CiNiiで検索';
    searchBtn.className = 'btn-add';
    searchBtn.style.marginLeft = '8px';
    searchBtn.style.display = ni.nameIdentifierScheme === 'CiNii' ? '' : 'none';
    searchBtn.onclick = (e) => {
      e.preventDefault();
      const family = person.familyNames?.[0]?.familyName || '';
      const given = person.givenNames?.[0]?.givenName || '';
      const searchName = (family && given) ? `${family} ${given}`
        : (person.creatorNames?.[0]?.creatorName || person.contributorNames?.[0]?.contributorName || '');
      if (searchName) {
        window.open(`https://cir.nii.ac.jp/researchers?q=${encodeURIComponent(searchName)}`, '_blank');
      } else {
        alert('著者名が入力されていません。');
      }
    };

    // Scheme onChange: CiNii選択時にURI自動設定 + 検索ボタン表示切替
    const onSchemeChange = (val) => {
      const uriInput = grp.querySelector('[data-field-key="nameIdentifierURI"] input');
      if (val === 'CiNii' && uriInput && !uriInput.value) {
        uriInput.value = 'https://ci.nii.ac.jp/nrid/';
      }
      searchBtn.style.display = val === 'CiNii' ? '' : 'none';
    };

    grp.appendChild(createFieldRow('Scheme', ni.nameIdentifierScheme || '', 'select', 'nameIdentifierScheme', {
      fieldKey: 'nameIdentifierScheme', onChange: onSchemeChange
    }));
    grp.appendChild(createFieldRow('URI', ni.nameIdentifierURI || '', 'text', null, {
      fieldKey: 'nameIdentifierURI', warn: ni._warnOrcid, warnTitle: 'OpenAlexから取得した値です。正確か確認してください'
    }));
    grp.appendChild(searchBtn);
    grp.appendChild(delBtn);
    idCont.appendChild(grp);
  });
  personContent.appendChild(idWrap);

  // 所属
  const { wrapper: affWrap, content: affCont } = createNestedSectionHeader(affLabel, 2, (cont) => {
    const ai = cont.querySelectorAll(':scope > .nested-item').length;
    const emptyAff = {
      [affNameKey]: [{ [affNameField]: '', [affNameLangField]: '' }],
      [affIdKey]: [],
    };
    cont.appendChild(renderOneAffiliation(emptyAff, ai, keys));
  });
  (person[affKey] || []).forEach((aff, ai) => {
    affCont.appendChild(renderOneAffiliation(aff, ai, keys));
  });
  personContent.appendChild(affWrap);

  return personItem;
}

// ----- 所属機関: 1件分のDOM生成 -----
function renderOneAffiliation(aff, ai, keys) {
  const {
    affLabel, affNameKey, affNameField, affNameLangField,
    affIdKey, affIdField, affIdSchemeField, affIdUriField,
  } = keys;

  const affDispName = aff[affNameKey]?.[0]?.[affNameField] || '';
  const { item: affItem, content: affItemCont } = createNestedItem(`${affLabel}[${ai}]${affDispName ? ': '+affDispName : ''}`, 2);

  // 所属機関名
  const { wrapper: anWrap, content: anCont } = createNestedSectionHeader('所属機関名', 3, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('所属機関名', '', 'text', null, { fieldKey: affNameField }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: affNameLangField }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (aff[affNameKey] || []).forEach(an => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('所属機関名', an[affNameField] || '', 'text', null, { fieldKey: affNameField }));
    grp.appendChild(createFieldRow('言語', an[affNameLangField] || '', 'select', 'language', {
      fieldKey: affNameLangField, warn: an._warnLang, warnTitle: '仮に英語として設定しています。正確か確認してください'
    }));
    grp.appendChild(delBtn);
    anCont.appendChild(grp);
  });
  affItemCont.appendChild(anWrap);

  // 所属機関識別子
  const { wrapper: aiWrap, content: aiCont } = createNestedSectionHeader('所属機関識別子', 3, (cont) => {
    const aidx = cont.querySelectorAll(':scope > .nested-item').length;
    const { item: aidItem, content: aidContent } = createNestedItem(`所属機関識別子[${aidx}]`, 4);

    // (1) 識別子フィールド行を生成し、逆引きボタンをインライン追加
    const idRow = createFieldRow('識別子', '', 'text', null, { fieldKey: affIdField });
    const lookupBtn = document.createElement('button');
    lookupBtn.textContent = '名称を確認';
    lookupBtn.className = 'btn-add';
    lookupBtn.style.display = 'none';
    idRow.appendChild(lookupBtn);
    aidContent.appendChild(idRow);

    // (2) Scheme・URI フィールド行（Scheme 変更時に updateAffLookup 呼び出し）
    let updateAffLookup = () => {};
    aidContent.appendChild(createFieldRow('Scheme', '', 'select', 'affiliationNameIdentifierScheme', {
      fieldKey: affIdSchemeField,
      onChange: () => updateAffLookup(),
    }));
    aidContent.appendChild(createFieldRow('URI', '', 'text', null, { fieldKey: affIdUriField }));

    // (3) Scheme select が DOM にある状態で attachLookupUi を呼ぶ
    const { updateVisibility } = attachLookupUi({
      btn: lookupBtn,
      resultContainer: aidContent,
      fetchNames: () => {
        const uriInput = aidContent.querySelector(`[data-field-key="${affIdUriField}"] input`);
        return fetchRorNamesAll(uriInput?.value || '');
      },
      getVisible: () => {
        const schemeEl = aidContent.querySelector(`[data-field-key="${affIdSchemeField}"] select`);
        return schemeEl?.value === 'ROR';
      },
      getTargetCont: () => anCont,
      nameFld: affNameField, langFld: affNameLangField,
      nameLabel: '所属機関名', langLabel: '言語',
    });
    updateAffLookup = updateVisibility;

    cont.appendChild(aidItem);
  });
  (aff[affIdKey] || []).forEach((aid, aidx) => {
    const { item: aidItem, content: aidContent } = createNestedItem(`所属機関識別子[${aidx}]`, 4);

    // (1) 識別子フィールド行を生成し、逆引きボタンをインライン追加
    const idRow = createFieldRow('識別子', aid[affIdField] || '', 'text', null, { fieldKey: affIdField });
    const lookupBtn = document.createElement('button');
    lookupBtn.textContent = '名称を確認';
    lookupBtn.className = 'btn-add';
    lookupBtn.style.display = 'none';
    idRow.appendChild(lookupBtn);
    aidContent.appendChild(idRow);

    // (2) Scheme・URI フィールド行（Scheme 変更時に updateAffLookup 呼び出し）
    let updateAffLookup = () => {};
    aidContent.appendChild(createFieldRow('Scheme', aid[affIdSchemeField] || '', 'select',
      'affiliationNameIdentifierScheme', {
        fieldKey: affIdSchemeField,
        onChange: () => updateAffLookup(),
      }));
    aidContent.appendChild(createFieldRow('URI', aid[affIdUriField] || '', 'text', null, { fieldKey: affIdUriField }));

    // (3) Scheme select が DOM にある状態で attachLookupUi を呼ぶ
    const { updateVisibility } = attachLookupUi({
      btn: lookupBtn,
      resultContainer: aidContent,
      fetchNames: () => {
        const uriInput = aidContent.querySelector(`[data-field-key="${affIdUriField}"] input`);
        return fetchRorNamesAll(uriInput?.value || '');
      },
      getVisible: () => {
        const schemeEl = aidContent.querySelector(`[data-field-key="${affIdSchemeField}"] select`);
        return schemeEl?.value === 'ROR';
      },
      getTargetCont: () => anCont,
      nameFld: affNameField, langFld: affNameLangField,
      nameLabel: '所属機関名', langLabel: '言語',
    });
    updateAffLookup = updateVisibility;

    aiCont.appendChild(aidItem);
  });
  affItemCont.appendChild(aiWrap);

  return affItem;
}

// ----- 作成者/寄与者 共通 -----
function renderPersonField(def, persons, isCreator) {
  const arr = Array.isArray(persons) ? persons : [];
  const summaryText = def.sum(arr);
  const { section, content } = createSection(def.key, def.label, summaryText);

  const keys = {
    def, isCreator,
    typeLabel: isCreator ? '作成者タイプ' : '寄与者タイプ',
    typeKey: isCreator ? 'creatorType' : 'contributorType',
    typeSelectOpts: isCreator ? null : 'contributorType',
    namesLabel: isCreator ? '作成者姓名' : '寄与者姓名',
    namesKey: isCreator ? 'creatorNames' : 'contributorNames',
    nameKey: isCreator ? 'creatorName' : 'contributorName',
    nameLangKey: isCreator ? 'creatorNameLang' : 'lang',
    nameTypeKey: isCreator ? 'creatorNameType' : 'nameType',
    affKey: isCreator ? 'creatorAffiliations' : 'contributorAffiliations',
    affLabel: isCreator ? '作成者所属' : '寄与者所属',
    affNameKey: isCreator ? 'affiliationNames' : 'contributorAffiliationNames',
    affNameField: isCreator ? 'affiliationName' : 'contributorAffiliationName',
    affNameLangField: isCreator ? 'affiliationNameLang' : 'contributorAffiliationNameLang',
    affIdKey: isCreator ? 'affiliationNameIdentifiers' : 'contributorAffiliationNameIdentifiers',
    affIdField: isCreator ? 'affiliationNameIdentifier' : 'contributorAffiliationNameIdentifier',
    affIdSchemeField: isCreator ? 'affiliationNameIdentifierScheme' : 'contributorAffiliationScheme',
    affIdUriField: isCreator ? 'affiliationNameIdentifierURI' : 'contributorAffiliationURI',
  };

  arr.forEach((person, idx) => {
    content.appendChild(renderOnePerson(person, idx, keys));
  });

  content.appendChild(createAddButton(def.label, () => {
    const idx = content.querySelectorAll(':scope > .nested-item').length;
    const emptyPerson = {
      [keys.typeKey]: '',
      [keys.namesKey]: [{ [keys.nameKey]: '', [keys.nameLangKey]: '', [keys.nameTypeKey]: '' }],
      familyNames: [{ familyName: '', familyNameLang: '' }],
      givenNames: [{ givenName: '', givenNameLang: '' }],
      nameIdentifiers: [],
      [keys.affKey]: [],
    };
    content.insertBefore(renderOnePerson(emptyPerson, idx, keys), content.lastChild);
  }));

  return section;
}

// ----- 関連情報 -----
function renderRelationField(def, relations) {
  const arr = Array.isArray(relations) ? relations : [];
  const summaryText = def.sum(arr);
  const { section, content } = createSection(def.key, def.label, summaryText);

  arr.forEach((rel, idx) => {
    const idText = rel.subitem_relation_type_id?.subitem_relation_type_id_text || '';
    const itemLabel = `${def.label}[${idx}]${idText ? ': '+idText.substring(0,40) : ''}`;
    const { item: relItem, content: relContent } = createNestedItem(itemLabel, 1);

    relContent.appendChild(createFieldRow('関連タイプ', rel.subitem_relation_type || '', 'select', 'subitem_relation_type', { fieldKey: 'subitem_relation_type' }));

    // 関連識別子（fieldset）
    const relId = rel.subitem_relation_type_id || {};
    relContent.appendChild(createFieldRow('識別子タイプ', relId.subitem_relation_type_select || '', 'select', 'subitem_relation_type_select', { fieldKey: 'subitem_relation_type_select' }));
    relContent.appendChild(createFieldRow('関連識別子', relId.subitem_relation_type_id_text || '', 'text', null, { fieldKey: 'subitem_relation_type_id_text' }));

    // 関連名称（配列）
    const { wrapper: rnWrap, content: rnCont } = createNestedSectionHeader('関連名称', 2, (cont) => {
      const { grp, delBtn } = createEntryGroup();
      grp.appendChild(createFieldRow('関連名称', '', 'text', null, { fieldKey: 'subitem_relation_name_text' }));
      grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_relation_name_language' }));
      grp.appendChild(delBtn);
      cont.appendChild(grp);
    });
    (rel.subitem_relation_name || []).forEach(rn => {
      const { grp, delBtn } = createEntryGroup();
      grp.appendChild(createFieldRow('関連名称', rn.subitem_relation_name_text || '', 'text', null, { fieldKey: 'subitem_relation_name_text' }));
      grp.appendChild(createFieldRow('言語', rn.subitem_relation_name_language || '', 'select', 'language', { fieldKey: 'subitem_relation_name_language' }));
      grp.appendChild(delBtn);
      rnCont.appendChild(grp);
    });
    relContent.appendChild(rnWrap);

    content.appendChild(relItem);
  });

  content.appendChild(createAddButton(def.label, () => {
    const idx = content.querySelectorAll(':scope > .nested-item').length;
    const emptyRel = {
      subitem_relation_type: '',
      subitem_relation_type_id: { subitem_relation_type_select: '', subitem_relation_type_id_text: '' },
      subitem_relation_name: [],
    };
    content.insertBefore(
      (() => {
        const itemLabel = `${def.label}[${idx}]`;
        const { item: relItem, content: relContent } = createNestedItem(itemLabel, 1);
        relContent.appendChild(createFieldRow('関連タイプ', '', 'select', 'subitem_relation_type', { fieldKey: 'subitem_relation_type' }));
        relContent.appendChild(createFieldRow('識別子タイプ', '', 'select', 'subitem_relation_type_select', { fieldKey: 'subitem_relation_type_select' }));
        relContent.appendChild(createFieldRow('関連識別子', '', 'text', null, { fieldKey: 'subitem_relation_type_id_text' }));
        const { wrapper: rnWrap, content: rnCont } = createNestedSectionHeader('関連名称', 2, (cont) => {
          const { grp, delBtn } = createEntryGroup();
          grp.appendChild(createFieldRow('関連名称', '', 'text', null, { fieldKey: 'subitem_relation_name_text' }));
          grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_relation_name_language' }));
          grp.appendChild(delBtn);
          cont.appendChild(grp);
        });
        relContent.appendChild(rnWrap);
        return relItem;
      })(),
      content.lastChild
    );
  }));
  return section;
}

// ----- 1件の助成情報DOMを生成するヘルパー -----
function renderOneFunder(funder, idx, defLabel) {
  const fName = funder.subitem_funder_names?.[0]?.subitem_funder_name || '';
  const itemLabel = `${defLabel}[${idx}]${fName ? ': '+fName.substring(0,40) : ''}`;
  const { item: fundItem, content: fundContent } = createNestedItem(itemLabel, 1);

  // 助成機関名（配列）
  const { wrapper: fnWrap, content: fnCont } = createNestedSectionHeader('助成機関名', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('助成機関名', '', 'text', null, { fieldKey: 'subitem_funder_name' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_funder_name_language' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (funder.subitem_funder_names || []).forEach(fn => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('助成機関名', fn.subitem_funder_name || '', 'text', null, { fieldKey: 'subitem_funder_name' }));
    grp.appendChild(createFieldRow('言語', fn.subitem_funder_name_language || '', 'select', 'language', { fieldKey: 'subitem_funder_name_language' }));
    grp.appendChild(delBtn);
    fnCont.appendChild(grp);
  });
  fundContent.appendChild(fnWrap);

  // 助成機関識別子（fieldset）
  const fId = funder.subitem_funder_identifiers || {};

  // (1) 識別子フィールド行にボタンをインライン追加
  const funderIdRow = createFieldRow('助成機関識別子', fId.subitem_funder_identifier || '', 'text', null,
    { fieldKey: 'subitem_funder_identifier' });
  const funderLookupBtn = document.createElement('button');
  funderLookupBtn.textContent = '名称を確認';
  funderLookupBtn.className = 'btn-add';
  funderLookupBtn.style.display = 'none';
  funderIdRow.appendChild(funderLookupBtn);
  fundContent.appendChild(funderIdRow);

  // (2) タイプ行（変更時に updateFunderLookup 呼び出し）
  let updateFunderLookup = () => {};
  fundContent.appendChild(createFieldRow('識別子タイプ', fId.subitem_funder_identifier_type || '', 'select',
    'subitem_funder_identifier_type', {
      fieldKey: 'subitem_funder_identifier_type',
      onChange: () => updateFunderLookup(),
    }));

  // (3) タイプ select が DOM にある状態で attachLookupUi
  const { updateVisibility: updateFV } = attachLookupUi({
    btn: funderLookupBtn,
    resultContainer: fundContent,
    fetchNames: () => {
      const idInput = fundContent.querySelector('[data-field-key="subitem_funder_identifier"] input');
      const typeEl  = fundContent.querySelector('[data-field-key="subitem_funder_identifier_type"] select');
      const idVal   = idInput?.value || '';
      const typeVal = typeEl?.value  || '';
      if (typeVal === 'Crossref Funder') return fetchCrossrefFunderDetails(idVal);
      if (typeVal === 'ROR')             return fetchRorNamesAll(idVal);
      return Promise.resolve([]);
    },
    getVisible: () => {
      const typeEl = fundContent.querySelector('[data-field-key="subitem_funder_identifier_type"] select');
      return typeEl?.value === 'Crossref Funder' || typeEl?.value === 'ROR';
    },
    getTargetCont: () => fnCont,
    nameFld: 'subitem_funder_name', langFld: 'subitem_funder_name_language',
    nameLabel: '助成機関名', langLabel: '言語',
  });
  updateFunderLookup = updateFV;

  // 研究課題番号（fieldset）+ 助成機関を検索ボタン
  const aw = funder.subitem_award_numbers || {};
  const awardRow = createFieldRow('研究課題番号', aw.subitem_award_number || '', 'text', null, { fieldKey: 'subitem_award_number' });
  const awardLookupBtn = document.createElement('button');
  awardLookupBtn.textContent = '助成機関を検索';
  awardLookupBtn.className = 'btn-add';
  awardRow.appendChild(awardLookupBtn);
  fundContent.appendChild(awardRow);
  // 補助金番号修正の警告表示
  if (funder._supplementaryWarning) {
    const warnEl = document.createElement('div');
    warnEl.className = 'lookup-result warn';
    warnEl.textContent = '⚠ ' + funder._supplementaryWarning;
    fundContent.appendChild(warnEl);
  }
  fundContent.appendChild(createFieldRow('研究課題番号URI', aw.subitem_award_uri || '', 'text', null, { fieldKey: 'subitem_award_uri' }));

  // 研究課題名（配列）
  const { wrapper: atWrap, content: atCont } = createNestedSectionHeader('研究課題名', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('研究課題名', '', 'text', null, { fieldKey: 'subitem_award_title' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_award_title_language' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (funder.subitem_award_titles || []).forEach(at => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('研究課題名', at.subitem_award_title || '', 'text', null, { fieldKey: 'subitem_award_title' }));
    grp.appendChild(createFieldRow('言語', at.subitem_award_title_language || '', 'select', 'language', { fieldKey: 'subitem_award_title_language' }));
    grp.appendChild(delBtn);
    atCont.appendChild(grp);
  });
  fundContent.appendChild(atWrap);

  // 助成機関を検索ボタンの結果表示エリアとイベントハンドラ
  const awardResultEl = document.createElement('div');
  awardResultEl.className = 'lookup-result';
  fundContent.appendChild(awardResultEl);

  awardLookupBtn.onclick = async (e) => {
    e.preventDefault();
    const awardInput = fundContent.querySelector('[data-field-key="subitem_award_number"] input');
    const awardNum = awardInput?.value.trim() || '';
    if (!awardNum) return;

    awardLookupBtn.disabled = true;
    awardResultEl.className = 'lookup-result';
    awardResultEl.textContent = '検索中...';
    try {
      const hasCiNiiKey = CONFIG.CiNii_API_KEY && CONFIG.CiNii_API_KEY !== 'YOUR_CiNii_API_KEY';
      let result = null;
      let supplementaryWarning = '';

      // KAKEN XML API（Chrome拡張経由でCORS回避）
      if (hasCiNiiKey) {
        try { result = await fetchKakenXml(awardNum); } catch { /* ignore */ }
        // 補助金番号の検出
        if (result?.normalizedValue) {
          const inputNorm = /^JP/i.test(awardNum) ? awardNum.toUpperCase() : 'JP' + awardNum.toUpperCase();
          if (inputNorm !== result.normalizedValue.toUpperCase()) {
            supplementaryWarning = `研究課題番号に「補助金の研究課題番号」が入力されたため「研究課題番号」に変更しました（${awardNum} → ${result.normalizedValue}）`;
            if (awardInput) awardInput.value = result.normalizedValue;
          }
        }
      }

      // JGN フォールバック（JP接頭辞あり）
      if (!result && /^JP/i.test(awardNum)) {
        try { result = await fetchJgn(awardNum); } catch { /* ignore */ }
      }

      // CiNii Research OpenSearch フォールバック（KAKEN XML・JGN いずれも失敗時）
      if (!result) {
        try { result = await fetchKakenCiNii(awardNum); } catch { /* ignore */ }
      }

      if (!result) {
        awardResultEl.className = 'lookup-result warn';
        const strippedNum = awardNum.replace(/^JP/i, '');
        if (/^\d+[A-Z]/i.test(strippedNum)) {
          awardResultEl.innerHTML = '⚠ 助成情報が見つかりませんでした。補助金番号の可能性があります。<a href="https://kaken.nii.ac.jp/ja/search/?qb='
            + encodeURIComponent(strippedNum) + '" target="_blank" style="color:#1565c0">KAKENで検索</a>して正規の研究課題番号を確認してください。';
        } else {
          awardResultEl.textContent = '⚠ 助成情報が見つかりませんでした。';
        }
        return;
      }

      // 助成機関名を設定
      const names = result.funderNames?.length
        ? result.funderNames
        : JSPS_FUNDER_NAMES.map(n => ({...n}));
      [...fnCont.querySelectorAll(':scope > .entry-group')].forEach(g => g.remove());
      names.forEach(({ subitem_funder_name: nm, subitem_funder_name_language: lang }) => {
        const { grp, delBtn } = createEntryGroup();
        grp.appendChild(createFieldRow('助成機関名', nm, 'text', null, { fieldKey: 'subitem_funder_name' }));
        grp.appendChild(createFieldRow('言語', lang || 'en', 'select', 'language', { fieldKey: 'subitem_funder_name_language' }));
        grp.appendChild(delBtn);
        fnCont.appendChild(grp);
      });

      // 助成機関識別子を設定
      const doi = result.funderDoi || JSPS_FUNDER_DOI;
      const idInput = fundContent.querySelector('[data-field-key="subitem_funder_identifier"] input');
      const typeSelect = fundContent.querySelector('[data-field-key="subitem_funder_identifier_type"] select');
      if (idInput) idInput.value = `https://doi.org/${doi}`;
      if (typeSelect) typeSelect.value = 'Crossref Funder';
      updateFunderLookup();

      // 研究課題名を設定
      if (result.titles?.length) {
        [...atCont.querySelectorAll(':scope > .entry-group')].forEach(g => g.remove());
        result.titles.forEach(({ subitem_award_title: t, subitem_award_title_language: lang }) => {
          const { grp, delBtn } = createEntryGroup();
          grp.appendChild(createFieldRow('研究課題名', t, 'text', null, { fieldKey: 'subitem_award_title' }));
          grp.appendChild(createFieldRow('言語', lang || '', 'select', 'language', { fieldKey: 'subitem_award_title_language' }));
          grp.appendChild(delBtn);
          atCont.appendChild(grp);
        });
      }

      // 研究課題番号URIを設定
      const uriInput = fundContent.querySelector('[data-field-key="subitem_award_uri"] input');
      if (uriInput && result.kakenUrl) uriInput.value = result.kakenUrl;

      // ヘッダーラベルを更新
      const headerSpan = fundItem.querySelector('.nested-item-header span:last-child');
      if (headerSpan) {
        const newName = names[0]?.subitem_funder_name || '';
        headerSpan.textContent = `${defLabel}[${idx}]${newName ? ': '+newName.substring(0,40) : ''}`;
      }

      if (supplementaryWarning) {
        awardResultEl.className = 'lookup-result warn';
        awardResultEl.textContent = '⚠ ' + supplementaryWarning;
      } else {
        awardResultEl.className = 'lookup-result ok';
        awardResultEl.textContent = '✓ 設定完了: ' + names.map(n => n.subitem_funder_name).join(', ');
      }
    } finally {
      awardLookupBtn.disabled = false;
    }
  };

  return fundItem;
}

// ----- 助成情報 -----
function renderFundingField(def, funders) {
  const arr = Array.isArray(funders) ? funders : [];
  const summaryText = def.sum(arr);
  const { section, content } = createSection(def.key, def.label, summaryText);

  arr.forEach((funder, idx) => {
    content.appendChild(renderOneFunder(funder, idx, def.label));
  });

  content.appendChild(createAddButton(def.label, () => {
    const idx = content.querySelectorAll(':scope > .nested-item').length;
    const emptyFunder = {
      subitem_funder_names: [{ subitem_funder_name: '', subitem_funder_name_language: '' }],
      subitem_funder_identifiers: {},
      subitem_award_numbers: {},
      subitem_award_titles: [],
    };
    content.insertBefore(renderOneFunder(emptyFunder, idx, def.label), content.lastChild);
  }));
  return section;
}

// ----- 書誌情報 -----
function renderBiblioField(def, obj) {
  const data = obj || {};
  const summaryText = def.sum(data);
  const { section, content } = createSection(def.key, def.label, summaryText);

  if (!obj) {
    const msg = document.createElement('div');
    msg.style.cssText = 'padding:8px 16px;color:#999;font-size:0.85em';
    msg.textContent = '（データなし）';
    content.appendChild(msg);
    return section;
  }

  // 雑誌名（配列）
  const { wrapper: btWrap, content: btCont } = createNestedSectionHeader('雑誌名', 2);
  (data.bibliographic_titles || []).forEach(bt => {
    btCont.appendChild(createFieldRow('タイトル', bt.bibliographic_title || '', 'text', null, { fieldKey: 'bibliographic_title' }));
    btCont.appendChild(createFieldRow('言語', bt.bibliographic_titleLang || '', 'select', 'language', { fieldKey: 'bibliographic_titleLang' }));
  });
  content.appendChild(btWrap);

  // 巻・号・ページ
  content.appendChild(createFieldRow('巻', data.bibliographicVolumeNumber || '', 'text', null, { fieldKey: 'bibliographicVolumeNumber' }));
  content.appendChild(createFieldRow('号', data.bibliographicIssueNumber || '', 'text', null, { fieldKey: 'bibliographicIssueNumber' }));
  content.appendChild(createFieldRow('開始ページ', data.bibliographicPageStart || '', 'text', null, { fieldKey: 'bibliographicPageStart' }));
  content.appendChild(createFieldRow('終了ページ', data.bibliographicPageEnd || '', 'text', null, { fieldKey: 'bibliographicPageEnd' }));
  content.appendChild(createFieldRow('ページ数', data.bibliographicNumberOfPages || '', 'text', null, { fieldKey: 'bibliographicNumberOfPages' }));

  // 発行日（fieldset）
  const bd = data.bibliographicIssueDates || {};
  content.appendChild(createFieldRow('発行日', bd.bibliographicIssueDate || '', 'text', null, { fieldKey: 'bibliographicIssueDate' }));
  content.appendChild(createFieldRow('発行日タイプ', bd.bibliographicIssueDateType || '', 'select', 'bibliographicIssueDateType', { fieldKey: 'bibliographicIssueDateType' }));

  return section;
}

// ----- 権利者情報: 1件分のDOM生成 -----
function renderOneRightsHolder(rh, idx, defLabel) {
  const dispName = rh.rightHolderNames?.[0]?.rightHolderName || '';
  const itemLabel = `${defLabel}[${idx}]${dispName ? ': '+dispName.substring(0,40) : ''}`;
  const { item: rhItem, content: rhCont } = createNestedItem(itemLabel, 1);

  // 権利者名（配列）
  const { wrapper: rnWrap, content: rnCont } = createNestedSectionHeader('権利者名', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('権利者名', '', 'text', null, { fieldKey: 'rightHolderName' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'rightHolderLanguage' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (rh.rightHolderNames || []).forEach(rn => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('権利者名', rn.rightHolderName || '', 'text', null, { fieldKey: 'rightHolderName' }));
    grp.appendChild(createFieldRow('言語', rn.rightHolderLanguage || '', 'select', 'language', { fieldKey: 'rightHolderLanguage' }));
    grp.appendChild(delBtn);
    rnCont.appendChild(grp);
  });
  rhCont.appendChild(rnWrap);

  // 権利者識別子（配列）
  const { wrapper: riWrap, content: riCont } = createNestedSectionHeader('権利者識別子', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('識別子', '', 'text', null, { fieldKey: 'nameIdentifier' }));
    grp.appendChild(createFieldRow('Scheme', '', 'select', 'nameIdentifierScheme', { fieldKey: 'nameIdentifierScheme' }));
    grp.appendChild(createFieldRow('URI', '', 'text', null, { fieldKey: 'nameIdentifierURI' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (rh.nameIdentifiers || []).forEach(ni => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('識別子', ni.nameIdentifier || '', 'text', null, { fieldKey: 'nameIdentifier' }));
    grp.appendChild(createFieldRow('Scheme', ni.nameIdentifierScheme || '', 'select', 'nameIdentifierScheme', { fieldKey: 'nameIdentifierScheme' }));
    grp.appendChild(createFieldRow('URI', ni.nameIdentifierURI || '', 'text', null, { fieldKey: 'nameIdentifierURI' }));
    grp.appendChild(delBtn);
    riCont.appendChild(grp);
  });
  rhCont.appendChild(riWrap);

  return rhItem;
}

// ----- 権利者情報 -----
function renderRightsHolderField(def, holders) {
  const arr = Array.isArray(holders) ? holders : [];
  const summaryText = def.sum(arr);
  const { section, content } = createSection(def.key, def.label, summaryText);

  arr.forEach((rh, idx) => {
    content.appendChild(renderOneRightsHolder(rh, idx, def.label));
  });

  content.appendChild(createAddButton(def.label, () => {
    const idx = content.querySelectorAll(':scope > .nested-item').length;
    const emptyRh = {
      rightHolderNames: [{ rightHolderName: '', rightHolderLanguage: '' }],
      nameIdentifiers: [],
    };
    content.insertBefore(renderOneRightsHolder(emptyRh, idx, def.label), content.lastChild);
  }));
  return section;
}

// ----- 位置情報: 1件分のDOM生成 -----
function renderOneGeolocation(geo, idx, defLabel) {
  const placeText = geo.subitem_geolocation_place?.[0]?.subitem_geolocation_place_text || '';
  const itemLabel = `${defLabel}[${idx}]${placeText ? ': '+placeText.substring(0,40) : ''}`;
  const { item: geoItem, content: geoCont } = createNestedItem(itemLabel, 1);

  // 位置情報（点）
  const pt = geo.subitem_geolocation_point || {};
  const { wrapper: ptWrap, content: ptCont } = createNestedSectionHeader('位置情報（点）', 2, false);
  ptCont.appendChild(createFieldRow('経度', pt.subitem_point_longitude || '', 'text', null, { fieldKey: 'subitem_point_longitude' }));
  ptCont.appendChild(createFieldRow('緯度', pt.subitem_point_latitude || '', 'text', null, { fieldKey: 'subitem_point_latitude' }));
  geoCont.appendChild(ptWrap);

  // 位置情報（空間）
  const bx = geo.subitem_geolocation_box || {};
  const { wrapper: bxWrap, content: bxCont } = createNestedSectionHeader('位置情報（空間）', 2, false);
  bxCont.appendChild(createFieldRow('西部経度', bx.subitem_west_longitude || '', 'text', null, { fieldKey: 'subitem_west_longitude' }));
  bxCont.appendChild(createFieldRow('東部経度', bx.subitem_east_longitude || '', 'text', null, { fieldKey: 'subitem_east_longitude' }));
  bxCont.appendChild(createFieldRow('南部緯度', bx.subitem_south_latitude || '', 'text', null, { fieldKey: 'subitem_south_latitude' }));
  bxCont.appendChild(createFieldRow('北部緯度', bx.subitem_north_latitude || '', 'text', null, { fieldKey: 'subitem_north_latitude' }));
  geoCont.appendChild(bxWrap);

  // 位置情報（自由記述）
  const { wrapper: plWrap, content: plCont } = createNestedSectionHeader('位置情報（自由記述）', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('自由記述', '', 'text', null, { fieldKey: 'subitem_geolocation_place_text' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (geo.subitem_geolocation_place || []).forEach(pl => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('自由記述', pl.subitem_geolocation_place_text || '', 'text', null, { fieldKey: 'subitem_geolocation_place_text' }));
    grp.appendChild(delBtn);
    plCont.appendChild(grp);
  });
  geoCont.appendChild(plWrap);

  return geoItem;
}

// ----- 位置情報 -----
function renderGeolocationField(def, geos) {
  const arr = Array.isArray(geos) ? geos : [];
  const summaryText = def.sum(arr);
  const { section, content } = createSection(def.key, def.label, summaryText);

  arr.forEach((geo, idx) => {
    content.appendChild(renderOneGeolocation(geo, idx, def.label));
  });

  content.appendChild(createAddButton(def.label, () => {
    const idx = content.querySelectorAll(':scope > .nested-item').length;
    const emptyGeo = {
      subitem_geolocation_point: { subitem_point_longitude: '', subitem_point_latitude: '' },
      subitem_geolocation_box: { subitem_west_longitude: '', subitem_east_longitude: '', subitem_south_latitude: '', subitem_north_latitude: '' },
      subitem_geolocation_place: [],
    };
    content.insertBefore(renderOneGeolocation(emptyGeo, idx, def.label), content.lastChild);
  }));
  return section;
}

// ----- 会議記述: 1件分のDOM生成 -----
function renderOneConference(conf, idx, defLabel) {
  const confName = conf.subitem_conference_names?.[0]?.subitem_conference_name || '';
  const itemLabel = `${defLabel}[${idx}]${confName ? ': '+confName.substring(0,40) : ''}`;
  const { item: confItem, content: confCont } = createNestedItem(itemLabel, 1);

  // 会議名（配列）
  const { wrapper: cnWrap, content: cnCont } = createNestedSectionHeader('会議名', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('会議名', '', 'text', null, { fieldKey: 'subitem_conference_name' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_conference_name_language' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (conf.subitem_conference_names || []).forEach(cn => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('会議名', cn.subitem_conference_name || '', 'text', null, { fieldKey: 'subitem_conference_name' }));
    grp.appendChild(createFieldRow('言語', cn.subitem_conference_name_language || '', 'select', 'language', { fieldKey: 'subitem_conference_name_language' }));
    grp.appendChild(delBtn);
    cnCont.appendChild(grp);
  });
  confCont.appendChild(cnWrap);

  // 回次
  confCont.appendChild(createFieldRow('回次', conf.subitem_conference_sequence || '', 'text', null, { fieldKey: 'subitem_conference_sequence' }));

  // 主催機関（配列）
  const { wrapper: csWrap, content: csCont } = createNestedSectionHeader('主催機関', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('主催機関', '', 'text', null, { fieldKey: 'subitem_conference_sponsor' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_conference_sponsor_language' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (conf.subitem_conference_sponsors || []).forEach(cs => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('主催機関', cs.subitem_conference_sponsor || '', 'text', null, { fieldKey: 'subitem_conference_sponsor' }));
    grp.appendChild(createFieldRow('言語', cs.subitem_conference_sponsor_language || '', 'select', 'language', { fieldKey: 'subitem_conference_sponsor_language' }));
    grp.appendChild(delBtn);
    csCont.appendChild(grp);
  });
  confCont.appendChild(csWrap);

  // 開催期間（オブジェクト）
  const cd = conf.subitem_conference_date || {};
  const { wrapper: cdWrap, content: cdCont } = createNestedSectionHeader('開催期間', 2, false);
  cdCont.appendChild(createFieldRow('開始年', cd.subitem_conference_start_year || '', 'text', null, { fieldKey: 'subitem_conference_start_year' }));
  cdCont.appendChild(createFieldRow('開始月', cd.subitem_conference_start_month || '', 'text', null, { fieldKey: 'subitem_conference_start_month' }));
  cdCont.appendChild(createFieldRow('開始日', cd.subitem_conference_start_day || '', 'text', null, { fieldKey: 'subitem_conference_start_day' }));
  cdCont.appendChild(createFieldRow('終了年', cd.subitem_conference_end_year || '', 'text', null, { fieldKey: 'subitem_conference_end_year' }));
  cdCont.appendChild(createFieldRow('終了月', cd.subitem_conference_end_month || '', 'text', null, { fieldKey: 'subitem_conference_end_month' }));
  cdCont.appendChild(createFieldRow('終了日', cd.subitem_conference_end_day || '', 'text', null, { fieldKey: 'subitem_conference_end_day' }));
  cdCont.appendChild(createFieldRow('開催期間', cd.subitem_conference_period || '', 'text', null, { fieldKey: 'subitem_conference_period' }));
  cdCont.appendChild(createFieldRow('言語', cd.subitem_conference_date_language || '', 'select', 'language', { fieldKey: 'subitem_conference_date_language' }));
  confCont.appendChild(cdWrap);

  // 開催会場（配列）
  const { wrapper: cvWrap, content: cvCont } = createNestedSectionHeader('開催会場', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('開催会場', '', 'text', null, { fieldKey: 'subitem_conference_venue' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_conference_venue_language' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (conf.subitem_conference_venues || []).forEach(cv => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('開催会場', cv.subitem_conference_venue || '', 'text', null, { fieldKey: 'subitem_conference_venue' }));
    grp.appendChild(createFieldRow('言語', cv.subitem_conference_venue_language || '', 'select', 'language', { fieldKey: 'subitem_conference_venue_language' }));
    grp.appendChild(delBtn);
    cvCont.appendChild(grp);
  });
  confCont.appendChild(cvWrap);

  // 開催地（配列）
  const { wrapper: cpWrap, content: cpCont } = createNestedSectionHeader('開催地', 2, (cont) => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('開催地', '', 'text', null, { fieldKey: 'subitem_conference_place' }));
    grp.appendChild(createFieldRow('言語', '', 'select', 'language', { fieldKey: 'subitem_conference_place_language' }));
    grp.appendChild(delBtn);
    cont.appendChild(grp);
  });
  (conf.subitem_conference_places || []).forEach(cp => {
    const { grp, delBtn } = createEntryGroup();
    grp.appendChild(createFieldRow('開催地', cp.subitem_conference_place || '', 'text', null, { fieldKey: 'subitem_conference_place' }));
    grp.appendChild(createFieldRow('言語', cp.subitem_conference_place_language || '', 'select', 'language', { fieldKey: 'subitem_conference_place_language' }));
    grp.appendChild(delBtn);
    cpCont.appendChild(grp);
  });
  confCont.appendChild(cpWrap);

  // 開催国
  confCont.appendChild(createFieldRow('開催国', conf.subitem_conference_country || '', 'select', 'subitem_conference_country', { fieldKey: 'subitem_conference_country' }));

  return confItem;
}

// ----- 会議記述 -----
function renderConferenceField(def, confs) {
  const arr = Array.isArray(confs) ? confs : [];
  const summaryText = def.sum(arr);
  const { section, content } = createSection(def.key, def.label, summaryText);

  arr.forEach((conf, idx) => {
    content.appendChild(renderOneConference(conf, idx, def.label));
  });

  content.appendChild(createAddButton(def.label, () => {
    const idx = content.querySelectorAll(':scope > .nested-item').length;
    const emptyConf = {
      subitem_conference_names: [{ subitem_conference_name: '', subitem_conference_name_language: '' }],
      subitem_conference_sequence: '',
      subitem_conference_sponsors: [],
      subitem_conference_date: {},
      subitem_conference_venues: [],
      subitem_conference_places: [],
      subitem_conference_country: '',
    };
    content.insertBefore(renderOneConference(emptyConf, idx, def.label), content.lastChild);
  }));
  return section;
}

// ===== 5.5 メインレンダリング =====
function renderAll(metadata) {
  const container = document.getElementById('metadata-fields');
  container.innerHTML = '';

  // システムフィールド
  renderSystemFields(metadata.system);

  // メタデータフィールド
  for (const def of FIELD_DEFS) {
    const value = metadata[def.key];
    if (value === undefined) continue;
    let sectionEl;
    switch (def.type) {
      case 'array':
        sectionEl = renderArrayField(def, value);
        break;
      case 'object':
        sectionEl = renderObjectField(def, value);
        break;
      case 'creator':
        sectionEl = renderPersonField(def, value, true);
        break;
      case 'contributor':
        sectionEl = renderPersonField(def, value, false);
        break;
      case 'relation':
        sectionEl = renderRelationField(def, value);
        break;
      case 'funding':
        sectionEl = renderFundingField(def, value);
        break;
      case 'biblio':
        sectionEl = renderBiblioField(def, value);
        break;
      case 'rightsHolder':
        sectionEl = renderRightsHolderField(def, value);
        break;
      case 'geolocation':
        sectionEl = renderGeolocationField(def, value);
        break;
      case 'conference':
        sectionEl = renderConferenceField(def, value);
        break;
      default:
        continue;
    }
    container.appendChild(sectionEl);
  }

  document.getElementById('preview-area').style.display = 'block';
  document.getElementById('preview-btn').style.display = '';
  updateDoiBadges();
}

// ===== 5.6 空メタデータ生成 =====
function buildEmptyMetadata() {
  return {
    system: {
      id: '', uri: '', path: '',
      pos_index: '',
      publish_status: 'private', feedback_mail: '', cnri: '',
      doi_ra: '', doi: '', edit_mode: 'Keep', pubdate: todayStr(),
    },
    item_30002_title0: [{ subitem_title: '', subitem_title_language: '' }],
    item_30002_alternative_title1: [],
    item_30002_creator2: [{
      creatorType: '', creatorNames: [{ creatorName: '', creatorNameLang: '', creatorNameType: '' }],
      familyNames: [{ familyName: '', familyNameLang: '' }],
      givenNames: [{ givenName: '', givenNameLang: '' }],
      nameIdentifiers: [{ nameIdentifier: '', nameIdentifierScheme: '', nameIdentifierURI: '' }],
      creatorAffiliations: [{
        affiliationNames: [{ affiliationName: '', affiliationNameLang: '' }],
        affiliationNameIdentifiers: [{ affiliationNameIdentifier: '', affiliationNameIdentifierScheme: '', affiliationNameIdentifierURI: '' }],
      }],
    }],
    item_30002_contributor3: [],
    item_30002_access_rights4: { subitem_access_right: '', subitem_access_right_uri: '' },
    item_30002_rights6: [],
    item_30002_rights_holder7: [{
      rightHolderNames: [{ rightHolderName: '', rightHolderLanguage: '' }],
      nameIdentifiers: [],
    }],
    item_30002_subject8: [],
    item_30002_description9: [],
    item_30002_publisher10: [],
    item_30002_date11: [],
    item_30002_language12: [{ subitem_language: '' }],
    item_30002_resource_type13: { resourcetype: '', resourceuri: '' },
    item_30002_version14: { subitem_version: '' },
    item_30002_version_type15: { subitem_version_resource: '', subitem_version_type: '' },
    item_30002_identifier16: [],
    item_30002_identifier_registration17: { subitem_identifier_reg_text: '', subitem_identifier_reg_type: '' },
    item_30002_relation18: [],
    item_30002_temporal19: [],
    item_30002_geolocation20: [{
      subitem_geolocation_point: { subitem_point_longitude: '', subitem_point_latitude: '' },
      subitem_geolocation_box: { subitem_west_longitude: '', subitem_east_longitude: '', subitem_south_latitude: '', subitem_north_latitude: '' },
      subitem_geolocation_place: [{ subitem_geolocation_place_text: '' }],
    }],
    item_30002_funding_reference21: [],
    item_30002_source_identifier22: [],
    item_30002_source_title23: [],
    item_30002_volume_number24: { subitem_volume: '' },
    item_30002_issue_number25: { subitem_issue: '' },
    item_30002_number_of_pages26: { subitem_number_of_pages: '' },
    item_30002_page_start27: { subitem_start_page: '' },
    item_30002_page_end28: { subitem_end_page: '' },
    item_30002_bibliographic_information29: null,
    item_30002_conference34: [{
      subitem_conference_names: [{ subitem_conference_name: '', subitem_conference_name_language: '' }],
      subitem_conference_sequence: '',
      subitem_conference_sponsors: [],
      subitem_conference_date: {},
      subitem_conference_venues: [],
      subitem_conference_places: [],
      subitem_conference_country: '',
    }],
  };
}

// ================================================================
// STEP 7: DOM データ収集層（プレビュー / TSVエクスポート用）
// ================================================================

function getFieldVal(container, key) {
  const row = container.querySelector(`.field-row[data-field-key="${key}"]`);
  if (!row) return '';
  const el = row.querySelector('select') || row.querySelector('textarea') || row.querySelector('input');
  return el ? el.value : '';
}

const SYS_KEY_MAP = {
  sys_id: 'id', sys_uri: 'uri', sys_path: 'path',
  sys_pos: 'pos_index', sys_status: 'publish_status',
  sys_mail: 'feedback_mail', sys_cnri: 'cnri',
  sys_doi_ra: 'doi_ra', sys_doi: 'doi',
  sys_edit: 'edit_mode', sys_pubdate: 'pubdate',
};

function collectSystemFromDOM() {
  const sys = {};
  document.getElementById('system-fields-body').querySelectorAll('[data-key]').forEach(el => {
    const jsonKey = SYS_KEY_MAP[el.dataset.key] || el.dataset.key;
    sys[jsonKey] = el.value;
  });
  return sys;
}

function collectObjectField(section, def) {
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return {};
  const obj = {};
  for (const f of def.fields) {
    obj[f.k] = getFieldVal(content, f.k);
  }
  return obj;
}

function collectArrayField(section, def) {
  const items = [];
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return items;
  content.querySelectorAll(':scope > .nested-item.level-1').forEach(itemEl => {
    const ic = itemEl.querySelector(':scope > .item-content');
    if (!ic) return;
    const obj = {};
    for (const f of def.fields) {
      obj[f.k] = getFieldVal(ic, f.k);
    }
    items.push(obj);
  });
  return items;
}

function buildPersonKeys(isCreator) {
  return {
    typeKey: isCreator ? 'creatorType' : 'contributorType',
    namesKey: isCreator ? 'creatorNames' : 'contributorNames',
    nameKey: isCreator ? 'creatorName' : 'contributorName',
    nameLangKey: isCreator ? 'creatorNameLang' : 'lang',
    nameTypeKey: isCreator ? 'creatorNameType' : 'nameType',
    affKey: isCreator ? 'creatorAffiliations' : 'contributorAffiliations',
    affNameKey: isCreator ? 'affiliationNames' : 'contributorAffiliationNames',
    affNameField: isCreator ? 'affiliationName' : 'contributorAffiliationName',
    affNameLangField: isCreator ? 'affiliationNameLang' : 'contributorAffiliationNameLang',
    affIdKey: isCreator ? 'affiliationNameIdentifiers' : 'contributorAffiliationNameIdentifiers',
    affIdField: isCreator ? 'affiliationNameIdentifier' : 'contributorAffiliationNameIdentifier',
    affIdSchemeField: isCreator ? 'affiliationNameIdentifierScheme' : 'contributorAffiliationScheme',
    affIdUriField: isCreator ? 'affiliationNameIdentifierURI' : 'contributorAffiliationURI',
  };
}

function collectOneAffiliation(affEl, keys) {
  const ac = affEl.querySelector(':scope > .item-content');
  if (!ac) return { [keys.affNameKey]: [], [keys.affIdKey]: [] };
  const aff = { [keys.affNameKey]: [], [keys.affIdKey]: [] };

  // 所属機関名: level-3 nested-section-content 内の entry-group
  ac.querySelectorAll(':scope > .nested-item.level-3').forEach(l3 => {
    const nsc = l3.querySelector(':scope > .nested-section-content');
    if (!nsc) return;
    // entry-group 内に affNameField があれば所属機関名セクション
    nsc.querySelectorAll(':scope > .entry-group').forEach(grp => {
      if (grp.querySelector(`[data-field-key="${keys.affNameField}"]`)) {
        aff[keys.affNameKey].push({
          [keys.affNameField]: getFieldVal(grp, keys.affNameField),
          [keys.affNameLangField]: getFieldVal(grp, keys.affNameLangField),
        });
      }
    });
    // 所属識別子: level-4 nested-item 内の item-content
    nsc.querySelectorAll(':scope > .nested-item.level-4').forEach(l4 => {
      const l4c = l4.querySelector(':scope > .item-content');
      if (!l4c || !l4c.querySelector(`[data-field-key="${keys.affIdField}"]`)) return;
      aff[keys.affIdKey].push({
        [keys.affIdField]: getFieldVal(l4c, keys.affIdField),
        [keys.affIdSchemeField]: getFieldVal(l4c, keys.affIdSchemeField),
        [keys.affIdUriField]: getFieldVal(l4c, keys.affIdUriField),
      });
    });
  });
  return aff;
}

function collectPersonField(section, isCreator) {
  const keys = buildPersonKeys(isCreator);
  const persons = [];
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return persons;

  content.querySelectorAll(':scope > .nested-item.level-1').forEach(personEl => {
    const pc = personEl.querySelector(':scope > .item-content');
    if (!pc) return;
    const person = {
      [keys.typeKey]: getFieldVal(pc, keys.typeKey),
      [keys.namesKey]: [],
      familyNames: [],
      givenNames: [],
      nameIdentifiers: [],
      [keys.affKey]: [],
    };

    // level-2 サブセクション走査
    pc.querySelectorAll(':scope > .nested-item.level-2').forEach(l2 => {
      const nsc = l2.querySelector(':scope > .nested-section-content');
      if (nsc) {
        // createNestedSectionHeader 由来: entry-group を走査
        const groups = nsc.querySelectorAll(':scope > .entry-group');
        if (groups.length > 0) {
          const first = groups[0];
          if (first.querySelector(`[data-field-key="${keys.nameKey}"]`)) {
            groups.forEach(grp => {
              person[keys.namesKey].push({
                [keys.nameKey]: getFieldVal(grp, keys.nameKey),
                [keys.nameLangKey]: getFieldVal(grp, keys.nameLangKey),
                [keys.nameTypeKey]: getFieldVal(grp, keys.nameTypeKey),
              });
            });
          } else if (first.querySelector('[data-field-key="familyName"]')) {
            groups.forEach(grp => {
              person.familyNames.push({
                familyName: getFieldVal(grp, 'familyName'),
                familyNameLang: getFieldVal(grp, 'familyNameLang'),
              });
            });
          } else if (first.querySelector('[data-field-key="givenName"]')) {
            groups.forEach(grp => {
              person.givenNames.push({
                givenName: getFieldVal(grp, 'givenName'),
                givenNameLang: getFieldVal(grp, 'givenNameLang'),
              });
            });
          } else if (first.querySelector('[data-field-key="nameIdentifier"]')) {
            groups.forEach(grp => {
              person.nameIdentifiers.push({
                nameIdentifier: getFieldVal(grp, 'nameIdentifier'),
                nameIdentifierScheme: getFieldVal(grp, 'nameIdentifierScheme'),
                nameIdentifierURI: getFieldVal(grp, 'nameIdentifierURI'),
              });
            });
          }
        }
        // 所属ヘッダー内の所属アイテム (nested-item.level-2 > item-content)
        nsc.querySelectorAll(':scope > .nested-item.level-2').forEach(affEl => {
          if (affEl.querySelector(':scope > .item-content')) {
            person[keys.affKey].push(collectOneAffiliation(affEl, keys));
          }
        });
      }
    });

    persons.push(person);
  });
  return persons;
}

function collectRelationField(section) {
  const items = [];
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return items;
  content.querySelectorAll(':scope > .nested-item.level-1').forEach(relEl => {
    const rc = relEl.querySelector(':scope > .item-content');
    if (!rc) return;
    const rel = {
      subitem_relation_type: getFieldVal(rc, 'subitem_relation_type'),
      subitem_relation_type_id: {
        subitem_relation_type_select: getFieldVal(rc, 'subitem_relation_type_select'),
        subitem_relation_type_id_text: getFieldVal(rc, 'subitem_relation_type_id_text'),
      },
      subitem_relation_name: [],
    };
    rc.querySelectorAll('.entry-group').forEach(grp => {
      if (grp.querySelector('[data-field-key="subitem_relation_name_text"]')) {
        rel.subitem_relation_name.push({
          subitem_relation_name_text: getFieldVal(grp, 'subitem_relation_name_text'),
          subitem_relation_name_language: getFieldVal(grp, 'subitem_relation_name_language'),
        });
      }
    });
    items.push(rel);
  });
  return items;
}

function collectFundingField(section) {
  const items = [];
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return items;
  content.querySelectorAll(':scope > .nested-item.level-1').forEach(fundEl => {
    const fc = fundEl.querySelector(':scope > .item-content');
    if (!fc) return;
    const funder = {
      subitem_funder_names: [],
      subitem_funder_identifiers: {
        subitem_funder_identifier: getFieldVal(fc, 'subitem_funder_identifier'),
        subitem_funder_identifier_type: getFieldVal(fc, 'subitem_funder_identifier_type'),
      },
      subitem_award_numbers: {
        subitem_award_number: getFieldVal(fc, 'subitem_award_number'),
        subitem_award_uri: getFieldVal(fc, 'subitem_award_uri'),
      },
      subitem_award_titles: [],
    };
    fc.querySelectorAll('.entry-group').forEach(grp => {
      if (grp.querySelector('[data-field-key="subitem_funder_name"]')) {
        funder.subitem_funder_names.push({
          subitem_funder_name: getFieldVal(grp, 'subitem_funder_name'),
          subitem_funder_name_language: getFieldVal(grp, 'subitem_funder_name_language'),
        });
      }
      if (grp.querySelector('[data-field-key="subitem_award_title"]')) {
        funder.subitem_award_titles.push({
          subitem_award_title: getFieldVal(grp, 'subitem_award_title'),
          subitem_award_title_language: getFieldVal(grp, 'subitem_award_title_language'),
        });
      }
    });
    items.push(funder);
  });
  return items;
}

function collectBiblioField(section) {
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return null;
  // 「データなし」表示のみの場合
  if (!content.querySelector('.nested-item') && !content.querySelector('.field-row')) return null;

  const data = {
    bibliographic_titles: [],
    bibliographicVolumeNumber: getFieldVal(content, 'bibliographicVolumeNumber'),
    bibliographicIssueNumber: getFieldVal(content, 'bibliographicIssueNumber'),
    bibliographicPageStart: getFieldVal(content, 'bibliographicPageStart'),
    bibliographicPageEnd: getFieldVal(content, 'bibliographicPageEnd'),
    bibliographicNumberOfPages: getFieldVal(content, 'bibliographicNumberOfPages'),
    bibliographicIssueDates: {
      bibliographicIssueDate: getFieldVal(content, 'bibliographicIssueDate'),
      bibliographicIssueDateType: getFieldVal(content, 'bibliographicIssueDateType'),
    },
  };

  // 雑誌名: nested-section-content 内の field-row ペア（title + lang）
  const nsc = content.querySelector('.nested-section-content');
  if (nsc) {
    const titleRows = nsc.querySelectorAll('.field-row[data-field-key="bibliographic_title"]');
    const langRows = nsc.querySelectorAll('.field-row[data-field-key="bibliographic_titleLang"]');
    titleRows.forEach((tr, i) => {
      const titleEl = tr.querySelector('input');
      const langEl = langRows[i]?.querySelector('select');
      data.bibliographic_titles.push({
        bibliographic_title: titleEl ? titleEl.value : '',
        bibliographic_titleLang: langEl ? langEl.value : '',
      });
    });
  }

  const allEmpty = !data.bibliographic_titles.some(t => t.bibliographic_title) &&
    !data.bibliographicVolumeNumber && !data.bibliographicIssueNumber &&
    !data.bibliographicPageStart && !data.bibliographicPageEnd &&
    !data.bibliographicNumberOfPages &&
    !data.bibliographicIssueDates.bibliographicIssueDate;
  return allEmpty ? null : data;
}

function collectRightsHolderField(section) {
  const items = [];
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return items;
  content.querySelectorAll(':scope > .nested-item.level-1').forEach(rhEl => {
    const rc = rhEl.querySelector(':scope > .item-content');
    if (!rc) return;
    const rh = { rightHolderNames: [], nameIdentifiers: [] };
    rc.querySelectorAll('.entry-group').forEach(grp => {
      if (grp.querySelector('[data-field-key="rightHolderName"]')) {
        rh.rightHolderNames.push({
          rightHolderName: getFieldVal(grp, 'rightHolderName'),
          rightHolderLanguage: getFieldVal(grp, 'rightHolderLanguage'),
        });
      }
      if (grp.querySelector('[data-field-key="nameIdentifier"]')) {
        rh.nameIdentifiers.push({
          nameIdentifier: getFieldVal(grp, 'nameIdentifier'),
          nameIdentifierScheme: getFieldVal(grp, 'nameIdentifierScheme'),
          nameIdentifierURI: getFieldVal(grp, 'nameIdentifierURI'),
        });
      }
    });
    items.push(rh);
  });
  return items;
}

function collectGeolocationField(section) {
  const items = [];
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return items;
  content.querySelectorAll(':scope > .nested-item.level-1').forEach(geoEl => {
    const gc = geoEl.querySelector(':scope > .item-content');
    if (!gc) return;
    const geo = {
      subitem_geolocation_point: {
        subitem_point_longitude: getFieldVal(gc, 'subitem_point_longitude'),
        subitem_point_latitude: getFieldVal(gc, 'subitem_point_latitude'),
      },
      subitem_geolocation_box: {
        subitem_west_longitude: getFieldVal(gc, 'subitem_west_longitude'),
        subitem_east_longitude: getFieldVal(gc, 'subitem_east_longitude'),
        subitem_south_latitude: getFieldVal(gc, 'subitem_south_latitude'),
        subitem_north_latitude: getFieldVal(gc, 'subitem_north_latitude'),
      },
      subitem_geolocation_place: [],
    };
    gc.querySelectorAll('.entry-group').forEach(grp => {
      if (grp.querySelector('[data-field-key="subitem_geolocation_place_text"]')) {
        geo.subitem_geolocation_place.push({
          subitem_geolocation_place_text: getFieldVal(grp, 'subitem_geolocation_place_text'),
        });
      }
    });
    items.push(geo);
  });
  return items;
}

function collectConferenceField(section) {
  const items = [];
  const content = section.querySelector(':scope > .accordion-content');
  if (!content) return items;
  content.querySelectorAll(':scope > .nested-item.level-1').forEach(confEl => {
    const cc = confEl.querySelector(':scope > .item-content');
    if (!cc) return;
    const conf = {
      subitem_conference_names: [],
      subitem_conference_sequence: getFieldVal(cc, 'subitem_conference_sequence'),
      subitem_conference_sponsors: [],
      subitem_conference_date: {
        subitem_conference_start_year: getFieldVal(cc, 'subitem_conference_start_year'),
        subitem_conference_start_month: getFieldVal(cc, 'subitem_conference_start_month'),
        subitem_conference_start_day: getFieldVal(cc, 'subitem_conference_start_day'),
        subitem_conference_end_year: getFieldVal(cc, 'subitem_conference_end_year'),
        subitem_conference_end_month: getFieldVal(cc, 'subitem_conference_end_month'),
        subitem_conference_end_day: getFieldVal(cc, 'subitem_conference_end_day'),
        subitem_conference_period: getFieldVal(cc, 'subitem_conference_period'),
        subitem_conference_date_language: getFieldVal(cc, 'subitem_conference_date_language'),
      },
      subitem_conference_venues: [],
      subitem_conference_places: [],
      subitem_conference_country: getFieldVal(cc, 'subitem_conference_country'),
    };
    cc.querySelectorAll('.entry-group').forEach(grp => {
      if (grp.querySelector('[data-field-key="subitem_conference_name"]')) {
        conf.subitem_conference_names.push({
          subitem_conference_name: getFieldVal(grp, 'subitem_conference_name'),
          subitem_conference_name_language: getFieldVal(grp, 'subitem_conference_name_language'),
        });
      }
      if (grp.querySelector('[data-field-key="subitem_conference_sponsor"]')) {
        conf.subitem_conference_sponsors.push({
          subitem_conference_sponsor: getFieldVal(grp, 'subitem_conference_sponsor'),
          subitem_conference_sponsor_language: getFieldVal(grp, 'subitem_conference_sponsor_language'),
        });
      }
      if (grp.querySelector('[data-field-key="subitem_conference_venue"]')) {
        conf.subitem_conference_venues.push({
          subitem_conference_venue: getFieldVal(grp, 'subitem_conference_venue'),
          subitem_conference_venue_language: getFieldVal(grp, 'subitem_conference_venue_language'),
        });
      }
      if (grp.querySelector('[data-field-key="subitem_conference_place"]')) {
        conf.subitem_conference_places.push({
          subitem_conference_place: getFieldVal(grp, 'subitem_conference_place'),
          subitem_conference_place_language: getFieldVal(grp, 'subitem_conference_place_language'),
        });
      }
    });
    items.push(conf);
  });
  return items;
}

function collectFromDOM() {
  const metadata = { system: collectSystemFromDOM() };
  for (const def of FIELD_DEFS) {
    const section = document.querySelector(`.field-section[data-key="${def.key}"]`);
    if (!section) { metadata[def.key] = def.type === 'object' ? {} : (def.type === 'biblio' ? null : []); continue; }
    switch (def.type) {
      case 'object':      metadata[def.key] = collectObjectField(section, def); break;
      case 'array':       metadata[def.key] = collectArrayField(section, def); break;
      case 'creator':     metadata[def.key] = collectPersonField(section, true); break;
      case 'contributor':  metadata[def.key] = collectPersonField(section, false); break;
      case 'relation':    metadata[def.key] = collectRelationField(section); break;
      case 'funding':     metadata[def.key] = collectFundingField(section); break;
      case 'biblio':      metadata[def.key] = collectBiblioField(section); break;
      case 'rightsHolder': metadata[def.key] = collectRightsHolderField(section); break;
      case 'geolocation':  metadata[def.key] = collectGeolocationField(section); break;
      case 'conference':   metadata[def.key] = collectConferenceField(section); break;
    }
  }
  return metadata;
}

// ================================================================
// STEP 8: プレビュー表示
// ================================================================

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

function isEmptyVal(v) {
  if (!v) return true;
  if (typeof v === 'string') return !v.trim();
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.values(v).every(isEmptyVal);
  return false;
}

function buildObjectPreview(def, obj) {
  if (!obj) return '';
  const rows = def.fields.filter(f => obj[f.k]).map(f =>
    '<tr><th>' + f.l + '</th><td>' + fmtVal(obj[f.k]) + '</td></tr>'
  );
  return rows.length ? '<table class="pv-table">' + rows.join('') + '</table>' : '';
}

function buildArrayPreview(def, arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  const nonEmpty = arr.filter(item => def.fields.some(f => item[f.k]));
  if (!nonEmpty.length) return '';

  let html = '<table class="pv-table">';
  nonEmpty.forEach((item, i) => {
    // 言語フィールドを探す
    const langField = def.fields.find(f => f.k.includes('language') || f.k.includes('Lang'));
    const mainFields = def.fields.filter(f => f !== langField);
    const lang = langField ? item[langField.k] : '';

    if (mainFields.length === 1 && mainFields[0]) {
      html += '<tr><th>' + def.label + '[' + i + ']</th><td>' + fmtVal(item[mainFields[0].k], lang) + '</td></tr>';
    } else {
      const parts = mainFields.filter(f => item[f.k]).map(f => fmtVal(item[f.k]));
      if (lang) parts.push('(' + lang + ')');
      html += '<tr><th>' + def.label + '[' + i + ']</th><td>' + parts.join(' / ') + '</td></tr>';
    }
  });
  html += '</table>';
  return html;
}

function buildPersonPreview(persons, isCreator) {
  if (!Array.isArray(persons) || !persons.length) return '';
  const keys = buildPersonKeys(isCreator);
  const nonEmpty = persons.filter(p => {
    const names = p[keys.namesKey] || [];
    const family = p.familyNames || [];
    return names.some(n => n[keys.nameKey]) || family.some(f => f.familyName);
  });
  if (!nonEmpty.length) return '';

  let html = '<table class="pv-inner-table"><thead><tr>';
  html += '<th>#</th><th>姓名</th><th>姓 / 名</th><th>識別子</th><th>所属</th>';
  html += '</tr></thead><tbody>';

  nonEmpty.forEach((p, i) => {
    const names = (p[keys.namesKey] || []).filter(n => n[keys.nameKey])
      .map(n => fmtVal(n[keys.nameKey], n[keys.nameLangKey])).join('<br>');
    const fam = (p.familyNames || []).filter(f => f.familyName).map(f => fmtVal(f.familyName, f.familyNameLang));
    const giv = (p.givenNames || []).filter(g => g.givenName).map(g => fmtVal(g.givenName, g.givenNameLang));
    const famGiv = [...fam, ...giv].join(' / ');
    const ids = (p.nameIdentifiers || []).filter(ni => ni.nameIdentifier)
      .map(ni => (ni.nameIdentifierScheme ? ni.nameIdentifierScheme + ': ' : '') + fmtVal(ni.nameIdentifier))
      .join('<br>');
    const affs = (p[keys.affKey] || []).map(aff => {
      const affNames = (aff[keys.affNameKey] || []).filter(an => an[keys.affNameField])
        .map(an => fmtVal(an[keys.affNameField], an[keys.affNameLangField])).join(', ');
      return affNames;
    }).filter(Boolean).join('<br>');

    html += '<tr><td>' + i + '</td><td>' + names + '</td><td>' + famGiv + '</td><td>' + ids + '</td><td>' + affs + '</td></tr>';
  });
  html += '</tbody></table>';
  return html;
}

function buildRelationPreview(relations) {
  if (!Array.isArray(relations) || !relations.length) return '';
  const nonEmpty = relations.filter(r =>
    r.subitem_relation_type || r.subitem_relation_type_id?.subitem_relation_type_id_text
  );
  if (!nonEmpty.length) return '';

  let html = '<table class="pv-table">';
  nonEmpty.forEach((r, i) => {
    const id = r.subitem_relation_type_id || {};
    const parts = [
      r.subitem_relation_type || '',
      id.subitem_relation_type_select ? '[' + id.subitem_relation_type_select + ']' : '',
      fmtVal(id.subitem_relation_type_id_text),
    ].filter(Boolean).join(' ');
    html += '<tr><th>\u95A2\u9023[' + i + ']</th><td>' + parts + '</td></tr>';
  });
  html += '</table>';
  return html;
}

function buildFundingPreview(funders) {
  if (!Array.isArray(funders) || !funders.length) return '';
  const nonEmpty = funders.filter(f =>
    f.subitem_funder_names?.some(n => n.subitem_funder_name) ||
    f.subitem_award_numbers?.subitem_award_number
  );
  if (!nonEmpty.length) return '';

  let html = '<table class="pv-inner-table"><thead><tr>';
  html += '<th>#</th><th>\u52A9\u6210\u6A5F\u95A2\u540D</th><th>\u8B58\u5225\u5B50</th><th>\u8AB2\u984C\u756A\u53F7</th><th>\u8AB2\u984C\u540D</th>';
  html += '</tr></thead><tbody>';

  nonEmpty.forEach((f, i) => {
    const names = (f.subitem_funder_names || []).filter(n => n.subitem_funder_name)
      .map(n => fmtVal(n.subitem_funder_name, n.subitem_funder_name_language)).join('<br>');
    const fId = f.subitem_funder_identifiers || {};
    const idStr = fId.subitem_funder_identifier
      ? (fId.subitem_funder_identifier_type ? fId.subitem_funder_identifier_type + ': ' : '') + fmtVal(fId.subitem_funder_identifier)
      : '';
    const aw = f.subitem_award_numbers || {};
    const awardStr = aw.subitem_award_number
      ? fmtVal(aw.subitem_award_number) + (aw.subitem_award_uri ? ' (' + fmtVal(aw.subitem_award_uri) + ')' : '')
      : '';
    const titles = (f.subitem_award_titles || []).filter(t => t.subitem_award_title)
      .map(t => fmtVal(t.subitem_award_title, t.subitem_award_title_language)).join('<br>');
    html += '<tr><td>' + i + '</td><td>' + names + '</td><td>' + idStr + '</td><td>' + awardStr + '</td><td>' + titles + '</td></tr>';
  });
  html += '</tbody></table>';
  return html;
}

function buildBiblioPreview(obj) {
  if (!obj) return '';
  let html = '<table class="pv-table">';
  const titles = (obj.bibliographic_titles || []).filter(t => t.bibliographic_title)
    .map(t => fmtVal(t.bibliographic_title, t.bibliographic_titleLang)).join(', ');
  if (titles) html += '<tr><th>\u96D1\u8A8C\u540D</th><td>' + titles + '</td></tr>';
  const parts = [
    obj.bibliographicVolumeNumber ? 'Vol.' + obj.bibliographicVolumeNumber : '',
    obj.bibliographicIssueNumber ? 'No.' + obj.bibliographicIssueNumber : '',
    (obj.bibliographicPageStart || obj.bibliographicPageEnd)
      ? 'pp.' + (obj.bibliographicPageStart || '?') + '\u2013' + (obj.bibliographicPageEnd || '?')
      : '',
    obj.bibliographicNumberOfPages ? '(' + obj.bibliographicNumberOfPages + 'p)' : '',
  ].filter(Boolean).join(', ');
  if (parts) html += '<tr><th>\u5DFB\u53F7\u30DA\u30FC\u30B8</th><td>' + parts + '</td></tr>';
  const bd = obj.bibliographicIssueDates || {};
  if (bd.bibliographicIssueDate) {
    html += '<tr><th>\u767A\u884C\u65E5</th><td>' + bd.bibliographicIssueDate + (bd.bibliographicIssueDateType ? ' (' + bd.bibliographicIssueDateType + ')' : '') + '</td></tr>';
  }
  html += '</table>';
  return html === '<table class="pv-table"></table>' ? '' : html;
}

function buildRightsHolderPreview(holders) {
  if (!Array.isArray(holders) || !holders.length) return '';
  const nonEmpty = holders.filter(rh => rh.rightHolderNames?.some(n => n.rightHolderName));
  if (!nonEmpty.length) return '';

  let html = '<table class="pv-inner-table"><thead><tr><th>#</th><th>\u6A29\u5229\u8005\u540D</th><th>\u8B58\u5225\u5B50</th></tr></thead><tbody>';
  nonEmpty.forEach((rh, i) => {
    const names = (rh.rightHolderNames || []).filter(n => n.rightHolderName)
      .map(n => fmtVal(n.rightHolderName, n.rightHolderLanguage)).join('<br>');
    const ids = (rh.nameIdentifiers || []).filter(ni => ni.nameIdentifier)
      .map(ni => (ni.nameIdentifierScheme ? ni.nameIdentifierScheme + ': ' : '') + fmtVal(ni.nameIdentifier))
      .join('<br>');
    html += '<tr><td>' + i + '</td><td>' + names + '</td><td>' + ids + '</td></tr>';
  });
  html += '</tbody></table>';
  return html;
}

function buildGeolocationPreview(geos) {
  if (!Array.isArray(geos) || !geos.length) return '';
  let html = '<table class="pv-table">';
  let hasContent = false;
  geos.forEach((geo, i) => {
    const pt = geo.subitem_geolocation_point || {};
    if (pt.subitem_point_longitude || pt.subitem_point_latitude) {
      html += '<tr><th>\u70B9[' + i + ']</th><td>\u7D4C\u5EA6: ' + pt.subitem_point_longitude + ', \u7DEF\u5EA6: ' + pt.subitem_point_latitude + '</td></tr>';
      hasContent = true;
    }
    const bx = geo.subitem_geolocation_box || {};
    if (bx.subitem_west_longitude || bx.subitem_east_longitude) {
      html += '<tr><th>\u7A7A\u9593[' + i + ']</th><td>W:' + bx.subitem_west_longitude + ' E:' + bx.subitem_east_longitude + ' S:' + bx.subitem_south_latitude + ' N:' + bx.subitem_north_latitude + '</td></tr>';
      hasContent = true;
    }
    (geo.subitem_geolocation_place || []).forEach(pl => {
      if (pl.subitem_geolocation_place_text) {
        html += '<tr><th>\u5730\u540D[' + i + ']</th><td>' + fmtVal(pl.subitem_geolocation_place_text) + '</td></tr>';
        hasContent = true;
      }
    });
  });
  html += '</table>';
  return hasContent ? html : '';
}

function buildConferencePreview(confs) {
  if (!Array.isArray(confs) || !confs.length) return '';
  const nonEmpty = confs.filter(c => c.subitem_conference_names?.some(n => n.subitem_conference_name));
  if (!nonEmpty.length) return '';

  let html = '<table class="pv-table">';
  nonEmpty.forEach((c, i) => {
    const names = (c.subitem_conference_names || []).filter(n => n.subitem_conference_name)
      .map(n => fmtVal(n.subitem_conference_name, n.subitem_conference_name_language)).join(', ');
    if (names) html += '<tr><th>\u4F1A\u8B70\u540D[' + i + ']</th><td>' + names + '</td></tr>';
    if (c.subitem_conference_sequence) html += '<tr><th>\u56DE\u6B21</th><td>' + c.subitem_conference_sequence + '</td></tr>';
    const sponsors = (c.subitem_conference_sponsors || []).filter(s => s.subitem_conference_sponsor)
      .map(s => fmtVal(s.subitem_conference_sponsor, s.subitem_conference_sponsor_language)).join(', ');
    if (sponsors) html += '<tr><th>\u4E3B\u50AC\u6A5F\u95A2</th><td>' + sponsors + '</td></tr>';
    const cd = c.subitem_conference_date || {};
    const dateParts = [
      cd.subitem_conference_start_year, cd.subitem_conference_start_month, cd.subitem_conference_start_day
    ].filter(Boolean).join('/');
    const dateEnd = [
      cd.subitem_conference_end_year, cd.subitem_conference_end_month, cd.subitem_conference_end_day
    ].filter(Boolean).join('/');
    const dateStr = [dateParts, dateEnd].filter(Boolean).join(' \u2013 ') || cd.subitem_conference_period || '';
    if (dateStr) html += '<tr><th>\u958B\u50AC\u671F\u9593</th><td>' + dateStr + '</td></tr>';
    const venues = (c.subitem_conference_venues || []).filter(v => v.subitem_conference_venue)
      .map(v => fmtVal(v.subitem_conference_venue, v.subitem_conference_venue_language)).join(', ');
    if (venues) html += '<tr><th>\u958B\u50AC\u4F1A\u5834</th><td>' + venues + '</td></tr>';
    const places = (c.subitem_conference_places || []).filter(p => p.subitem_conference_place)
      .map(p => fmtVal(p.subitem_conference_place, p.subitem_conference_place_language)).join(', ');
    if (places) html += '<tr><th>\u958B\u50AC\u5730</th><td>' + places + '</td></tr>';
    if (c.subitem_conference_country) html += '<tr><th>\u958B\u50AC\u56FD</th><td>' + c.subitem_conference_country + '</td></tr>';
  });
  html += '</table>';
  return html;
}

function buildSectionPreview(def, val) {
  switch (def.type) {
    case 'object':      return buildObjectPreview(def, val);
    case 'array':       return buildArrayPreview(def, val);
    case 'creator':     return buildPersonPreview(val, true);
    case 'contributor':  return buildPersonPreview(val, false);
    case 'relation':    return buildRelationPreview(val);
    case 'funding':     return buildFundingPreview(val);
    case 'biblio':      return buildBiblioPreview(val);
    case 'rightsHolder': return buildRightsHolderPreview(val);
    case 'geolocation':  return buildGeolocationPreview(val);
    case 'conference':   return buildConferencePreview(val);
    default: return '';
  }
}

function buildPreviewTable(metadata) {
  let html = '';

  // システムフィールド
  html += '<div class="pv-section-header">\u30B7\u30B9\u30C6\u30E0\uFF08\u7BA1\u7406\u30D5\u30A3\u30FC\u30EB\u30C9\uFF09</div>';
  html += '<table class="pv-table">';
  const sysLabels = {
    id: '.id', uri: '.uri', path: '.IndexID[0]', pos_index: '.POS_INDEX[0]',
    publish_status: '.PUBLISH_STATUS', feedback_mail: '.FEEDBACK_MAIL[0]',
    cnri: '.CNRI', doi_ra: '.DOI_RA', doi: '.DOI', edit_mode: 'Keep/Upgrade',
    pubdate: '\u516C\u958B\u65E5',
  };
  for (const [k, label] of Object.entries(sysLabels)) {
    const v = metadata.system?.[k] || '';
    if (!v) continue;
    html += '<tr><th>' + label + '</th><td>' + fmtVal(v) + '</td></tr>';
  }
  html += '</table>';

  // メタデータフィールド
  for (const def of FIELD_DEFS) {
    const val = metadata[def.key];
    const sectionHtml = buildSectionPreview(def, val);
    if (sectionHtml) {
      html += '<div class="pv-section-header">' + def.label + '</div>';
      html += sectionHtml;
    }
  }

  return html;
}

function showPreview() {
  const metadata = collectFromDOM();
  const html = buildPreviewTable(metadata);
  document.getElementById('preview-modal-body').innerHTML = html;
  document.getElementById('preview-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  document.getElementById('preview-modal').style.display = 'none';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePreview(); closeOpfModal(); }
});
document.getElementById('preview-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closePreview();
});

// ===== Enter キー =====
document.getElementById('doi-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchData();
});

// ===== APIキー未設定警告（Chrome拡張ではstorage読み込み後に判定） =====
(async function checkApiKeyWarnings() {
  await loadConfig();
  if (!CONFIG.OpenAlex_API_KEY || CONFIG.OpenAlex_API_KEY === 'YOUR_OpenAlex_API_KEY') {
    document.getElementById('apikey-warning').style.display = 'block';
  }
  if (!CONFIG.CiNii_API_KEY || CONFIG.CiNii_API_KEY === 'YOUR_CiNii_API_KEY') {
    document.getElementById('cinii-apikey-warning').style.display = 'block';
  }
})();

// ===== 更新チェック =====
(async function checkForUpdate() {
  const LOCAL_VERSION = '2026-03-05';
  try {
    const res = await fetch('https://api.github.com/repos/tzhaya/jc-import-file-maker/commits?path=make_jc_importer.html&per_page=1');
    if (!res.ok) return;
    const commits = await res.json();
    if (!commits.length) return;
    const remoteDate = commits[0].commit.committer.date.slice(0, 10);
    if (remoteDate > LOCAL_VERSION) {
      const el = document.getElementById('update-check');
      if (el) {
        el.innerHTML = ' &nbsp;| &nbsp;<a href="https://github.com/tzhaya/jc-import-file-maker" target="_blank" '
          + 'style="color:#c62828; font-weight:bold; text-decoration:none;">'
          + '\uD83D\uDD14 更新版があります（' + remoteDate + '）</a>';
      }
    }
  } catch (_) { /* オフライン時は静かに無視 */ }
})();

// ===== イベントリスナー登録（Chrome拡張CSP対応） =====
document.getElementById('fetch-btn').addEventListener('click', fetchData);
document.getElementById('empty-btn').addEventListener('click', showEmptyFields);
document.getElementById('preview-btn').addEventListener('click', showPreview);
document.getElementById('opf-badge').addEventListener('click', openOpfModal);
document.getElementById('opf-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeOpfModal();
});
document.querySelector('#opf-modal button').addEventListener('click', closeOpfModal);
document.querySelector('#preview-modal .modal-close').addEventListener('click', closePreview);
