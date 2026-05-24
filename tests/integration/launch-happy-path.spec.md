# Integration Eval: Launch Happy Path

## Setup
Fresh project dir; no existing `state/`.

## Input
```
/sc:launch "build a CLI todo app in Node.js with file-based storage"
```

## Expected Artifacts

`state/artifacts/` contains at minimum:
- `<ulid>-discovery-pm-stories.md` (prd)
- `<ulid>-discovery-ba-domain.md` (design, project_type=cli-tool)
- `<ulid>-design-sa-architecture.md`
- `<ulid>-design-tl-tech-plan.md`
- ≥1 `<ulid>-build-dev-impl.md`
- `<ulid>-verify-qa-tests.md`
- `<ulid>-verify-qa-report.md`
- `<ulid>-handoff-sd-runbook.md`
- `final-report.md`

## Expected Events
`state/events.ndjson` contains:
- `project_init`
- `phase_start` for DISCOVERY/DESIGN/BUILD/VERIFY/HANDOFF
- multiple `dispatch_complete` per phase
- `final_report outcome:shipped`

## Expected Final Report
- `## Executive Summary` (≤10 lines)
- `## Technical Detail` with artifact tree

## Tolerances
- Cost ≤ cli-tool budget (100k tokens)
- Wall clock ≤ 30 min
- No escalations expected (unambiguous goal)

## NOT expected
- Missing per-phase artifacts
- `outcome != shipped`
- `final_report` event without artifact file
- Stale `state/lock` after completion
