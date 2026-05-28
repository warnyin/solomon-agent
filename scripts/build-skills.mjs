#!/usr/bin/env node
// scripts/build-skills.mjs — validates every committed skills/<name>/SKILL.md.
//
// Each skill MUST carry the frontmatter the Agent Skills spec requires —
// `name` + `description` — so the `skills` CLI (npx skills add) can discover
// them and the repo is listable on skills.sh.
//
// History: this script was originally meant to *generate* SKILL.md from
// rules/*.md (plan gap #87). The committed skills are hand-curated summaries,
// not mechanical mirrors, so regenerating would clobber them. It therefore
// VALIDATES the curated files instead of overwriting them. Rule<->doc drift is
// covered separately by scripts/check-drift.mjs via <!-- mirror: --> markers.
//
// Usage:
//   node scripts/build-skills.mjs          # validate, report per skill
//   node scripts/build-skills.mjs --check  # same checks; CI gate (exit 1 on any problem)
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const SKILLS_DIR = 'skills';
const REQUIRED = ['name', 'description'];

function parseFrontmatter(text) {
  const norm = text.replace(/\r\n/g, '\n');
  const m = norm.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

async function validateOne(name) {
  const dest = join(SKILLS_DIR, name, 'SKILL.md');
  let text;
  try { text = await fs.readFile(dest, 'utf8'); }
  catch { return { name, ok: false, reason: 'SKILL.md missing' }; }

  const fm = parseFrontmatter(text);
  if (!fm) return { name, ok: false, reason: 'no YAML frontmatter (--- block)' };

  const missing = REQUIRED.filter((k) => !fm[k]);
  if (missing.length) return { name, ok: false, reason: `missing/empty frontmatter: ${missing.join(', ')}` };

  if (fm.name !== name) return { name, ok: false, reason: `frontmatter name "${fm.name}" must equal folder "${name}"` };

  return { name, ok: true };
}

async function listSkillDirs() {
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

async function main() {
  let dirs;
  try { dirs = await listSkillDirs(); }
  catch (e) { console.error(`[build-skills] cannot read ${SKILLS_DIR}/: ${e.message}`); process.exit(1); }

  const results = await Promise.all(dirs.map(validateOne));
  let bad = 0;
  for (const r of results) {
    if (r.ok) { console.log(`[build-skills] ${r.name}: ok`); }
    else { console.error(`[build-skills] ${r.name}: ${r.reason}`); bad++; }
  }

  if (bad) {
    console.error(`[build-skills] ${bad} skill(s) invalid — every skills/<name>/SKILL.md needs frontmatter with name + description, name matching the folder (Agent Skills spec / skills.sh).`);
    process.exit(1);
  }
  console.log(`[build-skills] ${results.length} skill(s) valid`);
  process.exit(0);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
