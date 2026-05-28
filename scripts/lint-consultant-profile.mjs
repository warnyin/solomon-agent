#!/usr/bin/env node
// scripts/lint-consultant-profile.mjs
// Validate state/artifacts/consultant-profile.md against the schema in
// templates/role-verification-checklists.md#role-consultant-builder.
// Exit 0 on pass, 1 on lint failure, 2 on unreadable input.
// Node 18+ builtins only. See design/consultant-feature.md Q5 for full schema.
//
// CLI:
//   node scripts/lint-consultant-profile.mjs [path/to/consultant-profile.md]
//
// Default path: state/artifacts/consultant-profile.md (relative to SC_STATE_ROOT or cwd).

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.SC_STATE_ROOT || process.cwd();
const DEFAULT_PATH = path.join(ROOT, 'state', 'artifacts', 'consultant-profile.md');

const REQUIRED_TOP_LEVEL_KEYS = [
  'artifact_type', 'status', 'mode',
  'identity', 'expertise', 'outside_scope',
  'knowledge_frames', 'domain_analogs', 'voice_style',
  'signed_off_by'
];

const REQUIRED_NESTED = {
  identity: ['title', 'years_experience', 'prior_work'],
  expertise: ['primary', 'secondary'],
  voice_style: ['tone', 'uncertainty_phrase', 'refusal_phrase'],
};

const VALID_MODES = new Set(['initial', 'patch', 'rebuild']);
const VALID_STATUSES = new Set(['draft', 'ready_for_review', 'approved', 'rejected', 'superseded', 'waiver_pending']);

function splitFrontmatter(text) {
  const norm = text.replace(/\r\n/g, '\n');
  const m = norm.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  return { fm: m[1], body: m[2] };
}

