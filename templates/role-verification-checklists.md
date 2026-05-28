# Role Verification Checklists

> Binding source: `rules/role-strictness-protocol.md`. Every role MUST run its `#<role>` checklist before declaring `status: ready_for_review`. Peer reviewer uses SAME checklist with verification lens. Items marked `[SAFETY]` cannot be waived.

**Checklist Version:** 3
**Schema:** each item has `(id: snake_case_id)` for traceability into `signed_off_by[].passed_items[]` / `failed_items[]`.

---

## Common to ALL role checklists (applied to every artifact)

> Source: `skills/creative-security-mindset`. Every per-role checklist below INHERITS these two items in addition to its own. Producer MUST include both in `signed_off_by[].passed_items[]` or in `failed_items[]` with reason.

- [ ] (id: creative_alternatives_explored) `[SAFETY-adjacent]` Artifact contains `## Alternatives Considered` with ≥ 3 distinct options (or explicit skip-reason for trivial/locked/ADR-deferred cases). At least one alternative evaluated through security lens. Chosen option's rationale stated.
- [ ] (id: security_threat_lens_applied) `[SAFETY]` STRIDE applied (Spoofing/Tampering/Repudiation/Info-disclosure/DoS/Elevation) to each component / endpoint / data flow in artifact. Assume-hostile-input + fail-closed + least-privilege + no-secrets-in-text defaults observed. New attack surface (if any) listed in `## Security Note` with mitigations + residual risk + owner.
- [ ] (id: handoff_section_present) `[SAFETY-adjacent]` Artifact body ends with `## Handoff` section per `templates/handoff-card.md` — covering what-i-did, state, what-i-read, what-happens-next, resume-hint, broadcast. Enables /solomon-agent:resume after session drop.

**Peer reviewer extra lens (every peer):** Did producer include obviously-bad straw-man alternatives to pad the count? Did STRIDE coverage skip any data flow that crosses a trust boundary? Were security claims actually demonstrated, or just asserted?

---

## role-pm

Producer self-check before shipping `prd` artifact:

- [ ] (id: goal_one_sentence) Goal stated in ≤1 sentence, no compound "and"
- [ ] (id: users_named) Each user persona named with role + technical level + locale
- [ ] (id: scope_in_explicit) `## Scope` lists what IS in v0.1 (no "etc.")
- [ ] (id: non_goals_explicit) `## Non-Goals` lists what is explicitly OUT — minimum 3 items
- [ ] (id: success_metrics_measurable) Each metric is measurable + has a target + has a time horizon (30d / 90d)
- [ ] (id: user_stories_acceptance_test) Each user story has a concrete pass/fail test, not "works correctly"
- [ ] (id: story_count_realistic) Stories count ≤ realistic for stated timeline (no 50 stories for 1-week MVP)
- [ ] (id: ambiguity_flagged) Any term with 2+ valid interpretations is marked `[AMBIGUOUS]` or escalated
- [ ] (id: brief_alignment) PRD does not contradict `discovery-brief.md` (each diff explained in `## Decisions`)
- [ ] (id: anti_scope_inherited) Anti-scope from brief is preserved (not silently dropped)

**Peer (role-ba) lens:** does each user story map to a domain entity? Are there hidden stakeholders the PM missed?

---

## role-ba

Producer self-check before shipping `domain-model` artifact:

- [ ] (id: glossary_complete) Every domain term used in artifacts appears in `## Glossary` with one-sentence definition
- [ ] (id: entities_named) Each entity has name + attributes + lifecycle states
- [ ] (id: relationships_cardinality) Every relationship has cardinality (1:1, 1:N, N:M) AND ownership
- [ ] (id: project_type_justified) `project_type_classification` matches `rules/project-templates.md` enum with rationale
- [ ] (id: language_detected_explicit) `language_detected` recorded; if mixed → primary + secondary noted
- [ ] (id: invariants_listed) Domain invariants listed (e.g., "appointment cannot overlap")
- [ ] (id: edge_cases_covered) `## Edge Cases` enumerates: empty, max-scale, concurrent, malformed input
- [ ] (id: external_systems_mapped) Every external dependency (API, DB, queue) has source + auth model + failure mode
- [ ] (id: market_context_cited) If market claim made → source URL + access date
- [ ] (id: pm_questions_answered) Every `[AMBIGUOUS]` from PRD has a BA resolution OR an escalation

**Peer (role-pm) lens:** is the domain model rich enough to write tests against? Any entity invented that wasn't in the brief?

---

## role-sa

Producer self-check before shipping `design` artifact:

