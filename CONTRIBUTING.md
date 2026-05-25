# Contributing to Solomon Agent

## Quick Links
- [Architecture](docs/architecture.md)
- [Roles](docs/roles.md)
- [Hook contract](docs/hook-contract.md)
- [Configuration](docs/configuration.md)
- [Migration policy](docs/migration-policy.md)
- [Security model](docs/security-model.md) · [SECURITY.md](SECURITY.md) (vulnerability disclosure)
- [Telemetry policy](docs/telemetry-policy.md)
- [Marketplace submission](docs/marketplace-submission.md)

## Extender Cookbooks (Round 20)
Before adding code, follow the cookbook:
- [Add a role agent](docs/extending-add-role.md) — 7-step recipe
- [Add a `/solomon-agent:*` command](docs/extending-add-command.md) — 5-step recipe
- [Add a skill](docs/extending-add-skill.md) — 4-step recipe

## Setup
```bash
git clone https://github.com/warnyin/solomon-agent
cd solomon-agent
# no runtime deps; engines.node >= 18
```

## Workflow
1. Open issue first
2. Fork + `feature/<name>` or `fix/<name>`
3. Run all checks:
   ```bash
   npm run lint:plugin
   npm run lint:frontmatter
   npm run build:skills -- --check
   npm test
   node scripts/check-drift.mjs
   ```
4. Update `CHANGELOG.md` under `[Unreleased]`
5. Open PR

## Adding a role
1. Charter in `rules/role-charters.md`
2. `agents/role-<name>.md` with Prompt Defense Baseline + mirror marker
3. Add to `rules/external-tool-routing.md` + `rules/context-isolation.md`
4. Update `docs/roles.md`
5. Run `node scripts/build-manifest.mjs`

## Adding a command
1. `commands/<name>.md` with `{description, argument-hint}`
2. Update README Quickstart

## Adding a hook
1. Entry in `hooks/hooks.json` (nested schema)
2. Script in `scripts/<name>.mjs`:
   - Node built-ins only
   - Graceful crash (try/catch + state/hook-errors.log + exit 0)
   - EXCEPT security-critical (`guard-secrets`) fails-closed
   - Use `${CLAUDE_PLUGIN_ROOT}` in path

## Adding a rule
1. `rules/<name>.md`
2. Reference from consumers
3. Skill-generatable? Register in `scripts/build-skills.mjs:SKILL_MAP`

## Code Style
- Node ESM only
- No npm runtime deps
- Atomic writes via `state-store.atomicWrite()`
- Cross-platform: `path.join` + `os.homedir()`

## Migrations
See [migration-policy.md](docs/migration-policy.md). Always include test fixtures + SHA in MANIFEST.

## Code of Conduct
Be kind. Disagree on technical substance, not identity.
