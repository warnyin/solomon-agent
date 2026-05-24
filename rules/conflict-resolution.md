# Conflict Resolution Protocol

> Round 5 Gap #3.

## Conflict = contradictory claims on same field
Examples: `auth_method`, `deploy_target`, `data_model`, `tech_stack.*`, `api_style`, `package_manager`, `language`, `runtime`

## 4-Step Protocol

### 1. Detect
Owner diffs artifacts by overlapping domain field at phase exit. Different non-empty values = conflict.

### 2. Triangulate
Owner dispatches arbiter:
- ARCHITECTURAL → `role-sa`
- All others → `role-tech-lead`

Arbiter receives both artifacts + relevant charter + conflict statement `<field>: A=<v1> vs B=<v2>`.

Arbiter returns:
```json
{"winning_artifact_id":"01H...","reason":"...","merged_field":null}
{"winning_artifact_id":"01H...","reason":"...","merged_field":{"field":"value"}}
{"needs_human":true,"reason":"..."}
```

### 3. Decide
- Decisive → owner marks loser `status:superseded`; writes `Decision` to memory MCP; emits `conflict_resolved`
- "needs_human" → escalate `DECISION_GATE`

### 4. Log
Every conflict → `state/events.ndjson` `{ts,type:"conflict_detected"|"conflict_resolved",artifact_ids:[ULID],field,winner,reason}`. Persist as `Decision` entity per `rules/memory-schema.md`.

## Anti-Deadlock

- Max 1 arbiter round per conflict
- Second round → mandatory `DECISION_GATE` escalation
- Arbiter MUST NOT dispatch back to original producer

## Owner Behavior

NEVER silently overwrite. Decision entities immutable; later overrides create new Decision pointing back.
