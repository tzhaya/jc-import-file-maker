#!/usr/bin/env node
// 正本（リポジトリ直下）から Chrome 拡張ディレクトリへの同期コピー。
// 実行: npm run build
// コピー元を編集したら本スクリプトを実行する。ペアの一致は
// scripts/check.js（npm test / CI）の File sync 検査が保証する。

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// [正本, コピー先]。check.js の File sync 検査もこのリストを参照する
const COPY_PAIRS = [
  ['shared.js', 'chrome-extension/shared.js'],
  ['tsv_headers_template.js', 'chrome-extension/tsv_headers_template.js'],
  ['make_jc_importer.js', 'chrome-extension/make_jc_importer.js'],
  ['funder_lookup.js', 'chrome-extension/funder_lookup.js'],
];

function build() {
  for (const [src, dest] of COPY_PAIRS) {
    fs.copyFileSync(path.join(ROOT, src), path.join(ROOT, dest));
    console.log(`  ✓ ${src} → ${dest}`);
  }
}

if (require.main === module) build();

module.exports = { COPY_PAIRS };
