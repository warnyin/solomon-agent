# Communication Protocol — Inter-Agent Artifact Schema

> Every artifact handoff goes through `state-store.writeArtifact()`. Never write to `state/artifacts/*` directly.

## Artifact File Naming

```
state/artifacts/{ulid}-{phase}-{role}-{kind}.md
```

- `ulid`: sortable, written by state-store
- `phase`: DISCOVERY|DESIGN|BUILD|VERIFY|HANDOFF|REWORK|DEPLOY|DATA-MODEL|DESIGN-NATIVE
- `role`: short role slug (pm|ba|sa|tl|dev|qa|devsecops|security|infra|sd|owner|arbiter|consultant|consultant-builder)
- `kind`: maps to `artifact_type`

## Frontmatter (REQUIRED on every artifact)

```yaml
---
id: "01H...ULID"
phase: "DISCOVERY"
produced_by: "role-pm"
produced_at: "2026-05-23T10:35:00Z"
inputs: ["01H...PREVIOUS_ULID"]
status: "draft"                  # draft | ready_for_review | rejected | approved | superseded | waiver_pending
artifact_type: "prd"
writer_signature: "<hmac-sha256-hex>"
schema_version: 2                # bumped: signed_off_by[] + verification_log[] added in Round 12
sensitivity: "public"
language: "en"
signed_off_by:
  - role: "role-pm"
    level: "self"                # self | peer | adversarial | owner
    at: "2026-05-23T10:40:00Z"
    checklist_version: 1
    passed_items: ["goal_one_sentence", "non_goals_explicit", "users_named"]
    failed_items: []             # [] OR [{item_id, reason}]
  - role: "role-ba"
    level: "peer"
    at: "2026-05-23T10:55:00Z"
    checklist_version: 1
    passed_items: ["goal_one_sentence", "users_named"]
    failed_items: []
verification_log:
  - at: "2026-05-23T10:40:00Z"
    actor: "role-pm"
    action: "self_verify"
    result: "ready_for_review"
  - at: "2026-05-23T10:55:00Z"
    actor: "role-ba"
    action: "peer_review"
    result: "approved"
---
```

**Status lifecycle** (per `rules/role-strictness-protocol.md` §Status Lifecycle):
```
draft → ready_for_review → approved
   ↑           ↓
   └─ rejected (peer found issues; back to producer)
```
Owner promotes `ready_for_review → approved` only after peer (+ adversarial for safety-class) sign-off. Without peer sign-off, downstream roles MUST refuse to consume.

## Per-Artifact-Type Schema (body sections REQUIRED)

### `prd`
- `## Goal`, `## Users`, `## Scope`, `## Non-Goals`, `## Success Metrics`, `## User Stories`

### `design`
- `## Components`, `## Data Flow`, `## Integration Points`, `## Key Decisions`, `## Open Questions` (optional)

### `tech-plan`
- `## Modules`, `## Tech Stack`, `## Conventions`, `## Build Plan`, `## Code Map` (brownfield)

### `code`
- `## Changes`, `## Test Status`, `## Self-Review Notes`, `## MCP Unavailable` (if any), `## Needs-Input` (if blocked)

### `test-plan`
- `## Coverage Targets`, `## Test Cases`, `## Automation`

### `test-report`
- `## Run Summary`, `## Failures`, `## Coverage Achieved`, `## Recommendation`

### `security-audit`
- `## Threat Model`, `## Findings`, `## Dependency Scan`, `## Recommendation`

### `runbook`
- `## Overview`, `## Procedures`, `## Failure Modes`, `## Contact`

### `code-map` (brownfield)
- `## Stack`, `## Entry Points`, `## Modules`, `## Test Coverage Present`, `## Conventions Detected`, `## Integration Points`

### `consultant-profile` (per `design/consultant-feature.md`)
- File path is a **fixed slot**: `state/artifacts/consultant-profile.md` (one per project, not ULID-prefixed) — singleton governed by `role-consultant-builder` modes initial/patch/rebuild
- Frontmatter ADDITIONAL fields beyond the common schema: `mode (initial|patch|rebuild)`, `identity{title, years_experience, prior_work[]}`, `expertise{primary[], secondary[]}`, `outside_scope[].{field, reason}`, `knowledge_frames[].{frame, derived_from[]}`, `domain_analogs[].{name, similarity, difference}`, `voice_style{tone, uncertainty_phrase, refusal_phrase}`
- Body sections: narrative biography (200-300 words); optional `## Patch History` (patch mode); optional `## Pivot Note` (rebuild mode); standard `## Handoff`
- Singleton overwrite policy: `state-store.writeArtifact()` (or direct Write by builder) replaces the file atomically; prior version archived to `state/archive/consultant-profile/<timestamp>.md` before overwrite

## Cross-Reference Format
Reference another artifact: `[[01H...ULID#section-anchor]]`. `validate-artifact.mjs` semantic pass (Round 5 #20) verifies referenced artifact + section exists; non-matching → `semantic_validation_warning` event.

## Hand-off Rules
- `inputs:[]` MUST list all artifact IDs the producer read
- A consuming role's ACL automatically grants Read on listed inputs
- `status:draft` → owner reviews → may promote to `approved` after phase exit
- `superseded` artifacts archived per `rules/handoff-protocol.md` at HANDOFF

## Write Path
ONLY: `state-store.writeArtifact({ role, phase, kind, body, frontmatter? })`. PostToolUse `validate-artifact-write.mjs` emits `raw_write_suspected` if a Write to `state/artifacts/*.md` lacks valid signature (Round 8 #97 — advisory only).

## Needs-Input Protocol
If role cannot complete because input is outside ACL: write `## Needs-Input` section listing what data, why required, where it lives. Set `status:draft` and exit; owner applies `rules/needs-input-protocol.md` action matrix.

## Handoff Section (Round 14, mandatory)
Every artifact body MUST end with a `## Handoff` section per `templates/handoff-card.md`. Required sub-fields:
- What I did (artifact_id, type, status, checklist passed/failed count)
- State of my work (% complete, blockers)
- What I read (inputs, memory queries, MCP calls)
- What happens next (proposal for owner)
- Resume hint (how operator resumes from here)
- Broadcast (instructions for other roles: who's waiting on what)

Owner-ceo extracts the Handoff section on read and uses it to populate `state/checkpoints/*.json` + `state/role-state-board.json` via `scripts/checkpoint.mjs`. See `rules/handoff-checkpoint-protocol.md` for the full protocol.
