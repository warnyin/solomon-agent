#!/usr/bin/env node
// scripts/checkpoint.mjs
// Per rules/handoff-checkpoint-protocol.md. Writes state/checkpoints/*.json + state/role-state-board.json
// atomically and emits HMAC events. CLI usage:
//   node scripts/checkpoint.mjs --trigger role_return --active-role role-sa --phase DESIGN
//   node scripts/checkpoint.mjs --verify
//
// Node 18+ builtins only.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SC_STATE_ROOT || process.cwd();
const STATE_DIR = path.join(ROOT, 'state');
const CHECKPOINT_DIR = path.join(STATE_DIR, 'checkpoints');
const BOARD_PATH = path.join(STATE_DIR, 'role-state-board.json');
const PROJECT_PATH = path.join(STATE_DIR, 'project.json');
const BUDGET_PATH = path.join(STATE_DIR, 'budget.json');
const EVENTS_PATH = path.join(STATE_DIR, 'events.ndjson');
const ARTIFACTS_DIR = path.join(STATE_DIR, 'artifacts');
const SESSION_KEY_PATH = path.join(STATE_DIR, 'session.key');
const HOOK_ERROR_LOG = path.join(STATE_DIR, 'hook-errors.log');

const VALID_TRIGGERS = new Set([
  'role_return', 'phase_exit', 'feature_complete',
  'escalation_emitted', 'interview_round_end', 'time_threshold', 'manual',
  'consultant_built'
]);

function ulid() {
  const time = Date.now().toString(36).padStart(10, '0').toUpperCase();
  const rand = crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 16);
  return `01${time}${rand}`.padEnd(26, '0').slice(0, 26);
}

async function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}

async function readJsonSafe(p, fallback = null) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return fallback; }
}

async function listArtifacts() {
  try {
    const files = await fs.readdir(ARTIFACTS_DIR);
    return files.filter(f => f.endsWith('.md'));
  } catch { return []; }
}

async function readArtifactFrontmatter(filename) {
  try {
    const content = await fs.readFile(path.join(ARTIFACTS_DIR, filename), 'utf8');
    const m = content.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return null;
    const fm = {};
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
    }
    return fm;
  } catch { return null; }
}

async function inFlightArtifacts() {
  const files = await listArtifacts();
  const inflight = [];
  for (const f of files) {
    const fm = await readArtifactFrontmatter(f);
    if (!fm) continue;
    if (fm.status === 'draft' || fm.status === 'ready_for_review' || fm.status === 'waiver_pending') {
      inflight.push({
        id: fm.id,
        role: fm.produced_by,
        type: fm.artifact_type,
        status: fm.status,
        path: `state/artifacts/${f}`
      });
    }
  }
  return inflight;
}

