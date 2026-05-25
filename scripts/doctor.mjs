#!/usr/bin/env node
// scripts/doctor.mjs
// Per commands/doctor.md. Health check for Solomon Agent install + project state.
// CLI: node scripts/doctor.mjs [--json] [--verbose] [--fix]

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.env.SC_PROJECT_ROOT || process.cwd();
const STATE_DIR = path.join(ROOT, 'state');

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const isFix = args.includes('--fix');

const checks = [];
function check(name, status, msg) { checks.push({ name, status, msg }); }

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function readJsonSafe(p) { try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return null; } }
async function listFiles(dir, ext = null) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isFile() && (!ext || e.name.endsWith(ext))).map(e => e.name);
  } catch { return []; }
}

async function runScript(scriptPath, scriptArgs = []) {
  return new Promise((resolve) => {
    const p = spawn('node', [scriptPath, ...scriptArgs], { stdio: 'pipe' });
    let out = '', err = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('close', code => resolve({ code, out, err }));
    p.on('error', e => resolve({ code: -1, out, err: e.message }));
  });
}

// 1. node_version
const v = process.versions.node.split('.').map(Number);
if (v[0] >= 18) check('node_version', 'pass', `Node ${process.versions.node} (>= 18 required)`);
else check('node_version', 'fail', `Node ${process.versions.node} < 18 required`);

// 2. plugin_manifest
{
  const m = await readJsonSafe(path.join(ROOT, '.claude-plugin/plugin.json'));
  const pkg = await readJsonSafe(path.join(ROOT, 'package.json'));
  if (!m) check('plugin_manifest', 'fail', '.claude-plugin/plugin.json missing or invalid');
  else if (pkg && m.version !== pkg.version) check('plugin_manifest', 'warn', `plugin.json version (${m.version}) != package.json version (${pkg.version})`);
  else check('plugin_manifest', 'pass', `valid · version ${m.version}`);
}

// 3. marketplace_manifest
{
  const m = await readJsonSafe(path.join(ROOT, '.claude-plugin/marketplace.json'));
  if (!m) check('marketplace_manifest', 'fail', '.claude-plugin/marketplace.json missing or invalid');
  else check('marketplace_manifest', 'pass', `valid · ${(m.plugins || []).length} plugin entries`);
}

// 4. scripts_runnable (parse only)
{
  const scripts = await listFiles(path.join(ROOT, 'scripts'), '.mjs');
  let failed = [];
  for (const s of scripts) {
    const r = await runScript(path.join(ROOT, 'scripts', s), ['--help-noop']);
    if (r.err.includes('SyntaxError') || r.err.includes('Cannot find package')) failed.push(s);
  }
  if (failed.length === 0) check('scripts_runnable', 'pass', `${scripts.length} scripts loadable`);
  else check('scripts_runnable', 'fail', `${failed.length} failed: ${failed.join(', ')}`);
}

// 5. hook_schema
{
  const h = await readJsonSafe(path.join(ROOT, 'hooks/hooks.json'));
  if (!h) check('hook_schema', 'warn', 'hooks/hooks.json missing (optional but recommended)');
  else {
    const events = Object.keys(h);
    const valid = events.every(e =>
      Array.isArray(h[e]) && h[e].every(g => 'hooks' in g && Array.isArray(g.hooks))
    );
    if (valid) check('hook_schema', 'pass', `nested format OK · ${events.length} event groups`);
    else check('hook_schema', 'fail', 'hooks/hooks.json not in nested {event:[{matcher,hooks:[...]}]} format');
  }
}

// 6-10. presence counts
{
  const counts = {
    rules: (await listFiles(path.join(ROOT, 'rules'), '.md')).length,
    commands: (await listFiles(path.join(ROOT, 'commands'), '.md')).length,
    templates: (await listFiles(path.join(ROOT, 'templates'), '.md')).length,
  };
  check('rules_present', counts.rules >= 10 ? 'pass' : 'warn', `${counts.rules} rules files`);
  check('commands_present', counts.commands >= 10 ? 'pass' : 'warn', `${counts.commands} commands`);
  check('templates_present', counts.templates >= 3 ? 'pass' : 'warn', `${counts.templates} templates`);

  const agents = await listFiles(path.join(ROOT, 'agents'), '.md');
  const roles = agents.filter(a => a.startsWith('role-')).length;
  if (roles >= 10 && agents.length >= 12) check('agents_present', 'pass', `${agents.length} agents (${roles} roles + owner + backup)`);
  else check('agents_present', 'warn', `${agents.length} agents, ${roles} roles (expected 10+)`);

  let skillsCount = 0;
  try {
    const skillDirs = await fs.readdir(path.join(ROOT, 'skills'), { withFileTypes: true });
    for (const d of skillDirs) {
      if (d.isDirectory() && await exists(path.join(ROOT, 'skills', d.name, 'SKILL.md'))) skillsCount++;
    }
  } catch {}
  check('skills_present', skillsCount >= 3 ? 'pass' : 'warn', `${skillsCount} skills`);
}

