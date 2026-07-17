#!/usr/bin/env node
// Quality checks: JSON parse + JS syntax + UTF-8 validity for self-authored files.
// Run via: npm test
// Does NOT require network, API keys, or a browser.

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const JSON_FILES = [
  'package.json',
  'package-lock.json',
  'chrome-extension/manifest.json',
  'data/tsv_headers.json',
];

const JS_FILES = [
  'shared.js',
  'tsv_headers_template.js',
  'chrome-extension/background.js',
  'chrome-extension/funder_lookup.js',
  'chrome-extension/make_jc_importer.js',
  'chrome-extension/openalex_panel.js',
  'chrome-extension/opensearch_panel.js',
  'chrome-extension/options.js',
  'chrome-extension/shared.js',
  'chrome-extension/tsv_headers_template.js',
  'chrome-extension/weko3_opensearch_core.js',
  // ユニットテスト（#192）
  'tests/doi.test.js',
  'tests/abstract.test.js',
  'tests/tsv.test.js',
  'tests/aff-misattribution.test.js',
  'tests/access-rights.test.js',
  'tests/opensearch.test.js',
  'tests/openalex-match.test.js',
];

// Text files that may contain Japanese — verify no encoding corruption (#175)
const UTF8_FILES = [
  ...JSON_FILES,
  ...JS_FILES,
  // Markdown
  'README.md',
  'docs/README.md',
  'docs/privacy-policy.md',
  'docs/user_guide.md',
  'docs/settings.md',
  'docs/developer_docs.md',
  'docs/requirements.md',
  'docs/fields.md',
  'docs/handover_cors_extension.md',
  'docs/Implementation_JaLC.md',
  'docs/datacite_jpcoar_mapping.md',
  'docs/current_review_2026-07-05.md',
  'docs/roadmap_2026-07-05.md',
  'docs/resource_type_vocabulary.md',
  'docs/weko3-opensearch-client-spec.md',
  'docs/weko3-opensearch-client-general-spec.md',
  'function.md',
  // HTML (standalone)
  'make_jc_importer.html',
  'funder_lookup.html',
  'openalex_lookup.html',
  // HTML (Chrome extension)
  'chrome-extension/panel.html',
  'chrome-extension/funder_panel.html',
  'chrome-extension/openalex_panel.html',
  'chrome-extension/opensearch_panel.html',
  'chrome-extension/options.html',
  // GitHub Pages
  'docs/index.html',
];

let errors = 0;

function check(label, fn) {
  try {
    fn();
    process.stdout.write(`  ✓ ${label}\n`);
  } catch (e) {
    process.stderr.write(`  ✗ ${label}: ${e.message}\n`);
    errors++;
  }
}

console.log('--- JSON parse ---');
for (const f of JSON_FILES) {
  check(f, () => {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    JSON.parse(src);
  });
}

console.log('--- JS syntax (node --check) ---');
for (const f of JS_FILES) {
  check(f, () => {
    execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
  });
}

// TextDecoder with fatal:true throws on invalid byte sequences (#175)
console.log('--- UTF-8 validity ---');
const decoder = new TextDecoder('utf-8', { fatal: true });
for (const f of UTF8_FILES) {
  check(f, () => {
    const buf = fs.readFileSync(path.join(ROOT, f));
    decoder.decode(buf);
  });
}

// File sync pairs (#193)
console.log('--- File sync ---');
const SYNC_PAIRS = [
  ['shared.js', 'chrome-extension/shared.js'],
  ['tsv_headers_template.js', 'chrome-extension/tsv_headers_template.js'],
];
for (const [a, b] of SYNC_PAIRS) {
  check(`${a} ↔ ${b}`, () => {
    const ca = fs.readFileSync(path.join(ROOT, a), 'utf8');
    const cb = fs.readFileSync(path.join(ROOT, b), 'utf8');
    if (ca !== cb) throw new Error(`Content mismatch`);
  });
}

// TSV_HEADERS_TEMPLATE (JS) ↔ data/tsv_headers.json structure sync
console.log('--- TSV headers structure ---');
check('tsv_headers_template.js ↔ data/tsv_headers.json', () => {
  const vm = require('vm');

  // Read and evaluate template
  const templateSrc = fs.readFileSync(path.join(ROOT, 'tsv_headers_template.js'), 'utf8');
  const templateContext = {};
  vm.runInNewContext(`${templateSrc}; this.template = TSV_HEADERS_TEMPLATE;`, templateContext, { timeout: 5000 });
  const template = templateContext.template;

  // Read JSON
  const jsonSrc = fs.readFileSync(path.join(ROOT, 'data/tsv_headers.json'), 'utf8');
  const jsonData = JSON.parse(jsonSrc);

  // Deep compare (stringify for structure + order equality)
  if (JSON.stringify(template) !== JSON.stringify(jsonData)) {
    throw new Error(`Structure mismatch`);
  }
});

if (errors > 0) {
  process.stderr.write(`\n${errors} check(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
