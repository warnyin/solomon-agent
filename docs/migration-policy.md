# Migration Policy

> Round 5 #21 #68.

## Schema Version
`state/project.json:sc_version` recorded at init. `session-bootstrap.mjs` compares vs `plugin.json:version`.

## File Convention
`scripts/migrations/<from>-to-<to>.mjs`:
```js
export async function migrate(state) {
  return { ...state, new_field: 'default' };
}
```

## Registration
Add to `scripts/migrations/MANIFEST.json`:
```json
{ "version": "0.2.0", "migrations": [
  { "from": "0.1.0", "to": "0.2.0", "script": "0.1.0-to-0.2.0.mjs", "sha256": "<hex>" }
]}
```

SHA: `node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync('PATH')).digest('hex'))"`

## Test
Fixtures `tests/migrations/fixtures/<from>.json` + `<to>.json`. Run `node scripts/migrations/test-harness.mjs`.

## Failures
- SHA mismatch → `MIGRATION_INTEGRITY_FAILURE` (never auto-execute)
- Downgrade → REFUSED always
- Crash → escalate; state preserved

## Memory Migration
Memory entities have `schema_version`. Use `scripts/memory-migrations/<from>-to-<to>.mjs`.
