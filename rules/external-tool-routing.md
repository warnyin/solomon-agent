# External Tool Routing — MCPs + ECC Skills per Role

> Canonical "which role uses what." Each `agents/role-*.md` frontmatter `tools:` list MUST match below. `mcp_overrides` in `sc.config.json` may RELAX but cannot ESCALATE beyond MAX-privilege per role.

## Per-Role MCP + ECC Skill Allow-List

| Role | MCPs allowed (MAX privilege) | ECC skills allowed |
|---|---|---|
| owner-ceo | `mcp__plugin_ecc_memory__*`, `mcp__plugin_ecc_sequential-thinking__*` | `ecc:plan`, `ecc:strategic-compact` |
| backup-owner | (same as owner-ceo) | (same as owner-ceo) |
| role-pm | `mcp__plugin_ecc_memory__*` | `ecc:plan-prd`, `ecc:plan` |
| role-ba | `mcp__plugin_ecc_exa__*`, `mcp__plugin_ecc_memory__*` | `ecc:market-research`, `ecc:lead-intelligence`, `ecc:deep-research` |
| role-sa | `mcp__plugin_ecc_context7__*`, `mcp__plugin_ecc_github__search_code` | `ecc:architecture-decision-records`, `ecc:code-architect` |
| role-tech-lead | `mcp__plugin_ecc_context7__*`, `mcp__plugin_ecc_github__*` (read), `mcp__plugin_ecc_memory__*` | `ecc:plan`, `ecc:code-architect`, `ecc:code-explorer`, `ecc:code-tour` |
| role-developer | `mcp__plugin_ecc_context7__*` | `ecc:tdd-workflow`, `ecc:code-review`, `ecc:build-fix`, `ecc:silent-failure-hunter` |
| role-qa | `mcp__plugin_ecc_playwright__*` | `ecc:test-coverage`, `ecc:e2e-testing`, `ecc:ai-regression-testing` |
| role-devsecops | `mcp__plugin_ecc_github__*` (write requires SAFETY) | `ecc:deployment-patterns`, `ecc:docker-patterns` |
| role-security | `mcp__plugin_ecc_github__search_code` (read-only) | `ecc:security-review`, `ecc:security-scan`, `ecc:silent-failure-hunter` |
| role-infra | `mcp__plugin_ecc_github__*` (read) | `ecc:deployment-patterns`, `ecc:homelab-network-setup` |
| role-service-desk | `mcp__plugin_ecc_memory__*` | `ecc:article-writing` |

## Restrictions
- `role-developer` MUST NOT have `Bash` git-write (no push/force-push/reset-hard); local commits OK if tests pass
- `role-security` read-only on `github`
- Any role calling MCP outside its row → `guard-isolation.mjs` blocks + `acl_violation` event

## MCP Override Limits (Round 5 #67)
`sc.config.json:mcp_overrides[role]` MAY: ✅ REMOVE MCP, ✅ ALIAS to subset. MUST NOT: ❌ ADD MCP not in row (refused by `validate-config.mjs`), ❌ grant `Bash` write to forbidden roles.

## Adding extra_roles (Round 2 #13)
`sc.config.json:extra_roles[].tools` MUST be subset of `["Read","Glob","Grep","Write","Edit","Bash","Agent","WebFetch"]`. Regenerate `agents/manifest.json` via `scripts/build-manifest.mjs` after adding.
