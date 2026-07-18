#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  E2E_RECORD_DIR,
  E2E_TARGETS_BY_FILE,
  validateE2ERecord,
} from './e2e-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const requiredTargets = new Set();
const changedFiles = getChangedFiles(args);

for (const file of changedFiles) {
  for (const target of E2E_TARGETS_BY_FILE.get(file) || []) requiredTargets.add(target);
}

if (args.includes('--require') && requiredTargets.size === 0) {
  for (const target of ['main', 'funder', 'openalex']) requiredTargets.add(target);
}

if (requiredTargets.size === 0) {
  console.log('E2E record check skipped: no E2E-bound files changed.');
  process.exit(0);
}

let failures = 0;
for (const target of requiredTargets) {
  try {
    const recordPath = path.join(root, E2E_RECORD_DIR, `${target}.json`);
    const record = JSON.parse(await readFile(recordPath, 'utf8'));
    const requiredFiles = validateE2ERecord(record, target);
    for (const file of requiredFiles) {
      const expected = record.files[file];
      const bytes = await readFile(path.join(root, file));
      const actual = createHash('sha256').update(bytes).digest('hex');
      if (actual !== expected) throw new Error(`${file} changed after E2E`);
    }
    for (const [file, expected] of Object.entries(record.executionFiles)) {
      try {
        const bytes = await readFile(path.join(root, file));
        const actual = createHash('sha256').update(bytes).digest('hex');
        if (actual !== expected) throw new Error(`${file} changed after E2E`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        console.log(`INFO e2e:${target} execution input unavailable in checkout: ${file}`);
      }
    }
    console.log(`PASS e2e:${target} artifacts matched (${record.executedAtJst})`);
  } catch (error) {
    failures++;
    console.error(`FAIL e2e:${target}: ${error.message}`);
  }
}

if (failures) process.exit(1);

function getChangedFiles(argv) {
  const fromIndex = argv.indexOf('--changed-from');
  try {
    const commands = fromIndex >= 0 && argv[fromIndex + 1]
      ? [['diff', '--name-only', `${argv[fromIndex + 1]}...HEAD`]]
      : argv.includes('--require-if-changed')
        ? [['diff', '--name-only', 'master...HEAD'], ['diff', '--name-only', 'HEAD']]
        : [['diff', '--name-only', 'HEAD']];
    const files = new Set();
    for (const gitArgs of commands) {
      const output = execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' });
      for (const line of output.split(/\r?\n/)) if (line.trim()) files.add(line.trim());
    }
    return [...files];
  } catch (error) {
    console.error(`Unable to determine changed files: ${error.message}`);
    process.exit(2);
  }
}