async function logEvent(eventName, payload) {
  try {
    const sessionKey = await fs.readFile(SESSION_KEY_PATH, 'utf8').catch(() => 'no-session-key');
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event: eventName,
      payload,
      hmac: crypto.createHmac('sha256', sessionKey).update(JSON.stringify(payload)).digest('hex').slice(0, 16)
    });
    await fs.appendFile(EVENTS_PATH, line + '\n');
  } catch (e) {
    await fs.appendFile(HOOK_ERROR_LOG, `[checkpoint.logEvent] ${e.message}\n`).catch(() => {});
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--verify') { out.verify = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-/g, '_');
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

async function writeCheckpoint(args) {
  if (!VALID_TRIGGERS.has(args.trigger)) {
    console.error(`[checkpoint] invalid --trigger; must be one of: ${[...VALID_TRIGGERS].join(', ')}`);
    process.exit(2);
  }
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });

  const project = await readJsonSafe(PROJECT_PATH, { id: 'unknown', phase: 'UNKNOWN' });
  const budget = await readJsonSafe(BUDGET_PATH, { tokens_used: 0, tokens_remaining: 0, usd_estimate: 0 });
  const inflight = await inFlightArtifacts();
  const completed = inflight.filter(a => a.status === 'ready_for_review' || a.status === 'waiver_pending');

  const checkpointId = ulid();
  const phase = args.phase || project.phase || 'UNKNOWN';
  const activeRole = args.active_role || 'unknown';
  const waitingRoles = (args.waiting_roles || '').split(',').filter(Boolean);
  const nextAction = args.next_action || 'TBD by owner-ceo on next turn';

  const checkpoint = {
    checkpoint_id: checkpointId,
    project_id: project.id,
    at: new Date().toISOString(),
    trigger: args.trigger,
    phase,
    active_role: activeRole,
    waiting_roles: waitingRoles,
    completed_artifacts_in_phase: completed,
    in_flight_artifacts: inflight.filter(a => a.status === 'draft'),
    last_completed_dispatch: parseInt(args.dispatch_id || '0', 10),
    next_planned_action: nextAction,
    resume_command_hint: '/solomon-agent:resume',
    pending_escalations: project.pending_escalations || [],
    budget,
    schema_version: 1
  };

  const fname = `${checkpointId}-${phase}-${args.trigger}.json`;
  const fpath = path.join(CHECKPOINT_DIR, fname);
  await atomicWrite(fpath, JSON.stringify(checkpoint, null, 2));

  const board = {
    updated_at: checkpoint.at,
    phase,
    active_role: activeRole,
    active_role_dispatched_at: args.dispatched_at || checkpoint.at,
    active_role_expected_completion: args.expected_completion || null,
    waiting_roles: waitingRoles.map(r => ({ role: r, blocked_by: nextAction, ready_when: 'see checkpoint next_planned_action' })),
    completed_in_phase: completed.map(a => a.role),
    checkpoint_pointer: path.relative(ROOT, fpath).replace(/\\/g, '/')
  };
  await atomicWrite(BOARD_PATH, JSON.stringify(board, null, 2));

  await logEvent('checkpoint_written', { trigger: args.trigger, checkpoint_id: checkpointId, phase, active_role: activeRole });
  await logEvent('role_state_broadcast_updated', { active_role: activeRole, phase });

  console.log(`[checkpoint] ${checkpointId} (${args.trigger}) phase=${phase} active=${activeRole}`);

  if (args.trigger === 'feature_complete' || args.trigger === 'phase_exit') {
    const { spawn } = await import('node:child_process');
    for (const sub of ['build-codemap.mjs', 'build-kb-index.mjs']) {
      const subPath = path.join(SCRIPT_DIR, sub);
      try {
        await fs.access(subPath);
        spawn('node', [subPath], { stdio: 'inherit', detached: false }).on('error', () => {});
      } catch { /* sibling script not present yet */ }
    }
    if (args.trigger === 'feature_complete') {
      await logEvent('feature_completed', { feature_id: args.feature_id || 'unknown', artifacts: completed.length });
    }
  }

  if (args.trigger === 'consultant_built') {
    await logEvent('consultant_built', {
      consultant_profile_artifact_id: args.consultant_profile_artifact_id || 'unknown',
      mode: args.mode || 'initial',
      peer_reviewer: args.peer_reviewer || 'role-ba'
    });
  }

  return 0;
}

async function verifyCheckpoint() {
  let problems = 0;
  try {
    const files = (await fs.readdir(CHECKPOINT_DIR)).filter(f => f.endsWith('.json')).sort();
    if (files.length === 0) {
      console.log('[checkpoint:verify] no checkpoints; clean baseline');
      return 0;
    }
    const latest = JSON.parse(await fs.readFile(path.join(CHECKPOINT_DIR, files.at(-1)), 'utf8'));
    const board = await readJsonSafe(BOARD_PATH);
    if (!board) { console.error('[checkpoint:verify] role-state-board.json missing'); problems++; }
    else if (board.phase !== latest.phase) { console.error(`[checkpoint:verify] board.phase (${board.phase}) != latest.phase (${latest.phase})`); problems++; }
    else if (board.active_role !== latest.active_role) { console.error(`[checkpoint:verify] board.active_role mismatch`); problems++; }

    for (const a of [...(latest.completed_artifacts_in_phase || []), ...(latest.in_flight_artifacts || [])]) {
      const ap = path.join(ROOT, (a.path || `state/artifacts/${a.id}.md`));
      try { await fs.access(ap); }
      catch { console.error(`[checkpoint:verify] artifact missing: ${a.id}`); problems++; }
    }
    if (problems === 0) console.log(`[checkpoint:verify] OK (${files.length} checkpoints, latest=${latest.checkpoint_id})`);
  } catch (e) {
    console.error(`[checkpoint:verify] ERROR: ${e.message}`);
    return 1;
  }
  return problems > 0 ? 1 : 0;
}

try {
  const args = parseArgs(process.argv);
  const code = args.verify ? await verifyCheckpoint() : await writeCheckpoint(args);
  process.exit(code);
} catch (e) {
  await fs.mkdir(STATE_DIR, { recursive: true }).catch(() => {});
  await fs.appendFile(HOOK_ERROR_LOG, `[checkpoint] CRASH: ${e.message}\n${e.stack}\n`).catch(() => {});
  console.error(`[checkpoint] graceful-crash: ${e.message}`);
  process.exit(0);
}
