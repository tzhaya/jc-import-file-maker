#!/usr/bin/env node
// Quality checks: JSON parse + JS syntax + UTF-8 validity for self-authored files.
// Run via: npm test
// Does NOT require network, API keys, or a browser.

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// git追跡下のテキストファイルを拡張子で自動列挙する。
// 新規ファイルは追加登録なしで自動的に検査対象へ入る（旧: 手動リスト運用）。
// samples/ は外部API等から採取した参照データのため自作ファイルの検査対象外。
const TRACKED_FILES = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((f) => !f.startsWith('samples/'));
const byExt = (...exts) => TRACKED_FILES.filter((f) => exts.some((ext) => f.endsWith(ext)));

const JSON_FILES = byExt('.json');
const JS_FILES = byExt('.js', '.mjs');

// Text files that may contain Japanese — verify no encoding corruption (#175)
const UTF8_FILES = [...JSON_FILES, ...JS_FILES, ...byExt('.md', '.html', '.yml')];

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

// File sync pairs (#193): 正本→拡張のコピー（npm run build）が反映済みかを検証
console.log('--- File sync ---');
const { COPY_PAIRS: SYNC_PAIRS } = require('./build.js');
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
