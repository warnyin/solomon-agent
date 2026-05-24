#!/usr/bin/env node
// scripts/guard-depth.mjs — Round 6 #83 + Round 7 #91.
// PreToolUse Agent. Reads state/dispatch-stack.json; blocks if next depth > max.

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
  const agent = process.env.CLAUDE_AGENT_NAME || 'owner-ceo';

  let project = { dispatch_depth_max: 2 };
  try { project = JSON.parse(await fs.readFile('state/project.json', 'utf8')); } catch {}
  const max = project.dispatch_depth_max || 2;

  let stack = { stack: [] };
  try { stack = JSON.parse(await fs.readFile('state/dispatch-stack.json', 'utf8')); } catch {}

  const parentDepths = stack.stack.filter((e) => e.invoking_agent === agent).map((e) => e.depth);
  const parentDepth = parentDepths.length === 0 ? 0 : Math.max(...parentDepths);
  const nextDepth = parentDepth + 1;

  if (nextDepth > max) {
    process.stderr.write(`[guard-depth] DEPTH_LIMIT_REACHED ${agent} → depth ${nextDepth} > max ${max}\n`);
    try {
      await fs.appendFile('state/events.ndjson', JSON.stringify({
        ts: new Date().toISOString(), type: 'depth_limit_blocked', role: agent, next_depth: nextDepth, max,
      }) + '\n');
    } catch {}
    process.exit(2);
  }
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] guard-depth: ${e.stack}\n`); } catch {}
  process.exit(0);
});
