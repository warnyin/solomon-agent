---
description: Launch a virtual company of 10 role-based agents (CEO + PM/BA/SA/TL/Dev/QA/DevSecOps/Security/Infra/ServiceDesk) to ship your idea autonomously. Owner-CEO orchestrates DISCOVERY→DESIGN→BUILD→VERIFY→HANDOFF lifecycle; halts only on declared escalation conditions.
argument-hint: "<one-line requirement | path/to/requirement.md>"
---

# /solomon-agent:launch

You are the `/solomon-agent:launch` command runner — a thin entrypoint, NOT the orchestrator. Your job:

## 1. Pre-flight (mandatory)

1. **Check lock**: if `state/lock` exists and `state/project.json:status != "complete"` → escalate `MULTI_USER_LOCK` (per `rules/escalation.md` §8); do NOT proceed without `--force-takeover` flag in `$ARGUMENTS`
2. **Check completed prior run**: if `state/project.json:status == "complete"` → prompt user: archive (move to `state/archive/<project_id>/`) / append (new project_id, share state/) / cancel
3. **Sanitize input**: pipe `$ARGUMENTS` through `node ${CLAUDE_PLUGIN_ROOT}/scripts/sanitize-input.mjs`. If injection patterns detected → escalate `INJECTION_DETECTED`. Sanitized output wrapped in `<USER_REQUIREMENT>...</USER_REQUIREMENT>`
4. **Parse flag**: if `$ARGUMENTS` starts with `--force-takeover ` → strip flag, set `force_takeover=true`
5. **Resolve requirement**: if remaining `$ARGUMENTS` is a file path that exists → Read it; else treat as inline text

## 1.5. Cost pre-flight (Round 16, mandatory)

Per `rules/cost-transparency-protocol.md`. Run via Bash:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/estimate-cost.mjs" --goal "<sanitized requirement>" --features 1
```

The script writes `state/cost-estimate.json` and prints a `[$] PRE-FLIGHT COST ESTIMATE` block. Surface that block verbatim to user.

Then prompt:
```
Proceed? [y/n/budget=<usd>]
```

- `y` → continue to Step 2
- `n` → exit cleanly, no state created
- `budget=X` → record budget cap = $X; if X < estimate.bands.low → refuse (suggest scope reduction); else continue

Bypass: `sc.config.json: {"cost_transparency": {"preflight": false}}` skips this step (logged as Decision).

## 2. Initialize state

Run via Bash:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/state-store.mjs" init \
  --goal "<sanitized requirement>" \
  --project-id "$(node ${CLAUDE_PLUGIN_ROOT}/scripts/lib/ulid.mjs)" \
  --sc-version "0.1.0"
```

This creates: `state/project.json` (phase=DISCOVERY), `state/budget.json` (defaults from `sc.config.json` if present), `state/session.key` (HMAC random, umask 600), `state/dispatch-stack.json` (empty), `state/role-acls.json` (from project_type template; brownfield ACL widening at DISCOVERY exit).

## 3. Load bootstrap summary (if resuming)

If `state/bootstrap-summary.md` exists (written by `session-bootstrap.mjs` SessionStart hook), Read it. Otherwise this section is empty.

## 4. Dispatch owner-ceo

Invoke the orchestrator via the Agent tool:

```
Agent({
  subagent_type: "owner-ceo",
  description: "Orchestrate project launch end-to-end",
  prompt: `
<USER_REQUIREMENT>
{{sanitized_requirement}}
</USER_REQUIREMENT>

<RESUME_CONTEXT>
{{contents of state/bootstrap-summary.md or empty}}
</RESUME_CONTEXT>

state_dir: ${CLAUDE_PLUGIN_ROOT}/state (or project-local — check sc.config.json)
escalation_rules: ${CLAUDE_PLUGIN_ROOT}/rules/escalation.md
charters: ${CLAUDE_PLUGIN_ROOT}/rules/role-charters.md

Begin DISCOVERY phase per your charter (agents/owner-ceo.md).
`
})
```

## 5. Do NOT do orchestration yourself

This command body is delegation-only. All decomposition, role dispatch, conflict resolution, escalation handling, phase transitions, and final reporting belong to `owner-ceo`. Why: same logic must be reusable from `/solomon-agent:replay` and `/solomon-agent:inject`.

## 6. On owner return

- **First turn ALWAYS opens with `[BLUE] DISCOVERY INTERVIEW`** — owner-ceo interviews the user to fill `state/artifacts/discovery-brief.md` (per `rules/discovery-interview-protocol.md`) BEFORE any role dispatch. User answers → next round → stops at confidence ≥ 0.85, user says "ลุย", or 5 rounds. To skip entirely: `sc.config.json:discovery_interview.skip = true` (not recommended).
- If owner completed → final report at `state/artifacts/final-report.md`; show Executive Summary section
- If owner escalated → escalation block already surfaced; user replies; owner-ceo can be re-invoked via `/solomon-agent:inject` or `/solomon-agent:replay`
- If owner crashed → suggest `/solomon-agent:failover` (Round 6 Gap #89)

## v0.1 limits referenced

- No automated owner liveness monitoring (user invokes `/solomon-agent:failover` manually)
- No determinism guarantee — only structural reproducibility (Round 7 Gap #95)
- Budget tracking degrades to char-heuristic if Claude Code does not surface child token usage (Round 7 Gap #94)
- Write-path enforcement is best-effort, not adversarial (Round 8 Gap #97)
