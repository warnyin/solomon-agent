#!/usr/bin/env node
// scripts/post-agent.mjs — Round 8 #100 (merged stack-pop + token-record). PostToolUse Agent.

import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';

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

function computeFrameKey(toolInput) {
  const subagent = toolInput?.subagent_type || 'unknown';
  const prompt = (toolInput?.prompt || '').slice(0, 200);
  return createHash('sha256').update(subagent + prompt).digest('hex').slice(0, 16);
}

async function popFrameByKey(keyPrefix) {
  let stack = { stack: [] };
  try { stack = JSON.parse(await fs.readFile('state/dispatch-stack.json', 'utf8')); } catch {}
  let idx = stack.stack.findIndex((e) => e.frame_key?.startsWith(keyPrefix));
  if (idx < 0 && stack.stack.length > 0) idx = stack.stack.length - 1;
  const popped = idx >= 0 ? stack.stack.splice(idx, 1)[0] : null;
  try { await atomicWrite('state/dispatch-stack.json', JSON.stringify(stack)); } catch {}
  return popped;
}

function estimateTokens(text) {
  if (!text) return 0;
  const nonAscii = (text.match(/[^\x00-\x7f]/g) || []).length;
  const ratio = nonAscii / text.length > 0.3 ? 2.0 : 3.5;
  return Math.ceil(text.length / ratio);
}

async function recordTokens(role, count) {
  let b;
  try { b = JSON.parse(await fs.readFile('state/budget.json', 'utf8')); } catch { return; }
  b.tokens_used = (b.tokens_used || 0) + count;
  b.per_role = b.per_role || {};
  b.per_role[role] = (b.per_role[role] || 0) + count;
  b.cost_estimate_usd = (b.tokens_used / 1_000_000) * 3.0;
  try { await atomicWrite('state/budget.json', JSON.stringify(b, null, 2)); } catch {}
}

async function main() {
  const raw = await readStdin();
  let payload;
  try { payload = JSON.parse(raw); } catch { return process.exit(0); }
  const toolInput = payload?.tool_input || {};
  const toolResponse = payload?.tool_response || {};
  const role = toolInput.subagent_type || 'unknown';

  const key = computeFrameKey(toolInput);
  const popped = await popFrameByKey(key);
  const startedAt = popped ? new Date(popped.started_at).getTime() : Date.now();
  const durationMs = Date.now() - startedAt;

  let tokens = 0, source = 'estimate';
  if (toolResponse?.usage?.total_tokens) {
    tokens = toolResponse.usage.total_tokens;
    source = 'actual';
  } else if (toolResponse?.output) {
    tokens = estimateTokens(toolResponse.output) + estimateTokens(toolInput.prompt || '');
  }
  if (tokens > 0) await recordTokens(role, tokens);

  try {
    await fs.appendFile('state/events.ndjson', JSON.stringify({
      ts: new Date().toISOString(), type: 'dispatch_complete',
      role, depth: popped?.depth || 0, duration_ms: durationMs, tokens, source,
    }) + '\n');
  } catch {}
  process.exit(0);
}

main().catch(async (e) => {
  try { await fs.appendFile('state/hook-errors.log', `[${new Date().toISOString()}] post-agent: ${e.stack}\n`); } catch {}
  process.exit(0);
});
