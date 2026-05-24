#!/usr/bin/env node
// scripts/guard-rate.mjs — Round 4 #24 + Round 5 #75.
// PreToolUse Agent. Sliding 60s window of timestamps in state/rate-window.json.

import { promises as fs } from 'node:fs';

const DEFAULT_RPM = 60;
const DEFAULT_BURST = 10;

async function readStdin() {
  return new Promise((resolve) => {
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => resolve(d));
  });
}

async function atomicWrite(path, content) {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, path);
}

async function main() {
  await readStdin();
  let w = { timestamps: [], requests_per_minute_limit: DEFAULT_RPM, burst_limit: DEFAULT_BURST };
  try { w = JSON.parse(await fs.readFile('state/rate-window.json', 'utf8')); } catch {}

  const now = Date.now();
  const windowMs = 60_000;
  w.timestamps = (w.timestamps || []).filter((ts) => now - new Date(ts).getTime() < windowMs);

  if (w.timestamps.length >= (w.requests_per_minute_limit || DEFAULT_RPM)) {
    process.stderr.write(`[guard-rate] BLOCKED: ${w.timestamps.length}/${w.requests_per_minute_limit} per minute. Back off.\n`);
    try {
      await fs.appendFile('state/events.ndjson', JSON.stringify({
        ts: new Date().toISOString(), type: 'rate_limit_blocked',
        window_size: w.timestamps.length, limit: w.requests_per_minute_limit,
      }) + '\n');
    } catch {}
    process.exit(2);
  }

  w.timestamps.push(new Date(now).toISOString());
  try { await atomicWrite('state/rate-window.json', JSON.stringify(w)); } catch {}
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] guard-rate: ${e.stack}\n`); } catch {}
  process.exit(0);
});