- [ ] (id: components_named) Each component has name + responsibility (one sentence) + owner
- [ ] (id: data_flow_complete) Data flow covers happy + at least 2 error paths
- [ ] (id: integration_points_listed) Every external integration has: protocol + auth + rate-limit + failure-mode
- [ ] (id: decisions_recorded_adr) `## Key Decisions` uses ADR format: context, decision, alternatives, consequences
- [ ] (id: alternatives_considered) Each decision lists ≥ 2 alternatives evaluated
- [ ] (id: threat_surface_noted) `[SAFETY]` Threat surface high-level called out (auth boundary, data egress, trust zone)
- [ ] (id: scalability_target) Stated user-count + traffic envelope; design choices justified against it
- [ ] (id: cost_estimate_rough) Rough monthly cost estimate (cloud / API spend) with bands (low/mid/high)
- [ ] (id: open_questions_explicit) Unresolved questions in `## Open Questions` — not left to chance
- [ ] (id: pm_ba_alignment) Design solves the PRD's user stories; no orphan components

**Peer (role-tech-lead) lens:** is this implementable in the tech-plan budget? Any component handwaving over real complexity?

---

## role-tech-lead

Producer self-check before shipping `tech-plan` artifact:

- [ ] (id: modules_breakdown) Modules listed with: name + responsibility + estimated LOC band + test strategy
- [ ] (id: tech_stack_versions) Every chosen lib/framework has pinned version + license check
- [ ] (id: conventions_stated) Naming, error-handling, logging, async patterns documented
- [ ] (id: build_plan_ordered) Build order respects dependencies (no cycle)
- [ ] (id: code_map_brownfield) `[SAFETY]` For brownfield: code-map artifact exists + delta from existing code stated
- [ ] (id: standards_inherits_repo) For brownfield: convention matches existing repo (no surprise style)
- [ ] (id: parallel_safety) If BUILD parallel: modules can compile/test independently (no shared mutable state)
- [ ] (id: rollback_plan_per_module) Each module has rollback strategy (feature flag, revert script, etc.)
- [ ] (id: dep_supply_chain_clean) `[SAFETY]` No dep with known CVE in `npm audit` / `pip audit` / equivalent
- [ ] (id: design_alignment) Plan implements `design` artifact without architectural drift

**Peer (role-sa) lens:** does the breakdown preserve architectural intent? Any abstraction the TL added that doesn't trace to design?

---

## role-developer

Producer self-check before shipping `code` artifact:

- [ ] (id: changes_list_files) `## Changes` lists every file touched + summary of why
- [ ] (id: unit_tests_present) Every public function has ≥ 1 unit test
- [ ] (id: tests_pass) `## Test Status` shows GREEN; no skipped tests undocumented
- [ ] (id: lint_clean) Project linter run; zero errors
- [ ] (id: type_check_clean) Type checker run (where applicable); zero errors
- [ ] (id: no_secrets_committed) `[SAFETY]` No API keys, tokens, credentials in diff (grep + pattern match)
- [ ] (id: no_console_debug) No leftover `console.log` / `print()` / `dbg!` outside tests
- [ ] (id: error_handling_explicit) Every error path returns an explicit error type; no silent swallows
- [ ] (id: input_validation) `[SAFETY]` All external input (user, API, file) validated at boundary
- [ ] (id: self_review_notes) `## Self-Review Notes` records 1+ tradeoff or known limitation
- [ ] (id: tech_plan_followed) Code structure matches `tech-plan`'s module breakdown
- [ ] (id: no_unauth_git) `[SAFETY]` No `git push`, `git push --force`, `git rebase -i`, `git reset --hard` (per charter)
- [ ] (id: ecc_code_review_run) ECC `code-review` skill run; findings addressed or noted
- [ ] (id: complexity_under_limit) No function > 50 lines, no file > 800 lines, no nesting > 4 levels

**Peer (role-qa + role-security) lens:** QA — are tests realistic, not over-mocked? Security — any obvious injection / auth-bypass / SSRF?

---

## role-qa

Producer self-check before shipping `test-plan` / `test-report` artifact:

- [ ] (id: coverage_target_stated) Coverage target declared per module (default 80%)
- [ ] (id: coverage_achieved_reported) Actual coverage measured + reported per module
- [ ] (id: test_pyramid_balanced) Unit + integration + e2e ratio reasonable (not all unit, not all e2e)
- [ ] (id: edge_cases_tested) Empty, max, concurrent, malformed, network-fail cases covered
- [ ] (id: regression_seeded) Prior bugs (from memory/Lesson entities) have regression tests
- [ ] (id: tests_independent) Tests can run in any order (no shared mutable fixtures)
- [ ] (id: no_overmock) Mocks limited to true external boundaries; not mocking own code
- [ ] (id: failure_clarity) `## Failures` lists each fail with: input, expected, actual, suspected cause
- [ ] (id: recommendation_actionable) `## Recommendation` is concrete (file:line) — not "improve coverage"
- [ ] (id: flaky_tests_quarantined) Any test flagged flaky is quarantined + ticket noted

