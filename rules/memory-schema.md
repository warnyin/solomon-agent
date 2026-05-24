# Memory Schema — Cross-Session Entities

> Round 2 #2 + Round 5 #55.

Stored via `mcp__plugin_ecc_memory__create_entities`. `schema_version:1` baseline.

## Project
```json
{
  "name": "<ulid>", "entityType": "Project", "schema_version": 1,
  "observations": [
    "goal: <text>", "started_at: <ISO-8601>", "completed_at: <ISO-8601>",
    "project_type: web-app", "outcome: shipped|aborted|escalated_out",
    "audit_anchor: <hmac-genesis>"
  ]
}
```

## Decision
```json
{
  "name": "<ulid>", "entityType": "Decision", "schema_version": 1,
  "observations": [
    "project_id: <ulid>", "phase: DESIGN",
    "question: <field>", "chosen: <value>", "rejected: [...]",
    "rationale: <text>", "reversibility: low|med|high"
  ]
}
```

## Lesson
```json
{
  "name": "<ulid>", "entityType": "Lesson", "schema_version": 1,
  "observations": [
    "project_id: <ulid>", "category: escalation|technical|process",
    "insight: <text>", "evidence_artifact_id: <ulid>"
  ]
}
```

## Pattern
```json
{
  "name": "<slug>", "entityType": "Pattern", "schema_version": 1,
  "observations": [
    "problem: <text>", "solution: <text>",
    "example_project_ids: [<ulid>...]", "reuse_count: <int>"
  ]
}
```

## Risk
```json
{
  "name": "<ulid>", "entityType": "Risk", "schema_version": 1,
  "observations": [
    "project_id: <ulid>", "risk: <text>",
    "likelihood: low|med|high", "impact: low|med|high",
    "materialized: true|false", "mitigation_used: <text>"
  ]
}
```

## Relations
- Project --has_decision--> Decision
- Project --produced_lesson--> Lesson
- Project --identified_risk--> Risk
- Pattern --instantiated_in--> Project

## Ingestion Timing
- DISCOVERY entry: query Pattern + Lesson matching `project_type`
- HANDOFF: emit Project + Decisions + Lessons + materialized Risks + new Patterns

## Schema Migrations (Round 5 #55)
Upgrade scripts in `scripts/memory-migrations/<from>-to-<to>.mjs`. Run at session start when `state/project.json:sc_version` differs.
