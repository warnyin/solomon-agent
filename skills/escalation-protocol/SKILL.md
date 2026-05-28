---
name: escalation-protocol
description: When to STOP and ask the user vs decide alone. 14 escalation conditions covering safety, ambiguity, decision-gate, scope-explosion, dead-end, budget, injection, lock, version, language, long-session, dependency-version, migration-integrity, MCP-auth. Used by owner-ceo and role agents.
---

# Skill: escalation-protocol

<!-- DO NOT EDIT MANUALLY. Generated from rules/escalation.md -->

## Quick Reference (14 conditions)

| # | Condition | Relaxable? |
|---|---|---|
| 1 | AMBIGUITY | yes |
| 2 | DECISION_GATE | NO |
| 3 | SAFETY | NO |
| 4 | SCOPE_EXPLOSION | NO |
| 5 | DEAD_END | yes |
| 6 | BUDGET_WARNING/EXCEEDED | NO (hard) |
| 7 | INJECTION_DETECTED | NO |
| 8 | MULTI_USER_LOCK | NO |
| 9 | STATE_VERSION_MISMATCH | NO |
| 10 | LANGUAGE_DOWNGRADE_PROPOSAL | yes |
| 11 | LONG_SESSION_WARNING | auto |
| 12 | DEPENDENCY_VERSION_MISMATCH | yes |
| 13 | MIGRATION_INTEGRITY_FAILURE | NO |
| 14 | MCP_AUTH | NO |

## Format
```
[YELLOW] ESCALATION

Condition(s): <CONDITION_1>[, <CONDITION_2>]
Phase: <phase>
Need decision on:
  1. <question 1>
  2. <question 2>
Default (if no reply in 10min): <default> or "HALT"
Context: <one paragraph>
```

## Bundling
2+ simultaneous → ONE numbered block. User addresses each by number.

See `rules/escalation.md` for worked examples per condition.
