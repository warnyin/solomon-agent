# Hand-Off Checkpoint Protocol

> Round 14 (post-v0.1 user feedback): owner-ceo MUST checkpoint state after every role return, every phase boundary, and every feature completion so any operator can resume after session drop. Every role MUST know the broadcast state to avoid premature work.

## Why

Session drops happen (network, context limit, user closes laptop). Without frequent checkpoints, work is lost and the operator can't tell "where were we?". Without role-state broadcast, role-tech-lead might start working while role-sa is still drafting — wasted tokens, conflict, rework.

## Binding Rule

Owner-ceo MUST emit a checkpoint via `scripts/checkpoint.mjs` at EVERY trigger below. Roles MUST read `state/role-state-board.json` at start of their turn and refuse to act if `active_role != self`.

## Checkpoint Triggers

| Trigger | When | What gets written |
|---|---|---|
| `role_return` | After ANY role's Agent call returns | checkpoint + broadcast update |
| `phase_exit` | Before transitioning phase | checkpoint with phase-summary + KB/codemap rebuild |
| `feature_complete` | When a deliverable feature passes VERIFY | checkpoint + KB/codemap rebuild + `feature-completed` event |
| `escalation_emitted` | When `[YELLOW] ESCALATION` is surfaced | checkpoint with `resume_blocked_by: escalation_id` |
| `interview_round_end` | After Discovery Interview each round | checkpoint with brief draft snapshot |
| `time_threshold` | Every 15min wall-clock (heartbeat) | lightweight checkpoint with phase/role only |
| `manual` | `/sc:status` or `/sc:resume` invocation | refresh broadcast + checkpoint |

## Checkpoint File Format

`state/checkpoints/{checkpoint_ulid}-{phase}-{trigger}.json`:

```json
{
  "checkpoint_id": "01H_SYNTHETIC_CHECKPOINT",
  "project_id": "01H_SYNTHETIC_PROJECT",
  "at": "2026-05-24T10:30:00Z",
  "trigger": "role_return",
  "phase": "DESIGN",
  "active_role": "role-sa",
  "waiting_roles": ["role-tech-lead", "role-security", "role-infra"],
  "completed_artifacts_in_phase": [
    {"id": "01H_ART_PM", "role": "role-pm", "type": "prd", "status": "approved"},
    {"id": "01H_ART_BA", "role": "role-ba", "type": "domain-model", "status": "approved"}
  ],
  "in_flight_artifacts": [
    {"id": "01H_ART_SA", "role": "role-sa", "type": "design", "status": "draft", "progress_pct": 60}
  ],
  "last_completed_dispatch": 7,
  "next_planned_action": "Await role-sa draft, then dispatch role-tech-lead with sa-architecture as input",
  "resume_command_hint": "/sc:resume",
  "pending_escalations": [],
  "budget": {"tokens_used": 47230, "tokens_remaining": 152770, "usd_estimate": 0.42},
  "events_tail_50_offset": 1247,
  "schema_version": 1
}
```

## Role-State Broadcast

Single file `state/role-state-board.json` (atomic-rename writes for race safety):

```json
{
  "updated_at": "2026-05-24T10:30:00Z",
  "phase": "DESIGN",
  "active_role": "role-sa",
  "active_role_dispatched_at": "2026-05-24T10:28:00Z",
  "active_role_expected_completion": "2026-05-24T10:45:00Z",
  "waiting_roles": [
    {"role": "role-tech-lead", "blocked_by": "role-sa.design artifact", "ready_when": "01H_ART_SA.status=approved"},
    {"role": "role-security", "blocked_by": "role-sa.design artifact", "ready_when": "01H_ART_SA.status=approved"},
    {"role": "role-infra", "blocked_by": "role-sa.design artifact", "ready_when": "01H_ART_SA.status=approved"}
  ],
  "completed_in_phase": ["role-pm", "role-ba"],
  "checkpoint_pointer": "state/checkpoints/01H_SYNTHETIC_CHECKPOINT-DESIGN-role_return.json"
}
```

## Role Discipline (MUST follow)

Every role agent body must include this check at start of turn:

```
1. Read state/role-state-board.json
2. If active_role != my role name:
   - I am in waiting_roles[]: do NOT execute task. Reply "[BROADCAST] Standing by — active_role: <X>. My ready_when: <condition>. Aborting this turn."
   - I am NOT in waiting_roles[]: this is unexpected — reply "[BROADCAST] Not in current phase scope. Refusing dispatch." + escalate AMBIGUITY
3. If active_role == my role name: proceed
4. On completion: do NOT update role-state-board.json yourself; owner-ceo does (post-Agent return)
```

