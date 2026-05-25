#!/usr/bin/env node
// scripts/session-report.mjs — Round 1 #11 + Round 5 #22 #41 #66 + Round 2 #2.

import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const GLOBAL_STATS_PATH = join(homedir(), '.claude', 'plugins', 'sc', 'global-stats.json');
const ABORTED = process.argv.includes('--aborted');

async function readJson(path, dflt) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return dflt; }
}

async function listArtifacts() {
  try {
    return (await fs.readdir('state/artifacts')).filter((f) => f.endsWith('.md') && !f.endsWith('.invalid.md')).sort();
  } catch { return []; }
}

async function tail(path, n) {
  try {
    const txt = await fs.readFile(path, 'utf8');
    return txt.trim().split('\n').filter(Boolean).slice(-n).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

async function loadJargon() {
  try { return (await fs.readFile(join(HERE, '..', 'docs', 'jargon-blocklist.txt'), 'utf8')).split('\n').filter(Boolean); }
  catch { return []; }
}

function stripJargon(text, jargon) {
  let t = text;
  for (const w of jargon) {
    if (!w || w.startsWith('#')) continue;
    t = t.replace(new RegExp(`\\b${w}\\b`, 'gi'), `[${w}]`);
  }
  return t;
}

async function buildExecSummary(project, artifacts, events) {
  const outcome = ABORTED ? 'aborted' : (project.status === 'complete' ? 'shipped' : 'escalated_out');
  const pending = (project.pending_escalations || []).length;
  const lastEvent = events.at(-1);
  return [
    `## Executive Summary`, ``,
    `Outcome: **${outcome}**`,
    `Phases reached: ${project.phase}`,
    `Artifacts: ${artifacts.length}`,
    `Pending escalations: ${pending}`,
    `Last activity: ${lastEvent?.ts || 'n/a'} (${lastEvent?.type || 'n/a'})`, ``,
    pending > 0 ? `Next decision: see [YELLOW] ESCALATION block in /solomon-agent:status` : `Next decision: review Technical Detail section below`,
    ``,
    `_(Auto-generated. Owner-ceo may re-dispatch role-service-desk at HANDOFF for richer prose.)_`,
  ].join('\n');
}

async function buildTechnicalDetail(project, budget, artifacts, events) {
  const byPhase = {};
  for (const f of artifacts) {
    const m = f.match(/^[^-]+-([^-]+)-/);
    const phase = m?.[1] || 'unknown';
    (byPhase[phase] = byPhase[phase] || []).push(f);
  }
  const decisions = events.filter((e) => e.type === 'decision' || e.type === 'conflict_resolved');
  const escalations = events.filter((e) => e.type === 'escalation' || /^escalation_/.test(e.type));
  return [
    `## Technical Detail`, ``,
    `### Project`,
    `\`\`\`json\n${JSON.stringify(project, null, 2)}\n\`\`\``, ``,
    `### Budget`,
    `\`\`\`json\n${JSON.stringify(budget, null, 2)}\n\`\`\``, ``,
    `### Artifact Tree (${artifacts.length})`,
    Object.entries(byPhase).map(([p, files]) => `- **${p}**\n  - ${files.join('\n  - ')}`).join('\n'), ``,
    `### Decisions Log`,
    decisions.length ? decisions.map((d) => `- ${d.ts} ${d.type}: ${JSON.stringify(d).slice(0, 200)}`).join('\n') : 'None recorded', ``,
    `### Escalations`,
    escalations.length ? escalations.map((e) => `- ${e.ts}: ${e.type}`).join('\n') : 'None', ``,
    `### Events Timeline (last 20)`,
    events.slice(-20).map((e) => `- ${e.ts} ${e.type} ${e.role || ''}`).join('\n'),
  ].join('\n');
}

async function updateGlobalStats(project, budget, outcome) {
  try {
    await fs.mkdir(dirname(GLOBAL_STATS_PATH), { recursive: true });
    let stats = await readJson(GLOBAL_STATS_PATH, {
      total_launches: 0, by_outcome: { shipped: 0, aborted: 0, escalated_out: 0 },
      avg_cost_usd: 0, avg_phases: 0, by_project_type: {}, projects: {},
    });
    if (project.id && !stats.projects[project.id]) {
      stats.total_launches += 1;
      stats.by_outcome[outcome] = (stats.by_outcome[outcome] || 0) + 1;
      stats.projects[project.id] = {
        outcome, project_type: project.project_type, cost_usd: budget?.cost_estimate_usd || 0,
        finished_at: new Date().toISOString(),
      };
      const all = Object.values(stats.projects);
      stats.avg_cost_usd = all.reduce((s, p) => s + (p.cost_usd || 0), 0) / all.length;
      const t = project.project_type || 'unknown';
      stats.by_project_type[t] = stats.by_project_type[t] || { n: 0, shipped: 0 };
      stats.by_project_type[t].n += 1;
      if (outcome === 'shipped') stats.by_project_type[t].shipped += 1;
    }
    await fs.writeFile(GLOBAL_STATS_PATH, JSON.stringify(stats, null, 2), { mode: 0o600 });
  } catch {}
}

async function main() {
  const project = await readJson('state/project.json', null);
  if (!project) return process.exit(0);

  const budget = await readJson('state/budget.json', {});
  const artifacts = await listArtifacts();
  const events = await tail('state/events.ndjson', 500);
  const jargon = await loadJargon();

  const outcome = ABORTED ? 'aborted' : (project.status === 'complete' ? 'shipped' : 'escalated_out');

  let exec = await buildExecSummary(project, artifacts, events);
  exec = stripJargon(exec, jargon);
  const tech = await buildTechnicalDetail(project, budget, artifacts, events);

  const report = [
    `# Final Report — project_id=${project.id}`,
    `Generated: ${new Date().toISOString()}`, ``,
    exec, ``, `---`, ``, tech,
  ].join('\n');

  try { await fs.mkdir('state/artifacts', { recursive: true }); } catch {}
  try { await fs.writeFile('state/artifacts/final-report.md', report); } catch {}
  await updateGlobalStats(project, budget, outcome);

  try {
    await fs.appendFile('state/events.ndjson', JSON.stringify({
      ts: new Date().toISOString(), type: 'final_report', outcome,
    }) + '\n');
  } catch {}

  try {
    const stat = await fs.stat('state/events.ndjson');
    if (stat.size > 50 * 1024 * 1024) process.stderr.write(`[session-report] state/ is large — consider /solomon-agent:compact\n`);
  } catch {}

  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] session-report: ${e.stack}\n`); } catch {}
  process.exit(0);
});
