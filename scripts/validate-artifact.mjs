#!/usr/bin/env node
// scripts/validate-artifact.mjs — Round 2 #9 (schema) + Round 5 #20 (semantic).

import { promises as fs } from 'node:fs';

const REQUIRED_SECTIONS = {
  'prd': ['## Goal', '## Users', '## Scope', '## Non-Goals', '## Success Metrics', '## User Stories'],
  'design': ['## Components', '## Data Flow', '## Integration Points', '## Key Decisions'],
  'tech-plan': ['## Modules', '## Tech Stack', '## Conventions', '## Build Plan'],
  'code': ['## Changes', '## Test Status', '## Self-Review Notes'],
  'test-plan': ['## Coverage Targets', '## Test Cases', '## Automation'],
  'test-report': ['## Run Summary', '## Failures', '## Coverage Achieved', '## Recommendation'],
  'security-audit': ['## Threat Model', '## Findings', '## Dependency Scan', '## Recommendation'],
  'runbook': ['## Overview', '## Procedures', '## Failure Modes', '## Contact'],
  'code-map': ['## Stack', '## Entry Points', '## Modules', '## Test Coverage Present', '## Conventions Detected', '## Integration Points'],
};

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

async function logEvent(event) {
  try {
    await fs.appendFile('state/events.ndjson', JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n');
  } catch {}
}

async function validate(path) {
  let text;
  try { text = await fs.readFile(path, 'utf8'); }
  catch (e) { console.error(`cannot read: ${e.message}`); return 1; }

  const { fm, body } = parseFrontmatter(text);
  if (!fm) { console.error(`no frontmatter`); return 1; }

  const reqd = ['id', 'phase', 'produced_by', 'produced_at', 'inputs', 'status', 'artifact_type'];
  const missing = reqd.filter((k) => fm[k] === undefined);
  if (missing.length) {
    console.error(`missing frontmatter: ${missing.join(', ')}`);
    await logEvent({ type: 'artifact_invalid', artifact_id: fm.id, path, missing_fields: missing });
    return 1;
  }

  const type = fm.artifact_type;
  const reqdSections = REQUIRED_SECTIONS[type] || [];
  const missingSections = reqdSections.filter((s) => !body.includes(s));
  if (missingSections.length) {
    console.error(`missing sections for ${type}: ${missingSections.join(', ')}`);
    await logEvent({ type: 'artifact_invalid', artifact_id: fm.id, path, missing_sections: missingSections });
    return 1;
  }

  const refs = [...body.matchAll(/\[\[([A-Z0-9]+)(?:#([^\]]+))?\]\]/g)];
  const brokenRefs = [];
  for (const [, id, section] of refs) {
    try {
      const files = await fs.readdir('state/artifacts');
      const target = files.find((f) => f.startsWith(id));
      if (!target) { brokenRefs.push({ id, section, reason: 'not_found' }); continue; }
      if (section) {
        const targetTxt = await fs.readFile(`state/artifacts/${target}`, 'utf8');
        if (!new RegExp(`^##+\\s+${section.replace(/-/g, '[\\s-]')}`, 'mi').test(targetTxt)) {
          brokenRefs.push({ id, section, reason: 'section_not_found' });
        }
      }
    } catch (e) { brokenRefs.push({ id, section, reason: e.message }); }
  }
  if (brokenRefs.length) {
    console.error(`semantic_validation_warning: ${brokenRefs.length} broken ref(s)`);
    await logEvent({ type: 'semantic_validation_warning', artifact_id: fm.id, broken_refs: brokenRefs });
  }

  console.log(`OK: ${path} (${type})`);
  return 0;
}

const path = process.argv[2];
if (!path) { console.error('usage: validate-artifact.mjs <path>'); process.exit(1); }
validate(path).then((code) => process.exit(code)).catch((e) => { console.error(e.stack); process.exit(1); });
