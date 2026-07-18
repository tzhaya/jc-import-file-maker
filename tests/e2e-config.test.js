const test = require('node:test');
const assert = require('node:assert/strict');

const configPromise = import('../scripts/e2e-config.mjs');

test('mainのE2E記録は必須成果物が完全なら有効', async () => {
  const { E2E_TARGETS, validateE2ERecord } = await configPromise;
  const files = Object.fromEntries(E2E_TARGETS.main.files.map((file) => [file, 'hash']));
  const executionFiles = Object.fromEntries(E2E_TARGETS.main.executionFiles.map((file) => [file, 'hash']));
  assert.deepEqual(validateE2ERecord({
    schemaVersion: 1,
    target: 'main',
    suite: 'regression',
    result: 'passed',
    files,
    executionFiles,
  }, 'main'), E2E_TARGETS.main.files);
});

test('E2E記録から必須成果物を省略できない', async () => {
  const { validateE2ERecord } = await configPromise;
  assert.throws(() => validateE2ERecord({
    schemaVersion: 1,
    target: 'main',
    suite: 'regression',
    result: 'passed',
    files: { 'make_jc_importer.html': 'hash' },
    executionFiles: { 'make_jc_importer_test.html': 'hash' },
  }, 'main'), /do not match required/);
});

test('E2E記録へ任意のパスを追加できない', async () => {
  const { E2E_TARGETS, validateE2ERecord } = await configPromise;
  const files = Object.fromEntries(E2E_TARGETS.openalex.files.map((file) => [file, 'hash']));
  const executionFiles = Object.fromEntries(E2E_TARGETS.openalex.executionFiles.map((file) => [file, 'hash']));
  files['../outside'] = 'hash';
  assert.throws(() => validateE2ERecord({
    schemaVersion: 1,
    target: 'openalex',
    suite: 'regression',
    result: 'passed',
    files,
    executionFiles,
  }, 'openalex'), /do not match required/);
});

test('未定義suiteのE2E記録を拒否する', async () => {
  const { E2E_TARGETS, validateE2ERecord } = await configPromise;
  const files = Object.fromEntries(E2E_TARGETS.funder.files.map((file) => [file, 'hash']));
  const executionFiles = Object.fromEntries(E2E_TARGETS.funder.executionFiles.map((file) => [file, 'hash']));
  assert.throws(() => validateE2ERecord({
    schemaVersion: 1,
    target: 'funder',
    suite: 'custom',
    result: 'passed',
    files,
    executionFiles,
  }, 'funder'), /invalid record metadata/);
});
