# Roles Catalog

Plain-English view of `rules/role-charters.md`.

| Role | Color | Model | Scope | Phase |
|---|---|---|---|---|
| owner-ceo | magenta | opus | Decompose / dispatch / decide / escalate | ALL |
| backup-owner | pink | opus | User-triggered failover from checkpoint | failover |
| role-pm | blue | sonnet | User stories, prioritization | DISCOVERY |
| role-ba | green | sonnet | Domain model, project-type classify, language detect | DISCOVERY |
| role-sa | purple | opus | System design, ADR, architectural arbiter | DESIGN |
| role-tech-lead | cyan | opus | Module breakdown, tech stack, brownfield code-map | DESIGN |
| role-developer | yellow | sonnet | Implementation + unit tests | BUILD (worktree parallel) |
| role-qa | orange | sonnet | Test plan + E2E + regression | VERIFY |
| role-devsecops | red | sonnet | CI/CD pipeline + IaC | VERIFY |
| role-security | red | opus | Threat model + audit (deps + secrets + OWASP) | DESIGN+VERIFY |
| role-infra | gray | sonnet | Runtime topology + scaling + observability | DESIGN |
| role-service-desk | white | haiku | Runbook + Exec Summary | HANDOFF |

## Anti-Scope Quick-Look
- PM ≠ tech selection (→ TL), ≠ domain depth (→ BA)
- BA ≠ architecture (→ SA), ≠ code (→ Dev)
- SA ≠ module breakdown (→ TL), ≠ audit (→ Sec)
- TL ≠ writing code (→ Dev), ≠ test strategy (→ QA)
- Dev ≠ deploy (→ DevSecOps), ≠ git push (user)
- QA ≠ implementation (→ Dev), ≠ security depth (→ Sec)
- DevSecOps ≠ threat model (→ Sec), ≠ topology (→ Infra)
- Sec ≠ pipeline (→ DevSecOps)
- Infra ≠ deploy automation (→ DevSecOps)
- SD synthesizes only — never invents

## Source
`rules/role-charters.md` — single source. Each agent body mirrors charter; drift detected by `scripts/check-drift.mjs`.
