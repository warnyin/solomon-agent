# Migration Tests

> Round 4 #39.

## Convention

Per registered migration `scripts/migrations/<from>-to-<to>.mjs`:
1. `tests/migrations/fixtures/<from>.json` — state at `from` version
2. `tests/migrations/fixtures/<to>.json` — expected after migration
3. `node scripts/migrations/test-harness.mjs`

## Fixture Format

`<version>.json` is a synthetic `state/project.json` snapshot:
```json
{
  "id": "01H_SYNTHETIC_ULID",
  "goal": "synthetic test goal",
  "started_at": "2026-05-23T10:00:00Z",
  "phase": "DESIGN",
  "project_type": "web-app",
  "sc_version": "0.1.0",
  "status": "in_progress",
  "pending_escalations": []
}
```

## v0.1 Baseline
No migrations. `MANIFEST.json:migrations:[]`. `test-harness.mjs` prints "no migrations" and exits 0.

## Adding First Migration (v0.2+ contributors)
1. Write `scripts/migrations/0.1.0-to-0.2.0.mjs` exporting `migrate(state) → newState`
2. Compute SHA via `crypto.createHash('sha256')`
3. Register in `MANIFEST.json`
4. Add fixtures
5. `node scripts/migrations/test-harness.mjs` must pass

## CI
`.github/workflows/test.yml` runs test-harness on PR.
