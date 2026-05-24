# Configuration Precedence

> Round 5 #48.

More-specific wins.

## Hierarchy (highest to lowest)

1. `sc.config.json` — user override (within safety limits per `validate-config.mjs`)
2. Agent body — role-specific behavior
3. Role charter (`rules/role-charters.md`)
4. Skill (`skills/<name>/SKILL.md`) — derived
5. Project rules (`rules/*.md`)
6. Plugin defaults — hardcoded

## Examples

| Conflict | Winner |
|---|---|
| sc.config requests SAFETY relax | REFUSED; rules/escalation wins |
| Agent body model:opus vs rules:sonnet | Agent body |
| Skill X vs rules Y | Rules (regenerate skill) |
| Two agents disagree on field | `rules/conflict-resolution.md` arbiter |

## Safety Floor (never overridable)

- SAFETY escalations
- INJECTION_DETECTED
- secret-pattern blocks (fail-closed)
- MIGRATION_INTEGRITY_FAILURE
- HMAC writer signature validation
