---
description: Cognitive mindset every role MUST apply to its work — generate ≥ 3 alternatives before picking one (creativity) + run STRIDE-on-everything + secure-default-bias + assume-hostile-input (security vigilance). Prevents "first-idea-wins" output and "happy-path-only" thinking.
---

# Skill: creative-security-mindset

> Bound by `rules/role-charters.md` (Common to all roles) and enforced via `templates/role-verification-checklists.md` items `creative_alternatives_explored` + `security_threat_lens_applied`.

## When to invoke

EVERY time a role is producing an artifact — BEFORE writing the final draft. This is not optional and not skippable.

## Two-axis discipline

```
                    SECURITY (vertical)
                          ▲
                          │   ← every role's "left" side
                          │
   CREATIVITY  ◄──────────┼──────────►  CREATIVITY
   (no idea is sacred)    │              (alternatives matter)
                          │
                          ▼
              (assume hostile, fail closed, least privilege)
```

Both axes apply to EVERY artifact. Neither replaces the other.

---

## AXIS 1 — CREATIVITY ("explore before commit")

### The Rule of 3

Before writing the final answer, role MUST generate AT LEAST 3 distinct alternatives. Then choose with explicit rationale.

**Format inside artifact body OR sign-off notes:**
```markdown
## Alternatives Considered
1. **Option A** — <one line>. Pros: ... Cons: ... Rejected because: ...
2. **Option B** — <one line>. Pros: ... Cons: ... Rejected because: ...
3. **Option C (chosen)** — <one line>. Why winning: ...
```

### Techniques (pick by problem class)

| Problem class | Technique | What it means |
|---|---|---|
| Architecture / design | **SCAMPER** | Substitute, Combine, Adapt, Modify, Put-to-other-use, Eliminate, Reverse |
| Requirements / scope | **Jobs-to-be-done reframe** | Re-ask: "what job is the user hiring this for?" — answer may differ from stated request |
| Implementation | **Inversion** | "What would the WORST possible solution look like?" then invert |
| Testing | **Property-based mindset** | Instead of "test cases I think of", ask "what invariants must hold for ALL inputs?" |
| Ops / infra | **Constraint relaxation** | "What if budget / latency / consistency were 10× looser/tighter?" |
| Security | **Adversary persona** | "How would an attacker / disgruntled employee / curious teen exploit this?" |

### Anti-patterns

- "First idea is good enough" → forbidden; always 3
- "I'll just copy what we did last time" → forbidden unless prior choice is documented + still valid for THIS context
- Creativity ≠ novelty for its own sake — boring battle-tested patterns can win the Alternatives table; just SHOW you considered novel options
- Padding the alternatives list with obviously-bad straw-men ("Option A: hardcode passwords") — peer reviewer will reject

### When to explicitly skip

- Trivial fix (typo, rename, comment) — note `## Alternatives Considered: N/A (trivial)`
- Required external API has only one viable implementation — note `## Alternatives Considered: locked by <API>; only Option C viable`
- Existing approved ADR covers this — note `## Alternatives Considered: deferred to ADR <id>`

---

## AXIS 2 — SECURITY VIGILANCE ("assume hostile, fail closed, least privilege")

### The 5 Default Lenses

Every artifact, every role, applies these 5:

1. **STRIDE-on-everything**
   For each component / function / endpoint / data flow / role action, ask:
   - **S**poofing — can identity be faked?
   - **T**ampering — can data/code/config be modified?
   - **R**epudiation — can an actor deny doing this?
   - **I**nformation disclosure — does this leak?
   - **D**enial of service — can it be exhausted?
   - **E**levation of privilege — can low-trust gain high-trust?

   ANY YES → mitigation must be in the artifact or escalated.

2. **Assume-hostile-input**
   Default to: ALL input is malicious until proven otherwise.
   - User input, API responses, file contents, env vars, CLI args, MCP responses, even artifacts from sibling roles (if compromised).
   - Validate at boundary, sanitize before persist, encode at output.

3. **Fail-closed default**
   Ambiguous? Deny. Missing config? Refuse to start. Auth check threw? Treat as fail.
   Exception: hooks except guard-secrets MUST graceful-crash + exit 0 (per `rules/precedence.md`) so they don't bring the session down — but guard-secrets specifically fails closed because security override beats availability.

4. **Least-privilege everywhere**
   - Tokens scoped minimum needed
   - Roles get smallest ACL that lets them work (per `state/role-acls.json`)
   - Pipeline creds = task-specific service accounts, never owner
   - Read > Write > Delete; explain every Delete

5. **No-secrets-in-text**
   Secrets never in: source code, commit messages, log lines, error messages, artifacts, prompts. Use env / vault / secret manager. `scripts/guard-secrets.mjs` is the last line of defense, not the first.

