#!/usr/bin/env node
// scripts/state-compact.mjs — Round 4 #19.
import { promises as fs } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { join } from 'node:path';

const EVENTS = 'state/events.ndjson';
const ARTIFACTS_DIR = 'state/artifacts';
const ARCHIVE_DIR = 'state/archive';
const SIZE_THRESHOLD = 10 * 1024 * 1024;
const SUPERSEDED_DAYS = 7;

async function rotateEvents() {
  try {
    const stat = await fs.stat(EVENTS);
    if (stat.size < SIZE_THRESHOLD) return { rotated: false };
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = join(ARCHIVE_DIR, `events-${ts}.ndjson.gz`);
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    await pipeline(createReadStream(EVENTS), createGzip(), createWriteStream(dest));
    await fs.writeFile(EVENTS, JSON.stringify({
      ts: new Date().toISOString(), type: 'genesis_after_rotate', archived_to: dest, _prev: 'GENESIS',
    }) + '\n');
    return { rotated: true, dest, size: stat.size };
  } catch (e) { return { rotated: false, error: e.message }; }
}

async function archiveSuperseded() {
  let moved = 0;
  try {
    const files = await fs.readdir(ARTIFACTS_DIR);
    const cutoff = Date.now() - SUPERSEDED_DAYS * 86400 * 1000;
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      const path = join(ARTIFACTS_DIR, f);
      const txt = await fs.readFile(path, 'utf8');
      if (!/status:\s*"?superseded"?/.test(txt)) continue;
      const m = txt.match(/produced_at:\s*"?([^"\n]+)"?/);
      if (!m) continue;
      if (new Date(m[1]).getTime() > cutoff) continue;
      const phaseMatch = f.match(/^[^-]+-([^-]+)-/);
      const phase = phaseMatch?.[1] || 'unknown';
      const destDir = join(ARCHIVE_DIR, 'artifacts', phase);
      await fs.mkdir(destDir, { recursive: true });
      await fs.rename(path, join(destDir, f));
      moved++;
    }
  } catch {}
  return { moved };
}

async function main() {
  const r = await rotateEvents();
  const a = await archiveSuperseded();
  console.log(`[compact] events: ${r.rotated ? `rotated to ${r.dest}` : 'no rotation needed'}; artifacts: ${a.moved} superseded archived`);
  try {
    await fs.appendFile(EVENTS, JSON.stringify({
      ts: new Date().toISOString(), type: 'state_compacted', events_rotated: r.rotated, artifacts_moved: a.moved,
    }) + '\n');
  } catch {}
  process.exit(0);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
