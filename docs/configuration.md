# Configuration — `sc.config.json`

Optional per-project file at repo root. NOT gitignored — never put actual secrets here.

## Full Schema

```json
{
  "budget": { "tokens_budget": 200000, "cost_estimate_usd_max": 5.00 },
  "language": "auto",
  "project_type_override": null,
  "auto_compact_handoff": true,
  "escalation_relax": [],
  "role_swap": {},
  "extra_roles": [],
  "mcp_overrides": {},
  "skill_versions": {},
  "mcp_versions": {},
  "observability": {
    "sink": null, "endpoint": null, "api_key_env": null,
    "include_data": false, "include_paths": false, "include_artifact_content": false
  },
  "dispatch": { "stack_ttl_seconds": 1800 },
  "bootstrap": { "event_window": 50 },
  "jargon_allow": [],
  "ba": { "allow_market_research": false }
}
```

## Examples

### High-budget research
```json
{ "budget": { "tokens_budget": 500000, "cost_estimate_usd_max": 20.00 },
  "ba": { "allow_market_research": true },
  "bootstrap": { "event_window": 200 } }
```

### Custom Rust developer swap
```json
{ "role_swap": { "role-developer": "agents/custom/role-rust-developer.md" } }
```
File MUST live under repo (validate-config enforces).

### Agency adding role-marketing
```json
{ "extra_roles": [{
  "name": "role-marketing",
  "tools": ["Read","Write","Glob","Grep","WebFetch"],
  "model": "sonnet", "color": "magenta",
  "charter_path": "rules/custom/role-marketing-charter.md"
}] }
```
Run `npm run build:manifest` after.

## Forbidden (refused by validate-config)
- `escalation_relax` safety-class → filtered + warning event
- `role_swap` path outside repo
- `extra_roles[].tools` containing non-base tools
- `mcp_overrides` escalating beyond per-role MAX
- `observability.api_key_env` containing key-shaped value (must be env NAME)
