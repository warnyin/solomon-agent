# Changelog

All notable changes to Solomon Agent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-26

### TL;DR

First public release. Solomon Agent turns a single `/solomon-agent:launch` into a 10-role virtual company that runs DISCOVERY → DESIGN → BUILD → VERIFY → HANDOFF autonomously. Ships with 10 role agents (PM/BA/SA/TL/Dev/QA/DevSecOps/Security/Infra/ServiceDesk) + CEO orchestrator + backup-owner failover, 14 `/solomon-agent:*` commands, 8 cognitive skills, 23 protocol rules, per-role sign-off gates, resumable hand-off checkpoints, HMAC-chained event log, KB + codemap auto-build, pre-flight + mid-flight + retrospective cost transparency, doctor health check, and a dry-run harness. Built across 20 audit rounds, 137 files. Cross-platform (Linux/macOS/Windows) and bilingual (EN + TH) docs.

### Added (Round 20 — Extender Cookbooks)
- `docs/extending-add-role.md` — 7-step cookbook for adding a new role agent
- `docs/extending-add-command.md` — 5-step cookbook for adding a `/solomon-agent:*` command
- `docs/extending-add-skill.md` — 4-step cookbook for adding a cognitive skill

### Added (Round 19 — Open-Source Readiness)
- `SECURITY.md` — vulnerability disclosure + threat model + hardening recommendations
- `docs/telemetry-policy.md` — zero-default-telemetry stance + data inventory
- `.github/ISSUE_TEMPLATE/bug.yml` — structured bug report form
- `.github/ISSUE_TEMPLATE/feature.yml` — feature request form
- `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist with strictness verification
- `CODE_OF_CONDUCT.md` — Contributor Covenant

### Added (Round 18 — Dry-Run Harness)
- `scripts/dry-run-harness.mjs` — end-to-end simulation of `/solomon-agent:launch` with mock owner-ceo
- `tests/fixtures/launch-simulation/basic.json` — CLI-project scenario fixture
- Updated `.github/workflows/eval.yml` — replaced stub with dry-run invocation

### Added (Round 17 — Health Check)
- `commands/doctor.md` — `/solomon-agent:doctor` command spec (15 health checks)
- `scripts/doctor.mjs` — implementation with `--json`, `--verbose`, `--fix` modes

### Added (Round 16 — Cost Transparency)
- `rules/cost-transparency-protocol.md` — 3-surface model (pre-flight/mid-flight/retrospective)
- `scripts/estimate-cost.mjs` — pre-flight estimator (heuristic-v1)
- `scripts/burn-rate-watch.mjs` — mid-flight burn-rate watcher with threshold alerts
- Updated `commands/launch.md` — Step 1.5 pre-flight cost gate
- Updated `commands/cost-report.md` — retrospective section
- Updated `agents/owner-ceo.md` — burn-rate-watch invocation after every checkpoint

### Added (Round 15 — Meta-Command `/solomon-agent:do`)
- `commands/do.md` — smart router: reads state, classifies intent, asks back, routes
- `skills/intent-router/SKILL.md` — 3-layer classification (state → keyword → confidence)

### Added (Round 14 — Resumable Hand-Off + KB + Codemap)
- `rules/handoff-checkpoint-protocol.md` — 6 checkpoint triggers + role-state broadcast
- `rules/knowledge-base-protocol.md` — artifact index in `docs/kb/`
- `rules/codemap-protocol.md` — code TOC in `docs/codemap/`
- `templates/handoff-card.md`, `templates/codemap.md`, `templates/knowledge-base-index.md`
- `skills/checkpoint-and-resume/SKILL.md`
- `scripts/checkpoint.mjs`, `scripts/build-codemap.mjs`, `scripts/build-kb-index.mjs`
- `commands/resume.md`, `commands/codemap.md`, `commands/kb.md`

### Added (Round 13 — Creative + Security Mindset)
- `skills/creative-security-mindset/SKILL.md` — 2-axis discipline (Rule of 3 + STRIDE-on-everything)
- Updated `rules/role-charters.md` Common section + `templates/role-verification-checklists.md`

### Added (Round 12 — Strictness / Sign-Off Gate)
- `rules/role-strictness-protocol.md` — self/peer/owner/adversarial sign-off
- `templates/role-verification-checklists.md` — 10-15 items per role
- Updated `rules/communication-protocol.md` — `signed_off_by[]`, `verification_log[]`, status lifecycle
- Updated `rules/escalation.md` — added #15 `VERIFICATION_FAILED`

### Added (Round 11 — Discovery Interview)
- `rules/discovery-interview-protocol.md` — binding intake protocol (5 rounds × 5 questions)
- `skills/idea-discovery-interview/SKILL.md` — 10-dimension question bank
- `templates/discovery-brief.md` — output schema
- Updated `agents/owner-ceo.md` — Step 0 Discovery Interview before Phase Machine

### Added (Rounds 1-10 — v0.1 Foundation)
- Initial scaffold: plugin manifest, marketplace registration, package.json, README, LICENSE, .gitignore
- Directory layout for commands/, agents/, skills/, rules/, hooks/, scripts/, docs/, tests/, state/
- 10 role agents (PM/BA/SA/TL/Dev/QA/DevSecOps/Security/Infra/ServiceDesk) + owner-ceo + backup-owner
- 9 v0.1 commands (launch/status/inject/abort/replay/failover/cost-report/compact/stats)
- HMAC chain event log + atomic-rename writes + path-traversal guards
- PRP plan with 110 closed gaps across 9 rounds of audit (see `.claude/PRPs/plans/meta-agent-orchestrator.plan.md`)