// 11. project_state
{
  const p = await readJsonSafe(path.join(STATE_DIR, 'project.json'));
  if (!p) check('project_state', 'pass', 'no active project (clean baseline)');
  else if (!p.id || !p.phase) check('project_state', 'fail', 'state/project.json missing required fields (id, phase)');
  else check('project_state', 'pass', `project ${p.id.slice(0, 8)}... phase=${p.phase}`);
}

// 12. artifacts_signed
{
  const arts = await listFiles(path.join(STATE_DIR, 'artifacts'), '.md');
  if (arts.length === 0) check('artifacts_signed', 'pass', 'no artifacts yet');
  else {
    let unsigned = 0;
    for (const a of arts) {
      try {
        const content = await fs.readFile(path.join(STATE_DIR, 'artifacts', a), 'utf8');
        const fm = content.match(/^---\n([\s\S]*?)\n---/);
        if (fm && fm[1].includes('status: approved') && !fm[1].includes('signed_off_by')) unsigned++;
      } catch {}
    }
    if (unsigned === 0) check('artifacts_signed', 'pass', `${arts.length} artifacts · all approved have signed_off_by[]`);
    else check('artifacts_signed', 'warn', `${unsigned}/${arts.length} approved artifacts missing signed_off_by[]`);
  }
}

// 13. hmac_chain
{
  const verifyScript = path.join(ROOT, 'scripts/verify-log.mjs');
  if (await exists(verifyScript)) {
    const r = await runScript(verifyScript);
    if (r.code === 0) check('hmac_chain', 'pass', (r.out.trim() || 'verified'));
    else check('hmac_chain', 'fail', r.err.trim() || r.out.trim() || `exit ${r.code}`);
  } else check('hmac_chain', 'warn', 'scripts/verify-log.mjs not found');
}

// 14. codemap_stale
{
  const m = await readJsonSafe(path.join(ROOT, 'docs/codemap/manifest.json'));
  if (!m) check('codemap_stale', 'warn', 'docs/codemap/ not built yet — run /solomon-agent:codemap');
  else {
    const ageDays = (Date.now() - new Date(m.built_at)) / (1000 * 60 * 60 * 24);
    if (ageDays > 7) check('codemap_stale', 'warn', `last built ${ageDays.toFixed(1)} days ago`);
    else check('codemap_stale', 'pass', `built ${ageDays.toFixed(1)} days ago · ${m.files_indexed} files`);
  }
}

// 15. kb_index
{
  const m = await readJsonSafe(path.join(ROOT, 'docs/kb/manifest.json'));
  if (!m) check('kb_index', 'warn', 'docs/kb/ not built yet — run /solomon-agent:kb');
  else check('kb_index', 'pass', `${m.artifacts_indexed} artifacts indexed`);
}

if (isFix) {
  const fixes = [];
  if (checks.find(c => c.name === 'codemap_stale' && c.status === 'warn')) {
    const r = await runScript(path.join(ROOT, 'scripts/build-codemap.mjs'));
    fixes.push(`codemap rebuild: ${r.code === 0 ? 'OK' : 'failed'}`);
  }
  if (checks.find(c => c.name === 'kb_index' && c.status === 'warn')) {
    const r = await runScript(path.join(ROOT, 'scripts/build-kb-index.mjs'));
    fixes.push(`kb rebuild: ${r.code === 0 ? 'OK' : 'failed'}`);
  }
  await fs.mkdir(path.join(STATE_DIR, 'checkpoints'), { recursive: true });
  fixes.push('state/checkpoints/ ensured');
  if (!isJson) for (const f of fixes) console.error(`[fix] ${f}`);
}

const passed = checks.filter(c => c.status === 'pass').length;
const warned = checks.filter(c => c.status === 'warn').length;
const failed = checks.filter(c => c.status === 'fail').length;
const summary = `${passed} passed, ${warned} warned, ${failed} failed`;
const ok = failed === 0;

if (isJson) {
  console.log(JSON.stringify({ ok, checks, summary }, null, 2));
} else {
  console.log(`\n[DOC] Solomon Agent Doctor — ${summary}\n`);
  for (const c of checks) {
    const icon = c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
    console.log(`${icon} ${c.name.padEnd(22)} ${c.msg}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
