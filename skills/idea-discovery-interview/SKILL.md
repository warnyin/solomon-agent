---
name: idea-discovery-interview
description: Human-like deep idea-probing interview owner-ceo runs IMMEDIATELY on /solomon-agent:launch BEFORE any role dispatch. Doubts every assumption, asks 5-Whys + Premortem + Inverse + Stakeholder + Reference triangulation, fills discovery-brief.md until confidence ≥ 0.85 or user explicitly says "go". Prevents downstream rework by forcing clarity at intake.
---

# Skill: idea-discovery-interview

> Bound by `rules/discovery-interview-protocol.md`. Owner-CEO MUST invoke this before transitioning DISCOVERY → DESIGN.

## When to invoke

- IMMEDIATELY on `/solomon-agent:launch <idea>` (first owner-ceo turn, before any role dispatch)
- When user injects new scope via `/solomon-agent:inject` that materially changes the brief
- When any role returns `## Needs-Input: type=CLARIFY` that the owner cannot resolve from the brief

## Why

Sub-agents (PM/BA/SA/...) execute on the brief. An unclear brief multiplies error across 10 roles → wasted tokens, wrong product, painful rework. One round of human-quality questioning at intake saves 5-50× the cost downstream.

## Operating Principles

1. **Doubt by default** — Every word the user said could be ambiguous. "App" = web? mobile? CLI? "Fast" = <100ms? <1s? "Users" = how many? what kind?
2. **One question is rarely enough** — A surface answer usually hides a deeper "why". Use Ladder of Whys (max 5 levels) for stated goals.
3. **Ask what they did NOT say** — Stakeholders, constraints, anti-references, failure modes, success criteria.
4. **Cluster, don't drip** — Ask 3-5 related questions per turn (not 1 by 1). Respect user's time.
5. **Confidence-driven stop** — Maintain a confidence vector. Stop when ≥ 0.85 on all critical dimensions OR user explicitly says "ลุย" / "go" / "เริ่มเลย".
6. **No assumption is silent** — If user refuses to answer a critical question, record the assumption explicitly in the brief and flag it as a decision risk.

## Question Bank (10 dimensions)

Owner picks questions BY GAPS in the current brief, not as a fixed script.

### 1. WHO — Users & stakeholders
- Who is the primary user? (role, technical level, age, language)
- Who is the secondary user / admin / operator?
- Who pays for this? (might differ from user)
- Who must approve? (legal / compliance / boss)
- Estimated user count at launch / 1 year? (10, 1K, 1M?)

### 2. WHAT — Concrete deliverable
- What exact form? (web app, mobile app, CLI tool, library, API, document, hardware?)
- What does v0.1 ship with vs. what's "later"?
- What does "done" look like? (concrete acceptance test)
- Show me 2-3 reference products / sites / repos that resemble what you want
- Show me 2-3 references of what you DO NOT want it to be

### 3. WHY — Underlying job-to-be-done
- What problem does this solve? (Ladder of Whys: ask "why" up to 5 times)
- What happens today without this? (workaround cost)
- What's the single biggest pain you're trying to remove?
- How will you measure success in 30 days? 90 days?

### 4. WHEN — Time / urgency
- When does it need to ship? (hard deadline / soft preference)
- Why that date? (event, contract, season, demo)
- What's the cost of delay (per week)?

