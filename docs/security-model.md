# Security Model (Honest Scope)

> Round 8 #97 + Round 6 #90 — we name what we do NOT protect.

## IN SCOPE
- Accidental secret writes (guard-secrets fail-closed)
- Soft prompt-injection (sanitize-input)
- Schema drift (validate-artifact + writer_signature advisory)
- Internal state corruption (HMAC chain detects)
- Out-of-lane Read (guard-isolation + ACL)
- Concurrent write races (atomic-rename)
- Plugin upgrade w/ stale state (migration SHA verification)
- Cross-host lock contention (pid+hostname)
- Token-budget runaway (guard-budget hard-cap)
- Recursion runaway (guard-depth)
- Rate limit (guard-rate)
- Long-session exhaustion (LONG_SESSION_WARNING + auto-abort 6hr)

## OUT OF SCOPE (v0.1)
- **Filesystem-level adversary** — can rewrite session.key + recompute chain
- **Malicious plugin author** — `extra_roles[].agent_sha256` recommended not enforced
- **Memory MCP poisoning** — Lessons from compromised runs not validated
- **Side-channel timing**
- **LLM jailbreaks** beyond baseline defense
- **Multi-tenant isolation** — single-operator
- **Network MITM** on sink — user must pin HTTPS

## Crypto
- HMAC-SHA256 chain in events.ndjson
- ULID artifact IDs (timestamp-sortable + 80-bit random)
- `state/session.key` mode 0o600 (POSIX-only)
- NO encryption at rest

## Recommendations
- `state/` not on shared drives
- Pin `extra_roles[].agent_sha256` for 3rd-party role files
- Rotate observability sink token
- Sensitive projects: `observability.sink: null`
- Audit `state/events.ndjson` periodically with `verify-log.mjs`
