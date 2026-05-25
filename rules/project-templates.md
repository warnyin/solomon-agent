# Project Templates

> Round 4 #7.

## web-app (default)
- Phases: DISCOVERY → DESIGN → BUILD → VERIFY → DEPLOY → HANDOFF
- Required roles: pm, ba, sa, tech-lead, developer, qa, devsecops, security, infra, service-desk
- Default budget: 250000
- Soft-classify until DESIGN entry

## cli-tool
- Phases: DISCOVERY → DESIGN → BUILD → VERIFY → HANDOFF
- Roles: pm, sa, tech-lead, developer, qa, service-desk (no ba, no devsecops separate)
- Default budget: 100000

## data-pipeline
- Phases: DISCOVERY → DATA-MODEL → DESIGN → BUILD → VERIFY → DEPLOY → HANDOFF
- Required: sa, infra, security, developer, qa, devsecops
- Default budget: 200000

## library
- Phases: DISCOVERY → DESIGN → BUILD → VERIFY → HANDOFF
- Roles: pm, sa, tech-lead, developer, qa, service-desk (no infra/devsecops)
- Default budget: 80000

## mobile-app
- Phases: DISCOVERY → DESIGN → DESIGN-NATIVE → BUILD → VERIFY → DEPLOY → HANDOFF
- All 10 roles required
- Default budget: 300000

## Classification Heuristics (role-ba)

| Keywords | Type |
|---|---|
| website, web app, SaaS, dashboard | web-app |
| CLI, command line, terminal tool | cli-tool |
| ETL, pipeline, batch, streaming | data-pipeline |
| library, SDK, package, plugin | library |
| iOS, Android, mobile, native | mobile-app |

## Soft vs Hard Classify (Round 5 #53)

Soft-classify until DESIGN entry; hard-locked thereafter. To change: `/solomon-agent:abort` + new launch.

## Override

`sc.config.json:project_type_override: "<type>"` bypasses auto-classification.
