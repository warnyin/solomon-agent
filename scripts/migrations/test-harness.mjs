#!/usr/bin/env node
// scripts/migrations/test-harness.mjs — Round 4 #39.
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, '..', '..', 'tests', 'migrations', 'fixtures');

async function loadManifest() {
  return JSON.parse(await fs.readFile(join(HERE, 'MANIFEST.json'), 'utf8'));
}

async function runOne({ from, to, script }) {
  try {
    const from_state = JSON.parse(await fs.readFile(join(FIXTURES_DIR, `${from}.json`), 'utf8'));
    const expected_to = JSON.parse(await fs.readFile(join(FIXTURES_DIR, `${to}.json`), 'utf8'));
    const mod = await import(pathToFileURL(join(HERE, script)).href);
    const actual = await mod.migrate(from_state);
    const ok = JSON.stringify(actual) === JSON.stringify(expected_to);
    return { from, to, status: ok ? 'pass' : 'fail' };
  } catch (e) { return { from, to, status: 'error', error: e.message }; }
}

async function main() {
  const manifest = await loadManifest();
  if (manifest.migrations.length === 0) {
    console.log('[migrations/test-harness] no migrations registered (v0.1 baseline)');
    return process.exit(0);
  }
  const results = await Promise.all(manifest.migrations.map(runOne));
  let exit = 0;
  for (const r of results) {
    console.log(`${r.from} → ${r.to}: ${r.status}${r.error ? ' (' + r.error + ')' : ''}`);
    if (r.status !== 'pass') exit = 1;
  }
  process.exit(exit);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
