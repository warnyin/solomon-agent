# MCP Fallback Policy

> Round 3 Gap #12 + Round 4 #12.

## Per-MCP Policy

| MCP | Timeout | Retries | Fallback |
|---|---|---|---|
| context7 | 30s | 2 | role-tech-lead with WebSearch OR mark gap + proceed |
| exa | 30s | 2 | degrade to memory MCP search + log `enrichment_gap` |
| github | 60s | 2 | escalate `MCP_AUTH` (token expiry likely) |
| memory | 10s | 2 | skip cross-session learning + log; never block |
| playwright | 60s | 2 | degrade QA to manual-test-plan + flag at HANDOFF |
| sequential-thinking | 30s | 1 | proceed without explicit chain-of-thought |

## Role Behavior on MCP Failure
1. STOP looping after 2 attempts
2. Write `mcp_unavailable: <name>` in artifact
3. Return to owner

## Owner Behavior
1. Apply fallback above
2. Log `mcp_failure` + `mcp_fallback_used` events
3. Auth-class → escalate `MCP_AUTH`

## Event Shape

```json
{"type":"mcp_failure","mcp":"github","role":"role-security","attempt":2,"error":"401"}
{"type":"mcp_fallback_used","mcp":"exa","role":"role-ba","fallback":"memory-search"}
{"type":"mcp_auth_escalation","mcp":"github"}
```
