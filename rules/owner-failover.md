# Owner Failover Protocol

> Round 6 Gap #89 — user-triggered ONLY.

## NOT
- automatic heartbeat (no agent supervisor in Claude Code)
- 60s liveness check
- silent swap

## IS
- User triggers `/sc:failover` after suspected stall
- Backup-owner reads `state/checkpoint.json` to resume
- Original owner-ceo considered dead

## When to trigger
- Silent >10min (check `/sc:status` progress events)
- Malformed dispatches repeatedly
- Persona drift (owner doing role work)

## Procedure (`commands/failover.md`)
1. Check `state/checkpoint.json` — absent → `NO_CHECKPOINT_AVAILABLE`
2. Force release `state/lock` if dead pid (`state-store.mjs release-lock`)
3. Re-acquire lock
4. Dispatch `agents/backup-owner.md` with `<RESUME_CONTEXT>FAILOVER...</RESUME_CONTEXT>`

## Checkpoint Cadence (owner-ceo)
At every phase exit + every 30min:
```json
{"phase":"BUILD","pending_dispatches":["frame_key1"],"last_event_ts":"2026-05-23T10:35:00Z","in_flight_artifacts":["01H..."]}
```

## Backup Boot Sequence
Per `agents/backup-owner.md` — read checkpoint + events tail; reconcile dispatch-stack; resume from checkpoint phase WITHOUT replaying.

## v0.1 Honesty
Best-effort recovery, NOT HA. Crash mid-write → partial state; backup-owner detects via reconciliation.
