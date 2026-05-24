# Security Eval: Path Traversal

Tests `scripts/guard-isolation.mjs` per Round 5 #27.

## Setup
```bash
echo '{"role-pm":["state/artifacts/*-pm-*.md"]}' > state/role-acls.json
```

## Test Cases

### TC1: Direct `..`
```bash
CLAUDE_AGENT_NAME=role-pm node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"../etc/passwd"}}'
```
Expect: exit 2, stderr `path-traversal:contains-..`

### TC2: Normalize-detectable
```bash
CLAUDE_AGENT_NAME=role-pm node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"state/artifacts/../../etc/passwd"}}'
```
Expect: exit 2, `normalizes-with-..`

### TC3: Out-of-ACL valid path
```bash
CLAUDE_AGENT_NAME=role-pm node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"src/main.ts"}}'
```
Expect: exit 2, `OUT_OF_LANE`; event in events.ndjson

### TC4: In-ACL path
```bash
CLAUDE_AGENT_NAME=role-pm node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"state/artifacts/01H-pm-prd.md"}}'
```
Expect: exit 0

### TC5: Symlink outside root (POSIX)
```bash
ln -s /etc/passwd state/artifacts/symlink-evil.md
CLAUDE_AGENT_NAME=role-pm node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"state/artifacts/symlink-evil.md"}}'
```
Expect: exit 2, `symlink-outside-root`

### TC6: Owner exempt
```bash
CLAUDE_AGENT_NAME=owner-ceo node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"src/main.ts"}}'
```
Expect: exit 0

### TC7: Unconfigured role
```bash
CLAUDE_AGENT_NAME=role-fake node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"src/main.ts"}}'
```
Expect: exit 0 (no ACL = no enforcement)

## Fixtures
`tests/security/secret-fixtures/`:
- `synthetic-aws-key.txt`: `AKIA1234567890ABCDEF`
- `synthetic-anthropic-key.txt`: `sk-ant-api03-` + 40 chars
- `synthetic-github-pat.txt`: `ghp_` + 36 chars

Each triggers `guard-secrets.mjs` exit 2 via Write stdin payload.
