#!/usr/bin/env node
// scripts/check-drift.mjs — Round 5 #47.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const MIRROR_RE = /<!--\s*mirror:\s*([^#\s]+)(?:#([^\s]+))?\s*-->/g;

function extractSection(text, section) {
  if (!section) return text;
  const re = new RegExp(`^##+\\s+${section.replace(/-/g, '[\\s-]')}[\\s\\S]*?(?=^##+\\s|\\Z)`, 'mi');
  return text.match(re)?.[0] || '';
}

async function checkOne(agentPath) {
  let text;
  try { text = await fs.readFile(agentPath, 'utf8'); } catch { return []; }
  const issues = [];
  for (const m of text.matchAll(MIRROR_RE)) {
    const [, ruleFile, section] = m;
    let ruleText;
    try { ruleText = await fs.readFile(ruleFile, 'utf8'); }
    catch { issues.push({ agent: agentPath, rule: ruleFile, reason: 'rule file missing' }); continue; }
    const ruleSection = extractSection(ruleText, section);
    if (!ruleSection) issues.push({ agent: agentPath, rule: ruleFile, section, reason: 'section not found' });
  }
  return issues;
}

async function main() {
  let allIssues = [];
  for (const f of await fs.readdir('agents')) {
    if (!f.endsWith('.md')) continue;
    allIssues = allIssues.concat(await checkOne(join('agents', f)));
  }
  if (allIssues.length) {
    console.error(`[check-drift] ${allIssues.length} issue(s):`);
    for (const i of allIssues) console.error(`  - ${i.agent}: ${i.reason} (${i.rule}${i.section ? '#' + i.section : ''})`);
    try {
      await fs.appendFile('state/events.ndjson', JSON.stringify({
        ts: new Date().toISOString(), type: 'drift_detected', count: allIssues.length,
      }) + '\n');
    } catch {}
    process.exit(1);
  }
  console.log('[check-drift] no drift');
  process.exit(0);
}

main().catch((e) => { console.error(e.stack); process.exit(1); });
