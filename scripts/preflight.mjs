#!/usr/bin/env node
// scripts/preflight.mjs — Round 5 #71.
import { promises as fs } from 'node:fs';

async function main() {
  const issues = [];
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 18) issues.push(`Node version ${process.versions.node} < required 18.0.0`);

  for (const [name, path] of [
    ['plugin.json', '.claude-plugin/plugin.json'],
    ['marketplace.json', '.claude-plugin/marketplace.json'],
    ['hooks.json', 'hooks/hooks.json'],
  ]) {
    try { JSON.parse(await fs.readFile(path, 'utf8')); }
    catch (e) { issues.push(`${name} invalid: ${e.message}`); }
  }

  if (issues.length) {
    console.error(`[preflight] ${issues.length} issue(s):`);
    for (const i of issues) console.error(`  - ${i}`);
    process.exit(1);
  }
  console.log(`[preflight] OK (node ${process.versions.node})`);
  process.exit(0);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
