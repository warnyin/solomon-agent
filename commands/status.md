---
description: Show live status of running orchestrator — current phase, active dispatches, pending escalations, last events, budget usage, audit log integrity. Reads state/ only — never mutates.
argument-hint: ""
---

# /sc:status

Read-only inspection of orchestrator state.

## Procedure

1. Read `state/project.json` — if missing → "No active project. Run `/sc:launch \"<goal>\"`"
2. Read `state/budget.json` — show tokens_used / tokens_budget + per-role breakdown
3. Read tail of `state/events.ndjson` (last 10 events)
4. Read `state/dispatch-stack.json` — list active dispatches (frame_key, role, depth, started_at)
5. Read `state/inbox.md` if exists — show pending injected context
6. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-log.mjs` — warn if `AUDIT_LOG_TAMPERED`
7. Read `state/hook-errors.log` (last 5 lines if exists) — surface recent hook crashes
8. If `state/abort.flag` exists — show abort reason + phase

## Output Format

```
[STATUS] project_id=<ulid> phase=<PHASE> language=<lang>

Budget: <used>/<budget> tokens (<pct>%) — $<cost_estimate>
Per-role: pm:X, ba:X, sa:X, ...

Active Dispatches (depth):
  - role-developer (1) started 02:14 ago
  - ...

Pending Escalations: <count>
  1. [YELLOW] ESCALATION: <condition> — <question>

Last 10 events: <timeline>

Audit log: VALID | TAMPERED at line N
Inbox: <count> message(s)
Abort flag: <none | reason>
```

## v0.1 limits
- Live tail = re-runnable snapshot; no true streaming UI in Claude Code
- Cost from `recordTokens()` heuristic if Claude Code Agent tool doesn't surface child usage (Round 7 #94)
