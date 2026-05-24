#!/usr/bin/env node
// scripts/dry-run-harness.mjs
// Round 18: simulates /sc:launch end-to-end with mocked owner-ceo + role agents.
// CLI: node scripts/dry-run-harness.mjs --scenario tests/fixtures/launch-simulation/basic.json

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.SC_PROJECT_ROOT || process.cwd();
const REPORT_PATH = path.join(ROOT, 'state', 'dry-run-report.json');

const args = process.argv.slice(2);
const scenarioPath = (() => {
  const i = args.indexOf('--scenario');
  return i >= 0 ? args[i + 1] : path.join(ROOT, 'tests/fixtures/launch-simulation/basic.json');
})();

async function readJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }

async function simulateRole(role, phase, scenario) {
  const baseline = (scenario.role_token_baseline || {})[role] || 5000;
  const variance = (Math.random() - 0.5) * 0.2;
  const tokens = Math.round(baseline * (1 + variance));
  return {
    role, phase, tokens,
    artifact_id: `01H_SIM_${role}_${Date.now().toString(36).toUpperCase()}`.slice(0, 26),
    status: 'approved',
    signed_off: ['self', 'peer'],
    duration_ms: Math.round(tokens * 0.15),
  };
}

async function simulatePhase(phase, roles, scenario, result) {
  for (const role of roles) {
    const r = await simulateRole(role, phase, scenario);
    result.artifacts.push(r);
    result.mock_tokens += r.tokens;
    result.checkpoints.push({ at: new Date().toISOString(), phase, trigger: 'role_return', role });
  }
  result.checkpoints.push({ at: new Date().toISOString(), phase, trigger: 'phase_exit' });
}

async function run() {
  let scenario;
  try { scenario = await readJson(scenarioPath); }
  catch (e) {
    console.error(`[dry-run] cannot read scenario: ${e.message}`);
    process.exit(2);
  }

  const result = {
    scenario: path.basename(scenarioPath, '.json'),
    started_at: new Date().toISOString(),
    goal: scenario.goal,
    project_type: scenario.project_type,
    phases_simulated: 0,
    artifacts: [],
    checkpoints: [],
    mock_tokens: 0,
    mock_usd: 0,
    errors: [],
    schema_version: 1,
  };

  const phases = scenario.phases || [
    { name: 'DISCOVERY', roles: ['role-pm', 'role-ba'] },
    { name: 'DESIGN',    roles: ['role-sa', 'role-tech-lead', 'role-security', 'role-infra'] },
    { name: 'BUILD',     roles: ['role-developer'] },
    { name: 'VERIFY',    roles: ['role-qa', 'role-security', 'role-devsecops'] },
    { name: 'HANDOFF',   roles: ['role-service-desk'] },
  ];

  try {
    for (const phase of phases) {
      await simulatePhase(phase.name, phase.roles, scenario, result);
      result.phases_simulated += 1;
    }
    result.mock_usd = parseFloat(((result.mock_tokens / 1_000_000) * 9.0).toFixed(2));
    result.completed_at = new Date().toISOString();

    if (scenario.expect_min_artifacts && result.artifacts.length < scenario.expect_min_artifacts) {
      result.errors.push(`artifacts ${result.artifacts.length} < expected ${scenario.expect_min_artifacts}`);
    }
    if (scenario.expect_max_tokens && result.mock_tokens > scenario.expect_max_tokens) {
      result.errors.push(`tokens ${result.mock_tokens} > max ${scenario.expect_max_tokens}`);
    }
  } catch (e) {
    result.errors.push(`simulation crash: ${e.message}`);
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(result, null, 2));

  const ok = result.errors.length === 0;
  console.log(`[dry-run] scenario=${result.scenario} phases=${result.phases_simulated} artifacts=${result.artifacts.length} tokens=${result.mock_tokens} usd=$${result.mock_usd} errors=${result.errors.length}`);
  if (!ok) for (const e of result.errors) console.error(`[dry-run] ERROR: ${e}`);

  process.exit(ok ? 0 : 1);
}

try { await run(); }
catch (e) {
  console.error(`[dry-run] crash: ${e.message}`);
  process.exit(1);
}
