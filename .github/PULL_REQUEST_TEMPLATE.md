# Pull Request

## Summary
<!-- 1-3 bullets: what changes, why -->

## Type of change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (raises sc_version)
- [ ] Documentation only
- [ ] Refactor (no behavior change)
- [ ] CI / tooling
- [ ] Security fix (link to SECURITY.md disclosure if applicable)

## Related issue
<!-- Closes #N or Refs #N -->

## Files changed (group by area)
- **agents/**: …
- **commands/**: …
- **rules/**: …
- **scripts/**: …
- **skills/**: …
- **templates/**: …
- **tests/**: …
- **docs/**: …

## Alternatives considered (per skills/creative-security-mindset)
<!-- Min 3 alternatives + chosen rationale, OR skip-reason for trivial changes -->

## Security review (per rules/role-strictness-protocol.md)
- [ ] STRIDE applied (Spoofing/Tampering/Repudiation/Info-disclosure/DoS/Elevation)
- [ ] No secrets in diff (run `grep -r AKIA|sk-|ghp_` over diff)
- [ ] No production data in test fixtures
- [ ] guard-* hooks still pass

## Verification
- [ ] `npm run lint:plugin` passes
- [ ] `npm run lint:frontmatter` passes
- [ ] `npm run build:skills:check` passes
- [ ] `node scripts/check-drift.mjs` passes
- [ ] `node scripts/doctor.mjs` all-pass (Round 17)
- [ ] `node scripts/dry-run-harness.mjs` passes if applicable (Round 18)
- [ ] Migration script added if schema changed (per `rules/handoff-protocol.md`)
- [ ] CHANGELOG.md updated

## Manual test plan
<!-- Bulleted checklist of steps a reviewer should run to verify -->

## Breaking change migration (if applicable)
<!-- Path: scripts/migrations/X.Y.Z-to-A.B.C.mjs + fixture + test -->

## Token-cost note (per rules/cost-transparency-protocol.md, Round 16)
<!-- Did this change affect baseline cost? Updated heuristic? -->
