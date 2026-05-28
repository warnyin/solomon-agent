# Design: Professional Consultant Agent

> Status: design locked via `/grill-me` interview on 2026-05-28. MVP implementation in progress.
> Goal: insert a new step at project init that builds a domain-expert "consultant" persona from the discovery-brief, so role agents can resolve deep questions by asking the consultant instead of bothering the user.

## Problem

Today, when a role (PM/BA/SA/dev/...) hits an unclear point, it emits `## Needs-Input: type=CLARIFY` and owner-ceo surfaces it to the user as `[YELLOW] ESCALATION`. For multi-week projects, the user gets interrupted dozens of times.

The discovery-brief already captures most of what's needed to answer these questions — what's missing is an agent that internalizes the brief + adds appropriate domain expertise, and is dispatched in place of the user for non-binding clarifications.

## Solution overview

After the discovery interview reaches its stop condition, owner-ceo dispatches a one-shot `role-consultant-builder` to synthesize a per-project persona (`state/artifacts/consultant-profile.md`). From that point onward, when a role emits `## Needs-Input: type=CLARIFY`, owner intercepts and batches the question(s) to `role-consultant` (a static answerer agent that loads the profile + brief). The consultant returns answers tagged with provenance + confidence + `defer_to_user` flag. Owner injects accepted answers back into the asking role; deferred / low-confidence / safety-rejected answers go into a [BLUE] CONSULTANT-DEFER batch surfaced to the user.

## Locked decisions

| # | Decision | Rationale |
|---|---|---|
| Q1 Form | Static `agents/role-consultant.md` + dynamic `state/artifacts/consultant-profile.md` injected at dispatch | Consistent persona across dispatches; per-dispatch constraints enforceable; resume-safe |
| Q2 Generator | New `agents/role-consultant-builder.md` dispatched once at DISCOVERY exit | 1 agent = 1 job convention; owner stays orchestration-pure; LLM judgment needed for domain to title mapping |
| Q3 Invocation | Owner brokers (only `agents/owner-ceo.md` modified, not 10 role files) | Single control point for budget/audit/escalation; minimal blast radius |
| Q4 Authority | Domain-extrapolation allowed; every answer tagged provenance(brief/extrapolation/inference) + confidence + caveats + `defer_to_user` | Structural hallucination guard; honors "answer deep questions" intent |
| Q5 Profile schema | YAML frontmatter: identity, expertise.{primary,secondary}, outside_scope[], knowledge_frames[], domain_analogs[], voice_style + 200-300 word narrative body | Validatable; consistent across projects; outside_scope wires Q4 defer rule |
| Q6 Lifecycle | Build once at DISCOVERY exit; `/inject` non-pivotal -> builder mode=patch; pivotal (project_type/WHO.primary_user/WHAT.deliverable_form/WHY.problem) -> escalate `CONSULTANT_REBUILD_REQUIRED` -> user confirm -> mode=rebuild | Persona stability + safety on real pivots |
| Q7 Sign-off | Self (builder) + Peer (role-ba) at build; per-answer adversarial (role-security) only when question_class in safety AND provenance.brief = [] | Adversarial at the risk point, not the persona point |
| Q8 Fall-through | `[BLUE] CONSULTANT-DEFER` block bundling up to 5; shows consultant's attempt as context; flush on full / blocks dispatch / phase boundary / status / idle 1min | Fewer interruptions; user can confirm consultant guess fast |
| Q9 Events | 9 targeted event types + 1 new checkpoint trigger `consultant_built` | Audit trail for "why did role X pick Y"; phase-significant gate captured |
| Q10 Budget | Separate `consultant: {used, soft, hard, dispatches_this_phase}` line + per-phase dispatch cap default 10 | Cost class user opted into -> user must be able to cap it |
| Q11 Concurrency | Batch up to N=5 questions per dispatch; shared profile+brief context; sequential batches if > 5 pending | Massive context reuse; cross-question coherence |
| Q12 Failure modes | Defined retry/defer/anti-loop rules (malformed: 1 retry -> defer; adversarial reject 2x -> defer; same qid >= 2x -> defer; zero-anchor -> force defer; timeout -> defer; defer-rate > 70% phase -> warn) | Bounds every loop; degrades to existing user-defer flow |
| Q13 Needs-Input | Add fields: `question_class`, `user_only` (default false), `consult_first` (default true); update CLARIFY owner action matrix; extend anti-loop to include question_class | Lets roles opt out for binding decisions |
| Q14 Files | 7 new + 13 modified | MVP = 2 new + 5 modified (this PR) |