### 5. WHERE — Environment / deployment
- Where will it run? (cloud / on-prem / user's device / offline)
- Which platforms / browsers / OS versions must work?
- Geography / locales / languages required?

### 6. HOW — Approach preferences
- Any existing code / system to integrate with? (repo? API?)
- Tech stack preference? (or "anything reasonable")
- Existing data we should use? (source? schema?)
- Brand / design system / look-and-feel preference?

### 7. CONSTRAINTS
- Budget ceiling (USD or tokens)?
- Team / maintainer count after handoff? (just you? 5 people?)
- Compliance requirements? (GDPR / HIPAA / PCI / Thai PDPA / SOC2)
- Performance targets? (latency, throughput, uptime)
- Data classification of inputs? (public / PII / PHI / confidential)

### 8. EDGE CASES & FAILURE
- What if it gets 100× expected traffic?
- What if a critical dependency is down?
- What if input data is malformed / hostile?
- What if a user tries to abuse it?
- Premortem: "Imagine this project fails in 6 months. What was the cause?"

### 9. ANTI-SCOPE — What it's NOT
- What MUST it not do? (safety / brand / legal)
- Features you do NOT want? (and why — to surface false assumptions)
- Users you do NOT want? (gatekeeping)

### 10. ASSUMPTIONS we're making
- Explicit list — read back to user: "I'm assuming X, Y, Z. Correct any."

## Stop Conditions

Owner stops asking when ANY of:

| Condition | Threshold |
|---|---|
| Confidence vector | ALL 10 dimensions ≥ 0.85 |
| User explicit go | "ลุย", "go", "เริ่มเลย", "พอแล้ว", "เริ่มได้", "ok proceed" |
| Question budget | 5 rounds × 5 questions = 25 max questions |
| User opt-out | User says "minimal questions" → stop at confidence ≥ 0.6 (record gaps as assumptions) |
| Trivial scope | Goal is bug-fix / docs-update class (<2hr work) → 1 round only |

## Confidence Vector Format

After EACH round, owner emits to user (and writes to `state/artifacts/confidence.json`):

```json
{
  "who":         0.90,
  "what":        0.85,
  "why":         0.95,
  "when":        0.70,
  "where":       0.80,
  "how":         0.40,
  "constraints": 0.50,
  "edge_cases":  0.30,
  "anti_scope":  0.60,
  "assumptions": 0.85,
  "overall":     0.68
}
```

Owner targets the LOWEST scores in the next round.

## Output: discovery-brief.md

Final artifact written to `state/artifacts/discovery-brief.md` via `state-store.writeArtifact()` with `artifact_type: "discovery-brief"`. See `templates/discovery-brief.md` for the schema.

The brief is the single source of truth that role-pm / role-ba read at DISCOVERY phase start.

## Interview Anti-Patterns (NEVER DO)

- One question per turn → wastes user time
- 20+ questions in one turn → cognitive overload (max 5)
- Yes/no questions for critical scope → use open-ended "describe / show / give example"
- Asking questions whose answers are obvious from `<USER_REQUIREMENT>` already
- Skipping anti-scope / failure / assumptions — those are the rework killers
- Continuing to ask after user said "ลุย" — user trumps confidence target
- Asking technical-stack questions BEFORE understanding the WHO/WHY (premature solutioning)

## Example Opening Turn

User typed: `/solomon-agent:launch "build a SaaS appointment app for Thai barbershops"`

Owner replies (NOT dispatching any role yet):

```
[BLUE] DISCOVERY INTERVIEW — Round 1/5

ขอบคุณสำหรับ idea ครับ ก่อนผมจะมอบงานต่อให้ทีม PM/BA/SA
ขอถามเพิ่ม 5 ข้อ เพื่อให้ทีมไม่ตีความผิดทาง:

WHO
1. ผู้ใช้หลักคือ "เจ้าของร้านตัดผม" หรือ "ลูกค้าที่จองคิว"? (เลือก 1 หรือบอก ratio)
2. ขนาดร้านที่จับ — ร้านเล็กเจ้าของคนเดียว / chain หลายสาขา / both?

WHAT
3. มี reference app ที่ "ใกล้เคียงสิ่งที่อยาก" 1-2 ตัวไหม (เช่น Booksy / SimplyBook.me / Setmore)?
4. v0.1 ที่ "ส่งให้ลูกค้าใช้ได้" ต้องมีอะไรบ้าง (booking, payment, reminder, loyalty)?

WHY
5. ปัญหาที่อยากแก้คืออะไรเป็นหลัก — โทรจองยาก / no-show เยอะ / จัดการคิวมั่ว / รับรายได้รั่ว?

confidence: who=0.3 what=0.4 why=0.4 when=0.0 where=0.0 how=0.0 constraints=0.0 edge=0.0 anti=0.0 assume=0.0 overall=0.11

ตอบเป็นข้อๆ หรือเล่าเป็น paragraph ก็ได้ครับ
```

## Failure-mode escape hatch

If after 5 rounds confidence STILL < 0.6 on any safety-class dimension (constraints, who, anti_scope), owner escalates `AMBIGUITY` (per `rules/escalation.md` §1) instead of guessing.
