#!/usr/bin/env node
// scripts/validate-role.mjs — Round 5 #50.
import { promises as fs } from 'node:fs';

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const [k, ...rest] = line.split(':');
    if (!k) continue;
    let v = rest.join(':').trim();
    try { v = JSON.parse(v); } catch {}
    fm[k.trim()] = v;
  }
  return { fm, body: m[2] };
}

async function validate(rolePath) {
  let text;
  try { text = await fs.readFile(rolePath, 'utf8'); } catch (e) { console.error(`cannot read: ${e.message}`); return 1; }
  const parsed = parseFrontmatter(text);
  if (!parsed) { console.error('no frontmatter'); return 1; }
  const { fm, body } = parsed;
  const reqd = ['name', 'description', 'tools', 'model'];
  const missing = reqd.filter((k) => fm[k] === undefined);
  if (missing.length) { console.error(`missing: ${missing.join(', ')}`); return 1; }
  if (!body.includes('Prompt Defense Baseline')) {
    console.error('missing Prompt Defense Baseline');
    return 1;
  }
  if (!body.includes('Charter')) {
    console.error('missing Charter reference');
    return 1;
  }
  console.log(`OK: ${rolePath} (${fm.name})`);
  return 0;
}

const path = process.argv[2];
if (!path) { console.error('usage: validate-role.mjs <agents/role-*.md>'); process.exit(1); }
validate(path).then((c) => process.exit(c));
