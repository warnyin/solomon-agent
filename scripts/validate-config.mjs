#!/usr/bin/env node
// scripts/validate-config.mjs — Round 5 #61 + #67 + #69 + Round 2 #13.

import { promises as fs } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

const SAFETY_CLASS = new Set([
  'SAFETY', 'DECISION_GATE', 'SCOPE_EXPLOSION', 'INJECTION_DETECTED',
  'MULTI_USER_LOCK', 'BUDGET_EXCEEDED', 'STATE_VERSION_MISMATCH',
  'MIGRATION_INTEGRITY_FAILURE', 'MCP_AUTH',
]);

const BASE_TOOLS = new Set(['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash', 'Agent', 'WebFetch']);

const MAX_MCP_PER_ROLE = {
  'role-pm': ['mcp__plugin_ecc_memory__'],
  'role-ba': ['mcp__plugin_ecc_exa__', 'mcp__plugin_ecc_memory__'],
  'role-sa': ['mcp__plugin_ecc_context7__', 'mcp__plugin_ecc_github__search_code'],
  'role-tech-lead': ['mcp__plugin_ecc_context7__', 'mcp__plugin_ecc_github__', 'mcp__plugin_ecc_memory__'],
  'role-developer': ['mcp__plugin_ecc_context7__'],
  'role-qa': ['mcp__plugin_ecc_playwright__'],
  'role-devsecops': ['mcp__plugin_ecc_github__'],
  'role-security': ['mcp__plugin_ecc_github__search_code'],
  'role-infra': ['mcp__plugin_ecc_github__'],
  'role-service-desk': ['mcp__plugin_ecc_memory__'],
};

async function logEvent(event) {
  try {
    await fs.appendFile('state/events.ndjson', JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n');
  } catch {}
}

function isKeyLikeValue(v) {
  if (typeof v !== 'string') return false;
  if (/^[A-Z_][A-Z0-9_]{2,}$/.test(v)) return false;
  if (v.length > 24 && /[A-Za-z0-9+/=_-]{20,}/.test(v)) return true;
  return false;
}

function isUnderRepo(path) {
  try {
    const r = relative(process.cwd(), resolve(path));
    return !r.startsWith('..') && !isAbsolute(r);
  } catch { return false; }
}

async function validate() {
  let c;
  try { c = JSON.parse(await fs.readFile('sc.config.json', 'utf8')); }
  catch { return { ok: true, config: {} }; }

  const issues = [];

  if (Array.isArray(c.escalation_relax)) {
    const rejected = c.escalation_relax.filter((x) => SAFETY_CLASS.has(x));
    if (rejected.length) {
      await logEvent({ type: 'config_safety_relax_refused', rejected });
      c.escalation_relax = c.escalation_relax.filter((x) => !SAFETY_CLASS.has(x));
      issues.push(`safety relax refused: ${rejected.join(', ')}`);
    }
  }

  if (c.role_swap) {
    for (const [role, path] of Object.entries(c.role_swap)) {
      if (!isUnderRepo(path)) {
        issues.push(`role_swap[${role}]: path ${path} not under repo`);
        delete c.role_swap[role];
      }
    }
  }

  if (Array.isArray(c.extra_roles)) {
    for (const er of c.extra_roles) {
      const bad = (er.tools || []).filter((t) => !BASE_TOOLS.has(t));
      if (bad.length) {
        issues.push(`extra_roles[${er.name}].tools not allowed: ${bad.join(', ')}`);
        er.tools = (er.tools || []).filter((t) => BASE_TOOLS.has(t));
      }
    }
  }

  if (c.mcp_overrides) {
    for (const [role, mcps] of Object.entries(c.mcp_overrides)) {
      const max = MAX_MCP_PER_ROLE[role] || [];
      const violations = mcps.filter((m) => !max.some((prefix) => m.startsWith(prefix)));
      if (violations.length) {
        issues.push(`mcp_overrides[${role}] escalates beyond MAX: ${violations.join(', ')}`);
        c.mcp_overrides[role] = mcps.filter((m) => max.some((prefix) => m.startsWith(prefix)));
      }
    }
  }

  if (c.observability?.api_key_env && isKeyLikeValue(c.observability.api_key_env)) {
    issues.push(`observability.api_key_env looks like an actual key, not env var name. Use NAME not VALUE.`);
    delete c.observability.api_key_env;
  }

  if (issues.length) {
    await logEvent({ type: 'config_invalid', issues });
    process.stderr.write(`[validate-config] ${issues.length} issue(s):\n  - ${issues.join('\n  - ')}\n`);
  } else {
    await logEvent({ type: 'config_loaded' });
  }

  return { ok: issues.length === 0, config: c, issues };
}

validate().then((r) => {
  process.stdout.write(JSON.stringify(r.config, null, 2));
  process.exit(r.ok ? 0 : 1);
}).catch((e) => { console.error(e.stack); process.exit(1); });
