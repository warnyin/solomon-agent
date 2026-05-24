#!/usr/bin/env node
// scripts/build-manifest.mjs — Round 5 #49.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const [k, ...rest] = line.split(':');
    if (!k) continue;
    let v = rest.join(':').trim();
    try { v = JSON.parse(v); } catch {}
    fm[k.trim()] = v;
  }
  return fm;
}

async function main() {
  const roles = [];
  try {
    for (const f of await fs.readdir('agents')) {
      if (!f.endsWith('.md')) continue;
      const text = await fs.readFile(join('agents', f), 'utf8');
      const fm = parseFrontmatter(text);
      if (!fm?.name) continue;
      roles.push({
        name: fm.name, file: f, model: fm.model, color: fm.color, tools: fm.tools,
        description: (fm.description || '').slice(0, 200),
        charter_section: `rules/role-charters.md#${fm.name}`,
      });
    }
  } catch (e) { console.error(`agents/ read failed: ${e.message}`); process.exit(1); }
  const manifest = { generated_at: new Date().toISOString(), version: '0.1.0', roles };
  await fs.writeFile('agents/manifest.json', JSON.stringify(manifest, null, 2));
  console.log(`[build-manifest] wrote agents/manifest.json with ${roles.length} roles`);
  process.exit(0);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
