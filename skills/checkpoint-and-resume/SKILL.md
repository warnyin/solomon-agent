---
description: How owner-ceo writes frequent recoverable checkpoints + broadcasts role state so any operator can resume mid-flight after session drop. Includes the trigger matrix, role discipline ("am I active?"), and the 6-step resume procedure used by /solomon-agent:resume. Bound by rules/handoff-checkpoint-protocol.md.
---

# Skill: checkpoint-and-resume

> Bound by `rules/handoff-checkpoint-protocol.md`. Used by `agents/owner-ceo.md` (writes checkpoints) + every role agent (reads role-state-board) + `commands/resume.md`.

## When to invoke

- Owner-ceo at every checkpoint trigger (see `rules/handoff-checkpoint-protocol.md §Checkpoint Triggers`)
- Every role at start of its turn (read board, check active_role)
- `/solomon-agent:resume` command on user-driven resumption

## Two responsibilities, one skill

### A. WRITE (owner-ceo only)

Owner-ceo invokes `scripts/checkpoint.mjs` with the trigger reason. The script:
1. Snapshots `state/project.json` + `state/budget.json` + in-flight artifact IDs
2. Writes atomic-rename to `state/checkpoints/{ulid}-{phase}-{trigger}.json`
3. Updates `state/role-state-board.json` atomic-rename
4. Emits `checkpoint_written` + `role_state_broadcast_updated` events to HMAC chain
5. If trigger=`feature_complete` or `phase_exit` → also invoke `scripts/build-codemap.mjs` + `scripts/build-kb-index.mjs`

Owner brief output to user (1 line):
```
[CHK] role-sa returned → checkpoint 01H... → next: peer-review by role-tech-lead
```

### B. READ (every role at start of turn)

Every role agent's first action:

```
1. Read state/role-state-board.json
2. If active_role != self:
   - In waiting_roles[]: reply "[BROADCAST] Standing by — active: <X>. My ready_when: <cond>. Aborting."
   - Not listed: reply "[BROADCAST] Not in current phase scope. Refusing." + escalate AMBIGUITY
3. If active_role == self: proceed with normal task
4. Never write to role-state-board.json yourself
```

This prevents role-tech-lead from starting work while role-sa is still drafting, even if owner mis-dispatched.

## Resume procedure (6 steps, used by `/solomon-agent:resume`)

```
Step 1: Read state/role-state-board.json
        → know phase, active_role, waiting_roles, checkpoint_pointer

Step 2: Read latest state/checkpoints/{...}.json (via checkpoint_pointer)
        → know next_planned_action, in_flight_artifacts, last_completed_dispatch

Step 3: Read all state/artifacts/*.md matching in_flight_artifacts[].id
        → know what's draft, where each artifact stands

Step 4: Run node scripts/verify-log.mjs
        → confirm HMAC chain intact; if NO, escalate VERIFICATION_FAILED

Step 5: If pending_escalations[] non-empty
        → surface escalation block to user FIRST
        → DO NOT auto-resume

Step 6: Re-dispatch next_planned_action
        → idempotent: skip if active_role already has completed_at in checkpoint
```

Resume is safe to invoke repeatedly — Step 6's idempotency prevents double-dispatch.

## What gets checkpointed (3 layers)

```
Layer 1 — Lightweight (every heartbeat, every role_return):
  - phase, active_role, waiting_roles, last_completed_dispatch
  - ~200 bytes

Layer 2 — Standard (every phase_exit, every escalation_emitted):
  - Layer 1 + in_flight_artifacts + budget + events_tail_offset
  - ~2-5KB

Layer 3 — Full (every feature_complete):
  - Layer 2 + KB rebuild + codemap rebuild + memory MCP write
  - ~10KB + docs/kb/* + docs/codemap/* rebuild
```

Owner-ceo MAY downsample Layer 1 if `sc.config.json:checkpoint.skip_role_return=true` AND budget tight. NEVER downsample Layer 2 or Layer 3.

## Common failure modes + fixes

| Symptom | Cause | Fix |
|---|---|---|
| `/solomon-agent:resume` re-dispatches role that already completed | checkpoint missing completed_at | Re-run with `--force-recheck` to re-scan artifacts; report to issue tracker |
| Two roles "active" simultaneously | board write not atomic | Update `scripts/checkpoint.mjs` to use atomic-rename pattern; verify-log will catch divergence |
| Role refuses dispatch claiming "not active" | board stale | `/solomon-agent:status` to refresh board; if persists, owner-ceo restarts dispatch loop |
| Checkpoint write fails mid-feature | disk full / permissions | guard-checkpoint pre-hook should catch; in v0.1 owner falls back to in-memory + escalates SAFETY |
| Resume from older checkpoint loses recent work | user invoked `--from <older-id>` | document in command help; default is always latest |

## Cost considerations

- Layer 1 cost: negligible (~50 tokens of owner output per turn)
- Layer 2 cost: ~200 tokens (slightly fuller summary)
- Layer 3 cost: ~500 tokens + script invocation (codemap/KB builds)
- Compared to "lost session = re-discover everything" cost which is 10-100× larger, checkpointing is cheap insurance

## Integration with other skills

- `meta-orchestration` — dispatch happens AFTER checkpoint write; never race
- `idea-discovery-interview` — interview rounds emit `interview_round_end` trigger
- `creative-security-mindset` — alternatives + STRIDE notes go into artifact, NOT checkpoint
- `escalation-protocol` — escalations always emit `escalation_emitted` trigger BEFORE surfacing to user
- `shared-state` — checkpoint files use same atomic-rename pattern

## Anti-patterns

- "I'll checkpoint at end of phase" — too coarse; mid-phase drops lose progress
- "Just keep going if board is stale" — never; refuse + force refresh
- "Skip codemap rebuild on feature_complete" — operator depends on it being fresh
- "Resume by re-running /solomon-agent:launch" — wipes prior state; always `/solomon-agent:resume`
- Roles writing to `role-state-board.json` — only owner-ceo writes; race condition guaranteed otherwise
