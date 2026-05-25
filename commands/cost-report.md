---
description: Per-role token + cost breakdown from state/budget.json and dispatch events. Surfaces what guard-budget.mjs records (Round 5 #36).
argument-hint: ""
---

# /solomon-agent:cost-report

## Procedure
1. Read `state/budget.json`
2. Read all `dispatch_complete` events from `state/events.ndjson` for token attribution
3. Aggregate per role + per phase
4. Render markdown table

## Output Format

```
## Cost Report — project_id=<ulid>

Total tokens: <used> / <budget> (<pct>%)
Total cost (est): $<cost>

### Per Role
| Role          | Dispatches | Tokens | Est USD | % Budget |
|---------------|-----------|--------|---------|----------|
| owner-ceo     |     5     | 18000  | $0.05   | 9%       |
| role-developer|    12     | 95000  | $0.28   | 48%      |

### Per Phase
| Phase     | Dispatches | Tokens | Est USD |
|-----------|-----------|--------|---------|
| DISCOVERY |    4      | 12000  | $0.04   |
| BUILD     |   12      | 95000  | $0.28   |

### Anomalies
- role-developer at 48% — exceeds typical 30-40% range
```

## Retrospective (Round 16 — at HANDOFF)

Per `rules/cost-transparency-protocol.md §3`. Read additional inputs:
- `state/cost-estimate.json` (pre-flight estimate)
- `state/burn-rate.ndjson` (mid-flight samples)

Append to report:

```
### Calibration vs Pre-flight
| Metric             | Estimate | Actual | Δ %  |
|--------------------|----------|--------|------|
| Total USD          | $1.80    | $2.05  | +14% |
| Total tokens       | 200,000  | 228k   | +14% |
| Complexity         | medium   | medium |  0   |

### Per-Feature
| Feature | Estimate | Actual | Variance | Notes |
|---------|----------|--------|----------|-------|
| F-001   | $0.40    | $0.52  | +30%     | sa+tl conflict (+1 arbiter) |
| F-002   | $0.30    | $0.28  | -7%      | clean |

### Burn-rate trajectory
- Min: 1.2k tok/min · Max: 4.8k · Median: 2.3k
- Peak phase: BUILD (4.8k tok/min during F-001 retry)

### Calibration update
Memory MCP — Project entity write: predicted=$1.80 actual=$2.05 error_pct=14%
Heuristic-v1 still in valid range (< 30% error); no review needed.
```

Always appended to `state/artifacts/final-report.md` at HANDOFF.

## v0.1 limit
Token counts via `state-store.recordTokens()` depend on `scripts/post-agent.mjs` PostToolUse Agent hook. If Claude Code Agent tool doesn't surface usage → char-heuristic (Round 7 #94). Report shows `source: actual|estimate` per row.
