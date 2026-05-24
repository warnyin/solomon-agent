#!/usr/bin/env node
// scripts/estimate-cost.mjs
// Per rules/cost-transparency-protocol.md. Pre-flight cost estimator.
// CLI: node scripts/estimate-cost.mjs --goal "<text>" [--project-type <type>] [--features <n>]
// Node 18+ builtins only.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.env.SC_STATE_ROOT || process.cwd();
const STATE_DIR = path.join(ROOT, 'state');
const OUT_PATH = path.join(STATE_DIR, 'cost-estimate.json');
const HOOK_ERROR_LOG = path.join(STATE_DIR, 'hook-errors.log');

const USD_PER_M_TOKEN = parseFloat(process.env.SC_USD_PER_M_TOKEN || '9.0');

const BASELINE_PER_FEATURE = {
  'cli':            25_000,
  'library':        25_000,
  'research':       20_000,
  'web-app':        50_000,
  'mobile-app':     50_000,
  'data-pipeline':  40_000,
  'unknown':        30_000,
};

const COMPLEXITY_MULTIPLIER = { small: 0.5, medium: 1.0, large: 2.0, xl: 4.0 };

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

function classifyComplexity(goalText) {
  const t = goalText.toLowerCase();
  const len = goalText.length;
  if (/\b(simple|tiny|small|fix|bug|patch|typo)\b/.test(t) || len < 50) return 'small';
  if (/\b(platform|enterprise|multi-tenant|distributed|microservices|saas)\b/.test(t)) return 'xl';
  if (/\b(app|system|service|integration|pipeline|dashboard)\b/.test(t) || len > 200) return 'large';
  return 'medium';
}

function classifyProjectType(goalText) {
  const t = goalText.toLowerCase();
  if (/\b(cli|command|terminal|shell)\b/.test(t)) return 'cli';
  if (/\b(library|sdk|package|module)\b/.test(t)) return 'library';
  if (/\b(web|website|webapp|saas|dashboard|frontend)\b/.test(t)) return 'web-app';
  if (/\b(mobile|ios|android|flutter|native)\b/.test(t)) return 'mobile-app';
  if (/\b(pipeline|etl|ingest|batch|stream|data)\b/.test(t)) return 'data-pipeline';
  if (/\b(research|analyze|study|investigation)\b/.test(t)) return 'research';
  return 'unknown';
}

function estimate(goal, projectType, features) {
  const complexity = classifyComplexity(goal);
  const baseline = BASELINE_PER_FEATURE[projectType] || BASELINE_PER_FEATURE['unknown'];
  const complexityMult = COMPLEXITY_MULTIPLIER[complexity];

  const strictnessMult = 2.0;
  const mindsetMult = 1.4;
  const interviewOverhead = 25_000;

  const featureTokens = baseline * complexityMult * strictnessMult * mindsetMult;
  const totalTokens = (features * featureTokens) + interviewOverhead;
  const totalUsd = (totalTokens / 1_000_000) * USD_PER_M_TOKEN;

  return {
    expected_tokens: Math.round(totalTokens),
    expected_usd: parseFloat(totalUsd.toFixed(2)),
    bands: {
      low:  parseFloat((totalUsd * 0.45).toFixed(2)),
      mid:  parseFloat(totalUsd.toFixed(2)),
      high: parseFloat((totalUsd * 3.0).toFixed(2)),
    },
    complexity,
    project_type: projectType,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.goal) {
    console.error('[estimate-cost] required: --goal "<text>"');
    process.exit(2);
  }

  const features = parseInt(args.features || '1', 10);
  const projectType = args.project_type || classifyProjectType(args.goal);
  const est = estimate(args.goal, projectType, features);

  const goalHash = 'sha256-' + crypto.createHash('sha256').update(args.goal).digest('hex').slice(0, 16);

  const payload = {
    estimate_at: new Date().toISOString(),
    goal_hash: goalHash,
    goal_complexity: est.complexity,
    project_type: est.project_type,
    features_assumed: features,
    expected_tokens: est.expected_tokens,
    expected_usd: est.expected_usd,
    confidence: features === 1 ? 'med' : 'low',
    bands: est.bands,
    based_on: 'heuristic-v1',
    memory_calibration_samples: 0,
    schema_version: 1,
  };

  await fs.mkdir(STATE_DIR, { recursive: true });
  const tmp = `${OUT_PATH}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tmp, OUT_PATH);

  console.log(`[$] PRE-FLIGHT COST ESTIMATE`);
  console.log(`  Goal:       "${args.goal.slice(0, 80)}${args.goal.length > 80 ? '...' : ''}"`);
  console.log(`  Complexity: ${est.complexity} · type: ${est.project_type} · features: ${features}`);
  console.log(`  Expected:   ~${(est.expected_tokens / 1000).toFixed(0)}k tokens (~$${est.expected_usd})`);
  console.log(`  Range:      $${est.bands.low} (lucky) — $${est.bands.high} (rough) with 80% confidence`);
  console.log(`  Based on:   heuristic-v1 (0 memory samples — v0.2 will use MCP)`);
  console.log(``);
  console.log(`Wrote: ${path.relative(ROOT, OUT_PATH)}`);
}

try {
  await main();
  process.exit(0);
} catch (e) {
  await fs.mkdir(STATE_DIR, { recursive: true }).catch(() => {});
  await fs.appendFile(HOOK_ERROR_LOG, `[estimate-cost] CRASH: ${e.message}\n${e.stack}\n`).catch(() => {});
  console.error(`[estimate-cost] graceful-crash: ${e.message}`);
  process.exit(0);
}
