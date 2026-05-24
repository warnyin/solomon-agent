---
description: Graceful shutdown of in-flight orchestrator. State preserved. Owner-ceo terminates after current dispatch completes. Recovery via /sc:replay or /sc:failover.
argument-hint: "[reason]"
---

# /sc:abort

## Procedure
1. Get current phase from `state/project.json`
2. Write abort flag: `node ${CLAUDE_PLUGIN_ROOT}/scripts/state-store.mjs abort --reason "${ARGUMENTS:-user-requested}" --phase "<current_phase>"`
3. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/session-report.mjs --aborted` for partial `final-report.md`
4. Log event `{type:"abort", reason, phase, ts}`
5. Print: `[ABORT] Wrote state/abort.flag. Owner terminates after current dispatch. State preserved.`

## NOT touched
- `state/artifacts/` (preserved)
- `state/events.ndjson` (preserved)
- `state/role-acls.json` (preserved)
- `state/lock` (released only after owner detects flag)

## Recovery
- `/sc:replay <last-phase>` — restart phase from clean state
- `/sc:failover` — backup-owner reads `state/checkpoint.json`
