# Rollback Protocol

> Round 5 Gap #46.

## /solomon-agent:replay <PHASE>
1. Mark artifacts where `produced_at > <phase_start_ts>` as `status:superseded`
2. Move to `state/archive/superseded-by-replay-<ts>/`
3. Reset `state/project.json:phase = <PHASE>`
4. Owner re-enters from clean state
5. Pending escalations preserved

## REWORK phase
- Auto-entered when VERIFY fails (qa/security CRITICAL)
- VERIFY → REWORK → re-enter BUILD (NOT full replay)
- REWORK artifact links failed VERIFY via `inputs:`
- Max 2 REWORK rounds; 3rd → `DEAD_END` escalation

## Cascade-Supersede
- Direct: same role same phase replaces
- Downstream review: owner emits `cascade_review` event listing potentially-stale artifacts
- Re-run as needed

## NOT touched
- Approved artifacts in earlier phases
- `state/events.ndjson` (append-only audit)
- `state/budget.json` (no token refund)
