#!/usr/bin/env node
// scripts/migrations/0.1.0-to-consultant.mjs
// One-shot upgrade for projects that started under v0.1.0 (pre-consultant feature)
// to the consultant-feature state shape. Idempotent: re-running is a no-op.
//
// What it changes:
//   state/budget.json — adds `consultant: { ... }` block if missing
//   state/role-acls.json — adds `role-consultant` + `role-consultant-builder` keys if missing
//
// What it does NOT change:
//   state/project.json (sc_version stays 0.1.0; consultant is additive)
//   any artifact, event, or HMAC chain
//
// CLI:
//   node scripts/migrations/0.1.0-to-consultant.mjs            # apply in cwd
//   node scripts/migrations/0.1.0-to-consultant.mjs --dry-run  # show what would change
//   SC_STATE_DIR=/path/to/state node scripts/migrations/0.1.0-to-consultant.mjs

import { promises as fs } from 'node:fs';
import path from 'node:path';

const STATE_DIR = process.env.SC_STATE_DIR || path.join(process.cwd(), 'state');
const BUDGET_PATH = path.join(STATE_DIR, 'budget.json');
const ACLS_PATH = path.join(STATE_DIR, 'role-acls.json');

const DRY_RUN = process.argv.includes('--dry-run');

const CONSULTANT_BUDGET = {
  tokens_used: 0,
  soft_limit_usd: 2.0,
  hard_limit_usd: 5.0,
  dispatches_this_phase: 0,
  max_dispatches_per_phase: 10,
};

const CONSULTANT_ACLS = {
  'role-consultant': [
    'state/artifacts/consultant-profile.md',
    'state/artifacts/discovery-brief.md',
    'state/artifacts/confidence.json',
    'rules/role-charters.md',
    'rules/needs-input-protocol.md',
  ],
  'role-consultant-builder': [
    'state/artifacts/discovery-brief.md',
    'state/artifacts/confidence.json',
    'state/artifacts/consultant-profile.md',
    'rules/role-charters.md',
    'rules/escalation.md',
    'rules/project-templates.md',
    'templates/role-verification-checklists.md',
    'design/consultant-feature.md',
    'state/project.json',
  ],
};

async function readJsonSafe(p) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

async function atomicWrite(p, obj) {
  const tmp = `${p}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fs.rename(tmp, p);
}

async function migrateBudget() {
  const budget = await readJsonSafe(BUDGET_PATH);
  if (!budget) {
    return { skipped: true, reason: 'state/budget.json not found (no active project)' };
  }
  if (budget.consultant && typeof budget.consultant === 'object') {
    return { skipped: true, reason: 'budget.consultant already present' };
  }
  budget.consultant = CONSULTANT_BUDGET;
  if (!DRY_RUN) await atomicWrite(BUDGET_PATH, budget);
  return { applied: true, added: 'consultant block', path: BUDGET_PATH };
}

async function migrateAcls() {
  const acls = await readJsonSafe(ACLS_PATH);
  if (!acls) {
    return { skipped: true, reason: 'state/role-acls.json not found (no active project)' };
  }
  const added = [];
  for (const [role, globs] of Object.entries(CONSULTANT_ACLS)) {
    if (Array.isArray(acls[role]) && acls[role].length > 0) continue;
    acls[role] = globs;
    added.push(role);
  }
  if (added.length === 0) {
    return { skipped: true, reason: 'consultant ACL entries already present' };
  }
  if (!DRY_RUN) await atomicWrite(ACLS_PATH, acls);
  return { applied: true, added: added.join(' + '), path: ACLS_PATH };
}

async function main() {
  console.log(`[migrate 0.1.0-to-consultant]${DRY_RUN ? ' [dry-run]' : ''} state dir: ${STATE_DIR}`);
  const results = [];
  results.push(await migrateBudget());
  results.push(await migrateAcls());

  for (const r of results) {
    if (r.applied) console.log(`  + ${r.path}: ${r.added}`);
    else console.log(`  - ${r.reason}`);
  }

  const applied = results.filter(r => r.applied).length;
  console.log(`[migrate 0.1.0-to-consultant]${DRY_RUN ? ' [dry-run]' : ''} ${applied} change(s) ${DRY_RUN ? 'would be' : ''} applied`);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
