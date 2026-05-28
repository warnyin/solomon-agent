// tests/scripts/lint-consultant-output.test.mjs
// node --test coverage for scripts/lint-consultant-output.mjs.
// Covers: happy path + each guard (malformed JSON, empty answers,
// missing fields, bad confidence, zero-anchor violation, confidence-cap
// violation, error variant validation).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const LINTER = path.join(REPO_ROOT, 'scripts/lint-consultant-output.mjs');

function runLinterWithStdin(jsonString) {
  return new Promise((resolve) => {
    const p = spawn('node', [LINTER], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d);
    p.stderr.on('data', d => stderr += d);
    p.on('close', code => resolve({ code, stdout, stderr }));
    p.stdin.write(jsonString);
    p.stdin.end();
  });
}

function answer(overrides = {}) {
  return {
    question_id: 'ni_01TEST',
    answer: 'sample answer',
    provenance: {
      brief: ['who.primary_user'],
      extrapolation: [],
      inference: [],
    },
    confidence: 0.8,
    caveats: [],
    defer_to_user: false,
    ...overrides,
  };
}

describe('lint-consultant-output.mjs', () => {
  it('passes on valid minimal payload', async () => {
    const payload = JSON.stringify({
      answers: [answer()],
      cross_question_notes: '',
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 0, `expected pass, got: ${r.stderr || r.stdout}`);
    assert.match(r.stdout, /OK/);
  });

  it('exits 2 on malformed JSON', async () => {
    const r = await runLinterWithStdin('not valid json {');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /JSON\.parse/);
  });

  it('exits 1 when answers array is empty', async () => {
    const payload = JSON.stringify({ answers: [], cross_question_notes: '' });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /answers: empty array/);
  });

  it('exits 1 when confidence is out of [0,1]', async () => {
    const payload = JSON.stringify({
      answers: [answer({ confidence: 1.5 })],
      cross_question_notes: '',
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /confidence=1\.5: must be in \[0, 1\]/);
  });

  it('exits 1 when answer is missing a required field', async () => {
    const broken = answer();
    delete broken.confidence;
    const payload = JSON.stringify({ answers: [broken], cross_question_notes: '' });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /\.confidence: missing/);
  });

  it('catches zero-anchor violation (empty provenance + defer_to_user=false)', async () => {
    const payload = JSON.stringify({
      answers: [answer({
        provenance: { brief: [], extrapolation: [], inference: [] },
        confidence: 0.3,
        defer_to_user: false,
      })],
      cross_question_notes: '',
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /zero-anchor answer.*MUST set defer_to_user=true/);
  });

  it('catches confidence-cap violation (>0.5 with empty brief and not deferring)', async () => {
    const payload = JSON.stringify({
      answers: [answer({
        provenance: { brief: [], extrapolation: ['domain norm: X'], inference: [] },
        confidence: 0.7,
        defer_to_user: false,
      })],
      cross_question_notes: '',
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /confidence=0\.7 exceeds 0\.5 cap for zero-brief-anchor/);
  });

  it('allows confidence>0.5 when brief anchor present', async () => {
    const payload = JSON.stringify({
      answers: [answer({
        provenance: { brief: ['who.primary_user'], extrapolation: ['domain'], inference: [] },
        confidence: 0.85,
        defer_to_user: false,
      })],
      cross_question_notes: '',
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 0, `expected pass, got: ${r.stderr || r.stdout}`);
  });

  it('passes when zero-anchor but defer_to_user=true (consultant correctly defers)', async () => {
    const payload = JSON.stringify({
      answers: [answer({
        provenance: { brief: [], extrapolation: [], inference: [] },
        confidence: 0.2,
        defer_to_user: true,
        caveats: ['no anchor available'],
      })],
      cross_question_notes: '',
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 0, `expected pass, got: ${r.stderr || r.stdout}`);
  });

  it('accepts error variant with defer_all_to_user=true', async () => {
    const payload = JSON.stringify({
      error: 'profile_unavailable',
      defer_all_to_user: true,
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 0, `expected pass, got: ${r.stderr || r.stdout}`);
  });

  it('rejects error variant with defer_all_to_user=false', async () => {
    const payload = JSON.stringify({
      error: 'profile_unavailable',
      defer_all_to_user: false,
    });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /"defer_all_to_user" must be true/);
  });

  it('exits 1 when cross_question_notes is missing', async () => {
    const payload = JSON.stringify({ answers: [answer()] });
    const r = await runLinterWithStdin(payload);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /cross_question_notes: missing/);
  });
});
