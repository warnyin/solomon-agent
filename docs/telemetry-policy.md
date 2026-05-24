# Telemetry Policy

> Round 19: explicit position on what Solomon Agent collects, where it lives, and how to opt out.

## TL;DR

**Solomon Agent v0.1 collects ZERO telemetry by default.** Every file written stays on your machine in `state/` or `docs/`. Nothing is sent to Anthropic, the marketplace, or any third party by this plugin itself.

Claude Code (the host CLI) has its own telemetry policy — see https://docs.claude.com/en/docs/claude-code. Anthropic's API has its own — see https://www.anthropic.com/legal/privacy.

## What lives where

| Data | Location | Sent off-machine? |
|---|---|---|
| Project goal + artifacts | `state/artifacts/*.md` | No |
| Phase/role state | `state/project.json`, `state/role-state-board.json`, `state/checkpoints/*.json` | No |
| Event log | `state/events.ndjson` | No |
| Budget / burn-rate | `state/budget.json`, `state/burn-rate.ndjson` | No |
| Session HMAC key | `state/session.key` | No (umask 600 local file) |
| Code map | `docs/codemap/*` | No |
| Knowledge base | `docs/kb/*` | No |
| Memory MCP entries | Wherever your memory MCP stores them | Depends on MCP — usually local |
| Tokens sent to LLM | Anthropic API per Claude Code | YES — sent to Anthropic |
| Errors caught by hooks | `state/hook-errors.log` | No |

## What is sent to Anthropic (via Claude Code, not by sc)

The LLM needs your prompts + tool calls + tool results to produce responses. This includes:
- Your `<USER_REQUIREMENT>` text
- Artifact bodies role agents read
- Role dispatch prompts owner-ceo constructs
- Conversation messages

This is inherent to using any LLM. Solomon Agent does NOT add any additional outbound calls.

## What is NEVER sent by sc itself

- File paths from your machine (beyond what's in artifacts you choose to write)
- Environment variables
- Git history
- System fingerprint / OS / hostname
- Any analytics ping

## Opt-out / control

- Run fully air-gapped against a local model: point Claude Code at a local LLM endpoint; sc has no network calls of its own
- Restrict memory MCP: if your memory MCP syncs anywhere, configure it directly per its docs (sc does not control this)
- Redact before commit: `state/` is in `.gitignore` by default; never commit it
- Audit: `node scripts/verify-log.mjs` confirms event chain integrity; `grep -r "fetch\|http" scripts/` confirms no outbound HTTP

## Future telemetry (v0.2+, opt-in only)

If a future version adds telemetry (e.g. for crash reporting, usage analytics for prioritization):

1. It will be opt-in only (default `disabled`)
2. Toggled via `sc.config.json: {"telemetry": {"enabled": true, "endpoint": "..."}}`
3. Documented exactly what fields are sent
4. PII-redacted by `scripts/sanitize-input.mjs` before send
5. Disclosed in CHANGELOG and this document before release

We will NEVER:
- Enable telemetry without explicit user action
- Send artifact bodies, code, or user prompts
- Send anything to undisclosed third parties
- Use telemetry for non-improvement purposes (advertising, profiling, etc.)

## Compliance notes (your responsibility)

If you operate sc against data subject to compliance regimes (PDPA / GDPR / HIPAA / PCI / SOC2):
- `state/artifacts/*` may contain regulated data — manage retention per your policy
- Memory MCP entries may persist across projects — review your MCP's compliance posture
- `role-security` checklist item `data_classification_mapped` enforces tagging at intake
- `rules/data-classification.md` defines sc's classification taxonomy

sc itself does not certify any compliance framework — but it gives you the surfaces to maintain compliance.

## Reporting telemetry concerns

If you discover sc making an unexpected network call, treat as security issue per `SECURITY.md`.
