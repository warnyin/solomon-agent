# Data Classification

> Round 5 #62.

## Sensitivity Levels (artifact frontmatter `sensitivity`)

| Level | Examples | Storage |
|---|---|---|
| `public` | PRD goal, architecture overview, runbook | default `state/events.ndjson` + `state/artifacts/` |
| `internal` | tech-plan w/ vendor pricing, test reports | default |
| `sensitive` | credentials, PII, security findings | `state/events-sensitive.ndjson` + umask 600 |

## Producer Rules
- role-security audit → ALWAYS `sensitive`
- role-developer code w/ test data → check before tagging
- role-pm PRD → typically `public`

## Hook Routing
Events tagged `sensitivity:"sensitive"` routed by `state-store.logEvent` to `state/events-sensitive.ndjson` mode 0o600.

## Observability Sink
Per `rules/observability-redaction.md`, sensitive NEVER sent externally unless `observability.include_sensitive: true` AND `sink: "file"` (local-only).

## OS Permissions
POSIX-only enforcement via umask; Windows ignores. README warns `state/` should not live on shared drives.
