---
description: Resume a project after session drop. Reads latest checkpoint + role-state-board, re-dispatches owner-ceo from where it stopped. Safe to invoke repeatedly (idempotent). Per rules/handoff-checkpoint-protocol.md.
argument-hint: "[--from <checkpoint-id>] [--force-recheck]"
---

# /solomon-agent:resume

You are the `/solomon-agent:resume` command runner. Your job:

## 1. Pre-flight

1. Verify `state/project.json` exists. If not → reply "No project to resume. Use `/solomon-agent:launch <idea>`."
2. Verify `state/role-state-board.json` exists. If not → reply "Missing broadcast board. Run `/solomon-agent:status` to refresh OR `/solomon-agent:launch --force-takeover <idea>` to restart."
3. Parse flags: `--from <ulid>` (default: latest), `--force-recheck` (rescan artifacts)

## 2. Verify integrity

Run via Bash:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/checkpoint.mjs" --verify
```

If non-zero exit → surface error block; halt; do NOT auto-dispatch. User must `/solomon-agent:abort` and `/solomon-agent:launch --force-takeover`.

If clean → continue.

## 3. Read 3 sources of truth (per skills/checkpoint-and-resume/SKILL.md §Resume procedure)

1. `state/role-state-board.json` → phase, active_role, waiting_roles, checkpoint_pointer
2. Latest `state/checkpoints/*.json` (or `--from` if given) → next_planned_action, in_flight_artifacts
3. All `state/artifacts/*.md` matching `in_flight_artifacts[].id` → know current artifact statuses

## 4. Check escalations FIRST

If `state/project.json:pending_escalations[]` non-empty → surface as `[YELLOW] ESCALATION` block; halt; do NOT auto-resume.

## 5. Surface human-readable summary

Reply with:

```
[RESUME] Project 01H... · Phase DESIGN · Active: role-sa (since 2026-05-24 10:28)

Where we left off:
- Completed in DESIGN: role-pm (PRD ✓), role-ba (domain ✓)
- In progress: role-sa drafting design (60%)
- Waiting: role-tech-lead, role-security, role-infra (blocked on role-sa)

Next planned action:
> Await role-sa draft, then dispatch role-tech-lead with sa-architecture as input

Resume? [y/n] — or use /solomon-agent:abort to stop, /solomon-agent:inject to add context first
```

Wait for user confirmation (single character or `/solomon-agent:inject <context>` to add info before resuming).

## 6. Dispatch owner-ceo with RESUME_CONTEXT

```
Agent({
  subagent_type: "owner-ceo",
  description: "Resume project from checkpoint",
  prompt: `
<RESUME_CONTEXT>
checkpoint_id: 01H_SYNTHETIC_CHECKPOINT
phase: DESIGN
active_role: role-sa
last_completed_dispatch: 7
next_planned_action: Await role-sa draft, then dispatch role-tech-lead with sa-architecture as input
in_flight_artifacts: [01H_SYNTHETIC_ART_SA (status=draft, progress=60%)]
</RESUME_CONTEXT>

Read state/role-state-board.json + state/checkpoints/{latest}.json + in-flight artifacts.
Continue from next_planned_action. Do NOT re-run completed dispatches.
On every role return: write new checkpoint per rules/handoff-checkpoint-protocol.md.
`
})
```

## 7. Idempotency

If user invokes `/solomon-agent:resume` while a turn is already mid-flight, owner-ceo's Boot Sequence Step 6 prevents re-running completed dispatches. Multiple `/solomon-agent:resume` calls are safe.

## v0.1 limits referenced

- Resume cannot recover from corrupt HMAC chain (verify-log will fail; need manual cleanup)
- Resume reads LATEST checkpoint only by default; use `--from <ulid>` for older
- No automatic recovery from MCP auth expiry — separate `MCP_AUTH` escalation flow
