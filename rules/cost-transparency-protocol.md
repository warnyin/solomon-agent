# Cost Transparency Protocol

> Round 16 (post-Round 15 gap analysis): pre-flight estimate before /sc:launch + mid-flight burn alerts + per-feature retrospective. Stops "session ate $500 with no warning" surprises.

## Why

Session this size (15 rounds of v0.1) cost real money. Without pre-flight, mid-flight, and post-flight cost surfaces, the operator only learns AFTER the bill arrives. Three surfaces close the loop.

## Three Surfaces

### 1. Pre-flight estimate (before /sc:launch dispatches owner-ceo)

`scripts/estimate-cost.mjs` runs and produces `state/cost-estimate.json`:

```json
{
  "estimate_at": "2026-05-24T10:00:00Z",
  "goal_hash": "sha256-of-sanitized-goal",
  "goal_complexity": "small|medium|large|xl",
  "project_type": "web-app|cli|library|data-pipeline|mobile-app|research",
  "expected_tokens": 200000,
  "expected_usd": 1.80,
  "confidence": "low|med|high",
  "bands": { "low": 0.80, "mid": 1.80, "high": 5.40 },
  "based_on": "heuristic-v1",
  "memory_calibration_samples": 3
}
```

**Heuristic (v1, easy to replace):**
- Tokens-per-feature baseline: 30k tokens/feature
- Strictness multiplier: 2.0× (2.5× safety-class)
- Mindset multiplier: 1.4×
- Discovery interview: +5k tokens × estimated rounds
- Brownfield code-map: +20k tokens
- Per project_type adjustment factor

If memory MCP has Pattern entities for similar projects, owner blends heuristic + historical (weight 0.5/0.5 if ≥ 3 samples, else heuristic only).

**Surface to user (in `/sc:launch §1` pre-flight):**
```
[$] PRE-FLIGHT COST ESTIMATE
  Goal:       "build markdown-to-PDF CLI in Node.js"
  Complexity: medium · type: cli
  Expected:   ~200k tokens (~$1.80)
  Range:      $0.80 (lucky) — $5.40 (rough) with 80% confidence
  Based on:   heuristic-v1 (3 memory samples)

Proceed? [y/n/budget=<usd>]
```

User can override budget cap inline. Cap < estimate.low → refuse + suggest scope reduction.

### 2. Mid-flight burn-rate watch

`scripts/burn-rate-watch.mjs` runs every checkpoint (per `rules/handoff-checkpoint-protocol.md`) and appends to `state/burn-rate.ndjson`:

```json
{"at":"2026-05-24T10:15:00Z","phase":"DESIGN","tokens_used":47230,"tokens_per_min":3145,"usd_estimate":0.42,"pct_of_budget":21.0,"projected_finish":"2026-05-24T11:25:00Z","projected_final_usd":2.05}
```

Owner-ceo SHALL surface a brief 1-line burn report:
- Every phase exit
- When `tokens_per_min` exceeds 3× historical average (suspicious spike)
- When projected_final_usd exceeds estimate.high
- When pct_of_budget crosses 50/80/95% thresholds

Format:
```
[$] BURN — 21% used · 3.1k tok/min · projected final $2.05 (estimate $1.80, within range)
```

If projected exceeds `bands.high` → owner emits `BUDGET_WARNING` escalation (per `rules/escalation.md` §6).

### 3. Per-feature retrospective (at HANDOFF)

`commands/cost-report.md` produces `state/artifacts/{ulid}-handoff-cost-retro.md`:

```markdown
# Cost Retrospective

## Per-Feature
| Feature | Estimate | Actual | Variance | Notes |
|---|---|---|---|---|
| F-001 | $0.40 | $0.52 | +30% | sa+tl conflict needed arbiter (+1 dispatch) |
| F-002 | $0.30 | $0.28 | -7% | clean |
| ... |

## Per-Role
| Role | Dispatches | Tokens | $ Cost |
|---|---|---|---|
| role-pm | 5 | 18,400 | $0.17 |
| role-developer | 12 | 89,200 | $0.80 |
| ... |

## Calibration Update
| Metric | Pre-flight | Actual | Δ | Action |
|---|---|---|---|---|
| Goal complexity | medium | medium | 0 | OK |
| Tokens/feature | 30k | 36k | +20% | Update heuristic-v2 |

Memory MCP: Project entity updated with `actual_tokens`, `actual_usd` for future calibration.
```

## Cost Estimate Calibration Loop

Every project completion feeds memory MCP as `Project` entity:
- `goal_complexity`
- `project_type`
- `predicted_tokens` vs `actual_tokens`
- `predicted_usd` vs `actual_usd`
- `error_pct`

`scripts/estimate-cost.mjs` reads these via `mcp__plugin_ecc_memory__search_nodes` on next pre-flight. After 10+ samples, error rate should drop below 30%; if not, heuristic needs review.

## Anti-Patterns (NEVER DO)

- Surfacing cost ONLY on HANDOFF — user has already burned everything
- Hiding the band (low-mid-high) and showing only "expected" — false precision
- Treating estimate as a binding commitment (it's a band, not a quote)
- Burying burn alerts in events.ndjson without surfacing to user
- Skipping retrospective "to save tokens" — calibration loop dies
- Auto-aborting when projected > estimate.high (always escalate, never silent kill)

## Bypass

`sc.config.json: { "cost_transparency": { "preflight": true, "burn_alerts": true, "retrospective": true } }`

Set any to `false` to disable. Defaults are all `true`. Logged as `Decision: cost_transparency_relaxed` if disabled.

## Integration

- `commands/launch.md` — pre-flight calls estimator
- `agents/owner-ceo.md` — surfaces burn report at every checkpoint
- `scripts/estimate-cost.mjs` — implements pre-flight
- `scripts/burn-rate-watch.mjs` — implements mid-flight
- `commands/cost-report.md` — extended with retrospective renderer
- `rules/handoff-checkpoint-protocol.md` — checkpoint trigger invokes burn-rate-watch
- `rules/memory-schema.md` — Project entity carries calibration data
- `rules/escalation.md` — BUDGET_WARNING / BUDGET_EXCEEDED unchanged

## v0.1 limits

- Heuristic-v1 is hand-coded; no learning weights yet
- Pre-flight assumes 1 feature per `/sc:launch` (multi-feature estimate = sum + 15% coordination overhead)
- USD conversion uses hardcoded $9/M-tokens average; real cost varies by model used (Opus vs Sonnet vs Haiku)
- No per-MCP cost tracking
