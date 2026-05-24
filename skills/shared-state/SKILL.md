---
description: File-based shared state convention. Artifact naming, atomic writes, HMAC signatures, locking, frontmatter schema. Used by all roles via state-store.mjs.
---

# Skill: shared-state

<!-- DO NOT EDIT MANUALLY. Generated from rules/communication-protocol.md -->

## File Layout
- `state/project.json` — phase, status, escalations
- `state/budget.json` — token tracking
- `state/events.ndjson` — append-only audit (HMAC chain)
- `state/dispatch-stack.json` — active dispatches
- `state/role-acls.json` — per-role Read ACLs
- `state/session.key` — HMAC key (umask 600)
- `state/lock` — concurrency lock
- `state/artifacts/<ulid>-<phase>-<role>-<kind>.md` — inter-role artifacts

## Atomic Writes
ALWAYS via `state-store.atomicWrite(path,content)` — temp + rename. NEVER raw `fs.writeFile`.

## Artifact Writes
ONLY via `state-store.writeArtifact({role,phase,kind,body,frontmatter?})`:
- Auto-ULID
- HMAC `writer_signature`
- Atomic rename
- Emits `artifact_created`

## Locking
`state/lock` JSON `{pid,hostname,user,started_at,project_id}`. Cross-host → `MULTI_USER_LOCK`.

## HMAC Chain
Every event has `_prev` + `_hash`. `verify-log.mjs` detects tamper.

See `rules/communication-protocol.md` for artifact schema.
