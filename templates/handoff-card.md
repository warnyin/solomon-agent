# Handoff Card

> Per `rules/handoff-checkpoint-protocol.md`. Every role MUST emit a Handoff Card at end of turn (success OR escalation). Owner-ceo aggregates cards into checkpoint + role-state-board.

---

## Meta
- card_id: 01H_SYNTHETIC_CARD
- emitted_by: role-{name}
- emitted_at: 2026-05-24T00:00:00Z
- project_id: 01H_SYNTHETIC_PROJECT
- phase: DESIGN
- dispatch_id: 7

## What I did
- Produced artifact: [01H_SYNTHETIC_ARTIFACT](../state/artifacts/01H_SYNTHETIC_ARTIFACT-...md) — type: design, status: ready_for_review
- Ran checklist `templates/role-verification-checklists.md#role-sa` v2 → 10 passed, 0 failed
- Self sign-off recorded in artifact `signed_off_by[]`

## State of my work
- Completion: 100% | partial: N% (if partial, explain why below)
- Blocked by: none | <artifact-id / question / external dep>
- Waiver requested: none | see `## Waiver` in artifact

## What I read
- Inputs: [01H_PRD_F005](...), [01H_BA_F005](...)
- Memory queries: Pattern/auth-mtls (relevance: high)
- MCP calls: none

## What happens NEXT (proposed)
- Owner promotes my artifact `ready_for_review → approved` after peer review by role-tech-lead
- Then dispatch role-tech-lead with my artifact as input for tech-plan
- Or: address `## Needs-Input` if blocked

## Resume hint (if session drops here)
- `/solomon-agent:resume` will: re-read this card + checkpoint + role-state-board → dispatch next planned action
- Manual override: `/solomon-agent:replay DESIGN` rebuilds from approved DISCOVERY artifacts

## Broadcast (read by other roles)
- I am NO LONGER active_role; do not consume my draft until status=approved
- Peer reviewer expected: role-tech-lead (per peer-review matrix)
- Other waiting roles (role-security, role-infra): your trigger is `01H_SYNTHETIC_ARTIFACT.status=approved`

---

## Card Schema

| Field | Required | Notes |
|---|---|---|
| card_id | yes | ULID |
| emitted_by | yes | role name |
| emitted_at | yes | ISO-8601 |
| project_id | yes | from state/project.json |
| phase | yes | current phase |
| dispatch_id | yes | int |
| what_i_did | yes | brief bullets, artifact IDs |
| state_of_my_work | yes | completion% + blockers |
| what_i_read | yes | inputs + memory + MCP |
| what_happens_next | yes | proposal for owner |
| resume_hint | yes | how operator resumes from here |
| broadcast | yes | for other roles |

Cards are PART of the artifact body in a `## Handoff` section (NOT a separate file). Owner extracts on read.
