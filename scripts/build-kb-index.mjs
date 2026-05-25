#!/usr/bin/env node
// scripts/build-kb-index.mjs
// Per rules/knowledge-base-protocol.md. Scans state/artifacts/*.md, writes docs/kb/*.
// CLI usage: node scripts/build-kb-index.mjs
// Node 18+ builtins only.

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.SC_PROJECT_ROOT || process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'state', 'artifacts');
const OUT_DIR = path.join(ROOT, 'docs', 'kb');
const STATE_DIR = path.join(ROOT, 'state');
const EVENTS_PATH = path.join(STATE_DIR, 'events.ndjson');
const HOOK_ERROR_LOG = path.join(STATE_DIR, 'hook-errors.log');

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'as', 'from', 'this', 'that', 'these', 'those',
  'it', 'its', 'we', 'our', 'you', 'your', 'they', 'their', 'i', 'me', 'my']);

async function atomicWrite(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}

async function readArtifacts() {
  let files;
  try { files = (await fs.readdir(ARTIFACTS_DIR)).filter(f => f.endsWith('.md')); }
  catch { return []; }

  const arts = [];
  for (const f of files) {
    try {
      const content = await fs.readFile(path.join(ARTIFACTS_DIR, f), 'utf8');
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!fmMatch) continue;
      const fm = {};
      for (const line of fmMatch[1].split('\n')) {
        const kv = line.match(/^(\w+):\s*(.+)$/);
        if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
      }
      const body = fmMatch[2];
      const headings = (body.match(/^##\s+.+$/gm) || []).slice(0, 20);
      const title = headings[0]?.replace(/^##\s+/, '').trim() || fm.artifact_type || 'untitled';
      const tokens = [...new Set(body
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 4 && !STOPWORDS.has(t))
      )].slice(0, 100);
      arts.push({
        id: fm.id || f.split('-')[0],
        path: `state/artifacts/${f}`,
        title,
        role: fm.produced_by || 'unknown',
        phase: fm.phase || 'UNKNOWN',
        type: fm.artifact_type || 'unknown',
        status: fm.status || 'draft',
        produced_at: fm.produced_at,
        headings,
        tokens,
        body
      });
    } catch {}
  }
  return arts;
}

function extractDecisions(arts) {
  const decisions = [];
  for (const a of arts) {
    const matches = a.body.matchAll(/^##\s+Key Decisions?\s*\n([\s\S]*?)(?=\n##\s|$)/gmi);
    for (const m of matches) {
      decisions.push({
        artifact_id: a.id,
        artifact_path: a.path,
        role: a.role,
        phase: a.phase,
        excerpt: m[1].trim().slice(0, 500)
      });
    }
    if (a.body.includes('## Waiver')) {
      const w = a.body.match(/##\s+Waiver([\s\S]*?)(?=\n##\s|$)/);
      if (w) decisions.push({
        artifact_id: a.id, artifact_path: a.path, role: a.role, phase: a.phase,
        type: 'waiver', excerpt: w[1].trim().slice(0, 500)
      });
    }
  }
  return decisions;
}

function extractRisks(arts) {
  const risks = [];
  for (const a of arts) {
    const matches = a.body.matchAll(/^##\s+(?:Risks?|Residual Risk|Open Risks?)\s*\n([\s\S]*?)(?=\n##\s|$)/gmi);
    for (const m of matches) {
      risks.push({
        artifact_id: a.id, artifact_path: a.path, role: a.role, phase: a.phase,
        excerpt: m[1].trim().slice(0, 400)
      });
    }
  }
  return risks;
}

function extractGlossary(arts) {
  const entries = new Map();
  for (const a of arts) {
    if (a.type !== 'design' && !a.body.includes('## Glossary')) continue;
    const m = a.body.match(/^##\s+Glossary\s*\n([\s\S]*?)(?=\n##\s|$)/m);
    if (!m) continue;
    for (const line of m[1].split('\n')) {
      const def = line.match(/^[\s\-*]*\**([A-Za-z][\w\s-]+?)\**\s*[—:-]\s*(.+)$/);
      if (def) {
        const term = def[1].trim();
        if (!entries.has(term)) entries.set(term, { term, definition: def[2].trim(), source: a.id });
      }
    }
  }
  return [...entries.values()].sort((x, y) => x.term.localeCompare(y.term));
}

async function logEvent(eventName, payload) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), event: eventName, payload });
    await fs.appendFile(EVENTS_PATH, line + '\n');
  } catch {}
}