function topLevelKeys(fm) {
  const keys = new Set();
  for (const line of fm.split('\n')) {
    const m = line.match(/^([a-z_][a-z0-9_]*):/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function sectionLines(fm, key) {
  const lines = fm.split('\n');
  const startRe = new RegExp(`^${key}:`);
  let i = 0;
  while (i < lines.length && !startRe.test(lines[i])) i++;
  if (i === lines.length) return null;
  const out = [lines[i]];
  i++;
  while (i < lines.length) {
    if (/^[a-z_][a-z0-9_]*:/.test(lines[i])) break;
    out.push(lines[i]);
    i++;
  }
  return out;
}

function countListItems(sectionBody) {
  let count = 0;
  for (const l of sectionBody) {
    if (/^\s{2,}-\s/.test(l)) count++;
  }
  return count;
}

function nestedKeysPresent(sectionBody, requiredKeys) {
  const present = new Set();
  for (const l of sectionBody) {
    for (const k of requiredKeys) {
      if (new RegExp(`^\\s+${k}:`).test(l)) present.add(k);
    }
  }
  return requiredKeys.filter(k => !present.has(k));
}

function extractYearsExperience(fm) {
  const m = fm.match(/^\s+years_experience:\s*(\d+)\s*$/m);
  return m ? parseInt(m[1], 10) : null;
}

function narrativeWordCount(body) {
  const stopAt = body.search(/^##\s+(Handoff|Patch History|Pivot Note)\b/m);
  const narrative = stopAt >= 0 ? body.slice(0, stopAt) : body;
  const text = narrative
    .replace(/^#+\s.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function countUnderField(parent, fieldName) {
  const idx = parent.findIndex(l => new RegExp(`^\\s+${fieldName}:`).test(l));
  if (idx < 0) return null;
  let c = 0;
  for (let i = idx + 1; i < parent.length; i++) {
    if (/^\s+[a-z_]+:/.test(parent[i])) break;
    if (/^\s{4,}-\s/.test(parent[i])) c++;
  }
  return c;
}

async function lint(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (e) {
    console.error(`[lint-consultant-profile] cannot read ${filePath}: ${e.message}`);
    return 2;
  }

  const issues = [];
  const split = splitFrontmatter(raw);
  if (!split) {
    issues.push('missing or malformed YAML frontmatter (--- ... ---)');
    return reportAndExit(issues);
  }
  const { fm, body } = split;

  const keys = topLevelKeys(fm);
  for (const k of REQUIRED_TOP_LEVEL_KEYS) {
    if (!keys.has(k)) issues.push(`missing top-level key: ${k}`);
  }

  const statusMatch = fm.match(/^status:\s*(\S+)\s*$/m);
  if (statusMatch && !VALID_STATUSES.has(statusMatch[1])) {
    issues.push(`status: "${statusMatch[1]}" not in ${[...VALID_STATUSES].join(', ')}`);
  }
  const modeMatch = fm.match(/^mode:\s*(\S+)\s*$/m);
  if (modeMatch && !VALID_MODES.has(modeMatch[1])) {
    issues.push(`mode: "${modeMatch[1]}" not in ${[...VALID_MODES].join(', ')}`);
  }

  const atMatch = fm.match(/^artifact_type:\s*(\S+)\s*$/m);
  if (atMatch && atMatch[1] !== 'consultant-profile') {
    issues.push(`artifact_type: "${atMatch[1]}" must be "consultant-profile"`);
  }

  for (const [section, required] of Object.entries(REQUIRED_NESTED)) {
    const lines = sectionLines(fm, section);
    if (!lines) continue;
    const missing = nestedKeysPresent(lines, required);
    for (const m of missing) issues.push(`${section}.${m}: missing`);
  }

  const listChecks = [
    { section: 'outside_scope', min: 3, max: null, label: 'outside_scope[]' },
    { section: 'knowledge_frames', min: 5, max: null, label: 'knowledge_frames[]' },
    { section: 'domain_analogs', min: 3, max: 3, label: 'domain_analogs[]' },
  ];
  for (const c of listChecks) {
    const lines = sectionLines(fm, c.section);
    if (!lines) continue;
    const count = countListItems(lines);
    if (count < c.min) issues.push(`${c.label} has ${count} items, need >= ${c.min}`);
    if (c.max !== null && count > c.max) issues.push(`${c.label} has ${count} items, need <= ${c.max}`);
  }

  const idLines = sectionLines(fm, 'identity');
  if (idLines) {
    const priorCount = countUnderField(idLines, 'prior_work');
    if (priorCount !== null) {
      if (priorCount < 3) issues.push(`identity.prior_work[] has ${priorCount}, need >= 3`);
      if (priorCount > 5) issues.push(`identity.prior_work[] has ${priorCount}, need <= 5`);
    }
  }

  const years = extractYearsExperience(fm);
  if (years !== null) {
    if (years < 8) issues.push(`identity.years_experience=${years} below 8`);
    if (years > 20) issues.push(`identity.years_experience=${years} above 20`);
  }

  const expLines = sectionLines(fm, 'expertise');
  if (expLines) {
    const p = countUnderField(expLines, 'primary');
    const s = countUnderField(expLines, 'secondary');
    if (p !== null && (p < 3 || p > 5)) issues.push(`expertise.primary[] has ${p}, need 3-5`);
    if (s !== null && (s < 2 || s > 5)) issues.push(`expertise.secondary[] has ${s}, need 2-5`);
  }

  const wc = narrativeWordCount(body);
  if (wc < 200) issues.push(`narrative body has ${wc} words, need >= 200`);
  if (wc > 300) issues.push(`narrative body has ${wc} words, need <= 300`);

  if (modeMatch) {
    if (modeMatch[1] === 'patch' && !/^##\s+Patch History\b/m.test(body)) {
      issues.push(`mode=patch requires "## Patch History" section in body`);
    }
    if (modeMatch[1] === 'rebuild' && !/^##\s+Pivot Note\b/m.test(body)) {
      issues.push(`mode=rebuild requires "## Pivot Note" section in body`);
    }
  }

  if (!/^##\s+Handoff\b/m.test(body)) {
    issues.push(`"## Handoff" section missing from body`);
  }

  return reportAndExit(issues);
}

function reportAndExit(issues) {
  if (issues.length === 0) {
    console.log('[lint-consultant-profile] OK');
    return 0;
  }
  console.error(`[lint-consultant-profile] ${issues.length} issue(s):`);
  for (const i of issues) console.error(`  - ${i}`);
  return 1;
}

async function main() {
  const arg = process.argv[2];
  const file = arg ? path.resolve(arg) : DEFAULT_PATH;
  const code = await lint(file);
  process.exit(code);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
