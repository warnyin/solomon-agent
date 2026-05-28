#!/usr/bin/env node
// scripts/burn-rate-watch.mjs
// Per rules/cost-transparency-protocol.md. Mid-flight burn-rate watcher.
// CLI: node scripts/burn-rate-watch.mjs [--phase DESIGN]
// Run by checkpoint.mjs after every checkpoint trigger.

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.SC_STATE_ROOT || process.cwd();
const STATE_DIR = path.join(ROOT, 'state');
const BUDGET_PATH = path.join(STATE_DIR, 'budget.json');
const ESTIMATE_PATH = path.join(STATE_DIR, 'cost-estimate.json');
const BURN_LOG = path.join(STATE_DIR, 'burn-rate.ndjson');
const PROJECT_PATH = path.join(STATE_DIR, 'project.json');
const HOOK_ERROR_LOG = path.join(STATE_DIR, 'hook-errors.log');

const USD_PER_M_TOKEN = parseFloat(process.env.SC_USD_PER_M_TOKEN || '9.0');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-/g, '_');
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

async function readJsonSafe(p, fallback = null) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return fallback; }
}

async function readLastBurn() {
  try {
    const lines = (await fs.readFile(BURN_LOG, 'utf8')).trim().split('\n').filter(Boolean);
    return lines.length ? JSON.parse(lines.at(-1)) : null;
  } catch { return null; }
}

async function main() {
  const args = parseArgs(process.argv);
  const budget = await readJsonSafe(BUDGET_PATH, { tokens_used: 0, tokens_budget: 200_000, usd_estimate: 0 });
  const estimate = await readJsonSafe(ESTIMATE_PATH, null);
  const project = await readJsonSafe(PROJECT_PATH, { started_at: new Date().toISOString() });
  const last = await readLastBurn();

  const now = new Date();
  const phase = args.phase || project.phase || 'UNKNOWN';

  const tokensUsed = budget.tokens_used || 0;
  const usdUsed = (tokensUsed / 1_000_000) * USD_PER_M_TOKEN;

  let tokensPerMin = 0;
  if (last) {
    const dtMin = (now - new Date(last.at)) / 60_000;
    if (dtMin > 0.01) tokensPerMin = Math.round((tokensUsed - (last.tokens_used || 0)) / dtMin);
  }

  let projectedFinalUsd = usdUsed;
  if (tokensPerMin > 0 && estimate) {
    const remainingTokens = Math.max(0, estimate.expected_tokens - tokensUsed);
    const expectedMinRemaining = remainingTokens / Math.max(tokensPerMin, 1);
    const projectedTotalTokens = tokensUsed + (tokensPerMin * expectedMinRemaining);
    projectedFinalUsd = parseFloat(((projectedTotalTokens / 1_000_000) * USD_PER_M_TOKEN).toFixed(2));
  }

  const pctOfBudget = budget.tokens_budget > 0
    ? parseFloat((tokensUsed / budget.tokens_budget * 100).toFixed(1))
    : 0;

  // Consultant bucket (per design/consultant-feature.md Q10).
  // Optional: budget.consultant may be absent on legacy projects → no extra output.
  const consultant = budget.consultant || null;
  let consultantUsd = 0;
  let consultantPctSoft = 0;
  let consultantPctHard = 0;
  let consultantDispatchesPct = 0;
  if (consultant) {
    const cTokensUsed = consultant.tokens_used || 0;
    consultantUsd = parseFloat(((cTokensUsed / 1_000_000) * USD_PER_M_TOKEN).toFixed(2));
    const soft = consultant.soft_limit_usd || 2.0;
    const hard = consultant.hard_limit_usd || 5.0;
    consultantPctSoft = parseFloat((consultantUsd / soft * 100).toFixed(1));
    consultantPctHard = parseFloat((consultantUsd / hard * 100).toFixed(1));
    const cap = consultant.max_dispatches_per_phase || 10;
    consultantDispatchesPct = parseFloat(((consultant.dispatches_this_phase || 0) / cap * 100).toFixed(1));
  }

  const sample = {
    at: now.toISOString(),
    phase,
    tokens_used: tokensUsed,
    tokens_per_min: tokensPerMin,
    usd_estimate: parseFloat(usdUsed.toFixed(2)),
    pct_of_budget: pctOfBudget,
    projected_final_usd: projectedFinalUsd,
    ...(consultant ? {
      consultant_usd_used: consultantUsd,
      consultant_pct_of_soft: consultantPctSoft,
      consultant_pct_of_hard: consultantPctHard,
      consultant_dispatches_pct: consultantDispatchesPct,
    } : {}),
    schema_version: 1,
  };

  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.appendFile(BURN_LOG, JSON.stringify(sample) + '\n');

  const alerts = [];
  if (estimate && projectedFinalUsd > estimate.bands.high) {
    alerts.push(`PROJECTED $${projectedFinalUsd} > high band $${estimate.bands.high} → consider BUDGET_WARNING escalation`);
  }
  if (pctOfBudget >= 95) alerts.push(`pct_of_budget=${pctOfBudget}% — 95% threshold`);
  else if (pctOfBudget >= 80) alerts.push(`pct_of_budget=${pctOfBudget}% — 80% threshold`);
  else if (pctOfBudget >= 50) alerts.push(`pct_of_budget=${pctOfBudget}% — 50% threshold`);
  if (last && last.tokens_per_min > 0 && tokensPerMin > 3 * last.tokens_per_min) {
    alerts.push(`SPIKE: ${tokensPerMin} tok/min (3× last ${last.tokens_per_min})`);
  }

  // Consultant-specific alerts (per rules/escalation.md #17 CONSULTANT_BUDGET_EXHAUSTED).
  if (consultant) {
    if (consultantPctHard >= 100) {
      alerts.push(`consultant.usd=$${consultantUsd} >= hard cap → escalate CONSULTANT_BUDGET_EXHAUSTED (hard)`);
    } else if (consultantPctSoft >= 100) {
      alerts.push(`consultant.usd=$${consultantUsd} >= soft cap → CONSULTANT_BUDGET_EXHAUSTED (soft) — non-blocking`);
    }
    if (consultantDispatchesPct >= 100) {
      alerts.push(`consultant dispatches ${consultant.dispatches_this_phase}/${consultant.max_dispatches_per_phase || 10} reached → bypass consultant for remaining phase`);
    }
  }

  console.log(`[$] BURN — ${pctOfBudget}% used · ${(tokensPerMin / 1000).toFixed(1)}k tok/min · projected final $${projectedFinalUsd}${estimate ? ` (estimate $${estimate.expected_usd})` : ''}`);
  if (consultant) {
    console.log(`[$] BURN consultant — $${consultantUsd} (${consultantPctSoft}% of soft, ${consultantPctHard}% of hard) · dispatches ${consultant.dispatches_this_phase || 0}/${consultant.max_dispatches_per_phase || 10} this phase`);
  }
  for (const a of alerts) console.log(`[$] ALERT: ${a}`);
}

try {
  await main();
  process.exit(0);
} catch (e) {
  await fs.mkdir(STATE_DIR, { recursive: true }).catch(() => {});
  await fs.appendFile(HOOK_ERROR_LOG, `[burn-rate-watch] CRASH: ${e.message}\n${e.stack}\n`).catch(() => {});
  console.error(`[burn-rate-watch] graceful-crash: ${e.message}`);
  process.exit(0);
}
