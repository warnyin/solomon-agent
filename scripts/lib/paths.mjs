#!/usr/bin/env node
// scripts/lib/paths.mjs — Round 5 #79 cross-platform paths.

import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { promises as fs, constants as FS } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SC_DIR_NAME = '.claude';
const PLUGIN_KEY = 'plugins/sc';

export function homeDir() {
  return homedir();
}

export function pluginRoot() {
  return process.env.CLAUDE_PLUGIN_ROOT || resolve(homeDir(), SC_DIR_NAME, PLUGIN_KEY);
}

export function globalStatsPath() {
  return join(homeDir(), SC_DIR_NAME, PLUGIN_KEY, 'global-stats.json');
}

export async function ensureGlobalStatsDir() {
  const dir = join(homeDir(), SC_DIR_NAME, PLUGIN_KEY);
  await fs.mkdir(dir, { recursive: true });
  try { await fs.chmod(dir, 0o700); } catch {}
  return dir;
}

export async function initGlobalStats() {
  const path = globalStatsPath();
  try { await fs.access(path, FS.F_OK); return; } catch {}
  await ensureGlobalStatsDir();
  await fs.writeFile(path, JSON.stringify({
    total_launches: 0,
    by_outcome: { shipped: 0, aborted: 0, escalated_out: 0 },
    avg_cost_usd: 0,
    avg_phases: 0,
    by_project_type: {},
    projects: {},
  }, null, 2), { mode: 0o600 });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flag = process.argv[2];
  const r = {
    '--home': homeDir,
    '--plugin-root': pluginRoot,
    '--global-stats': globalStatsPath,
  }[flag];
  if (!r) { console.error('usage: paths.mjs --home|--plugin-root|--global-stats'); process.exit(1); }
  process.stdout.write(r());
}
