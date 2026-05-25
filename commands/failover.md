---
description: User-triggered failover to backup-owner. Use when owner-ceo appears stalled (>10min no progress events) or unresponsive. Backup reads state/checkpoint.json and resumes.
argument-hint: ""
---

# /solomon-agent:failover

## When to use
- Owner-ceo silent for >10min (check `/solomon-agent:status` for progress events)
- Owner-ceo returning malformed dispatch repeatedly
- Suspected persona drift (owner doing role work instead of delegating)

## Procedure
1. Check `state/checkpoint.json` exists — if not → escalate `NO_CHECKPOINT_AVAILABLE`
2. Log event: `{type:"failover_triggered", reason:"user", original_pid:<from state/lock>}`
3. Force release lock if held by dead pid: `node ${CLAUDE_PLUGIN_ROOT}/scripts/state-store.mjs release-lock`
4. Re-acquire lock for current session
5. Dispatch backup-owner:

```
Agent({
  subagent_type: "backup-owner",
  description: "Failover from owner-ceo",
  prompt: `
<USER_REQUIREMENT>{{from state/project.json:goal}}</USER_REQUIREMENT>
<RESUME_CONTEXT>
FAILOVER triggered. Original owner-ceo considered dead.
Read state/checkpoint.json and last 100 events from state/events.ndjson.
Reconcile state/dispatch-stack.json per rules/rollback-protocol.md TTL reaper.
Resume from checkpoint phase.
</RESUME_CONTEXT>
`
})
```

## v0.1 limit (Round 6 #89)
Claude Code has NO automatic agent supervisor. User-triggered ONLY. No 60s heartbeat. No automatic detection.
