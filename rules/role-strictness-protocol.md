# Role Strictness / Sign-Off Gate Protocol

> Round 12 (post-v0.1 user feedback): no work product proceeds downstream until the producing role has run its own verification checklist AND signed off. Every role is its own first reviewer; owner-ceo enforces the gate.

## Binding Rule

For every artifact `A` produced by role `R`:

1. `R` MUST run the checklist at `templates/role-verification-checklists.md#R` against `A` BEFORE setting `status: ready_for_review`
2. `R` MUST attach `signed_off_by[]` entry to `A.frontmatter` with:
   - `role: R`
   - `at: <ISO-8601>`
   - `checklist_version: <int>`
   - `passed_items: [item_id, ...]`
   - `failed_items: [{item_id, reason}, ...]`
3. If ANY `failed_items[]` exists → `R` MUST self-revise; cannot ship with `failed_items[].length > 0` unless escalated via `## Waiver` block in artifact body (see §Waiver)
4. Downstream role `R'` MUST NOT consume `A` if:
   - `signed_off_by[]` does not contain entry from `R`, OR
   - `status` is NOT in `[ready_for_review, approved]`, OR
   - `failed_items[].length > 0` without active waiver

Owner-ceo MUST NOT promote `A.status: ready_for_review → approved` until peer-review checklist runs (see §Peer Review).

Owner-ceo MUST NOT advance phase until ALL phase-exit roles have signed-off artifacts (see §Phase Exit Gate).

