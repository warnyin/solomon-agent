# Solomon Agent

> **One slash command launches a virtual company of 10 role-based agents that ship your idea autonomously.**

You type:
```
/sc:launch "build a SaaS appointment app for Thai barbershops"
```

Owner-CEO agent FIRST interviews you (3-5 clustered questions per round, up to 5 rounds — "human-brain doubt every assumption" mode per [`rules/discovery-interview-protocol.md`](rules/discovery-interview-protocol.md)) → decomposes → dispatches PM/BA/SA/TL/Dev/QA/DevSecOps/Security/Infra/ServiceDesk in parallel → escalates only on AMBIGUITY / DECISION_GATE / SAFETY / SCOPE_EXPLOSION / DEAD_END → delivers final report.

Type "ลุย" / "go" anytime during the interview to skip remaining questions and proceed with current confidence.

**Strictness:** every artifact must pass producer self-verification → peer review → owner phase-exit gate per [`rules/role-strictness-protocol.md`](rules/role-strictness-protocol.md) + [`templates/role-verification-checklists.md`](templates/role-verification-checklists.md). Safety-class artifacts also require adversarial review. Nothing ships unverified. Token cost ~2× baseline; ~2.5× for safety-class.

**Resumable hand-offs:** Owner-CEO writes a checkpoint after every role return, phase exit, feature complete, and 15-min heartbeat (per [`rules/handoff-checkpoint-protocol.md`](rules/handoff-checkpoint-protocol.md)). `/sc:resume` continues from latest checkpoint. Every role reads `state/role-state-board.json` and refuses dispatch unless it's their turn — no premature work.

**Knowledge Base + Codemap:** On every feature complete, the system auto-rebuilds:
- [`docs/kb/`](docs/kb/) — searchable index of every artifact (PRDs, designs, decisions, risks, glossary) per [`rules/knowledge-base-protocol.md`](rules/knowledge-base-protocol.md). Browse via `/sc:kb` or search `/sc:kb <query>`.
- [`docs/codemap/`](docs/codemap/) — table-of-contents of code (modules, entry points, dependencies, per-feature file lists) per [`rules/codemap-protocol.md`](rules/codemap-protocol.md). View via `/sc:codemap`.

## Install

```bash
/plugin marketplace add https://github.com/warnyin/solomon-agent
/plugin install solomon-agent@solomon-agent-marketplace
```

## Commands (14 total)

```bash
# === Meta (one command to rule them all) ===
/sc:do "<anything in plain language>"  # Smart router: reads state, classifies intent,
                                       # asks back if ambiguous, routes to the right command below.

# === Health / pre-flight ===
/sc:doctor [--verbose] [--fix]         # 15-check plugin + project health check (Round 17)

# === Project lifecycle ===
/sc:launch "<one-line goal>"          # Launch a new project (triggers Discovery Interview + cost pre-flight)
/sc:status                            # Live phase + active role + recent events
/sc:inject "<context/decision>"       # Push info to running orchestrator
/sc:abort                             # Graceful stop (state preserved)
/sc:replay <PHASE>                    # Re-run a phase with new context
/sc:resume                            # Continue from latest checkpoint (after session drop) — Round 14
/sc:failover                          # Swap to backup-owner (user-triggered)

# === Observability ===
/sc:cost-report                       # Per-role token/cost breakdown
/sc:stats                             # Cross-project success metrics
/sc:compact                           # Archive old artifacts + logs

# === Knowledge navigation (Round 14) ===
/sc:codemap [--rebuild] [--module X]  # View/rebuild code TOC (docs/codemap/)
/sc:kb [<query>] [--by-phase|role|type]  # Browse/search artifact KB (docs/kb/)
```

See [`commands/`](commands/) for each command's full spec.

## Cost Transparency (Round 16)

- **Pre-flight estimate** before every `/sc:launch` — see [`rules/cost-transparency-protocol.md`](rules/cost-transparency-protocol.md)
- **Mid-flight burn alerts** at every checkpoint (50%/80%/95% thresholds + 3× spike detector)
- **Per-feature retrospective** in HANDOFF report — calibrates heuristic for next project

## Open-Source

- [SECURITY.md](SECURITY.md) — vulnerability disclosure
- [docs/telemetry-policy.md](docs/telemetry-policy.md) — zero-default-telemetry stance
- [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) — bug + feature request forms
- [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) — strictness checklist

## Extending (Round 20)

- [docs/extending-add-role.md](docs/extending-add-role.md) — add a specialized role agent
- [docs/extending-add-command.md](docs/extending-add-command.md) — add a `/sc:*` command
- [docs/extending-add-skill.md](docs/extending-add-skill.md) — add a cognitive skill

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full lifecycle diagram and state machine.

**Lifecycle**: DISCOVERY → DESIGN → BUILD → VERIFY → HANDOFF (+ project-type-specific phases)

**Roles**: see [`docs/roles.md`](docs/roles.md)

**Escalation rules**: see [`docs/escalation-rules.md`](docs/escalation-rules.md)

**v0.1 limits**: see [`docs/architecture.md#v01-limitations`](docs/architecture.md)

## Configuration

Optional `sc.config.json` at project root — see [`docs/configuration.md`](docs/configuration.md).

## Status

**v0.1** — initial release. Single-operator. No web UI. No cross-LLM portability. No auto-PR.

## License

MIT. Built for Claude Code community.

## Acknowledgments

Reference architecture: [affaan-m/ECC](https://github.com/affaan-m/ECC) v2.0 (plugin layout). Prior-art reviewed: [mbruhler/claude-orchestration](https://github.com/mbruhler/claude-orchestration), [bobmatnyc/claude-mpm](https://github.com/bobmatnyc/claude-mpm), [josephneumann/claude-corps](https://github.com/josephneumann/claude-corps), [suxxes/resin.ai](https://github.com/suxxes/resin.ai), [barkain/claude-code-workflow-orchestration](https://github.com/barkain/claude-code-workflow-orchestration).
