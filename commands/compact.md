---
description: Archive old artifacts + rotate event log. Run when state/ grows large. Safe — never deletes; moves to state/archive/.
argument-hint: ""
---

# /sc:compact

## Procedure
Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/state-compact.mjs`:
1. If `state/events.ndjson` > 10MB:
   - Move to `state/archive/events-<ts>.ndjson.gz` (zlib.createGzip)
   - Truncate live `state/events.ndjson` + write new genesis event
2. Artifacts with `status:superseded` AND `produced_at > 7 days ago`:
   - Move to `state/archive/artifacts/<phase>/`
3. Print summary

## When to run
- Stop hook warns if `state/` > 50MB → suggests `/sc:compact`
- Before `/sc:abort` of large runs (cleaner archive)
- After HANDOFF — auto if `sc.config.json:auto_compact_handoff: true` (default)

## Notes
- HMAC chain preserved across archive: `verify-log.mjs --include-archive`
- Mid-run compact safe (atomic ops); adds latency — prefer between phases
