// ============================================================
// WEKO3 OpenSearch 共通コア（#241）
// opensearch_panel.js（#237）と openalex_panel.js の重複照合バッジ（#156）が
// 共有する純粋関数・定数を集約する。
//
// 公開方式（ブラウザ／CommonJS 両対応）:
//   - ブラウザ: 各パネル JS より前に <script src> で読み込み、
//     globalThis.Weko3OpenSearchCore から参照する。
//   - Node（node:test）: require('./weko3_opensearch_core.js') で取得する。
//
// ※ 素のトップレベル const/function をグローバルに撒くと、同一ページで読み込む
//    パネル JS 側の同名定義と衝突して SyntaxError になる。名前空間オブジェクト
//    （Weko3OpenSearchCore）としてのみ公開すること。
// ============================================================
(function () {
  'use strict';

  // ===== 通信先ホスト制限（spec §2 / §7） =====
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

  // HTTPS かつ許可ホスト（*.repo.nii.ac.jp または固定追加許可ホスト）のみ true。
  // optional_host_permissions でユーザーが実行時許可した任意ホストは対象外（静的判定）。
  function isAllowedHost(repoUrl) {
    let parsed;
    try { parsed = new URL(repoUrl); } catch { return false; }
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    return ALLOWED_HOST_PATTERN.test(host) || ALLOWED_HOSTS_EXTRA.has(host);
  }

  // RDF 名前空間（JPCOAR/OpenSearch 応答の rdf:Description 走査に使用）
  const NS_RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

  // WEKO3 の format=jpcoar は JSON のヒット順をページ内で逆順に列挙する
  // （JIRCAS・筑波大学で 2026-07-14 実測・spec §4.1）。API の指定順へ戻す。
  function normalizeJpcoarItemOrder(items) {
    return [...items].reverse();
  }

  // DOI を素の形（小文字・プレフィックス除去）に
  function bareDoi(doi) {
    return (doi || '')
      .trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:/i, '')
      .toLowerCase();
  }

  const api = {
    ALLOWED_HOST_PATTERN,
    ALLOWED_HOSTS_EXTRA,
    isAllowedHost,
    NS_RDF,
    normalizeJpcoarItemOrder,
    bareDoi,
  };

  // Node（node:test）: module.exports で公開
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  // ブラウザ: グローバル名前空間で公開
  if (typeof globalThis !== 'undefined') {
    globalThis.Weko3OpenSearchCore = api;
  }
})();
