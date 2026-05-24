#!/usr/bin/env node
// scripts/uninstall.mjs — Round 4 #33.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    const s = join(src, e.name), d = join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function archive() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(homedir(), '.claude', `sc-archive-${ts}`);
  try { await copyDir('state', dest); return dest; } catch { return null; }
}

function ask(q) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim().toLowerCase()); }));
}

async function main() {
  let hasState = false;
  try { await fs.access('state'); hasState = true; } catch {}
  if (!hasState) { console.log('[uninstall] no state/. Safe to /plugin uninstall solomon-agent.'); return process.exit(0); }

  console.log('[uninstall] state/ exists. Options: (k)eep / (a)rchive / (d)elete');
  const ans = await ask('Choice [k/a/d]: ');
  if (ans === 'k') { console.log('Kept. Run /plugin uninstall solomon-agent next.'); return process.exit(0); }
  if (ans === 'a') {
    const dest = await archive();
    if (dest) console.log(`Archived to ${dest}`);
    return process.exit(dest ? 0 : 1);
  }
  if (ans === 'd') {
    await fs.rm('state', { recursive: true, force: true });
    console.log('Deleted. Run /plugin uninstall solomon-agent next.');
    return process.exit(0);
  }
  console.error(`unknown: ${ans}`); process.exit(1);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
