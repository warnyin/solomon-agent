# HANDOFF Protocol

> Round 4 Gap #37.

## Artifact Disposition

| Status | Action |
|---|---|
| approved | Stays in `state/artifacts/` |
| draft | Owner warns user; asks decision |
| superseded | Move to `state/archive/artifacts/<phase>/` |

## Event Log Snapshot
`state/events.ndjson` → `state/archive/events-handoff-<ts>.ndjson.gz` if `sc.config.json:auto_compact_handoff` (default true).

## Final Report
`state/artifacts/final-report.md` — canonical:
- `## Executive Summary` (≤10 lines, no jargon)
- `## Technical Detail`

## Memory Ingest
Owner emits Project + Decisions + Lessons + materialized Risks + new Patterns per `rules/memory-schema.md`.

## Sequence
1. Dispatch role-service-desk (runbook + exec-summary)
2. `session-report.mjs` assembles final-report.md
3. Memory ingest
4. Optional auto-compact
5. Emit `handoff_complete` event
6. Owner exits; lock released
