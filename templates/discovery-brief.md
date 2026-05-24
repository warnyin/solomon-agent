# Discovery Brief

> Written by owner-ceo via `skills/idea-discovery-interview` BEFORE DISCOVERY phase work begins.
> Source-of-truth for role-pm / role-ba / role-sa. Schema matches `rules/communication-protocol.md`.

---

## Meta
- artifact_type: discovery-brief
- artifact_id: 01H_SYNTHETIC_ULID
- project_id: 01H_SYNTHETIC_PROJECT_ID
- interview_rounds: 0
- overall_confidence: 0.00
- user_explicit_go: false
- created_at: 2026-05-23T00:00:00Z
- created_by: owner-ceo

---

## 1. WHO

- **Primary user**: ...
- **Secondary user / admin**: ...
- **Buyer / sponsor**: ...
- **Approvers (legal/compliance)**: ...
- **Estimated user count**: at launch=N, year-1=N
- **Technical level of users**: novice | intermediate | expert
- **Languages / locales**: [...]

## 2. WHAT (deliverable)

- **Form factor**: web | mobile | CLI | library | API | document | hardware | mixed → choice
- **v0.1 must-haves**: [...]
- **v0.1 explicitly deferred**: [...]
- **Acceptance test for "done"**: ...
- **Reference (positive) — looks like**: [...] (URLs / repo names)
- **Reference (negative) — does NOT look like**: [...]

## 3. WHY (job-to-be-done)

- **Pain solved**: ...
- **Current workaround cost**: ...
- **Ladder of whys**: 1) ... 2) ... 3) ... 4) ... 5) ...
- **Success metric — 30 days**: ...
- **Success metric — 90 days**: ...

## 4. WHEN

- **Hard deadline**: date or "none"
- **Soft preference**: ...
- **Why that date**: ...
- **Cost of delay (per week)**: ...

## 5. WHERE

- **Runtime environment**: cloud (which) | on-prem | user-device | offline | hybrid
- **Platforms / OS / browsers**: [...]
- **Geographies / data residency**: [...]

## 6. HOW (preferences, not commitments)

- **Existing code / repo to integrate**: path or "none"
- **Tech stack preference**: ... or "anything reasonable"
- **Existing data sources**: [...]
- **Brand / design system**: ...

## 7. CONSTRAINTS

- **Budget ceiling (USD)**: ...
- **Token budget**: ...
- **Maintainer count post-handoff**: ...
- **Compliance**: [GDPR | HIPAA | PCI | Thai PDPA | SOC2 | none]
- **Data classification**: [public | PII | PHI | confidential | secret] (per `rules/data-classification.md`)
- **Performance targets**: latency=p95, throughput=rps, uptime=%

## 8. EDGE CASES & FAILURE

- **100× traffic spike behavior**: ...
- **Critical dependency outage**: ...
- **Hostile input**: ...
- **Abuse vector**: ...
- **Premortem — top 3 ways this fails in 6 months**:
  1. ...
  2. ...
  3. ...

## 9. ANTI-SCOPE

- **MUST NOT do**: [...]
- **Features explicitly excluded**: [...]
- **Users explicitly excluded**: [...]

## 10. ASSUMPTIONS (read back to user)

- ASSUMPTION-1: ... [risk: low|med|high]
- ASSUMPTION-2: ... [risk: low|med|high]
- ASSUMPTION-N: ...

> All HIGH-risk assumptions trigger `DECISION_GATE` escalation if user did not explicitly confirm.

---

## Confidence Vector (final)

```json
{
  "who": 0.00,
  "what": 0.00,
  "why": 0.00,
  "when": 0.00,
  "where": 0.00,
  "how": 0.00,
  "constraints": 0.00,
  "edge_cases": 0.00,
  "anti_scope": 0.00,
  "assumptions": 0.00,
  "overall": 0.00
}
```

## Handoff Note to role-pm / role-ba

The brief is authoritative. If you find a contradiction between this brief and `<USER_REQUIREMENT>`, the brief WINS (it incorporates clarifications post-intake). If you find a gap that blocks your work, return `## Needs-Input: type=CLARIFY` to owner — do NOT invent the answer.
