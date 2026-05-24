#!/usr/bin/env node
// scripts/guard-secrets.mjs — Round 1 + Round 5 #64.
// PreToolUse Write|Edit. Blocks content with secret patterns. SECURITY: fail-closed.

import { promises as fs } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PATTERNS_FILE = resolve(HERE, 'secret-patterns.json');

async function readStdin() {
  return new Promise((resolve) => {
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => resolve(d));
  });
}

async function loadPatterns() {
  try {
    const txt = await fs.readFile(PATTERNS_FILE, 'utf8');
    const { patterns } = JSON.parse(txt);
    return patterns.map((p) => ({ name: p.name, re: new RegExp(p.regex, p.flags || 'g') }));
  } catch {
    return [
      { name: 'AWS', re: /AKIA[0-9A-Z]{16}/g },
      { name: 'Anthropic', re: /sk-ant-api03-[A-Za-z0-9_-]{40,}/g },
      { name: 'OpenAI/Stripe', re: /sk-(?:proj-|live-|test-)?[A-Za-z0-9]{40,}/g },
      { name: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{36}/g },
    ];
  }
}

async function main() {
  const raw = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { return process.exit(0); }
  const content = payload?.tool_input?.content || payload?.tool_input?.new_string || '';
  if (!content) return process.exit(0);
  const patterns = await loadPatterns();
  const hits = [];
  for (const { name, re } of patterns) {
    const m = content.match(re);
    if (m) hits.push({ name, count: m.length });
  }
  if (hits.length > 0) {
    process.stderr.write(`[guard-secrets] BLOCKED: ${hits.map((h) => `${h.name}×${h.count}`).join(', ')}\n`);
    process.exit(2);
  }
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`[guard-secrets] internal error: ${e.message}\n`);
  process.exit(2);  // SECURITY: fail-closed even on internal error
});
