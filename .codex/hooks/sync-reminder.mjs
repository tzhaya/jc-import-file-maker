// PostToolUse(Edit|Write) hook: 本番HTML / 共有JS を編集したら同期先をリマインドする。
// 本番ファイルからのみ発火（chrome-extension/ 内のコピーや *_test.html では発火しない）。
import fs from 'node:fs';

let data;
try {
  data = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const fp = String(data?.tool_input?.file_path || '').replace(/\\/g, '/');
if (!fp) process.exit(0);

// 同期元（コピー先や test 版では発火させない）
if (fp.includes('/chrome-extension/')) process.exit(0);
const base = fp.split('/').pop();
if (base.endsWith('_test.html')) process.exit(0);

const reminders = {
  'make_jc_importer.html':
    '同期先 → make_jc_importer_test.html / chrome-extension/make_jc_importer.js（addEventListener注意） / chrome-extension/panel.html（更新概要）。CONFIGのAPIキーは残す。',
  'funder_lookup.html':
    '同期先 → funder_lookup_test.html / chrome-extension/funder_lookup.js / chrome-extension/funder_panel.html（最終更新日）。CONFIGのAPIキーは残す。',
  'shared.js':
    '同期先 → chrome-extension/shared.js（同一内容コピー）。',
  'tsv_headers_template.js':
    '同期先 → chrome-extension/tsv_headers_template.js（同一内容コピー）。',
  'openalex_lookup.html':
    '同期先 → chrome-extension/openalex_panel.js / openalex_panel.html（同一ロジック）。テスト版HTMLは無し。',
};

const msg = reminders[base];
if (!msg) process.exit(0);

const output = {
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: `[同期リマインダー] ${base} を編集しました。${msg} PR前は /prepare-pr で最終確認。`,
  },
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