**Peer (role-developer) lens:** are these tests realistic? Would a real failure trigger them?

---

## role-devsecops

Producer self-check before shipping `pipeline` artifact:

- [ ] (id: stages_explicit) `## Stages` lists each CI/CD stage with: inputs, outputs, gate criteria
- [ ] (id: gates_block_on_failure) Every gate explicitly blocks on failure (no advisory-only on critical gates)
- [ ] (id: secrets_via_vault) `[SAFETY]` No secrets in pipeline YAML / env exports; vault/secret-manager referenced
- [ ] (id: rollback_documented) Rollback procedure per stage with exact commands
- [ ] (id: artifact_retention) Build artifacts retention policy stated
- [ ] (id: notification_paths) Failure notification routes defined (Slack/email/PD with explicit channel)
- [ ] (id: pinned_action_versions) `[SAFETY]` Every CI action / image pinned by SHA, not floating tag
- [ ] (id: minimal_permissions) `[SAFETY]` Pipeline tokens use least-privilege scope
- [ ] (id: drift_detection) IaC drift detection scheduled or noted
- [ ] (id: infra_aligned) Pipeline matches `infra-plan` topology; no surprise resources

**Peer (role-infra + role-security) lens:** does the pipeline deploy what infra planned? Does it leak any secret or use over-broad creds?

---

## role-security

Producer self-check before shipping `security-audit` / `threat-model` artifact:

- [ ] (id: threats_stride) `[SAFETY]` Threats enumerated using STRIDE per component
- [ ] (id: findings_severity) Each finding has severity (CRITICAL/HIGH/MED/LOW) + CVSS or rationale
- [ ] (id: dependency_scan_run) `[SAFETY]` SCA tool run; results attached
- [ ] (id: secret_scan_run) `[SAFETY]` Secret scanner run on full source + history
- [ ] (id: mitigations_actionable) Every CRITICAL/HIGH has a concrete mitigation (file:line)
- [ ] (id: residual_risk_owned) Residual risks have an owner + acceptance signature requirement
- [ ] (id: data_classification_mapped) `[SAFETY]` Each data store mapped to `rules/data-classification.md` class
- [ ] (id: compliance_checked) Compliance frameworks (PDPA/GDPR/HIPAA/etc per brief) addressed item-by-item
- [ ] (id: owasp_top10) Each OWASP Top 10 risk has explicit check or N/A justification
- [ ] (id: pen_test_plan) `## Pen-Test Plan` lists attack scenarios + acceptance criteria

**Peer (role-tech-lead) lens:** are mitigations actually implementable in the stack? Any compliance claim that requires infra change not in plan?

---

## role-infra

Producer self-check before shipping `infra` artifact:

- [ ] (id: hosts_explicit) `## Hosts` lists each runtime host with: size, region, count
- [ ] (id: scaling_rules_concrete) Auto-scale triggers + thresholds + cooldowns specified
- [ ] (id: observability_stack) Logs + metrics + traces destinations named + retention stated
- [ ] (id: capacity_vs_target) Capacity sized for `success_metrics` traffic (not under, not 100×over)
- [ ] (id: ha_topology) High-availability needs from PRD addressed (multi-AZ, failover, RTO/RPO)
- [ ] (id: cost_band_stated) Monthly cost band (low/mid/high) stated with assumptions
- [ ] (id: network_security) `[SAFETY]` VPC, SG, firewall, ingress/egress documented; no 0.0.0.0/0 on sensitive ports
- [ ] (id: data_residency) `[SAFETY]` Data residency matches compliance from brief
- [ ] (id: backup_strategy) `[SAFETY]` Backup cadence + retention + restore procedure tested
- [ ] (id: disaster_recovery) DR plan with RTO/RPO numbers

**Peer (role-devsecops) lens:** can the pipeline actually deploy to this topology with stated permissions?

---

## role-service-desk

Producer self-check before shipping `runbook` artifact + exec summary text:

- [ ] (id: overview_audience_aware) `## Overview` written for stated audience (ops / on-call / exec)
- [ ] (id: procedures_step_by_step) Each procedure has numbered steps with exact commands
- [ ] (id: failure_modes_listed) Top 5+ failure modes with: symptom + diagnosis + recovery
- [ ] (id: contact_chain) Contact escalation chain with names / roles / response SLA
- [ ] (id: smoke_tests_listed) Post-deploy smoke tests with pass/fail criteria
- [ ] (id: rollback_procedure) Rollback steps from runbook match devsecops pipeline rollback
- [ ] (id: links_resolve) All links to other artifacts/dashboards/docs resolve
- [ ] (id: exec_summary_truthful) Exec summary makes NO claim absent from underlying artifacts (no invention)
- [ ] (id: known_limits_disclosed) v0.1 limits / waivers / risks disclosed honestly
- [ ] (id: prd_alignment) Deliverables described match `prd` user stories

