#!/usr/bin/env node
// scripts/session-bootstrap.mjs — Round 2 #10 + Round 6 #85 + Round 7 #93 + Round 5 #21 + Round 8 #101.

import { promises as fs } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN_JSON = resolve(HERE, '../.claude-plugin/plugin.json');
const TTL_SEC_DEFAULT = 1800;

async function tail(path, n) {
  try {
    const txt = await fs.readFile(path, 'utf8');
    const lines = txt.trim().split('\n').filter(Boolean);
    return lines.slice(-n).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

async function reconcileStack() {
  let stack = { stack: [] };
  try { stack = JSON.parse(await fs.readFile('state/dispatch-stack.json', 'utf8')); } catch { return { reaped: 0, active: 0 }; }
  const events = await tail('state/events.ndjson', 500);
  const completed = new Set(events.filter((e) => e.type === 'dispatch_complete').map((e) => e.frame_key).filter(Boolean));
  let ttl = TTL_SEC_DEFAULT;
  try {
    const c = JSON.parse(await fs.readFile('sc.config.json', 'utf8'));
    if (c?.dispatch?.stack_ttl_seconds) ttl = c.dispatch.stack_ttl_seconds;
  } catch {}
  const now = Date.now();
  const before = stack.stack.length;
  stack.stack = stack.stack.filter((e) => {
    if (completed.has(e.frame_key)) return false;
    const age = (now - new Date(e.started_at).getTime()) / 1000;
    return age < ttl;
  });
  const reaped = before - stack.stack.length;
  if (reaped > 0) {
    try {
      await fs.writeFile('state/dispatch-stack.json', JSON.stringify(stack));
      await fs.appendFile('state/events.ndjson', JSON.stringify({
        ts: new Date().toISOString(), type: 'dispatch_stack_reaped', count: reaped,
      }) + '\n');
    } catch {}
  }
  return { reaped, active: stack.stack.length };
}

async function checkVersion() {
  let stateVer = null, pluginVer = null;
  try { stateVer = (JSON.parse(await fs.readFile('state/project.json', 'utf8'))).sc_version; } catch {}
  try { pluginVer = (JSON.parse(await fs.readFile(PLUGIN_JSON, 'utf8'))).version; } catch {}
  if (!stateVer || !pluginVer) return { ok: true };
  if (stateVer === pluginVer) return { ok: true };
  return { ok: false, stateVer, pluginVer, escalation: 'STATE_VERSION_MISMATCH' };
}

async function buildSummary() {
  let project = null;
  try { project = JSON.parse(await fs.readFile('state/project.json', 'utf8')); } catch {}
  if (!project) return null;

  const events = await tail('state/events.ndjson', 50);
  const lastCompleted = [...events].reverse().find((e) => e.type === 'dispatch_complete');
  const draftArtifacts = [];
  try {
    for (const f of await fs.readdir('state/artifacts')) {
      if (!f.endsWith('.md')) continue;
      const txt = await fs.readFile(`state/artifacts/${f}`, 'utf8');
      if (/status:\s*"?draft"?/.test(txt)) draftArtifacts.push(f);
    }
  } catch {}

  const stack = await reconcileStack();
  const version = await checkVersion();

  const summary = [
    `# Bootstrap Summary — ${new Date().toISOString()}`,
    ``,
    `Project: ${project.id}`,
    `Phase: ${project.phase}`,
    `Status: ${project.status}`,
    `Pending escalations: ${(project.pending_escalations || []).length}`,
    ``,
    `Last completed dispatch: ${lastCompleted?.role || 'none'} @ ${lastCompleted?.ts || ''}`,
    `Dispatch stack: ${stack.active} active, ${stack.reaped} reaped (TTL/completed)`,
    `Draft artifacts in flight: ${draftArtifacts.length}`,
    draftArtifacts.length ? `  - ${draftArtifacts.join('\n  - ')}` : '',
    ``,
    version.ok ? `Version: OK (${project.sc_version || 'n/a'})` : `[YELLOW] ESCALATION: ${version.escalation} state=${version.stateVer} plugin=${version.pluginVer}`,
  ].join('\n');

  try { await fs.writeFile('state/bootstrap-summary.md', summary); } catch {}
  return summary;
}

async function main() {
  const summary = await buildSummary();
  if (summary) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: summary,
      },
    }));
  }
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] session-bootstrap: ${e.stack}\n`); } catch {}
  process.exit(0);
});
