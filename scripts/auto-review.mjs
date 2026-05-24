#!/usr/bin/env node
// scripts/auto-review.mjs — Round 1 #11 (optional PostToolUse Write|Edit hook).
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
  const raw = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { return process.exit(0); }
  const path = payload?.tool_input?.file_path || '';
  if (!/\.(?:ts|tsx|js|jsx|py|go|rs|java|kt|swift|c|cpp|h|hpp|rb|php|cs)$/.test(path)) return process.exit(0);
  if (/state[\/\\]artifacts[\/\\]/.test(path)) return process.exit(0);

  try {
    await fs.appendFile('state/events.ndjson', JSON.stringify({
      ts: new Date().toISOString(), type: 'needs_review', file: path,
    }) + '\n');
  } catch {}
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] auto-review: ${e.stack}\n`); } catch {}
  process.exit(0);
});
