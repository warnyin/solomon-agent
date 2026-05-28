---
name: meta-orchestration
description: Decompose / dispatch / collect / decide loop for orchestrating 10 role-based agents. Pattern catalog (parallel fan-out, sequential pipeline, map-reduce, retry-on-class). Used by owner-ceo.
---

# Skill: meta-orchestration

<!-- Hand-maintained. Summarizes rules/role-charters.md — keep in sync. Validated by scripts/build-skills.mjs. -->

## When to invoke
- owner-ceo decomposing goal into dispatches
- Multi-role parallel wave scheduling
- Role conflict routing

## Dispatch Patterns

### Parallel Fan-Out
Independent roles in one phase → SINGLE message with multiple `Agent` calls.

### Sequential Pipeline
Phase B depends on Phase A output → dispatch B only after A's artifact is draft/approved.

### Map-Reduce over Artifacts
BUILD with multiple devs → `isolation:"worktree"` per module; reducer = role-qa.

### Retry-on-Class
Classifiable error → max 3 retries; 3+ same class → `DEAD_END` escalation.

## Collect + Decide
- All coherent → promote drafts to approved → advance phase
- Conflicts → arbiter per `rules/conflict-resolution.md`
- Missing → re-dispatch
- Escalation → halt

See `rules/role-charters.md` for full role contracts.
