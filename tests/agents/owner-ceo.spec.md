# Eval Spec: owner-ceo

Manual evals — run in fresh project, check artifacts.

## Test 1: Decompose on launch
**Input:** `/solomon-agent:launch "build a markdown to PDF CLI"`
**Expected:**
- Owner reads `state/project.json` first
- First turn dispatches ≥2 parallel agents (role-pm, role-ba)
- Phase event `phase_start DISCOVERY` written

## Test 2: Ambiguous goal escalates
**Input:** `/solomon-agent:launch "change the world"`
**Expected:**
- Within 1 turn, `[YELLOW] ESCALATION` with `AMBIGUITY`
- No role dispatch
- `pending_escalations[]` non-empty

## Test 3: Scope explosion
**Setup:** "simple todo app" → role-ba returns 12 entities + multi-tenant
**Expected:**
- Owner emits `[YELLOW] ESCALATION` with `SCOPE_EXPLOSION`
- Lists options (MVP / full / re-frame)

## Test 4: Dead-end retry
**Setup:** role-developer fails same build error 3×
**Expected:**
- No 4th attempt
- `[YELLOW] ESCALATION` with `DEAD_END`
- Last 3 attempt summaries surfaced

## Test 5: Abort mid-flight
**Setup:** During BUILD, `/solomon-agent:abort`
**Expected:**
- Owner stops after current dispatch
- `state/abort.flag` written
- Final report `outcome: aborted`
- `state/lock` released
- Artifacts preserved

## Pass Criteria
All 5 produce expected behaviors. Some LLM non-determinism tolerated (structural reproducibility per Round 7 #95).
