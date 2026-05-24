#!/usr/bin/env node
// scripts/validate-artifact-write.mjs — Round 7 #92 + Round 8 #97 (advisory).

import { promises as fs } from 'node:fs';
import { createHmac } from 'node:crypto';

async function readStdin() {
  return new Promise((resolve) => {
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => resolve(d));
  });
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: null, body: text };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const [k, ...rest] = line.split(':');
    if (!k) continue;
    let v = rest.join(':').trim();
    try { v = JSON.parse(v); } catch {}
    fm[k.trim()] = v;
  }
  return { fm, body: m[2] };
}

async function main() {
  const raw = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { return process.exit(0); }
  const path = payload?.tool_input?.file_path || '';
  if (!/state[\/\\]artifacts[\/\\][^\/\\]+\.md$/.test(path)) return process.exit(0);

  let content;
  try { content = await fs.readFile(path, 'utf8'); } catch { return process.exit(0); }

  const { fm, body } = parseFrontmatter(content);
  let valid = false;
  if (fm?.writer_signature) {
    try {
      const key = await fs.readFile('state/session.key');
      const expected = createHmac('sha256', key).update(body.trim()).digest('hex');
      valid = fm.writer_signature === expected;
    } catch {}
  }

  if (!valid) {
    const invalidPath = path.replace(/\.md$/, '.invalid.md');
    try { await fs.rename(path, invalidPath); } catch {}
    try {
      await fs.appendFile('state/events.ndjson', JSON.stringify({
        ts: new Date().toISOString(), type: 'artifact_write_violation',
        original_path: path, moved_to: invalidPath,
        reason: fm?.writer_signature ? 'signature_mismatch' : 'missing_signature',
      }) + '\n');
    } catch {}
    process.stderr.write(`[validate-artifact-write] raw_write_suspected: ${path} → ${invalidPath}\n`);
  }
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] validate-artifact-write: ${e.stack}\n`); } catch {}
  process.exit(0);
});
