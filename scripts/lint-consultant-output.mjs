#!/usr/bin/env node
// scripts/lint-consultant-output.mjs
// Validate role-consultant JSON output against the contract in
// agents/role-consultant.md §Output Contract and design/consultant-feature.md Q4.
// Exit 0 on pass, 1 on lint failure, 2 on unreadable input or malformed JSON.
// Node 18+ builtins only.
//
// CLI:
//   echo '{"answers":[...]}' | node scripts/lint-consultant-output.mjs       # reads stdin
//   node scripts/lint-consultant-output.mjs path/to/return.json               # reads file
//
// Used by owner-ceo immediately after role-consultant returns. Per
// rules/needs-input-protocol.md §Consultant Anti-Loop: malformed -> 1x retry
// with schema reminder -> still malformed -> defer all to user.

import { promises as fs } from 'node:fs';

const REQUIRED_ANSWER_FIELDS = [
  'question_id', 'answer', 'provenance',
  'confidence', 'caveats', 'defer_to_user'
];

const REQUIRED_PROVENANCE_KEYS = ['brief', 'extrapolation', 'inference'];

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function loadInput() {
  const arg = process.argv[2];
  if (arg) {
    return fs.readFile(arg, 'utf8');
  }
  if (process.stdin.isTTY) {
    throw new Error('no input on stdin and no file argument provided');
  }
  return readStdin();
}

function lintErrorShape(obj, issues) {
  if (typeof obj.error !== 'string' || obj.error.length === 0) {
    issues.push('error variant: "error" field must be non-empty string');
  }
  if (typeof obj.defer_all_to_user !== 'boolean') {
    issues.push('error variant: "defer_all_to_user" must be boolean');
  }
  if (obj.defer_all_to_user !== true) {
    issues.push('error variant: "defer_all_to_user" must be true (consultant cannot recover from internal errors)');
  }
}

function lintAnswer(ans, idx, issues) {
  const prefix = `answers[${idx}]`;

  if (typeof ans !== 'object' || ans === null || Array.isArray(ans)) {
    issues.push(`${prefix}: must be object`);
    return;
  }

  for (const f of REQUIRED_ANSWER_FIELDS) {
    if (!(f in ans)) issues.push(`${prefix}.${f}: missing`);
  }

  if ('question_id' in ans && typeof ans.question_id !== 'string') {
    issues.push(`${prefix}.question_id: must be string`);
  }
  if ('answer' in ans && typeof ans.answer !== 'string') {
    issues.push(`${prefix}.answer: must be string`);
  }
  if ('defer_to_user' in ans && typeof ans.defer_to_user !== 'boolean') {
    issues.push(`${prefix}.defer_to_user: must be boolean`);
  }
  if ('caveats' in ans) {
    if (!Array.isArray(ans.caveats)) {
      issues.push(`${prefix}.caveats: must be array`);
    } else {
      ans.caveats.forEach((c, i) => {
        if (typeof c !== 'string') issues.push(`${prefix}.caveats[${i}]: must be string`);
      });
    }
  }

  if ('confidence' in ans) {
    const c = ans.confidence;
    if (typeof c !== 'number' || Number.isNaN(c)) {
      issues.push(`${prefix}.confidence: must be number`);
    } else {
      if (c < 0 || c > 1) issues.push(`${prefix}.confidence=${c}: must be in [0, 1]`);
    }
  }

  if ('provenance' in ans) {
    const p = ans.provenance;
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
      issues.push(`${prefix}.provenance: must be object`);
    } else {
      for (const k of REQUIRED_PROVENANCE_KEYS) {
        if (!(k in p)) {
          issues.push(`${prefix}.provenance.${k}: missing`);
          continue;
        }
        if (!Array.isArray(p[k])) {
          issues.push(`${prefix}.provenance.${k}: must be array`);
          continue;
        }
        p[k].forEach((item, i) => {
          if (typeof item !== 'string') {
            issues.push(`${prefix}.provenance.${k}[${i}]: must be string`);
          }
        });
      }

      // Zero-anchor guard (per agents/role-consultant.md Method step 6):
      // if all 3 provenance arrays empty AND defer_to_user=false -> violation
      if (
        Array.isArray(p.brief) && p.brief.length === 0 &&
        Array.isArray(p.extrapolation) && p.extrapolation.length === 0 &&
        Array.isArray(p.inference) && p.inference.length === 0 &&
        ans.defer_to_user === false
      ) {
        issues.push(`${prefix}: zero-anchor answer (all provenance arrays empty) MUST set defer_to_user=true`);
      }

      // Confidence cap (per agents/role-consultant.md Method step 5):
      // pure-extrapolation (no brief anchor) capped at 0.5 unless deferred
      if (
        Array.isArray(p.brief) && p.brief.length === 0 &&
        typeof ans.confidence === 'number' && ans.confidence > 0.5 &&
        ans.defer_to_user === false
      ) {
        issues.push(`${prefix}: confidence=${ans.confidence} exceeds 0.5 cap for zero-brief-anchor answer`);
      }
    }
  }
}

function lint(json) {
  const issues = [];
  let obj;
  try {
    obj = JSON.parse(json);
  } catch (e) {
    return { code: 2, issues: [`JSON.parse: ${e.message}`] };
  }

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    issues.push('top-level must be object');
    return { code: 1, issues };
  }

  // Error variant?
  if ('error' in obj || 'defer_all_to_user' in obj) {
    lintErrorShape(obj, issues);
    return { code: issues.length ? 1 : 0, issues };
  }

  // Normal variant
  if (!Array.isArray(obj.answers)) {
    issues.push('answers: missing or not array');
  } else {
    if (obj.answers.length === 0) {
      issues.push('answers: empty array (consultant must return at least one entry per question dispatched)');
    }
    obj.answers.forEach((a, i) => lintAnswer(a, i, issues));
  }

  if (!('cross_question_notes' in obj)) {
    issues.push('cross_question_notes: missing (use empty string if no coupling decisions)');
  } else if (typeof obj.cross_question_notes !== 'string') {
    issues.push('cross_question_notes: must be string');
  }

  return { code: issues.length ? 1 : 0, issues };
}

async function main() {
  let json;
  try {
    json = await loadInput();
  } catch (e) {
    console.error(`[lint-consultant-output] cannot read input: ${e.message}`);
    process.exit(2);
  }

  const { code, issues } = lint(json);
  if (code === 0) {
    console.log('[lint-consultant-output] OK');
    process.exit(0);
  }
  console.error(`[lint-consultant-output] ${issues.length} issue(s):`);
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(code);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