**Peer (role-pm) lens:** does the runbook describe what was actually built, or an idealized version? Are exec claims defensible against the PRD?

---

## role-consultant-builder

Producer self-check before shipping `consultant-profile` artifact:

- [ ] (id: identity_domain_specific) `identity.title` is domain-specific (e.g., "Senior Service-Industry Operations Consultant"), not a generic "Product Consultant" / "Tech Advisor"
- [ ] (id: years_experience_in_band) `identity.years_experience` is integer 8-20 (lower = lacks gravitas, higher = loses plausibility)
- [ ] (id: prior_work_min_3) `identity.prior_work[]` has 3-5 sector-plausible engagements (no claims about real people; composites only)
- [ ] (id: expertise_split_named) `expertise.primary[]` has 3-5 entries AND `expertise.secondary[]` has 2-5 entries, all related to brief's domain
- [ ] (id: outside_scope_min_3) `outside_scope[]` has ≥ 3 entries covering binding business decisions (payment provider, brand, legal, pricing, hiring, or brief's `anti_scope[]`)
- [ ] (id: knowledge_frames_min_5) `knowledge_frames[]` has ≥ 5 entries; each `derived_from[]` points to actual paths in `discovery-brief.md` (no invented frames)
- [ ] (id: domain_analogs_eq_3) `domain_analogs[]` has exactly 3 entries with `similarity` + `difference` per entry; analog names are well-known (or from brief's references) — not invented companies
- [ ] (id: voice_style_complete) `voice_style` has all three fields filled: `tone`, `uncertainty_phrase`, `refusal_phrase`
- [ ] (id: narrative_200_to_300_words) Narrative body below frontmatter is 200-300 words; covers training/background, engagement types, philosophy, communication style
- [ ] (id: no_real_persons) `[SAFETY-adjacent]` No claims about real living people or specific company employees; personas are composites
- [ ] (id: no_behavior_overrides) Profile does NOT contain instructions to `role-consultant` beyond persona (no rules / no Method changes — those live in `agents/role-consultant.md`)
- [ ] (id: brief_confidence_floor) If `confidence.overall < 0.5` → escalated `BRIEF_INSUFFICIENT` instead of attempting build
- [ ] (id: mode_compliance) For `mode=patch`: identity.title + years_experience preserved; for `mode=rebuild`: includes `## Pivot Note` body section with diff vs prior persona

**Peer (role-ba) lens:** does the persona actually match the brief's WHO + project_type + WHY? Are the `outside_scope[]` entries the things only the user/business can decide? Are the `knowledge_frames` accurate distillations or hallucinated additions?

---

## owner-ceo (meta — phase exit checklist)

Owner self-check before transitioning `phase_n → phase_n+1`:

- [ ] (id: required_artifacts_present) All `rules/project-templates.md` required artifacts exist
- [ ] (id: all_self_signed) Every required artifact has `signed_off_by[level:self]`
- [ ] (id: all_peer_signed) Every required artifact has `signed_off_by[level:peer]`
- [ ] (id: safety_class_adversarial) Every safety-class artifact has `signed_off_by[level:adversarial]`
- [ ] (id: no_open_failed_items) No `failed_items[]` open without active waiver
- [ ] (id: no_open_escalations) `state/project.json:pending_escalations[]` is empty
- [ ] (id: no_dead_end_unresolved) No `## Needs-Input` with `status: open` from any role
- [ ] (id: budget_within_band) Token spend < soft budget OR escalation acknowledged
- [ ] (id: events_hmac_verified) `verify-log.mjs` exits clean (audit chain intact)
- [ ] (id: conflict_resolutions_logged) Every arbiter decision (per `conflict-resolution.md`) logged as `Decision` entity

Owner self sign-off at phase exit recorded as `signed_off_by[]` entry on phase-exit summary artifact (synthesized, ULID assigned).

---

## Versioning

When checklist items are added/removed/renamed, increment `Checklist Version` at top of this file. Roles MUST refuse sign-off if their stored `checklist_version` differs from current — owner-ceo escalates `DEPENDENCY_VERSION_MISMATCH` (per `rules/escalation.md` §12).

## How to use during dispatch

Owner-ceo dispatch prompt (per role) MUST include:

```
verification_checklist: templates/role-verification-checklists.md#<role-name>
checklist_version_expected: 1
```

Role agent loads the section, runs each item against own output, populates `signed_off_by[]`, sets `status: ready_for_review`, writes via `state-store.writeArtifact()`.
