---
description: Cross-project success metrics (Round 5 #41). Reads ~/.claude/plugins/sc/global-stats.json (per Round 5 #66 scope-isolated).
argument-hint: ""
---

# /sc:stats

## Procedure
1. Resolve path via `node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/paths.mjs --global-stats`
2. Read `~/.claude/plugins/sc/global-stats.json` (per-project rows keyed by project_id, umask 600)
3. Aggregate + render

## Output Format

```
## Solomon Agent Cross-Project Stats

Total launches: 24
By outcome:
  - shipped:        18 (75%)
  - aborted:         3 (12%)
  - escalated_out:   3 (12%)

Avg cost per launch: $0.42
Avg phases completed: 4.6 / 5
Avg duration: 38 min

### By project_type
| Type           | N  | Success Rate | Avg Cost | Avg Duration |
|----------------|----|--------------|----------|--------------|
| web-app        | 12 |     83%      |  $0.62   |    52 min    |
| cli-tool       |  6 |     67%      |  $0.18   |    18 min    |
| data-pipeline  |  4 |     75%      |  $0.41   |    34 min    |
| library        |  2 |    100%      |  $0.12   |    15 min    |

### Top Escalations
1. DECISION_GATE (8 occurrences)
2. SCOPE_EXPLOSION (5)
3. AMBIGUITY (3)
```

## Privacy
- Only aggregates + project_id; no goal text, no requirement content
- Delete per-project rows: `node ${CLAUDE_PLUGIN_ROOT}/scripts/stats-prune.mjs --project-id <id>`
