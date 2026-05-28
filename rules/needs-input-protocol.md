# Needs-Input Protocol

> Round 5 Gap #57. Extended for consultant layer (see `design/consultant-feature.md`).

Owner action matrix when role returns `## Needs-Input`:

| Request Type | Owner Action |
|---|---|
| ACL_WIDEN | Verify path safe → grant via `state/role-acls.json:temporary_grants[]` (1hr); re-dispatch |
| MCP_FAILED | Apply `rules/mcp-fallback-policy.md`; re-dispatch w/ fallback |
| MISSING_INPUT | Dispatch missing producer first; re-queue |
| CLARIFY | See **§Consultant Layer** below |
| DECISION_BLOCKED | Escalate `DECISION_GATE` |
| DEAD_END | Escalate per `rules/escalation.md` §5 |
| CAPABILITY_MISMATCH | Escalate; user adjusts `sc.config.json` |

## Block Format

```markdown
## Needs-Input
- type: CLARIFY
- what: <question text>
- why: <why role can't proceed>
- alternative: <fallback if user/consultant doesn't reply>
- question_class: business | technical | domain | safety | user_preference   # optional, default: technical
- user_only: false                                                            # optional, default: false (only user can decide)
- consult_first: true                                                         # optional, default: true (try consultant before user)
```

**Field semantics:**
- `question_class` — guides consultant scope check + owner's safety-class adversarial trigger. Safety class = `safety` OR (`question_class == technical AND domain in {auth, payment, PII, deploy, legal}`).
- `user_only` — role asserts no agent should answer this (e.g., "what's our brand color?"). When true, owner skips consultant entirely → straight to defer batch.
- `consult_first` — role opts out of consultant attempt for THIS specific question. Use sparingly; the default is true.

## Consultant Layer

Per `design/consultant-feature.md`, owner-ceo brokers CLARIFY requests through `role-consultant` before surfacing to user.

### CLARIFY action (replaces prior single-line action)

```
on Needs-Input(type=CLARIFY) from role R:
  if user_only == true OR consult_first == false:
    -> append to defer batch (per §Defer Batch)
    return

  if state/artifacts/consultant-profile.md does NOT exist:
    -> escalate AMBIGUITY (per rules/escalation.md §1)
       [consultant not yet built; CLARIFY can only be served once consultant operative]
    return

  buffer the request in state/consultant-dispatches/pending/<question_id>.json (or in-memory if persistence unavailable)
  if buffer >= 5 OR question blocks active dispatch OR phase boundary OR idle 1min:
    dispatch role-consultant with batch (up to 5 questions)
    parse JSON return; for each answer:
      apply Owner Fall-Through Rule (see below)
```

### Owner Fall-Through Rule

Accept consultant answer iff ALL of:
- `defer_to_user == false`, AND
- `confidence >= sc.config.json:consultant.confidence_floor` (default 0.7), AND
- NOT (`provenance.brief == []` AND `question_class in safety-class`), AND
- adversarial verdict (if triggered) == approved, AND
- this is not the 2nd retry of the same `question_id`

Otherwise: append answer to defer batch with consultant's attempt shown as context.

### Defer Batch

When the consultant returns `defer_to_user: true`, low-confidence, or safety-rejected — owner accumulates into a defer batch and flushes as `[BLUE] CONSULTANT-DEFER` to user under any of:

| Trigger | Action |
|---|---|
| Batch size >= 5 | flush immediately |
| Defer blocks current dispatch (role can't continue) | flush immediately + skip bundle |
| Phase boundary (next phase wants to start) | flush all pending |
| `/solomon-agent:status` invoked | flush all pending |
| Idle dispatch-stack >= 1min | flush all pending |

### Consultant Anti-Loop

| Trigger | Action |
|---|---|
| Same `question_id` dispatched to consultant >= 2x | force defer to user (mark `consultant_anti_pingpong`) |
| Adversarial reviewer rejects same answer 2x | force defer (mark `consultant_answer_unsafe`) |
| Consultant returns malformed JSON | 1x retry with schema reminder; still malformed -> defer |
| Consultant dispatch timeout | log `consultant_timeout`; defer |
| Zero-anchor answer (provenance.brief = [], extrapolation = [], inference = []) | force `defer_to_user=true` regardless of consultant's own flag |
| Consultant defer rate > 70% in 1 phase | emit `[YELLOW] Consultant low-utility — consider /solomon-agent:replay DISCOVERY` |

## Anti-Loop (general, pre-existing)
Same role + same type + same `question_class` 3x -> `DEAD_END` escalation. (`question_class` added so e.g. a role asking CLARIFY about three different unrelated areas isn't falsely tripped.)

## Audit
Owner logs `needs_input_received` + `needs_input_resolved` events. For consultant-brokered cases, also emit `consultant_dispatched`, `consultant_answered`, `defer_batch_flushed`, `defer_resolved_by_user` per `design/consultant-feature.md`.
