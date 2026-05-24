# When to Use Solomon Agent

> Round 5 #43.

## Decision Matrix

| Project Size ↓ / Team Size → | Solo | 2-5 | 6+ |
|---|---|---|---|
| XS (1-3 files) | by hand | by hand | by hand |
| S (10-50 files) | sc-launch | by hand | by hand |
| M (50-200 files) | sc-launch | sc-launch | by hand |
| L (200+ files) | sc-launch (split) | sc-launch | dedicated PM tool |

## Rules of Thumb
1. Use sc-launch when goal fits 1-2 sentences AND you don't want to project-manage
2. Skip when you already have a clear PM ticket — write the ticket
3. Choose sc over alternatives when you want explicit escalation gates

## Good fit ✅
- "Build a CLI to convert markdown → PDF with themes"
- "Add email + OAuth Google auth to my Next.js app"
- "Python pipeline: S3 CSV → normalize → Postgres"

## Poor fit ❌
- "Fix the bug in line 47 of auth.ts" — just edit it
- "Build me Facebook" — owner escalates AMBIGUITY immediately
- "Refactor entire codebase" — series of focused PRs
- "Manage sprint planning" — use Linear/Jira

## Cost Heuristic

| Project Type | Cost (USD est) | Duration |
|---|---|---|
| cli-tool (S) | $0.10-0.30 | 10-30 min |
| library (S) | $0.10-0.40 | 15-40 min |
| web-app (M) | $0.50-2.00 | 30-90 min |
| data-pipeline (M) | $0.40-1.50 | 25-75 min |
| mobile-app (L) | $1.50-5.00 | 90-180 min |

Override via `sc.config.json:budget.tokens_budget`.