## MVP scope (this PR)

**New files (2):**
- `agents/role-consultant.md`
- `agents/role-consultant-builder.md`

**Modified files (5):**
- `rules/role-charters.md` — +2 charters
- `rules/needs-input-protocol.md` — +Q13 fields + consultant intercept rules
- `rules/discovery-interview-protocol.md` — +builder dispatch on stop
- `agents/owner-ceo.md` — +Consultant Layer section + dispatch flow updates
- `design/consultant-feature.md` — this doc

## Deferred to follow-up PRs

- `scripts/lint-consultant-profile.mjs`, `scripts/lint-consultant-output.mjs`
- `scripts/checkpoint.mjs` — `consultant_built` trigger
- `scripts/estimate-cost.mjs` — consultant pre-flight line
- `scripts/burn-rate-watch.mjs` — consultant bucket
- `state/budget.json` schema bump + `state/defer-batch.json` buffer
- `rules/role-strictness-protocol.md` peer-review matrix row
- `rules/handoff-checkpoint-protocol.md` — `consultant_built` trigger
- `rules/escalation.md` — `CONSULTANT_REBUILD_REQUIRED`, `CONSULTANT_BUDGET_EXHAUSTED`
- `rules/communication-protocol.md` — consultant_* event schema
- `templates/role-verification-checklists.md` — `#role-consultant-builder` section
- `state/role-acls.json` template — `role-consultant` ACL

These are real and tracked, but not required to make the feature operative for first-light testing. The consultant can answer questions without burn-rate tracking; cap enforcement can default to "always try consultant" until budget machinery lands.

## Consultant return contract (Q4)

```json
{
  "answers": [
    {
      "question_id": "ni_01H_ULID",
      "answer": "50-200 users at launch, ramping to 500 by month 6",
      "provenance": {
        "brief": ["who.primary_user", "who.estimated_count_year1"],
        "extrapolation": ["barbershop SMB DAU norm: 50-200"],
        "inference": ["if retention >= 80%, 6mo ramp follows base x 2-3"]
      },
      "confidence": 0.72,
      "caveats": ["range depends on chain vs single shop — not yet decided"],
      "defer_to_user": false
    }
  ],
  "cross_question_notes": "tech_stack and deploy_target decided together: Vercel for both for coherence"
}
```

## Owner fall-through rule (Q4 + Q12)

Owner accepts the consultant answer iff:
- `defer_to_user == false`, AND
- `confidence >= 0.7` (default; configurable), AND
- NOT (`provenance.brief == []` AND `question_class in {auth, payment, PII, deploy, legal}`), AND
- adversarial verdict (if triggered) == approved, AND
- this is not the 2nd retry of the same `question_id`

Otherwise: append to defer batch.

## Profile schema (Q5)

YAML frontmatter:

```yaml
identity:
  title: <e.g., "Senior Service-Industry Operations Consultant">
  years_experience: <int>
  prior_work: [<3-5 plausible engagements>]

expertise:
  primary: [<3-5 areas inside scope>]
  secondary: [<3-5 adjacent areas>]

outside_scope:
  - field: <e.g., "payment_provider_choice">
    reason: <e.g., "business preference, requires user decision">

knowledge_frames:
  - frame: <distilled brief fact>
    derived_from: [<brief field paths>]

domain_analogs:
  - name: <reference product/company>
    similarity: <what's similar to the project>
    difference: <important caveat>

voice_style:
  tone: <e.g., "direct, concrete numbers with ranges">
  uncertainty_phrase: <e.g., "I'd estimate X (range Y) based on Z">
  refusal_phrase: <e.g., "outside my scope — needs user decision because W">
```

Below the frontmatter: 200-300 word narrative body describing the consultant as a person.

## Risks & open follow-ups

- **No automated linter yet** — profile schema validation in this PR relies on builder's self-checklist. A `scripts/lint-consultant-profile.mjs` follow-up will catch malformed profiles before they go operative.
- **No budget enforcement yet** — consultant dispatches consume tokens but aren't capped per-phase until follow-up. Heavy usage could blow budget. Mitigation: the role-strictness-protocol's 2.0x multiplier already applies to the builder's signoff path.
- **Adversarial trigger needs `question_class`** — Q13 adds this field but full enforcement of "safety class -> role-security review" depends on `rules/role-strictness-protocol.md` matrix update (deferred).
- **Defer batch is conceptual** — without `state/defer-batch.json` persistence, batched defers won't survive a session crash mid-batch. Acceptable risk for MVP; full persistence in follow-up.
