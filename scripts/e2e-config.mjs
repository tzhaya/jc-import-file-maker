export const E2E_RECORD_DIR = '.e2e-results';
export const E2E_SCHEMA_VERSION = 1;
export const E2E_SUITES = new Set(['regression']);

export const E2E_TARGETS = {
  main: {
    file: 'make_jc_importer_test.html',
    executionFiles: ['make_jc_importer_test.html'],
    files: ['make_jc_importer.html', 'shared.js', 'tsv_headers_template.js'],
    defaultInput: '10.1016/j.advnut.2025.100480',
  },
  funder: {
    file: 'funder_lookup_test.html',
    executionFiles: ['funder_lookup_test.html'],
    files: ['funder_lookup.html', 'shared.js'],
    defaultInput: 'JPMJPR2125',
  },
  openalex: {
    file: 'openalex_lookup.html',
    executionFiles: ['openalex_lookup.html'],
    files: ['openalex_lookup.html', 'shared.js'],
    defaultInput: '005pdtr14',
  },
};

export const E2E_TARGETS_BY_FILE = new Map();
for (const [target, config] of Object.entries(E2E_TARGETS)) {
  for (const file of config.files) {
    const targets = E2E_TARGETS_BY_FILE.get(file) || [];
    if (!targets.includes(target)) targets.push(target);
    E2E_TARGETS_BY_FILE.set(file, targets);
  }
}

export function validateE2ERecord(record, target) {
  if (
    record?.schemaVersion !== E2E_SCHEMA_VERSION ||
    record?.target !== target ||
    record?.result !== 'passed' ||
    !E2E_SUITES.has(record?.suite)
  ) {
    throw new Error('invalid record metadata');
  }
  const requiredFiles = E2E_TARGETS[target]?.files;
  if (!requiredFiles) throw new Error(`unknown E2E target: ${target}`);
  const recordedFiles = Object.keys(record.files || {}).sort();
  if (JSON.stringify(recordedFiles) !== JSON.stringify([...requiredFiles].sort())) {
    throw new Error(`record files do not match required ${target} artifacts`);
  }
  const executionFiles = E2E_TARGETS[target].executionFiles;
  const recordedExecutionFiles = Object.keys(record.executionFiles || {}).sort();
  if (JSON.stringify(recordedExecutionFiles) !== JSON.stringify([...executionFiles].sort())) {
    throw new Error(`record executionFiles do not match required ${target} inputs`);
  }
  return requiredFiles;
}
