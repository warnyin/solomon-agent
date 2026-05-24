#!/usr/bin/env node
// scripts/sanitize-input.mjs
// Round 3 Gap #17: strip prompt-injection patterns from user input.
// Wraps result in <USER_REQUIREMENT> tags. Logs original + sanitized to state/launch-input.audit.json.
// Round 5 Gap #65: scrub secrets BEFORE persisting audit log.

import { promises as fs } from 'node:fs';

const INJECTION_PATTERNS = [
  /<\|[^|]*\|>/gi,
  /ignore (?:all |previous |prior )?(?:instructions|rules|directives)/gi,
  /IGNORE_PRIOR_INSTRUCTIONS/g,
  /^(?:system|assistant|user)\s*:/gim,
  /<system-reminder>/gi,
  /<command-name>/gi,
  /<command-args>/gi,
  /you are (?:now )?(?:a |an )?(?:helpful|harmful|jailbroken|new|different)/gi,
  /from now on/gi,
  /DAN mode/gi,
  /forget (?:everything|all|previous)/gi,
];

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,
  /sk-ant-api03-[A-Za-z0-9_-]{40,}/g,
  /sk-(?:proj-|live-|test-)?[A-Za-z0-9]{40,}/g,
  /ghp_[A-Za-z0-9]{36}/g,
  /github_pat_[A-Za-z0-9_]{82}/g,
  /xox[abp]-[A-Za-z0-9-]{20,}/g,
];

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

function detectInjection(text) {
  const hits = [];
  for (const p of INJECTION_PATTERNS) {
    const m = text.match(p);
    if (m) hits.push({ pattern: p.source, matches: m.slice(0, 3) });
  }
  return hits;
}

function scrubSecrets(text) {
  let out = text;
  const found = [];
  for (const p of SECRET_PATTERNS) {
    out = out.replace(p, (match) => {
      found.push(match.slice(0, 8) + '...');
      return `[REDACTED:${p.source.slice(0, 12)}]`;
    });
  }
  return { scrubbed: out, found };
}

function stripInjectionMarkers(text) {
  let out = text;
  for (const p of INJECTION_PATTERNS) {
    out = out.replace(p, '[STRIPPED]');
  }
  return out;
}

async function main() {
  const raw = (await readStdin()).trim();
  const injections = detectInjection(raw);
  const stripped = stripInjectionMarkers(raw);
  const { scrubbed, found: scrubbedSecrets } = scrubSecrets(stripped);

  await fs.mkdir('state', { recursive: true });
  await fs.writeFile('state/launch-input.audit.json', JSON.stringify({
    ts: new Date().toISOString(),
    sanitized_chars: scrubbed.length,
    injection_patterns_detected: injections.length,
    injection_details: injections,
    secrets_redacted: scrubbedSecrets.length,
    secrets_prefixes: scrubbedSecrets,
    sanitized: scrubbed,
  }, null, 2));

  if (injections.length > 0) {
    process.stderr.write(`INJECTION_DETECTED: ${injections.length} pattern(s). See state/launch-input.audit.json.\n`);
    process.exit(2);
  }

  process.stdout.write(`<USER_REQUIREMENT>\n${scrubbed}\n</USER_REQUIREMENT>\n`);
}

main().catch((e) => {
  process.stderr.write(`sanitize-input crashed: ${e.message}\n`);
  process.exit(0);  // Round 8 #16: graceful
});
