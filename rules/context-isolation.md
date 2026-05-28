# Context Isolation — Per-Role Read ACL

> Round 2 #4 + Round 5 #27 (path traversal).

## Default ACL Templates

Owner emits resolved ACLs into `state/role-acls.json` at session start.

```yaml
owner-ceo:        ["**/*"]
backup-owner:     ["**/*"]

role-pm:
  - "state/artifacts/*-discovery-pm-*.md"
  - "state/artifacts/*-discovery-ba-*.md"
  - "rules/role-charters.md"
  - "rules/escalation.md"
  - "state/project.json"
  - "state/bootstrap-summary.md"

role-ba:
  - "state/artifacts/*-discovery-*.md"
  - "rules/role-charters.md"
  - "rules/project-templates.md"
  - "state/project.json"

role-sa:
  - "state/artifacts/*-discovery-*.md"
  - "state/artifacts/*-design-*.md"
  - "rules/**/*.md"
  - "state/project.json"

role-tech-lead:
  - "state/artifacts/*-discovery-*.md"
  - "state/artifacts/*-design-*.md"
  - "rules/**/*.md"
  - "state/project.json"
  - "**/*"   # brownfield discovery — scoped to non-state/ files via realpath check

role-developer:
  - "state/artifacts/*-design-*.md"
  - "state/artifacts/*-build-dev-*.md"
  - "state/artifacts/*-verify-qa-*.md"
  - "rules/role-charters.md"
  - "rules/external-tool-routing.md"
  - "src/**"
  - "test/**"
  - "tests/**"
  - "*.md"
  - "package.json"
  - "Cargo.toml"
  - "pyproject.toml"
  - "go.mod"

role-qa:
  - "state/artifacts/*-design-*.md"
  - "state/artifacts/*-build-*.md"
  - "state/artifacts/*-verify-qa-*.md"
  - "src/**"
  - "test/**"
  - "tests/**"

role-devsecops:
  - "state/artifacts/*-design-*.md"
  - "state/artifacts/*-verify-*.md"
  - "rules/role-charters.md"
  - ".github/**"
  - "Dockerfile"
  - "*.yml"
  - "*.yaml"

role-security:
  - "state/artifacts/**"   # widened by owner at dispatch
  - "rules/escalation.md"
  - "rules/role-charters.md"
  - "**/*"

role-infra:
  - "state/artifacts/*-design-*.md"
  - "rules/role-charters.md"

role-service-desk:
  - "state/artifacts/**"
  - "rules/**"
  - "docs/**"

role-consultant:
  # Answerer — tightest read scope in the system. Reads only its own persona
  # and the brief it was built from. Cannot inspect role artifacts (that's owner's job).
  - "state/artifacts/consultant-profile.md"
  - "state/artifacts/discovery-brief.md"
  - "state/artifacts/confidence.json"
  - "rules/role-charters.md"
  - "rules/needs-input-protocol.md"

role-consultant-builder:
  # Persona generator — reads brief + confidence + (patch|rebuild) prev profile.
  # Writes consultant-profile.md (write-side not guarded here per scripts/guard-isolation.mjs scope).
  - "state/artifacts/discovery-brief.md"
  - "state/artifacts/confidence.json"
  - "state/artifacts/consultant-profile.md"
  - "rules/role-charters.md"
  - "rules/escalation.md"
  - "rules/project-templates.md"
  - "templates/role-verification-checklists.md"
  - "design/consultant-feature.md"
  - "state/project.json"
```

## Path Traversal Rules (Round 5 #27)

`scripts/guard-isolation.mjs` rejects:
1. Path contains `..` (raw or after normalize)
2. Symlink resolves outside `process.cwd()` (via `fs.realpathSync`)
3. Absolute path not under project root

## ACL Inheritance for Inner Agents (Round 7 #91 + #54)

Inner agent INHERITS parent ACL (cannot widen). `state/role-acls.json:inheritance_chain[]` records depth-2 entries.

## ACL Widening — Temporary Grants

Owner adds entries to `state/role-acls.json:temporary_grants:[{role,paths,expires_at,reason}]` (default 1hr). Logged as `acl_temporarily_widened`.

## Out-of-Lane Behavior

Role reads outside ACL → `guard-isolation` exits 2 → emits `acl_violation` → role returns `## Needs-Input` per `rules/needs-input-protocol.md` → NEVER retry.
