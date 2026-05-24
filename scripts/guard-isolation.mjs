#!/usr/bin/env node
// scripts/guard-isolation.mjs — Round 2 #4 + Round 5 #27 path-traversal hardening.
// PreToolUse Read|Glob|Grep. Enforces per-role ACL from state/role-acls.json.

import { promises as fs, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, normalize } from 'node:path';

async function readStdin() {
  return new Promise((resolve) => {
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => resolve(d));
  });
}

function globToRegex(glob) {
  return new RegExp('^' + glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<DSTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DSTAR>>/g, '.*')
    .replace(/\?/g, '[^/]') + '$');
}

async function loadAcl() {
  try {
    const txt = await fs.readFile('state/role-acls.json', 'utf8');
    return JSON.parse(txt);
  } catch { return {}; }
}

function rejectTraversal(p) {
  if (p.includes('..')) return 'contains-..';
  const norm = normalize(p);
  if (norm.includes('..')) return 'normalizes-with-..';
  try {
    const real = realpathSync(isAbsolute(p) ? p : resolve(p));
    const rel = relative(process.cwd(), real);
    if (rel.startsWith('..') || isAbsolute(rel)) return 'symlink-outside-root';
  } catch { /* file may not exist — OK */ }
  return null;
}

async function main() {
  const raw = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { return process.exit(0); }
  const agent = process.env.CLAUDE_AGENT_NAME || 'unknown';
  if (agent === 'owner-ceo' || agent === 'backup-owner') return process.exit(0);
  const target = payload?.tool_input?.file_path || payload?.tool_input?.pattern || payload?.tool_input?.path || '';
  if (!target) return process.exit(0);

  const trav = rejectTraversal(target);
  if (trav) {
    process.stderr.write(`[guard-isolation] BLOCKED path-traversal:${trav} for ${agent} on ${target}\n`);
    process.exit(2);
  }

  const acls = await loadAcl();
  const allow = acls[agent] || [];
  if (allow.length === 0) return process.exit(0);

  const ok = allow.some((g) => globToRegex(g).test(target));
  if (!ok) {
    process.stderr.write(`[guard-isolation] OUT_OF_LANE: ${agent} cannot read ${target}\n`);
    try {
      const ts = new Date().toISOString();
      await fs.appendFile('state/events.ndjson', JSON.stringify({ ts, type: 'acl_violation', role: agent, path: target }) + '\n');
    } catch {}
    process.exit(2);
  }
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] guard-isolation: ${e.stack}\n`); } catch {}
  process.exit(0);  // Round 8 #16: graceful
});
