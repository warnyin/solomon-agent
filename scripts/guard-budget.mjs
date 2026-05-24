#!/usr/bin/env node
// scripts/guard-budget.mjs — Round 1 #1. PreToolUse Agent.

import { promises as fs } from 'node:fs';

async function readStdin() {
  return new Promise((resolve) => {
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => resolve(d));
  });
}

async function main() {
  await readStdin();
  let b;
  try { b = JSON.parse(await fs.readFile('state/budget.json', 'utf8')); }
  catch { return process.exit(0); }
  const pct = (b.tokens_used / b.tokens_budget) * 100;
  if (pct >= (b.hard_limit_pct || 100)) {
    process.stderr.write(`[guard-budget] BUDGET_EXCEEDED ${b.tokens_used}/${b.tokens_budget} (${pct.toFixed(1)}%)\n`);
    try {
      await fs.appendFile('state/events.ndjson', JSON.stringify({
        ts: new Date().toISOString(), type: 'budget_exceeded', pct, tokens_used: b.tokens_used,
      }) + '\n');
    } catch {}
    process.exit(2);
  }
  if (pct >= (b.soft_limit_pct || 80)) {
    process.stderr.write(`[guard-budget] BUDGET_WARNING ${pct.toFixed(1)}%\n`);
    try {
      await fs.appendFile('state/events.ndjson', JSON.stringify({
        ts: new Date().toISOString(), type: 'budget_warning', pct,
      }) + '\n');
    } catch {}
  }
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] guard-budget: ${e.stack}\n`); } catch {}
  process.exit(0);
});