async function buildFull() {
  const start = Date.now();
  await logEvent('kb_build_start', { trigger: 'manual_or_feature_complete', scope: 'full' });

  const arts = await readArtifacts();
  if (arts.length === 0) {
    await atomicWrite(path.join(OUT_DIR, 'index.md'),
      `# Knowledge Base\n\n> No artifacts yet. Run /solomon-agent:launch to produce some.\n`);
    await atomicWrite(path.join(OUT_DIR, 'manifest.json'),
      JSON.stringify({ schema_version: 1, built_at: new Date().toISOString(), artifacts_indexed: 0 }, null, 2));
    console.log('[build-kb-index] no artifacts; wrote empty index');
    return;
  }

  const byStatus = arts.reduce((acc, a) => ((acc[a.status] = (acc[a.status] || 0) + 1), acc), {});
  const indexLines = [
    `# Knowledge Base`,
    ``,
    `> Auto-generated ${new Date().toISOString()} by scripts/build-kb-index.mjs v1. Do NOT edit by hand.`,
    ``,
    `## Stats`,
    `- Artifacts indexed: ${arts.length}`,
    `- By status: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    ``,
    `## Browse`,
    `- [By Phase](by-phase/)`,
    `- [By Role](by-role/)`,
    `- [By Type](by-type/)`,
    `- [Decisions](decisions.md)`,
    `- [Risks](risks.md)`,
    `- [Glossary](glossary.md)`,
    ``,
    `## Recent Artifacts`,
    `| When | Role | Phase | Type | Title | Status |`,
    `|---|---|---|---|---|---|`,
    ...arts.slice().sort((x, y) => (y.produced_at || '').localeCompare(x.produced_at || '')).slice(0, 10)
      .map(a => `| ${(a.produced_at || '').slice(0, 19)} | ${a.role} | ${a.phase} | ${a.type} | ${a.title.slice(0, 60)} | ${a.status} |`),
    ``,
    `## Search`,
    `Use \`/solomon-agent:kb <query>\`.`,
    ``,
  ].join('\n');
  await atomicWrite(path.join(OUT_DIR, 'index.md'), indexLines);

  const grouped = (key) => arts.reduce((acc, a) => {
    const k = a[key];
    (acc[k] = acc[k] || []).push(a);
    return acc;
  }, {});

  for (const [phase, list] of Object.entries(grouped('phase'))) {
    const lines = [
      `# Phase: ${phase}`, ``,
      `## Artifacts (${list.length})`,
      `| When | Role | Type | Title | Status |`,
      `|---|---|---|---|---|`,
      ...list.map(a => `| ${(a.produced_at || '').slice(0, 19)} | ${a.role} | ${a.type} | [${a.title.slice(0, 60)}](../../${a.path}) | ${a.status} |`),
      ``,
    ].join('\n');
    await atomicWrite(path.join(OUT_DIR, 'by-phase', `${phase}.md`), lines);
  }

  for (const [role, list] of Object.entries(grouped('role'))) {
    const lines = [
      `# Role: ${role}`, ``,
      `## Artifacts produced (${list.length})`,
      `| When | Phase | Type | Title | Status |`,
      `|---|---|---|---|---|`,
      ...list.map(a => `| ${(a.produced_at || '').slice(0, 19)} | ${a.phase} | ${a.type} | [${a.title.slice(0, 60)}](../../${a.path}) | ${a.status} |`),
      ``,
    ].join('\n');
    await atomicWrite(path.join(OUT_DIR, 'by-role', `${role}.md`), lines);
  }

  for (const [type, list] of Object.entries(grouped('type'))) {
    const lines = [
      `# Type: ${type}`, ``,
      `## Artifacts of this type (${list.length})`,
      `| When | Role | Phase | Title | Status |`,
      `|---|---|---|---|---|`,
      ...list.map(a => `| ${(a.produced_at || '').slice(0, 19)} | ${a.role} | ${a.phase} | [${a.title.slice(0, 60)}](../../${a.path}) | ${a.status} |`),
      ``,
    ].join('\n');
    await atomicWrite(path.join(OUT_DIR, 'by-type', `${type}.md`), lines);
  }

  const decisions = extractDecisions(arts);
  await atomicWrite(path.join(OUT_DIR, 'decisions.md'), [
    `# Decisions Log`, ``,
    `> ${decisions.length} decisions / waivers extracted from artifacts.`, ``,
    ...decisions.map((d, i) => [
      `## D-${String(i + 1).padStart(3, '0')}${d.type === 'waiver' ? ' [waiver]' : ''} — from ${d.artifact_id}`,
      `- Role: ${d.role} | Phase: ${d.phase} | Source: [../${d.artifact_path}](../${d.artifact_path})`,
      ``, d.excerpt, ``,
    ].join('\n')),
  ].join('\n'));

  const risks = extractRisks(arts);
  await atomicWrite(path.join(OUT_DIR, 'risks.md'), [
    `# Risks`, ``,
    `> ${risks.length} risk sections extracted from artifacts.`, ``,
    ...risks.map(r => [
      `## From ${r.artifact_id} (${r.role}, ${r.phase})`,
      `- Source: [../${r.artifact_path}](../${r.artifact_path})`,
      ``, r.excerpt, ``,
    ].join('\n')),
  ].join('\n'));

  const glossary = extractGlossary(arts);
  await atomicWrite(path.join(OUT_DIR, 'glossary.md'), [
    `# Glossary`, ``,
    `> ${glossary.length} terms merged from role-ba domain-model artifacts.`, ``,
    ...glossary.map(g => `- **${g.term}** — ${g.definition} *(source: ${g.source})*`),
    ``,
  ].join('\n'));

  await atomicWrite(path.join(OUT_DIR, 'search-index.json'), JSON.stringify({
    schema_version: 1,
    built_at: new Date().toISOString(),
    artifacts_indexed: arts.length,
    entries: arts.map(a => ({
      id: a.id, path: a.path, title: a.title, role: a.role, phase: a.phase,
      type: a.type, status: a.status, tokens: a.tokens, headings: a.headings
    }))
  }, null, 2));

  await atomicWrite(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({
    schema_version: 1,
    built_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    artifacts_indexed: arts.length,
    decisions_count: decisions.length,
    risks_count: risks.length,
    glossary_entries: glossary.length
  }, null, 2));

  const duration = Date.now() - start;
  await logEvent('kb_build_complete', { artifacts_indexed: arts.length, decisions_count: decisions.length, duration_ms: duration });
  console.log(`[build-kb-index] ${arts.length} artifacts, ${decisions.length} decisions, ${risks.length} risks in ${duration}ms → docs/kb/`);
}

try {
  await buildFull();
  process.exit(0);
} catch (e) {
  await fs.mkdir(STATE_DIR, { recursive: true }).catch(() => {});
  await fs.appendFile(HOOK_ERROR_LOG, `[build-kb-index] CRASH: ${e.message}\n${e.stack}\n`).catch(() => {});
  console.error(`[build-kb-index] graceful-crash: ${e.message}`);
  process.exit(0);
}