This prevents two-roles-talking-at-once and prevents premature work even if owner-ceo accidentally over-dispatches.

## Resume Procedure (used by `/sc:resume`)

1. Read `state/role-state-board.json` → know phase + active_role + waiting_roles
2. Read latest `state/checkpoints/*.json` → know next_planned_action + in_flight_artifacts
3. Read `state/artifacts/*.md` matching in_flight_artifacts[].id → know what's draft
4. Verify `verify-log.mjs` clean → audit chain intact
5. If `pending_escalations[]` non-empty → surface FIRST, do not auto-resume
6. Re-dispatch `next_planned_action` per checkpoint

Resume command always safe to run repeatedly (idempotent — won't double-dispatch if active_role.completed_at exists).

## Feature-Complete Trigger

Defined as: a deliverable that passes VERIFY phase exit AND has `feature_id` tag in artifact frontmatter. On detection:

1. Write checkpoint with `trigger: feature_complete`, `feature_id: <id>`
2. Emit `feature_completed` event
3. Trigger `scripts/build-codemap.mjs` (per `rules/codemap-protocol.md`)
4. Trigger `scripts/build-kb-index.mjs` (per `rules/knowledge-base-protocol.md`)
5. Update memory MCP: `Project.features_completed += 1`, write `Pattern` entity if reusable
6. Brief checkpoint summary to user (auto-surface):
   ```
   [GREEN] FEATURE COMPLETE — <feature_id>
   - Artifacts: N
   - Codemap updated: docs/codemap/
   - KB updated: docs/kb/
   - Next: <next_feature or "HANDOFF">
   - Resume anytime with /sc:resume
   ```

## Atomicity & Recovery

- Checkpoint write uses atomic-rename (`tmp + rename`) — partial state never visible
- Old checkpoints retained for last 50 + last 1 per phase boundary; older archived to `state/archive/checkpoints/<project_id>/`
- `scripts/checkpoint.mjs --verify` checks: latest checkpoint matches role-state-board, all referenced artifacts exist, HMAC chain intact
- If verify fails → owner-ceo escalates `VERIFICATION_FAILED` with body "checkpoint integrity"

## Events Emitted

- `checkpoint_written` — trigger, checkpoint_id, phase, active_role
- `role_state_broadcast_updated` — old_active → new_active
- `feature_completed` — feature_id, artifacts[]
- `resume_attempted` — by_user_command, success, next_action
- `role_refused_premature_dispatch` — role, expected_active

## Cost Note

Each checkpoint write is ~2-5KB of JSON + ~1KB role-state-board update + HMAC event line. Net token impact is small (owner emits brief block per checkpoint, not a full re-read). Heartbeat checkpoints every 15min are ~50 tokens of owner output.

For long-running phases, checkpoint cost is negligible vs the safety of recoverable state. Owner-ceo MAY downsample to every 2nd `role_return` checkpoint if phase has >10 dispatches AND budget squeeze, but MUST keep `phase_exit` + `feature_complete` + `escalation_emitted` triggers.

## Anti-Patterns (NEVER DO)

- Skipping `role_return` checkpoint to "save tokens" — defeats resumability
- Writing checkpoint without updating role-state-board — broadcast drift
- Allowing a role to overwrite `active_role` (only owner-ceo writes board)
- Resuming without reading checkpoint AND board AND events (3 sources of truth must agree)
- Using checkpoints as a substitute for proper artifact write — they're metadata snapshots, not work products

## Bypass (NOT recommended)

`sc.config.json: { "checkpoint": { "heartbeat_min": 15, "skip_role_return": false } }`

- `heartbeat_min: 0` disables heartbeat (still keeps trigger-based)
- `skip_role_return: true` disables per-return checkpoint — only triggers on phase/feature/escalation. Logged as `Decision: relaxed_checkpoint`.

## Integration

- `rules/owner-failover.md` — failover reads latest checkpoint to bootstrap backup-owner
- `rules/handoff-protocol.md` — final HANDOFF includes pointer to checkpoint trail
- `rules/role-strictness-protocol.md` — checkpoint after every sign-off transition
- `rules/codemap-protocol.md` + `rules/knowledge-base-protocol.md` — feature_complete trigger rebuilds both
- `commands/resume.md` — `/sc:resume` user entry point
- `commands/status.md` — `/sc:status` reads latest checkpoint
