#!/usr/bin/env node
// scripts/lint-frontmatter.mjs — Round 5 #81 (Task 45).
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const RULES = {
  agents: ['name', 'description', 'tools', 'model'],
  commands: ['description'],
};

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const [k] = line.split(':');
    if (k && k.trim()) fm[k.trim()] = true;
  }
  return fm;
}

async function lintDir(dir, required) {
  const issues = [];
  let files;
  try { files = await fs.readdir(dir); } catch { return issues; }
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const path = join(dir, f);
    const text = await fs.readFile(path, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm) { issues.push({ file: path, missing: ['<entire frontmatter>'] }); continue; }
    const missing = required.filter((k) => !fm[k]);
    if (missing.length) issues.push({ file: path, missing });
  }
  return issues;
}

async function main() {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) { console.error('usage: lint-frontmatter.mjs <dir>...'); process.exit(1); }
  let total = [];
  for (const d of dirs) {
    const key = d.replace(/[\/\\]$/, '').split(/[\/\\]/).pop();
    const reqd = RULES[key] || RULES.agents;
    total = total.concat(await lintDir(d, reqd));
  }
  if (total.length) {
    console.error(`[lint-frontmatter] ${total.length} issue(s):`);
    for (const i of total) console.error(`  - ${i.file}: missing ${i.missing.join(', ')}`);
    process.exit(1);
  }
  console.log('[lint-frontmatter] OK');
  process.exit(0);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