**Violation** → escalate `VERIFICATION_FAILED` (escalation #15, per `rules/escalation.md`); halt all dispatch in current phase.

## Sign-Off Levels

| Level | Who | When | Records to |
|---|---|---|---|
| **Self** | producing role `R` | before `status: ready_for_review` | `signed_off_by[]` with `level: self` |
| **Peer** | sibling role (per matrix) | before `status: approved` | `signed_off_by[]` with `level: peer` |
| **Owner** | owner-ceo | at phase exit | `signed_off_by[]` with `level: owner` |
| **Adversarial** | role-security or role-qa | for safety-class artifacts | `signed_off_by[]` with `level: adversarial` |

### Peer-Review Matrix

| Producer | Peer Reviewer | Why |
|---|---|---|
| role-pm | role-ba | Domain coverage check |
| role-ba | role-pm | Requirements alignment check |
| role-sa | role-tech-lead | Implementability check |
| role-tech-lead | role-sa | Architectural fit check |
| role-developer | role-qa + role-security | Quality + safety |
| role-qa | role-developer | Test realism check (no over-mocked) |
| role-devsecops | role-infra + role-security | Topology + threat alignment |
| role-security | role-tech-lead | Mitigation feasibility check |
| role-infra | role-devsecops | Pipeline compatibility |
| role-service-desk | role-pm | Exec-summary truthfulness vs. PRD |
| role-consultant-builder | role-ba | Persona accuracy: does the synthesized consultant match the brief's domain + WHO + WHY? (per `design/consultant-feature.md` Q7) |

Peer reviewer uses SAME checklist (different lens: producer asks "did I do X?", peer asks "did producer actually do X?"). Peer dispatched by owner-ceo as a SEPARATE `Agent({subagent_type: <peer-role>, prompt: "Peer-review artifact 01H... per templates/role-verification-checklists.md#<role>"})` call — never assumed automatic.

## Status Lifecycle

```
draft  ─[role self-verifies]→  ready_for_review  ─[peer signs off]→  approved
   ↑                                  │
   └──────[peer rejects]──────────────┘
                                      │
                              [owner phase exit gate]
                                      ↓
                                  promoted_to_phase_exit
```

New statuses (extend `rules/communication-protocol.md`):
- `draft` — work in progress
- `ready_for_review` — self-verified, peer needed
- `rejected` — peer found issues, back to producer
- `approved` — peer signed off
- `superseded` — replaced by newer (existing)
- `waiver_pending` — failed_items but waiver requested

## Phase Exit Gate

Owner-ceo MUST verify before transition (e.g., DESIGN → BUILD):

```
phase_exit_check(phase) {
  required_artifacts = rules/project-templates.md[project_type][phase].required[]
  for art in required_artifacts:
    assert art.status == "approved"
    assert art.signed_off_by has level=self AND level=peer
    if art.artifact_type in safety_class:
      assert art.signed_off_by has level=adversarial
    assert art.failed_items.length == 0 OR has active waiver
  if any assertion fails: escalate VERIFICATION_FAILED
}
```

`safety_class` artifact_types: `security-audit`, `threat-model`, `pipeline` (subtype), `code` touching auth/payments/PII, `runbook` for prod deploys.

## Waiver Mechanism

If a `failed_items[]` is impractical to fix in current cycle, producer adds `## Waiver` section to artifact body:

```markdown
## Waiver
- item: test_coverage_min_80
- reason: Module is glue code with mostly type-system safety; 65% coverage with all branches.
- compensating_control: integration tests cover full happy + error paths
- expires_at: 2026-06-23T00:00:00Z
- requested_by: role-developer
- approver_required: role-qa AND owner-ceo (per peer matrix + owner gate)
```

Waivers MUST be approved by both peer reviewer AND owner-ceo. Owner-ceo records `Decision` entity in memory MCP (`type: waiver`). Waiver auto-expires per `expires_at`; re-verification needed at next phase entry.

Waivers MAY NEVER be granted for:
- `safety-class` items in `templates/role-verification-checklists.md` marked `[SAFETY]`
- `signed_off_by[]` missing producer's own self sign-off
- `INJECTION_DETECTED` related items

## Adversarial Review (safety-class only)

For `safety-class` artifacts, owner dispatches an additional adversarial pass:
- `code` touching auth/payments/PII → `role-security` adversarial (red-team lens: "how would I exploit this?")
- `runbook` for prod deploys → `role-qa` adversarial (chaos lens: "what fails if X then Y?")
- `security-audit` self-produced by role-security → `role-tech-lead` cross-check (independence: "did security miss feasibility tradeoff?")
- **Consultant answers** returned by `role-consultant` when `question_class in safety-class AND provenance.brief == []` → `role-security` adversarial per-answer (red-team lens: "would acting on this answer expose auth/payments/PII/deploy/legal risk?"). Reject 2× same answer triggers anti-pingpong defer (per `rules/needs-input-protocol.md §Consultant Anti-Loop`). NOTE: the consultant *profile* itself does NOT take an adversarial pass — risk surface is the answer, not the persona (per `design/consultant-feature.md` Q7).

Adversarial reviewer cannot also be the producer's standard peer (avoid collusion). If matrix conflict → owner-ceo MUST escalate `DECISION_GATE` for reviewer assignment.

## Events Emitted

- `signoff_self_complete` — role, artifact_id, passed_count, failed_count
- `signoff_peer_requested` — producer_role, peer_role, artifact_id
- `signoff_peer_complete` — peer_role, artifact_id, verdict (approved|rejected)
- `signoff_rejected` — peer_role, artifact_id, reasons[]
- `signoff_owner_phase_exit` — phase, artifacts_checked
- `waiver_requested` — artifact_id, item_id, requested_by, expires_at
- `waiver_approved` — artifact_id, item_id, approvers[]
- `signoff_adversarial_complete` — adversarial_role, artifact_id, findings[]

## Token-Cost Trade-off

This protocol increases token spend per artifact roughly 1.6-2.2× (self + peer; +0.5× if adversarial). Owner-ceo MUST factor this into the budget pre-dispatch check (Round 1 #1) — multiply estimated token cost by `2.0` baseline, `2.5` for safety-class artifacts.

If budget cannot absorb the multiplier → escalate `BUDGET_WARNING` BEFORE starting the phase, not partway through.

## Bypass (advanced, NOT recommended)

`sc.config.json: { "strictness": { "skip_peer_review": false, "skip_adversarial": false, "allow_waivers": true } }`

- `skip_peer_review: true` → only self-verification required; logged as `Decision: relaxed_strictness` in memory
- `skip_adversarial: true` → blocked for safety-class artifacts regardless (cannot bypass)
- `allow_waivers: false` → no waivers possible; producer MUST fix all `failed_items[]`

Owner-ceo MUST emit `[YELLOW] Strictness relaxed per config. Failure cost likely higher.` warning at SessionStart if any bypass active.

## Anti-Patterns (NEVER DO)

- Producer signs off own work as `peer` (collusion)
- Owner-ceo skips checklist run "because role is reliable" (every role, every time)
- Marking `failed_items: []` when items were not actually checked (dishonest pass)
- Auto-approving waivers without writing reason + compensating control
- Promoting `draft → approved` without `ready_for_review` intermediate (skip-the-line)
- Re-using prior phase's sign-off across phases (each phase fresh check)

## Integration with Other Rules

- `rules/communication-protocol.md` — `signed_off_by[]`, `status` lifecycle, `verification_log` fields
- `rules/escalation.md` — `VERIFICATION_FAILED` (#15)
- `rules/conflict-resolution.md` — arbiter decisions go through SAME sign-off gate
- `rules/needs-input-protocol.md` — `## Needs-Input` blocks role from signing off own work
- `rules/handoff-protocol.md` — final HANDOFF requires owner-level sign-off on `final-report.md`
- `rules/discovery-interview-protocol.md` — `discovery-brief.md` requires self + owner sign-off (peer skipped — owner IS the producer)

## Bootstrap exception

For v0.1: roles MAY ship with `checklist_version: 0` placeholder during initial 24hr post-install if `templates/role-verification-checklists.md` is missing — owner-ceo emits `[YELLOW] Strictness uninitialized — checklist template not found` once and proceeds. v0.2 makes this a hard fail.
