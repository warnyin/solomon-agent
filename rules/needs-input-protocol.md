# Needs-Input Protocol

> Round 5 Gap #57.

Owner action matrix when role returns `## Needs-Input`:

| Request Type | Owner Action |
|---|---|
| ACL_WIDEN | Verify path safe → grant via `state/role-acls.json:temporary_grants[]` (1hr); re-dispatch |
| MCP_FAILED | Apply `rules/mcp-fallback-policy.md`; re-dispatch w/ fallback |
| MISSING_INPUT | Dispatch missing producer first; re-queue |
| CLARIFY | Resolve from context if possible; else escalate `AMBIGUITY` |
| DECISION_BLOCKED | Escalate `DECISION_GATE` |
| DEAD_END | Escalate per `rules/escalation.md` §5 |
| CAPABILITY_MISMATCH | Escalate; user adjusts `sc.config.json` |

## Block Format

```markdown
## Needs-Input
- type: ACL_WIDEN
- what: state/secrets/prod-db.json
- why: validate connection string
- alternative: mark as TODO
```

## Anti-Loop
Same role + same type 3× → `DEAD_END` escalation.

## Audit
Owner logs `needs_input_received` + `needs_input_resolved` events.
