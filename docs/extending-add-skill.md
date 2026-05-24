# Cookbook — Add a New Skill

> Round 20: extending the 7-skill baseline with a new technique reference.

## Skills vs Rules vs Commands

| Layer | What | Example |
|---|---|---|
| **Rule** | MUST/SHALL policy (binding) | `rules/escalation.md` |
| **Skill** | HOW-TO technique reference (cognitive procedure) | `skills/checkpoint-and-resume/SKILL.md` |
| **Command** | User-invokable verb | `commands/launch.md` |
| **Script** | Imperative executable | `scripts/checkpoint.mjs` |

Add a NEW skill when you need to teach the LLM a TECHNIQUE that recurs across multiple roles/commands, but isn't a binding rule and isn't a user-invokable verb.

## When to add a skill

- A cognitive pattern recurs (e.g. "ask 5 clarifying questions before X")
- Multiple roles use the same technique with role-specific inflection
- A rule references a how-to that's too long to inline

DON'T add when:
- It's a one-paragraph instruction — inline in the role agent's body
- It's a hard MUST/SHALL — that's a rule, not a skill
- It's only used by one role — put it in that role's body

## 4-step recipe

### Step 1 — Pick name + scope

Name: `<verb>-<noun>` or `<noun>-<technique>` (kebab-case). Examples: `idea-discovery-interview`, `checkpoint-and-resume`, `creative-security-mindset`, `intent-router`.

Scope: 1 cognitive technique. NOT a kitchen sink.

### Step 2 — Create skill file

`skills/<name>/SKILL.md`:

```markdown
---
description: <1-line — what technique, when used, who uses it>
---

# Skill: <name>

> Bound by `rules/<related-rule>.md` (if any). Used by: <list consumers>.

## When to invoke
- <Specific triggers>

## Operating principles
1. <Core idea 1>
2. <Core idea 2>
...

## Algorithm / Steps
<Concrete procedure — pseudocode or numbered steps>

## Examples
<1-2 realistic examples showing the technique applied>

## Anti-patterns (NEVER DO)
- <Common mistake 1>
- <Common mistake 2>

## Integration
- <How it connects to other skills/rules/commands>

## Cost
<Approx token overhead per invocation>
```

### Step 3 — Wire references

Edit:
- The role agents that should USE this skill — add a Mission/Boot step "apply skills/<name>"
- The rule that BINDS to this skill (if any) — reference in the rule body
- `scripts/build-skills.mjs` auto-detects and validates — no manual list edit needed

### Step 4 — Verify

```bash
node scripts/build-skills.mjs --check    # verifies skill drift vs rules
node scripts/lint-frontmatter.mjs skills/
node scripts/doctor.mjs                  # skills_present check
node scripts/dry-run-harness.mjs --scenario tests/fixtures/launch-simulation/basic.json
```

PR per `.github/PULL_REQUEST_TEMPLATE.md`.

## Versioning

Skills evolve. Breaking changes (e.g. removing a step) bump skill version inside frontmatter:
```yaml
---
description: ...
version: 2
---
```

Roles/rules referencing the skill MAY pin to `version: 1` if they need stability — document in their body.

## Reference skills by pattern

- Cognitive interview: `skills/idea-discovery-interview/SKILL.md`
- Multi-axis discipline: `skills/creative-security-mindset/SKILL.md`
- State-driven router: `skills/intent-router/SKILL.md`
- Orchestration mechanics: `skills/meta-orchestration/SKILL.md`
- Persistence pattern: `skills/checkpoint-and-resume/SKILL.md`
- Escalation discipline: `skills/escalation-protocol/SKILL.md`
- State semantics: `skills/shared-state/SKILL.md`

## Anti-pattern — bloated skills

A skill > 500 lines is probably 2-3 skills. Split.

A skill that says MUST/SHALL is probably a rule. Move it.

A skill with no consumers is dead code. Remove or wire it.

## Cost note

Skills add load cost when invoked (LLM reads the SKILL.md body). Concise wins. Aim for ≤ 300 lines. Reference long material rather than inline it.
