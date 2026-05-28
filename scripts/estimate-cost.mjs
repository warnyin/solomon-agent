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

// Keyword tables (TH + EN). English keywords use \b boundaries; Thai keywords
// rely on substring match because JS \b is ASCII-only and won't fire on Thai script.
const KW = {
  small_en:    /\b(simple|tiny|small|fix|bug|patch|typo|trivial)\b/,
  small_th:    /(แก้บั?[คก]|แก้ไขเล็กน้อย|นิดเดียว|เล็ก ?ๆ|ปะ|แค่ลอง)/,
  xl_en:       /\b(platform|enterprise|multi[- ]?tenant|distributed|microservices|saas|workflow engine|flow engine|automation platform|low[- ]?code|no[- ]?code|directus|n8n|zapier|airflow)\b/,
  xl_th:       /(แพลตฟอร์ม|องค์กร|มัลติเทเนนต์|ไมโครเซอร์วิส|ระบบครบวงจร|ระบบใหญ่|automation|workflow|ออโตเมชั?น|เวิร์[คก]โฟลว์|โน[- ]?โค้ด|โล[- ]?โค้ด|flow engine)/,
  large_en:    /\b(app|application|system|service|integration|pipeline|dashboard|backend|api)\b/,
  large_th:    /(แอ[ปพ๊]|ระบบ|บริการ|ไปป์ไลน์|แดชบอร์ด|เชื่อมต่อ|backend|api)/,
  cli_en:      /\b(cli|command|terminal|shell)\b/,
  cli_th:      /(คอมมานด์|เทอร์มินัล|บรรทัดคำสั่ง|shell)/,
  library_en:  /\b(library|sdk|package|module)\b/,
  library_th:  /(ไลบรารี|แพ?[คก]เกจ|โมดูล|sdk)/,
  web_en:      /\b(web|website|webapp|saas|dashboard|frontend)\b/,
  web_th:      /(เว็?บไซต์?|แดชบอร์ด|หน้าเว็?บ|frontend)/,
  mobile_en:   /\b(mobile|ios|android|flutter|native)\b/,
  mobile_th:   /(มือถือ|แอนดรอยด์|ไอโอเอส|แอปมือถือ|ios|android|flutter)/,
  pipeline_en: /\b(pipeline|etl|ingest|batch|stream|data)\b/,
  pipeline_th: /(ไปป์ไลน์|ข้อมูล|สตรีม|แบทช์|etl)/,
  research_en: /\b(research|analyze|study|investigation)\b/,
  research_th: /(วิจัย|วิเคราะห์|ศึกษา|สำรวจ|ตรวจสอบ)/,
};

const matches = (t, ...keys) => keys.some(k => KW[k].test(t));

function classifyComplexity(goalText) {
  const t = goalText.toLowerCase();
  const len = goalText.length;
  // Intent beats length: check xl/large keywords BEFORE the len<30 small fallback.
  if (matches(t, 'xl_en', 'xl_th')) return 'xl';
  if (matches(t, 'large_en', 'large_th') || len > 200) return 'large';
  if (matches(t, 'small_en', 'small_th') || len < 30) return 'small';
  return 'medium';
}

function classifyProjectType(goalText) {
  const t = goalText.toLowerCase();
  if (matches(t, 'cli_en', 'cli_th')) return 'cli';
  if (matches(t, 'library_en', 'library_th')) return 'library';
  if (matches(t, 'web_en', 'web_th')) return 'web-app';
  if (matches(t, 'mobile_en', 'mobile_th')) return 'mobile-app';
  if (matches(t, 'pipeline_en', 'pipeline_th')) return 'data-pipeline';
  if (matches(t, 'research_en', 'research_th')) return 'research';
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

  // Consultant overhead (per design/consultant-feature.md Q10):
  // - One-shot builder + peer-review: ~10k tokens (strictness multiplier already
  //   covers the peer-review dispatch via existing role-strictness-protocol).
  // - Per-phase batched answers: ~15k tokens × complexityMult, across 5 standard
  //   phases (DISCOVERY/DESIGN/BUILD/VERIFY/HANDOFF). This is a coarse heuristic;
  //   actual usage depends on how many CLARIFY Needs-Input each role emits.
  const consultantBuilderTokens = 10_000;
  const consultantPerPhase = Math.round(15_000 * complexityMult);
  const consultantTokens = consultantBuilderTokens + (5 * consultantPerPhase);
  const consultantUsd = (consultantTokens / 1_000_000) * USD_PER_M_TOKEN;

  return {
    expected_tokens: Math.round(totalTokens),
    expected_usd: parseFloat(totalUsd.toFixed(2)),
    bands: {
      low:  parseFloat((totalUsd * 0.45).toFixed(2)),
      mid:  parseFloat(totalUsd.toFixed(2)),
      high: parseFloat((totalUsd * 3.0).toFixed(2)),
    },
    consultant_estimate_tokens: consultantTokens,
    consultant_estimate_usd: parseFloat(consultantUsd.toFixed(2)),
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
    consultant_estimate_tokens: est.consultant_estimate_tokens,
    consultant_estimate_usd: est.consultant_estimate_usd,
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
  console.log(`  Consultant: +~${(est.consultant_estimate_tokens / 1000).toFixed(0)}k tokens (~$${est.consultant_estimate_usd}) for persona build + per-phase Q&A`);
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
