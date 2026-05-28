// tests/scripts/lint-consultant-profile.test.mjs
// node --test coverage for scripts/lint-consultant-profile.mjs.
// Covers: happy path + each guard (missing FM, missing required key,
// out-of-range years_experience, undersized lists, wrong mode body section).

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const LINTER = path.join(REPO_ROOT, 'scripts/lint-consultant-profile.mjs');

let tmpDir;

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sc-lint-profile-'));
});

after(async () => {
  try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
});

function runLinter(filePath) {
  return new Promise((resolve) => {
    const p = spawn('node', [LINTER, filePath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d);
    p.stderr.on('data', d => stderr += d);
    p.on('close', code => resolve({ code, stdout, stderr }));
  });
}

const NARRATIVE_220_WORDS = Array(220).fill('word').join(' ');

function validProfile(overrides = {}) {
  return `---
artifact_id: 01TEST_VALID_PROFILE
artifact_type: consultant-profile
project_id: 01TEST_PROJECT
status: ready_for_review
mode: initial
signed_off_by:
  - role: role-consultant-builder
    at: "2026-05-28T14:30:00Z"
    checklist_version: 1
    level: self
    passed_items: []
    failed_items: []

identity:
  title: "Senior Service-Industry Operations Consultant"
  years_experience: 12
  prior_work:
    - "30-shop barbershop chain in Bangkok 2019-2022"
    - "Booksy partner consultant 2020-2023"
    - "SMB SaaS onboarding lead at Setmore 2017-2019"

expertise:
  primary:
    - "service operations"
    - "booking systems"
    - "no-show economics"
  secondary:
    - "staff scheduling"
    - "loyalty programs"

outside_scope:
  - field: "payment_provider_choice"
    reason: "business preference, requires user decision"
  - field: "brand_identity"
    reason: "owner-specific"
  - field: "legal_entity_setup"
    reason: "jurisdiction-dependent"

knowledge_frames:
  - frame: "Primary user is Thai SMB barbershop owner, 1-5 chairs, low tech literacy"
    derived_from:
      - "who.primary_user"
      - "who.tech_level"
  - frame: "Primary pain: no-show >15% costs >30% weekend revenue"
    derived_from:
      - "why.problem"
  - frame: "Target deliverable is a SaaS web app"
    derived_from:
      - "what.deliverable_form"
  - frame: "Geography Thailand, language th-TH primary, en-US fallback"
    derived_from:
      - "where.geography"
  - frame: "Estimated launch DAU 50-200 across 100-200 shops"
    derived_from:
      - "who.estimated_count_year1"

domain_analogs:
  - name: "Booksy"
    similarity: "booking flow"
    difference: "Western market, higher tech literacy"
  - name: "Setmore"
    similarity: "SMB tier pricing"
    difference: "generic across industries"
  - name: "SimplyBook.me"
    similarity: "self-serve onboarding"
    difference: "no industry-specific templates"

voice_style:
  tone: "direct, concrete numbers with ranges"
  uncertainty_phrase: "I'd estimate X (range Y) based on Z"
  refusal_phrase: "outside my scope — needs user decision because W"
---

# Senior Service-Industry Operations Consultant

${NARRATIVE_220_WORDS}

## Handoff
- What I did: synthesized persona from discovery-brief; mode=initial
- State: status=ready_for_review; awaiting peer review by role-ba
- What's next: role-ba reviews per templates/role-verification-checklists.md#role-consultant-builder
- Resume hint: profile is self-contained
${overrides.extraBody || ''}
`;
}

describe('lint-consultant-profile.mjs', () => {
  it('exits 2 when file does not exist', async () => {
    const r = await runLinter(path.join(tmpDir, 'does-not-exist.md'));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /cannot read/);
  });

  it('exits 1 when frontmatter is missing', async () => {
    const file = path.join(tmpDir, 'no-fm.md');
    await fs.writeFile(file, 'just a body, no frontmatter\n');
    const r = await runLinter(file);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /missing or malformed YAML frontmatter/);
  });

  it('passes on a valid mode=initial profile', async () => {
    const file = path.join(tmpDir, 'valid.md');
    await fs.writeFile(file, validProfile());
    const r = await runLinter(file);
    assert.equal(r.code, 0, `expected pass, got: ${r.stderr || r.stdout}`);
    assert.match(r.stdout, /OK/);
  });

  it('exits 1 when years_experience is out of [8,20] band', async () => {
    const file = path.join(tmpDir, 'years-low.md');
    await fs.writeFile(file, validProfile().replace('years_experience: 12', 'years_experience: 5'));
    const r = await runLinter(file);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /years_experience=5 below 8/);
  });

  it('exits 1 when knowledge_frames has fewer than 5 items', async () => {
    // Replace the entire knowledge_frames block (5 items in validProfile) with one
    // that has only 2. Anchor on the preceding key (outside_scope last line) and
    // following key (domain_analogs) to avoid fragile mid-list regex.
    const original = validProfile();
    const startIdx = original.indexOf('knowledge_frames:');
    const endIdx = original.indexOf('domain_analogs:');
    assert.ok(startIdx > 0 && endIdx > startIdx, 'fixture markers not found');
    const reducedFrames =
      'knowledge_frames:\n' +
      '  - frame: "Only frame 1"\n' +
      '    derived_from:\n' +
      '      - "who.primary_user"\n' +
      '  - frame: "Only frame 2"\n' +
      '    derived_from:\n' +
      '      - "why.problem"\n\n';
    const content = original.slice(0, startIdx) + reducedFrames + original.slice(endIdx);
    const file = path.join(tmpDir, 'few-frames.md');
    await fs.writeFile(file, content);
    const r = await runLinter(file);
    assert.equal(r.code, 1, `expected fail, got: ${r.stdout || r.stderr}`);
    assert.match(r.stderr, /knowledge_frames\[\] has 2 items, need >= 5/);
  });

  it('exits 1 when mode=patch lacks "## Patch History" section', async () => {
    const content = validProfile().replace('mode: initial', 'mode: patch');
    const file = path.join(tmpDir, 'patch-no-history.md');
    await fs.writeFile(file, content);
    const r = await runLinter(file);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /mode=patch requires "## Patch History" section/);
  });

  it('exits 1 when narrative body is too short', async () => {
    const content = validProfile().replace(NARRATIVE_220_WORDS, 'too short body');
    const file = path.join(tmpDir, 'short-body.md');
    await fs.writeFile(file, content);
    const r = await runLinter(file);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /narrative body has \d+ words, need >= 200/);
  });
});
