// scripts/state-store.mjs
// Centralized state read/write for Solomon Agent. Single import surface.
// Per plan Rounds: 1 (init), 4 (atomic), 5 (writeArtifact + writer_signature), 6 (lock pid), 7 (HMAC key), 8 (post-agent merge).
// Node built-ins only (no npm deps).

import { promises as fs, constants as FS } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHmac, randomBytes } from 'node:crypto';
import { hostname, userInfo } from 'node:os';
import { pathToFileURL } from 'node:url';

const STATE_DIR = process.env.SC_STATE_DIR || 'state';
const ARTIFACTS_DIR = join(STATE_DIR, 'artifacts');
const EVENTS_FILE = join(STATE_DIR, 'events.ndjson');
const PROJECT_FILE = join(STATE_DIR, 'project.json');
const BUDGET_FILE = join(STATE_DIR, 'budget.json');
const SESSION_KEY_FILE = join(STATE_DIR, 'session.key');
const LOCK_FILE = join(STATE_DIR, 'lock');
const ABORT_FLAG = join(STATE_DIR, 'abort.flag');
const STACK_FILE = join(STATE_DIR, 'dispatch-stack.json');

const DEFAULT_BUDGET = {
  tokens_budget: 200000,
  tokens_used: 0,
  cost_estimate_usd: 0,
  per_role: {},
  soft_limit_pct: 80,
  hard_limit_pct: 100,
};

// --- ULID generator (compact, no deps) ---
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function ulid() {
  const t = Date.now();
  let s = '';
  let v = t;
  for (let i = 9; i >= 0; i--) {
    s = CROCKFORD[v % 32] + s;
    v = Math.floor(v / 32);
  }
  const r = randomBytes(10);
  for (const b of r) s += CROCKFORD[b % 32];
  return s;
}

// --- Atomic write (Round 5 #75 / Round 7 atomic pattern) ---
export async function atomicWrite(path, content) {
  await fs.mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, path);
}

// --- HMAC writer signature (Round 7 #92 / Round 8 #97 advisory) ---
async function sessionKey() {
  try {
    return await fs.readFile(SESSION_KEY_FILE);
  } catch {
    const key = randomBytes(32);
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(SESSION_KEY_FILE, key, { mode: 0o600 });
    return key;
  }
}

export async function writerSignature(content) {
  const key = await sessionKey();
  return createHmac('sha256', key).update(content).digest('hex');
}

// --- Event log (Round 4 #6 + Round 5 #63 HMAC chain) ---
let lastHash = null;
async function loadLastHash() {
  if (lastHash !== null) return lastHash;
  try {
    const txt = await fs.readFile(EVENTS_FILE, 'utf8');
    const lines = txt.trim().split('\n');
    if (lines.length === 0) { lastHash = 'GENESIS'; return lastHash; }
    const last = JSON.parse(lines.at(-1));
    lastHash = last._hash || 'GENESIS';
  } catch {
    lastHash = 'GENESIS';
  }
  return lastHash;
}

export async function logEvent(event) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  const prev = await loadLastHash();
  const key = await sessionKey();
  const base = { ts: new Date().toISOString(), ...event, _prev: prev };
  const hash = createHmac('sha256', key).update(JSON.stringify(base)).digest('hex');
  const entry = { ...base, _hash: hash };
  await fs.appendFile(EVENTS_FILE, JSON.stringify(entry) + '\n', 'utf8');
  lastHash = hash;
  return entry;
}

// --- Project state ---
export async function readProject() {
  try { return JSON.parse(await fs.readFile(PROJECT_FILE, 'utf8')); }
  catch { return null; }
}

export async function init({ goal, projectId, scVersion = '0.1.0' }) {
  const id = projectId || ulid();
  const now = new Date().toISOString();
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  await atomicWrite(PROJECT_FILE, JSON.stringify({
    id, goal, started_at: now, phase: 'DISCOVERY',
    project_type: null, sc_version: scVersion, status: 'in_progress',
    pending_escalations: [],
  }, null, 2));
  await atomicWrite(BUDGET_FILE, JSON.stringify(DEFAULT_BUDGET, null, 2));
  await atomicWrite(STACK_FILE, JSON.stringify({ stack: [] }, null, 2));
  await acquireLock(id);
  await logEvent({ type: 'project_init', project_id: id, goal });
  return { id };
}

export async function setPhase(phase) {
  const p = await readProject();
  if (!p) throw new Error('no project to update');
  p.phase = phase;
  await atomicWrite(PROJECT_FILE, JSON.stringify(p, null, 2));
  await logEvent({ type: 'phase_start', phase });
}

// --- Lock (Round 4 #34) ---
export async function acquireLock(projectId) {
  try {
    await fs.access(LOCK_FILE, FS.F_OK);
    const existing = JSON.parse(await fs.readFile(LOCK_FILE, 'utf8'));
    throw new Error(`MULTI_USER_LOCK held by ${existing.user}@${existing.hostname} (pid ${existing.pid}) since ${existing.started_at}`);
  } catch (e) {
    if (e.code !== 'ENOENT' && !e.message.startsWith('MULTI_USER_LOCK')) throw e;
    if (e.message?.startsWith('MULTI_USER_LOCK')) throw e;
  }
  await atomicWrite(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    hostname: hostname(),
    user: userInfo().username,
    started_at: new Date().toISOString(),
    project_id: projectId,
  }));
}

