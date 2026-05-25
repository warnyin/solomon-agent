---
description: Health check for Solomon Agent plugin install + project state. Validates scripts runnable, state schema OK, HMAC chain intact, role coverage complete, hooks installed. Run before /solomon-agent:launch or when troubleshooting. Per Round 17 gap analysis.
argument-hint: "[--verbose] [--fix]"
---

# /solomon-agent:doctor

You are the `/solomon-agent:doctor` runner. Job: comprehensive health check, no state writes (except logging).

## 1. Invoke script

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" --json
```

If `--verbose` → add `--verbose`. If `--fix` → add `--fix` (only safe auto-repairs).

## 2. Parse output

The script returns JSON:
```json
{
  "ok": true,
  "checks": [
    {"name": "node_version", "status": "pass", "msg": "Node 20.10.0 (>= 18 required)"}
  ],
  "summary": "14 passed, 1 warned, 0 failed"
}
```

## 3. Surface to user

```
[DOC] Solomon Agent Doctor — 14 passed · 1 warned · 0 failed

✓ node_version           Node 20.10.0 (>= 18 required)
✓ plugin_manifest        .claude-plugin/plugin.json valid
✓ marketplace_manifest   .claude-plugin/marketplace.json valid
✓ scripts_runnable       18 scripts loadable
✓ hook_schema            hooks/hooks.json nested format OK
✓ rules_present          22 rules files
✓ commands_present       14 commands
✓ agents_present         12 agents (10 roles + owner + backup)
✓ skills_present         7 skills
✓ templates_present      6 templates
✓ project_state          state/project.json schema valid
✓ artifacts_signed       18 artifacts have signed_off_by[]
✓ hmac_chain             events.ndjson chain verified (847 events)
⚠ codemap_stale          docs/codemap/ last built 6 days ago (suggest /solomon-agent:codemap --rebuild)
✓ kb_index               docs/kb/manifest.json fresh

Run `/solomon-agent:doctor --verbose` for full per-check detail.
Run `/solomon-agent:doctor --fix` for safe auto-repairs.
```

## 4. Exit semantics

- All `pass` → ready for /solomon-agent:launch
- Any `warn` → can proceed but with caveat
- Any `fail` → DO NOT /solomon-agent:launch; surface fix-it links per failing check

## Categories of checks (15 total)

1. **node_version** — `>= 18` (per `package.json:engines.node`)
2. **plugin_manifest** — `.claude-plugin/plugin.json` valid + version matches `package.json`
3. **marketplace_manifest** — `.claude-plugin/marketplace.json` valid
4. **scripts_runnable** — every `scripts/*.mjs` parses without syntax error
5. **hook_schema** — `hooks/hooks.json` uses nested `{event:[{matcher,hooks:[{...}]}]}` format
6. **rules_present** — all expected rules files exist (per `agents/manifest.json:rules[]`)
7. **commands_present** — count matches manifest
8. **agents_present** — 10 roles + owner-ceo + backup-owner
9. **skills_present** — every skill referenced in rules has `SKILL.md`
10. **templates_present** — checklists + handoff-card + discovery-brief + codemap + kb-index
11. **project_state** — `state/project.json` schema valid (if exists)
12. **artifacts_signed** — every approved artifact has `signed_off_by[level:self]+[level:peer]`
13. **hmac_chain** — `node scripts/verify-log.mjs` clean
14. **codemap_stale** — warn if `docs/codemap/manifest.json:built_at` older than 7 days
15. **kb_index** — `docs/kb/manifest.json` fresh

## Safe auto-fixes (`--fix`)

- Stale codemap → run `scripts/build-codemap.mjs`
- Stale KB → run `scripts/build-kb-index.mjs`
- Missing `state/checkpoints/` directory → create empty
- Stale `state/role-state-board.json` (no project) → remove

NEVER auto-fix:
- Failing HMAC chain (needs human investigation)
- Schema mismatches (might lose data)
- Missing rules/commands/agents (might be intentional fork)

## v0.1 limits

- No deep semantic check of artifact bodies (only frontmatter)
- No mock dispatch of role agents (use `/solomon-agent:do --plan` for routing dry-run)
- No external connectivity check (MCP availability tested only when used)
