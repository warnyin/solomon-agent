# Escalation Rules (User-Facing)

Narrative of `rules/escalation.md`.

## What is an Escalation?
Owner halts: "I cannot decide. I need YOU."

```
[YELLOW] ESCALATION
Condition(s): <CONDITION_NAME>
Need decision on: <question>
Default (if no reply in 10min): <default> or "HALT"
```

You reply; owner resumes.

## 14 Conditions

### Safety-class (NEVER auto-decided)
- **SAFETY** — production / payments / secrets / shared infra
- **DECISION_GATE** — irreversible cost (vendor, schema, paid service)
- **SCOPE_EXPLOSION** — estimate grew >2×
- **INJECTION_DETECTED** — requirement contains instructions (treated as data)
- **MULTI_USER_LOCK** — another user holds project
- **BUDGET_EXCEEDED** — raise cap or `/solomon-agent:abort`
- **STATE_VERSION_MISMATCH** — plugin upgrade migration needed
- **MIGRATION_INTEGRITY_FAILURE** — SHA mismatch
- **MCP_AUTH** — API token expired

### Relaxable via `sc.config.json:escalation_relax`
- AMBIGUITY, DEAD_END, LANGUAGE_DOWNGRADE_PROPOSAL, DEPENDENCY_VERSION_MISMATCH

### Auto
- **LONG_SESSION_WARNING** — 2hr wall clock

## Why the Safety Floor?
Some choices have no rollback. Plugin refuses to make them silently.

## Relax (carefully)
```json
{ "escalation_relax": ["AMBIGUITY", "DEAD_END"] }
```
`validate-config.mjs` rejects safety-class additions.

## Bundling
Multiple conditions same dispatch → ONE numbered block. Reply addressing each by number.