export async function releaseLock() {
  try { await fs.unlink(LOCK_FILE); } catch {}
}

// --- Artifact write (Round 5 #75 + Round 7 #92 signature) ---
export async function writeArtifact({ role, phase, kind, body, frontmatter = {} }) {
  const id = ulid();
  const fname = `${id}-${phase}-${role}-${kind}.md`;
  const path = join(ARTIFACTS_DIR, fname);
  const fm = {
    id, phase, produced_by: role, produced_at: new Date().toISOString(),
    inputs: [], status: 'draft',
    artifact_type: kind,
    ...frontmatter,
  };
  const content = body;
  fm.writer_signature = await writerSignature(content);
  const yaml = Object.entries(fm).map(([k, v]) =>
    `${k}: ${JSON.stringify(v)}`
  ).join('\n');
  const full = `---\n${yaml}\n---\n\n${content}\n`;
  await atomicWrite(path, full);
  await logEvent({ type: 'artifact_created', artifact_id: id, role, phase, kind, path });
  return { id, path };
}

// --- Abort flag (Round 8 #82) ---
export async function writeAbortFlag({ reason, phase, escalation = null }) {
  await atomicWrite(ABORT_FLAG, JSON.stringify({
    reason, phase, escalation,
    written_at: new Date().toISOString(),
  }, null, 2));
  await logEvent({ type: 'abort', reason, phase });
}

// --- Token accounting (Round 1 #1 + Round 7 #94 hook-side fallback) ---
export async function recordTokens({ role, count, source = 'estimate' }) {
  let b;
  try { b = JSON.parse(await fs.readFile(BUDGET_FILE, 'utf8')); }
  catch { b = { ...DEFAULT_BUDGET }; }
  b.tokens_used += count;
  b.per_role[role] = (b.per_role[role] || 0) + count;
  b.cost_estimate_usd = (b.tokens_used / 1_000_000) * 3.0; // rough sonnet output
  await atomicWrite(BUDGET_FILE, JSON.stringify(b, null, 2));
  const pct = (b.tokens_used / b.tokens_budget) * 100;
  if (pct >= b.hard_limit_pct) await logEvent({ type: 'budget_exceeded', pct });
  else if (pct >= b.soft_limit_pct) await logEvent({ type: 'budget_warning', pct });
  return b;
}

// --- Config loader (Round 2 #13) with safety enforcement ---
export async function loadConfig() {
  const path = 'sc.config.json';
  let c = {};
  try { c = JSON.parse(await fs.readFile(path, 'utf8')); } catch {}
  const safetyClass = new Set([
    'SAFETY', 'DECISION_GATE', 'SCOPE_EXPLOSION', 'INJECTION_DETECTED',
    'MULTI_USER_LOCK', 'BUDGET_EXCEEDED', 'STATE_VERSION_MISMATCH',
    'MIGRATION_INTEGRITY_FAILURE', 'MCP_AUTH',
  ]);
  if (Array.isArray(c.escalation_relax)) {
    const filtered = c.escalation_relax.filter(x => !safetyClass.has(x));
    if (filtered.length !== c.escalation_relax.length) {
      await logEvent({ type: 'config_safety_relax_refused',
        rejected: c.escalation_relax.filter(x => safetyClass.has(x)) });
    }
    c.escalation_relax = filtered;
  }
  return c;
}

// --- SIGINT/SIGTERM cleanup (Round 4 #29) ---
let cleanupRegistered = false;
export function registerCleanup() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  const cleanup = async (signal) => {
    try { await writeAbortFlag({ reason: `signal:${signal}`, phase: (await readProject())?.phase }); }
    catch {}
    try { await releaseLock(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));
}

// --- CLI entrypoint (so launch.md can shell out) ---
// Use pathToFileURL — manual `file://${argv}` produces 2 slashes on Windows
// while import.meta.url uses 3, so the comparison silently fails and the
// CLI block is skipped (exit 0 with no init).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  registerCleanup();
  const [, , cmd, ...args] = process.argv;
  const opts = Object.fromEntries(
    args.reduce((acc, x, i, arr) => {
      if (x.startsWith('--')) acc.push([x.slice(2), arr[i + 1]]);
      return acc;
    }, [])
  );
  const run = {
    init: () => init({ goal: opts.goal, projectId: opts['project-id'], scVersion: opts['sc-version'] }),
    'set-phase': () => setPhase(opts.phase),
    'release-lock': () => releaseLock(),
    abort: () => writeAbortFlag({ reason: opts.reason || 'cli', phase: opts.phase }),
  }[cmd];
  if (!run) { console.error(`Unknown command: ${cmd}`); process.exit(1); }
  run().then(r => { if (r) console.log(JSON.stringify(r)); }).catch(e => {
    console.error(e.message); process.exit(1);
  });
}
