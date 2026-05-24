#!/usr/bin/env node
// scripts/verify-log.mjs — Round 5 #63 + Round 6 #90.
import { promises as fs } from 'node:fs';
import { createHmac } from 'node:crypto';

async function main() {
  let txt;
  try { txt = await fs.readFile('state/events.ndjson', 'utf8'); }
  catch { console.log('no events.ndjson'); return process.exit(0); }
  let key;
  try { key = await fs.readFile('state/session.key'); }
  catch { console.error('no state/session.key'); return process.exit(1); }

  const lines = txt.trim().split('\n').filter(Boolean);
  let prev = 'GENESIS';
  for (let i = 0; i < lines.length; i++) {
    let event;
    try { event = JSON.parse(lines[i]); } catch { console.error(`line ${i + 1}: invalid JSON`); return process.exit(2); }
    if (event._prev !== prev) {
      console.error(`AUDIT_LOG_TAMPERED at line ${i + 1}: _prev=${event._prev} expected=${prev}`);
      return process.exit(2);
    }
    const { _hash, ...rest } = event;
    const computed = createHmac('sha256', key).update(JSON.stringify(rest)).digest('hex');
    if (computed !== _hash) {
      console.error(`AUDIT_LOG_TAMPERED at line ${i + 1}: hash mismatch`);
      return process.exit(2);
    }
    prev = _hash;
  }
  console.log(`VALID: ${lines.length} events`);
  process.exit(0);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
