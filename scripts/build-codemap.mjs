#!/usr/bin/env node
// scripts/build-codemap.mjs
// Per rules/codemap-protocol.md. Scans project source tree, writes docs/codemap/*.
// CLI usage:
//   node scripts/build-codemap.mjs              # full rebuild
//
// Node 18+ builtins only. No npm deps.

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.SC_PROJECT_ROOT || process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'codemap');
const STATE_DIR = path.join(ROOT, 'state');
const EVENTS_PATH = path.join(STATE_DIR, 'events.ndjson');
const HOOK_ERROR_LOG = path.join(STATE_DIR, 'hook-errors.log');

const DEFAULT_EXCLUDES = [
  'node_modules', 'dist', 'build', 'target', '.next', '__pycache__', '.venv',
  '.git', '.claude', 'docs', 'state', 'coverage'
];

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
                              '.py', '.go', '.rs', '.java', '.kt', '.swift',
                              '.cs', '.cpp', '.c', '.h', '.hpp', '.rb', '.php']);

const ENTRY_PATTERNS = [
  /^(cli|main|server|index|app)\.(ts|js|mjs|py|go)$/,
  /^__main__\.py$/,
];

async function atomicWrite(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}

async function walkDir(dir, excludes = DEFAULT_EXCLUDES, results = []) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const e of entries) {
    if (excludes.includes(e.name)) continue;
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkDir(full, excludes, results);
    else results.push(full);
  }
  return results;
}

async function countLOC(file) {
  try {
    const content = await fs.readFile(file, 'utf8');
    return content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('#')).length;
  } catch { return 0; }
}

function detectModule(filePath, projectRoot) {
  const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  const m = rel.match(/^(?:src|pkg|app|crates|lib|packages)\/([^/]+)\//);
  if (m) return m[1];
  const parts = rel.split('/');
  if (parts.length > 1) return parts[0];
  return '_root_';
}

function isEntryPoint(filePath) {
  const base = path.basename(filePath);
  return ENTRY_PATTERNS.some(p => p.test(base));
}

async function detectExternalDeps(projectRoot) {
  const deps = new Set();
  for (const f of ['package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'requirements.txt']) {
    const fp = path.join(projectRoot, f);
    try {
      const c = await fs.readFile(fp, 'utf8');
      if (f === 'package.json') {
        const j = JSON.parse(c);
        Object.keys(j.dependencies || {}).forEach(d => deps.add(d));
        Object.keys(j.peerDependencies || {}).forEach(d => deps.add(d));
      } else if (f === 'go.mod') {
        c.match(/^\s*([^\s]+)\s+v[\d.]+/gm)?.forEach(l => deps.add(l.trim().split(/\s+/)[0]));
      } else if (f === 'Cargo.toml') {
        c.match(/^\s*([^\s=]+)\s*=/gm)?.forEach(l => deps.add(l.trim().split('=')[0].trim()));
      } else if (f === 'pyproject.toml' || f === 'requirements.txt') {
        c.split('\n').forEach(l => {
          const m = l.match(/^\s*([a-zA-Z0-9_-]+)/);
          if (m && !m[1].startsWith('#')) deps.add(m[1]);
        });
      }
    } catch {}
  }
  return [...deps].sort();
}

function detectPublicAPI(content, ext) {
  const lines = content.split('\n');
  const api = [];
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
    for (const l of lines) {
      const m = l.match(/^\s*export\s+(?:async\s+)?(?:function|class|const|interface|type)\s+(\w+)/);
      if (m) api.push(m[1]);
    }
  } else if (ext === '.py') {
    for (const l of lines) {
      const m = l.match(/^(?:def|class)\s+([a-zA-Z][a-zA-Z0-9_]*)/);
      if (m && !m[1].startsWith('_')) api.push(m[1]);
    }
  } else if (ext === '.go') {
    for (const l of lines) {
      const m = l.match(/^func\s+(?:\(\w+\s+\*?\w+\)\s+)?([A-Z]\w*)/) || l.match(/^type\s+([A-Z]\w*)/);
      if (m) api.push(m[1]);
    }
  } else if (ext === '.rs') {
    for (const l of lines) {
      const m = l.match(/^\s*pub\s+(?:fn|struct|enum|trait)\s+(\w+)/);
      if (m) api.push(m[1]);
    }
  }
  return [...new Set(api)];
}

async function logEvent(eventName, payload) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), event: eventName, payload });
    await fs.appendFile(EVENTS_PATH, line + '\n');
  } catch {}
}

