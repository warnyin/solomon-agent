# Existing-Codebase Protocol (Brownfield)

> Round 2 Gap #11.

## Trigger
At DISCOVERY step 0, owner runs `Glob **/*` excluding `state/`, `.claude-plugin/`, `node_modules/`, `.git/`. If >5 non-scaffolding files → **brownfield mode**.

## Scan Checklist (role-tech-lead)
- Top-level files
- Package manifest: `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / `Gemfile` / `pom.xml`
- `README.md`
- Entry points: JS `src/index.{ts,js}`, Python `src/__init__.py`, Rust `Cargo.toml:[[bin]]`, Go `main.go`
- Tests dir (`test/`, `tests/`, `__tests__/`)
- Framework signatures
- Conventions (lint config, formatter, commit hooks)

## code-map Artifact
Per `rules/communication-protocol.md#code-map`:
`## Stack`, `## Entry Points`, `## Modules`, `## Test Coverage Present`, `## Conventions Detected`, `## Integration Points`

## Owner Behavior
- DISCOVERY exit: brownfield → code-map MUST exist
- DESIGN: role-sa cites code-map in artifact
- ACL widened: `role-tech-lead` gets `**/*` Read (realpath-checked)
- New event: `brownfield_detected`
