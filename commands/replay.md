---
description: Re-run a specific phase. Resets state to phase start; later-phase artifacts marked superseded per rules/rollback-protocol.md. Useful after correcting input or fixing a critical decision.
argument-hint: "<PHASE-NAME>"
---

# /sc:replay

## Procedure
1. Validate `$ARGUMENTS` ∈ {DISCOVERY, DESIGN, BUILD, VERIFY, HANDOFF, REWORK, DEPLOY, DATA-MODEL, DESIGN-NATIVE}
2. Confirm phase already ran (events.ndjson for `phase_start <ARG>`)
3. Cascade-supersede per `rules/rollback-protocol.md`:
   - Mark artifacts where `produced_at > <phase_start_ts>` as `status:superseded`
   - Move to `state/archive/superseded-by-replay-<ts>/`
4. Reset `state/project.json:phase = <ARG>`
5. Invoke owner-ceo with `<RESUME_CONTEXT>` REPLAY block

```
Agent({
  subagent_type: "owner-ceo",
  description: "Replay phase ${ARGUMENTS}",
  prompt: `
<USER_REQUIREMENT>{{from state/project.json:goal}}</USER_REQUIREMENT>
<RESUME_CONTEXT>
REPLAY: phase=${ARGUMENTS} triggered by user.
Superseded <N> later artifacts (state/archive/superseded-by-replay-<ts>/).
Phase re-entered at clean state.
</RESUME_CONTEXT>
`
})
```

## Notes
- Cannot replay HANDOFF (terminal) — use new `/sc:launch` instead
- Unresolved escalations remain in `state/project.json:pending_escalations[]`
- Determinism: structural reproducibility only (Round 7 #95)
