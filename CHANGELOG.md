# Changelog

All notable changes to Solomon Agent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Consultant Layer (per `design/consultant-feature.md`)

A per-project "professional consultant" agent that absorbs the discovery brief and intercepts CLARIFY-type Needs-Input from roles, so deep questions get answered by a domain-grounded persona instead of interrupting the user every time. Built across 14 locked design decisions from a `/grill-me` session, then implemented as 3 atomic commits + one consolidation commit (state-store/doctor/CHANGELOG/tests).

#### New agents
- `agents/role-consultant.md` — Read-only batched answerer; mandatory provenance + confidence + `defer_to_user` contract; zero-anchor and confidence-cap guards baked into the prompt
- `agents/role-consultant-builder.md` — One-shot persona synthesizer; modes `initial | patch | rebuild`; writes singleton `state/artifacts/consultant-profile.md` with YAML schema (identity, expertise, outside_scope, knowledge_frames, domain_analogs, voice_style + 200-300 word narrative body)

#### New design doc
- `design/consultant-feature.md` — Preserves all 14 design decisions, MVP scope, deferred-vs-shipped breakdown, return contract, owner fall-through rule, profile schema, risks & open follow-ups

#### New scripts
- `scripts/lint-consultant-profile.mjs` — Validate persona artifact against schema (required keys, list-size constraints, years_experience 8-20, narrative word count 200-300, mode-specific body sections, Handoff section); exit 0/1/2 like `lint-frontmatter.mjs`
- `scripts/lint-consultant-output.mjs` — Validate JSON return contract from `role-consultant` (required answer fields, types, confidence range, provenance shape, zero-anchor + confidence-cap guards); reads stdin or file arg
- `tests/scripts/lint-consultant-profile.spec.mjs`, `tests/scripts/lint-consultant-output.spec.mjs` — Node `--test` coverage of happy path + each guard

#### Owner-ceo integration
- New `# Consultant Layer` section in `agents/owner-ceo.md` with full build + broker flow including Bash hookup to `lint-consultant-output.mjs` (retry-then-defer on malformed)
- Boot Sequence step 3 reads `consultant-profile.md` when present
- Anti-Patterns extended with consultant-specific guardrails (no role dispatch before profile=approved, no answer injection on Fall-Through failure, no anti-pingpong loops, etc.)
- Material-Pivot Rebuild section documents `/inject` → `CONSULTANT_REBUILD_REQUIRED` flow

#### Protocol & charter additions
- `rules/role-charters.md` — Charters for `role-consultant-builder` + `role-consultant` (color teal, model sonnet)
- `rules/discovery-interview-protocol.md` — Binding Rule extended with second gate; new `§Consultant Build Step` documents build+peer-review sequence
- `rules/needs-input-protocol.md` — Added optional fields `question_class`, `user_only`, `consult_first`; CLARIFY action matrix delegates to new `§Consultant Layer`; new `§Defer Batch` flush rules; new `§Defer Batch Persistence` (state/defer-batch.json schema with full lifecycle table); new `§Consultant Anti-Loop`; extended general anti-loop with `question_class` granularity
- `rules/escalation.md` — `#16 CONSULTANT_REBUILD_REQUIRED` (relaxable), `#17 CONSULTANT_BUDGET_EXHAUSTED` (hard variant non-relaxable); relaxation policy lists updated
- `rules/role-strictness-protocol.md` — Peer-Review Matrix row `role-consultant-builder → role-ba`; `§Adversarial Review` extended with per-answer consultant safety-class trigger
- `rules/handoff-checkpoint-protocol.md` — 7th checkpoint trigger `consultant_built` (blocks DISCOVERY phase exit until written); new event in `§Events Emitted`
- `rules/communication-protocol.md` — `consultant`/`consultant-builder` role slugs registered; new `consultant-profile` artifact_type schema (singleton path, additional frontmatter fields, body sections, atomic-overwrite policy)
- `rules/context-isolation.md` — ACL templates for `role-consultant` (5 read paths — tightest scope in the system) and `role-consultant-builder` (9 read paths)

#### Templates
- `templates/role-verification-checklists.md` — bumped Checklist Version 2 → 3; new `#role-consultant-builder` section (13 self-check items including persona-domain match, list-size minimums, mode compliance, SAFETY-adjacent persona rules) with role-ba peer lens

#### Scripts extended
- `scripts/checkpoint.mjs` — Accept `--trigger consultant_built`; emit `consultant_built` event with payload `{consultant_profile_artifact_id, mode, peer_reviewer}`
- `scripts/burn-rate-watch.mjs` — Read optional `budget.consultant` block; emit second `[$] BURN consultant` line with soft/hard cap percentages + dispatch count; new alerts for cap reach and dispatch-overrun (CONSULTANT_BUDGET_EXHAUSTED candidate)
- `scripts/estimate-cost.mjs` — Compute consultant overhead (one-shot builder ~10k + 5 phases × ~15k × complexityMult); surface as `Consultant:` line in `[$] PRE-FLIGHT COST ESTIMATE` block
- `scripts/state-store.mjs` — `init()` now writes `state/role-acls.json` from new `DEFAULT_ROLE_ACLS` constant (12 existing roles + 2 consultant entries); `DEFAULT_BUDGET` includes `consultant` block with Q10 defaults
- `scripts/doctor.mjs` — 2 new health checks: `consultant_profile_freshness` (warns if brief mtime > profile mtime → patch/rebuild needed) and `consultant_acls_present` (verifies role-acls.json contains both consultant entries)

#### Behind the flag
All consultant behavior gated by `sc.config.json:consultant.enabled` (default true); set false for legacy CLARIFY→user behavior.

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

