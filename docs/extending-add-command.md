# Cookbook — Add a New `/sc:*` Command

> Round 20: extending the 14-command baseline with a new user-facing command.

## When to add

- Specific user action recurring 3+ times that doesn't fit existing commands
- Surface for a new internal capability (e.g. `/sc:export` for project bundling)
- Distinct from `/sc:do` routing — only add when a typed entry-point is genuinely needed

DON'T add when:
- It's just an alias — extend `/sc:do` keyword table instead
- It's a one-off — script + `/sc:doctor` callable instead
- It overlaps existing command — extend that command's args/flags

## 5-step recipe

### Step 1 — Pick name + argument shape

Name: `/sc:<slug>` (kebab-case, no underscores). Single verb preferred (e.g. `resume`, `doctor`, `export`).

Argument hint format: `"<freeform>"` or `"--flag <value> [<positional>]"`. Test with users — short hints win.

### Step 2 — Create command spec file

`commands/<slug>.md`:

```markdown
---
description: <1-line — what it does + when to use>
argument-hint: "<shape>"
---

# /sc:<slug>

You are the `/sc:<slug>` runner. Job: <1 sentence>.

## 1. Pre-flight
- Required state checks (project.json, role-state-board, etc.)
- Argument validation
- Exit early with helpful message if preconditions fail

## 2. Main action
... (steps the command body executes)

## 3. Output format
Show user-visible result. Brief + actionable.

## 4. Side effects
Document what state is read/written. None preferred for query commands.

## v0.1 limits
- ...
```

### Step 3 — (Optional) Create implementation script

If the command needs heavy logic, create `scripts/<slug>.mjs` (Node 18+ builtins only). Pattern:
- Read args via `process.argv` parser
- Use atomic-rename for writes
- Graceful-crash via try/catch → `state/hook-errors.log` (NOT fail-closed unless security-class)
- Emit events via shared `logEvent` helper

### Step 4 — Wire into `/sc:do` router

Edit `commands/do.md` keyword routing table + `skills/intent-router/SKILL.md` keyword table. Add TH + EN keywords.

Test confidence threshold — should hit 0.85+ for clear intents.

### Step 5 — Update docs + manifest

- `README.md` Commands section — add to the right category, bump total count
- `QUICKSTART.th.md` — add brief Thai description
- `CHANGELOG.md` — add entry under next version

## Verify

```bash
node scripts/lint-frontmatter.mjs commands/
node scripts/doctor.mjs
node scripts/dry-run-harness.mjs --scenario tests/fixtures/launch-simulation/basic.json
```

PR per `.github/PULL_REQUEST_TEMPLATE.md`. Include manual test plan exercising the new command in 3+ scenarios.

## Naming taboos

- No `/sc:run`, `/sc:exec`, `/sc:eval` (security-charged; reserved)
- No collision with Claude Code built-ins (`/help`, `/clear`, `/compact`, `/goal`)
- No vendor-specific names (`/sc:github`, `/sc:slack`) — those go under MCP-namespaced plugin

## Reference commands by complexity

- Simple display: `commands/status.md`
- State-modifying: `commands/launch.md`
- Multi-step interactive: `commands/resume.md`
- Sub-script invoking: `commands/codemap.md`
- Router meta: `commands/do.md`

## Cost note

Each command adds a small bootstrap cost (its body is loaded when invoked). Heavy commands that spawn scripts add the script's cost on top. Update `rules/cost-transparency-protocol.md` heuristic if your command materially shifts averages.