async function buildFull() {
  const start = Date.now();
  await logEvent('codemap_build_start', { trigger: 'manual_or_feature_complete', scope: 'full' });

  const allFiles = await walkDir(ROOT);
  const sourceFiles = allFiles.filter(f => SOURCE_EXTS.has(path.extname(f)));

  const modules = new Map();
  const entries = [];
  let totalLOC = 0;

  for (const f of sourceFiles) {
    const mod = detectModule(f, ROOT);
    if (!modules.has(mod)) modules.set(mod, { files: [], loc: 0, apis: new Set() });
    const m = modules.get(mod);
    m.files.push(f);
    const loc = await countLOC(f);
    m.loc += loc;
    totalLOC += loc;
    if (isEntryPoint(f)) entries.push(f);
    try {
      const content = await fs.readFile(f, 'utf8');
      detectPublicAPI(content, path.extname(f)).forEach(a => m.apis.add(a));
    } catch {}
  }

  const deps = await detectExternalDeps(ROOT);

  const indexLines = [
    `# Codemap`,
    ``,
    `> Auto-generated ${new Date().toISOString()} by scripts/build-codemap.mjs v1. Do NOT edit by hand.`,
    ``,
    `## Stats`,
    `- Source files: ${sourceFiles.length}`,
    `- LOC (approx): ${totalLOC}`,
    `- Modules: ${modules.size}`,
    `- Entry points: ${entries.length}`,
    `- External deps: ${deps.length}`,
    ``,
    `## Modules`,
    `| Module | Files | LOC | Public API count |`,
    `|---|---|---|---|`,
    ...[...modules.entries()].sort().map(([name, m]) => `| [${name}](by-module/${name}.md) | ${m.files.length} | ${m.loc} | ${m.apis.size} |`),
    ``,
    `## Entry Points`,
    ...entries.map(e => `- \`${path.relative(ROOT, e).replace(/\\/g, '/')}\``),
    ``,
    `## External Dependencies`,
    ...deps.slice(0, 30).map(d => `- ${d}`),
    deps.length > 30 ? `- … and ${deps.length - 30} more` : '',
    ``,
    `## See also`,
    `- [entry-points.md](entry-points.md)`,
    `- by-module/ — per-module detail`,
    ``,
  ].join('\n');
  await atomicWrite(path.join(OUT_DIR, 'index.md'), indexLines);

  for (const [name, m] of modules) {
    const lines = [
      `# Module: ${name}`,
      ``,
      `## Files (${m.files.length})`,
      ...m.files.slice(0, 50).map(f => `- \`${path.relative(ROOT, f).replace(/\\/g, '/')}\``),
      m.files.length > 50 ? `- … and ${m.files.length - 50} more` : '',
      ``,
      `## Public API (${m.apis.size})`,
      ...[...m.apis].sort().slice(0, 100).map(a => `- \`${a}\``),
      ``,
      `## LOC: ${m.loc}`,
    ].join('\n');
    await atomicWrite(path.join(OUT_DIR, 'by-module', `${name}.md`), lines);
  }

  await atomicWrite(path.join(OUT_DIR, 'entry-points.md'), [
    `# Entry Points`,
    ``,
    ...entries.map(e => `- \`${path.relative(ROOT, e).replace(/\\/g, '/')}\``),
    ``,
  ].join('\n'));

  await atomicWrite(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({
    schema_version: 1,
    built_at: new Date().toISOString(),
    duration_ms: Date.now() - start,
    files_indexed: sourceFiles.length,
    modules_count: modules.size,
    entry_points_count: entries.length,
    external_deps_count: deps.length
  }, null, 2));

  const duration = Date.now() - start;
  await logEvent('codemap_build_complete', { files_indexed: sourceFiles.length, duration_ms: duration, modules_count: modules.size });
  console.log(`[build-codemap] ${sourceFiles.length} files, ${modules.size} modules in ${duration}ms → docs/codemap/`);
}

try {
  await buildFull();
  process.exit(0);
} catch (e) {
  await fs.mkdir(STATE_DIR, { recursive: true }).catch(() => {});
  await fs.appendFile(HOOK_ERROR_LOG, `[build-codemap] CRASH: ${e.message}\n${e.stack}\n`).catch(() => {});
  console.error(`[build-codemap] graceful-crash: ${e.message}`);
  process.exit(0);
}
