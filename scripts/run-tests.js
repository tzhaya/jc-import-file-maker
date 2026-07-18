#!/usr/bin/env node

'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const commands = [
  [process.execPath, ['scripts/check.js']],
  [process.execPath, ['--test', 'tests/**/*.test.js']],
];

let output = '';
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: false });
  output += result.stdout || '';
  output += result.stderr || '';
  if (result.status !== 0) {
    process.stderr.write(output);
    process.exit(result.status || 1);
  }
}

const tests = Number(output.match(/^# tests (\d+)$/m)?.[1] || 0);
const pass = Number(output.match(/^# pass (\d+)$/m)?.[1] || 0);
const fail = Number(output.match(/^# fail (\d+)$/m)?.[1] || 0);
console.log('All checks passed');
console.log(`tests: ${tests}`);
console.log(`pass: ${pass}`);
console.log(`fail: ${fail}`);
