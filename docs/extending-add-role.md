# Cookbook — Add a New Role Agent

> Round 20: step-by-step guide for community contributors. Adds 1 specialized role to the 10-role baseline.

## When to add a new role

Add a NEW role when:
- An existing role's charter explicitly forbids the work
- A recurring escalation reveals a gap in scope coverage
- A project_type needs domain expertise not present (e.g. ML engineer for data-pipeline+model projects)

DON'T add a role when:
- The work is a small extension of an existing role's scope — extend charter instead
- It's a one-off task — handle via `/sc:inject` instead
- It overlaps significantly with an existing role — clarify boundaries first

## 7-step recipe

### Step 1 — Pick a unique name + color

Name: `role-<slug>` (kebab-case). Color: pick from unused set (`magenta` taken by owner, `pink` by backup, `blue/green/purple/cyan/yellow/orange/red/gray/white/red` taken by 10 base roles).

If a color clash: use a tone variant via terminal (e.g. `magenta` + `dim`).

### Step 2 — Define the charter

Edit `rules/role-charters.md` — add a section with: Scope, Inputs, Outputs (artifact path + type + sections), Anti-scope (arrows to other roles), Hand-off targets.

Pick a SHORT slug (≤3 chars) for the artifact filename.

### Step 3 — Define the verification checklist

Edit `templates/role-verification-checklists.md` — add a section `## role-<slug>` with 8-12 self-check items.

Include at minimum:
- Required output sections present
- `[SAFETY]` items for any external boundaries the role crosses
- Cross-reference to inputs (no orphan claims)
- Peer reviewer lens hint at end

### Step 4 — Define peer-review partner

Edit `rules/role-strictness-protocol.md §Peer-Review Matrix` — pick a sibling role whose perspective best catches errors in this role's output.

Symmetric pairing preferred (if A reviews B, B reviews A).

### Step 5 — Create the agent file

`agents/role-<slug>.md`:

```markdown
---
name: role-<slug>
description: <one sentence — what task and which phase>
tools: ["Read", "Write", "Edit", "Glob", "Grep", <ECC skills if needed>]
model: <opus|sonnet|haiku>
color: <color>
---

# Prompt Defense Baseline (NEVER VIOLATE)
... (copy from any existing role-*.md)

# Mission
You are <role>, the <description>. You report to owner-ceo. Your charter: `rules/role-charters.md#role-<slug>`.

# Boot Sequence
1. Read state/role-state-board.json. If active_role != "role-<slug>" → "[BROADCAST] Standing by". Exit.
2. Read your inputs per dispatch prompt.
3. Run skill `creative-security-mindset` — produce ≥ 3 alternatives.
4. Produce artifact per checklist `templates/role-verification-checklists.md#role-<slug>`.
5. Self-verify, attach `signed_off_by[]` entry, write `## Handoff` section.
6. Set `status: ready_for_review`. Exit.

# Anti-Patterns
- Doing work outside scope (forbidden by charter)
- Skipping creative-security-mindset
- Not appending Handoff section
```

### Step 6 — Add to manifest + ACL

Edit `agents/manifest.json` — add `role-<slug>` to the list with its model + color.

Edit `state/role-acls.json` (or the template under `rules/project-templates.md`) — add ACL entry for the new role: which paths it can Read/Write.

### Step 7 — Add to phase machine

Edit `agents/owner-ceo.md §Per-phase allowed roles` — list the new role under the phase(s) it participates in.

If the role is project-type-specific (e.g. only for `data-pipeline`), edit `rules/project-templates.md` to gate its dispatch.

## Verify

Run:
```bash
node scripts/lint-frontmatter.mjs agents/
node scripts/build-manifest.mjs
node scripts/check-drift.mjs
node scripts/doctor.mjs
node scripts/dry-run-harness.mjs --scenario tests/fixtures/launch-simulation/basic.json
```

All pass → submit PR using `.github/PULL_REQUEST_TEMPLATE.md`.

## Example reference roles

- `agents/role-pm.md` — light role (sonnet, narrow scope)
- `agents/role-developer.md` — heavy role (sonnet, broad scope, restricted git)
- `agents/role-security.md` — adversarial role (opus, audit lens)

## Cost note

Adding a role increases per-dispatch token cost (more parallel work + more peer-review pairs). Update `rules/cost-transparency-protocol.md` baselines if your role materially shifts the average.
