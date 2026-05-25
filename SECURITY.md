# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ Active development |
| < 0.1 | ❌ Not supported |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Email: **security@warnyin.example** (replace with maintainer email after fork)

Or use GitHub's private security advisory:
1. Go to https://github.com/warnyin/solomon-agent/security/advisories
2. Click "Report a vulnerability"
3. Fill out the form

### What to include
- Description of the vulnerability
- Steps to reproduce (synthetic data only; never real secrets)
- Affected files / commands / scripts
- Suggested fix (optional)

### Response timeline (best-effort, community project)
- 24-72 hours: acknowledgement
- 7 days: initial assessment + severity rating
- 30 days: fix released for CRITICAL/HIGH
- 90 days: fix released for MEDIUM/LOW

## Threat Model — In Scope (per `docs/security-model.md`)

- Accidental leakage (HMAC chain + secret-pattern hooks)
- Path traversal (`guard-isolation.mjs`)
- Injection in `<USER_REQUIREMENT>` (`sanitize-input.mjs`)
- Budget runaway (`guard-budget.mjs` + Round 16 burn-rate alerts)
- Premature dispatch (Round 14 role-state-board discipline)

## Threat Model — OUT of Scope

- Filesystem-level attackers (root on operator's machine)
- LLM jailbreaks bypassing Prompt Defense Baseline
- Supply-chain compromise of Claude Code itself or upstream MCPs
- Compromised `session.key` mid-project (project becomes unrecoverable)
- Multi-host concurrent operators on same project (single-host lock only)

## Hall of Fame

| Reporter | Issue | Severity | Fixed in |
|---|---|---|---|
| — | (empty) | — | — |

## Hardening Recommendations for Operators

- Pin plugin version in marketplace config; review before upgrade
- Run `/solomon-agent:doctor` before every `/solomon-agent:launch`
- Don't commit `state/session.key` to git (already in `.gitignore`)
- Set `sc.config.json:strictness.skip_adversarial: false` (default) for safety-class work
- Limit ECC + MCP allow-list per role via `state/role-acls.json` to least-privilege
