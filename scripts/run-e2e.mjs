import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  E2E_RECORD_DIR,
  E2E_SCHEMA_VERSION,
  E2E_SUITES,
  E2E_TARGETS,
} from './e2e-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const { target, input } = parseArgs(process.argv.slice(2));
const configs = E2E_TARGETS;

if (!configs[target]) {
  console.error('Usage: node run-e2e.mjs <main|funder|openalex> [input]');
  process.exit(2);
}

const config = { ...configs[target], value: input || configs[target].defaultInput };
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

let checks;
let details = {};
let linkedAwards = [];
try {
  await page.goto(pathToFileURL(path.join(root, config.file)).href);
  if (target === 'main') ({ checks, ...details } = await testMain(page, config.value));
  if (target === 'funder') checks = await testFunder(page, config.value);
  if (target === 'openalex') checks = await testOpenAlex(page, config.value);
  if (target === 'main' && checks.every((check) => check.ok)) {
    linkedAwards = details.awardNumbers || [];
    for (const awardNumber of linkedAwards) {
      await page.goto(pathToFileURL(path.join(root, E2E_TARGETS.funder.file)).href);
      const funderChecks = await testFunder(page, awardNumber);
      checks.push(...funderChecks.map((check) => ({ ...check, field: `funder(${awardNumber}) ${check.field}` })));
    }
  }
} catch (error) {
  checks = [{ field: '実行', ok: false, value: error.message }];
} finally {
  await browser.close();
}

for (const message of pageErrors) checks.push({ field: 'pageerror', ok: false, value: message });
const passed = checks.every((check) => check.ok);
for (const check of checks) console.log(`[${check.ok ? 'PASS' : 'FAIL'}] ${check.field}: ${check.value}`);
if (target === 'main') {
  const awardNumbers = details.awardNumbers || [];
  console.log(`AWARD_NUMBERS=${awardNumbers.join(',')}`);
}

if (passed) {
  await writeRecord(target, config.value);
  if (linkedAwards.length > 0) await writeRecord('funder', linkedAwards.join(','));
}

console.log(`result: ${passed ? 'ALL PASSED' : 'SOME FAILED'}`);
process.exit(passed ? 0 : 1);

async function testMain(page, value) {
  await page.fill('#doi-input', value);
  await page.click('#fetch-btn');
  await page.waitForFunction(() => document.querySelector('#metadata-fields')?.children.length > 0, null, { timeout: 45000 });
  await page.waitForTimeout(5000);
  const result = await page.evaluate(() => {
    const root = document.querySelector('#metadata-fields');
    const title = root.querySelector('[data-key*="title"] input[type="text"]')?.value || '';
    const authors = root.querySelectorAll('[data-key*="creator"] .nested-item.level-1').length;
    const resourceType = root.querySelector('[data-key*="resource_type"] select')?.value || '';
    const doi = document.querySelector('#doi-link')?.href || '';
    const sectionCount = root.children.length;
    const awardNumbers = [];
    const funding = root.querySelector('[data-key*="funding"]');
    for (const input of funding?.querySelectorAll('input[type="text"]') || []) {
      const value = input.value.trim();
      if (/^JP[A-Za-z0-9]+$/.test(value)) awardNumbers.push(value);
    }
    return { checks: [
      { field: 'タイトル', ok: title.length > 0, value: title.slice(0, 80) || '(空)' },
      { field: '著者', ok: authors > 0, value: `${authors}人` },
      { field: 'DOI', ok: doi.includes('doi.org'), value: doi || '(空)' },
      { field: '資源タイプ', ok: resourceType.length > 0, value: resourceType || '(空)' },
      { field: 'セクション数', ok: sectionCount > 10, value: `${sectionCount}セクション` },
    ], awardNumbers };
  });
  return result;
}

async function testFunder(page, value) {
  await page.fill('#award-input', value);
  await page.click('#search-btn');
  await page.waitForSelector('.result-card, .error-message', { timeout: 30000 });
  await page.waitForTimeout(3000);
  const count = await page.locator('.result-card').count();
  const cardText = count > 0 ? (await page.locator('.result-card').first().textContent() || '') : '';
  return [
    { field: '結果カード', ok: count > 0, value: `${count}件` },
    { field: 'カード内容', ok: cardText.trim().length > 10, value: cardText.trim().slice(0, 100) || '(空)' },
  ];
}

async function testOpenAlex(page, value) {
  await page.fill('#q-ror', value);
  await page.fill('#q-days', '30');
  await page.click('#btn-search');
  await page.waitForFunction(() => document.querySelectorAll('#result-tbody tr').length > 0, null, { timeout: 60000 });
  return page.evaluate(() => {
    const rows = document.querySelectorAll('#result-tbody tr');
    const doi = rows[0]?.querySelector('a[href*="doi.org"]')?.href || '';
    const warn = document.querySelectorAll('#result-tbody .col-warn').length;
    const info = document.querySelector('#result-info')?.textContent?.trim() || '';
    return [
      { field: '結果行', ok: rows.length > 0, value: `${rows.length}件` },
      { field: '件数メッセージ', ok: info.length > 0, value: info.slice(0, 80) || '(空)' },
      { field: 'DOI', ok: doi.includes('doi.org'), value: doi || '(空)' },
      { field: '所属確認列', ok: warn > 0, value: warn > 0 ? 'あり' : 'なし' },
    ];
  });
}

function parseArgs(args) {
  return { target: args[0] || 'main', input: args[1] };
}

async function writeRecord(recordTarget, recordInput) {
  const recordConfig = E2E_TARGETS[recordTarget];
  const hashFiles = async (files) => Object.fromEntries(await Promise.all(files.map(async (file) => {
    const bytes = await readFile(path.join(root, file));
    return [file, createHash('sha256').update(bytes).digest('hex')];
  })));
  const record = {
    schemaVersion: E2E_SCHEMA_VERSION,
    commit: gitHead(),
    executedAtJst: jstTimestamp(),
    target: recordTarget,
    suite: 'regression',
    input: recordInput,
    files: await hashFiles(recordConfig.files),
    executionFiles: await hashFiles(recordConfig.executionFiles),
    result: 'passed',
    limitation: 'This record binds results to file hashes; it does not independently prove browser execution.',
  };
  const resultDir = path.join(root, E2E_RECORD_DIR);
  await mkdir(resultDir, { recursive: true });
  await writeFile(path.join(resultDir, `${recordTarget}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

function gitHead() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); }
  catch { return null; }
}

function jstTimestamp() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
  return `${parts.replace(' ', 'T')}+09:00`;
}