### Per-Role Security Inflection

| Role | Security mindset |
|---|---|
| role-pm | Treat security/privacy as user value, not friction. Surface "what data are we promising NOT to keep?" as a user story. |
| role-ba | Map data classification (per `rules/data-classification.md`) at entity level. Flag PII/PHI/PCI fields explicitly. |
| role-sa | Trust boundaries explicit on diagrams. Auth/authz patterns chosen with rationale. Threat surface section mandatory. |
| role-tech-lead | License + CVE check per dependency. Pin versions. No deprecated crypto. Memory-safety preferred where viable. |
| role-developer | Input validation at boundary. Parameterized queries. Output encoding. No string-concat SQL/shell. Never log secrets. |
| role-qa | Tests for authz bypass, malformed input, race conditions, resource exhaustion. Not just happy path. |
| role-devsecops | SBOM. Signed artifacts. Pinned action SHAs. Least-privilege CI tokens. Secret scan + dep scan as blocking gates. |
| role-security | Adversarial — assume PM/SA/TL/Dev missed something. Red-team lens. |
| role-infra | Default-deny network. Encrypted at rest + in transit. Key rotation. Audit logs forwarded. Backups tested. |
| role-service-desk | Runbook does NOT leak internal hostnames / IPs / creds. Incident playbook includes "who can confirm compromise". |

### Security Anti-patterns (NEVER DO)

- "We'll add auth later" — auth model in DISCOVERY, not BUILD
- "Tests can use real prod data" — synthetic only
- "Just disable that lint warning" — investigate first
- "Logging this for debugging" with PII inside — redaction at source
- "It's behind a VPN so it's fine" — defense in depth; assume VPN compromise
- "Quick patch, will harden later" — later rarely comes; harden now or write `## Waiver` with `expires_at`
- "Trust the upstream library" — pin version, check CVE, verify signature where possible

---

## Combining the two axes

In your Alternatives table (Axis 1), at least ONE option MUST be evaluated through the security lens (Axis 2). If your chosen option is NOT the most security-conservative, the Alternatives table MUST explain WHY (e.g., "Option B more secure but 10× cost; we accept residual risk because data class is public — see `## Waiver`").

If chosen option introduces new attack surface vs alternatives → mandatory `## Security Note` section listing:
- New attack surface
- Mitigations applied
- Residual risk
- Owner accepting residual risk

---

## How owner-ceo enforces

1. Every dispatch prompt MUST include:
   ```
   mindset: skills/creative-security-mindset
   require_alternatives: 3
   require_stride_pass: true
   ```
2. Role's artifact MUST contain `## Alternatives Considered` (or skip-reason) AND demonstrate STRIDE pass (inline notes OR linked threat-model)
3. Verification checklists include `creative_alternatives_explored` + `security_threat_lens_applied` (per `templates/role-verification-checklists.md`)
4. Missing → `failed_items[]` → strictness gate blocks promotion → `VERIFICATION_FAILED` if not fixed

---

## Example: role-developer applying the skill

Task: "Implement webhook receiver for payment provider"

```markdown
## Alternatives Considered
1. **Plain HTTP POST handler + JSON.parse** — simple, 20 LOC. Rejected: no signature verification, replay vulnerable, no idempotency.
2. **Express + middleware (helmet, raw-body, hmac verify, idempotency key)** — 80 LOC, battle-tested middleware. Cons: dependency surface. Rejected: chosen Option 3 for tighter scope.
3. **Native Node http + manual HMAC + Redis idempotency (chosen)** — 120 LOC, zero npm runtime deps. Why winning: smallest attack surface, full audit, replay-safe.

## Security Note
- STRIDE applied per endpoint:
  - Spoofing: HMAC-SHA256 against provider secret; constant-time compare
  - Tampering: signature covers full body + timestamp; reject if Δt > 5min
  - Repudiation: all requests logged with request_id + signature + timestamp (NO body)
  - Info disclosure: error responses generic ("invalid signature"), never echo payload
  - DoS: rate limit per source IP (sliding window 100/min); body size cap 64KB
  - EoP: handler runs as least-priv service account; no DB writes outside scope
- Residual risk: replay within 5min window if attacker captures + replays + has idempotency key — accepted because provider already deduplicates and we double-check
- Assume-hostile-input: timestamp parsed with explicit format + range check; signature is fixed-length hex; body is raw bytes, not eval'd
```

This is what "creative + security-vigilant" looks like on the page.

---

## Cost note

This skill increases token cost per artifact ~1.3-1.5× (because Alternatives + STRIDE notes add length). Owner-ceo MUST factor this into budget multipliers ALONGSIDE the strictness multiplier — combined effect for non-trivial artifacts: ~2.5-3× baseline. Pre-dispatch budget check (Round 1 #1) accounts for both.
