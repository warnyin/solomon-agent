# Marketplace Submission

## Pre-flight Checklist
- [ ] `npm run lint:plugin` passes
- [ ] `npm run lint:frontmatter` passes
- [ ] `npm run build:skills -- --check` passes (no skill drift)
- [ ] `npm test` passes
- [ ] `node scripts/check-drift.mjs` passes
- [ ] `CHANGELOG.md` updated
- [ ] `package.json:version` bumped
- [ ] `.claude-plugin/plugin.json:version` matches
- [ ] `.claude-plugin/marketplace.json:plugins[0].version` matches
- [ ] `git tag v<version> && git push --tags`

## Methods

### Self-host (default)
```
/plugin marketplace add https://github.com/warnyin/solomon-agent
/plugin install solomon-agent@solomon-agent-marketplace
```

### Anthropic official (when available)
Follow Anthropic submission portal (TBD as of v0.1).

### Aggregator
- ECC: PR to `affaan-m/ECC` README community list

## After Release
- Update README install URLs
- Announce: GitHub Discussions, Twitter/X, Discord
- Tag-triage issues within 48hr

## SemVer
- MAJOR: breaking layout/commands/state schema (ships migration)
- MINOR: new commands/roles/features
- PATCH: bug fixes, docs

## Rollback
1. Cut `v<old>.<patch+1>` with fix from previous good tag
2. Push; users `/plugin update`
3. Add eval case preventing recurrence
