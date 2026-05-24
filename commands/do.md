---
description: One-command-does-everything router. Reads project state, classifies your intent, asks 1-3 clarifying questions if needed, then routes to the right existing /sc:* command OR starts a new project. Use this when you don't want to remember which slash command to type. Per skills/intent-router.
argument-hint: "<anything in natural language>"
---

# /sc:do

You are the `/sc:do` runner — the **meta-command**. Your job: read state, understand intent, optionally ask back, then route. You do NOT replace other commands; you orchestrate them.

> Inspired by the ergonomics of ECC's `/goal` — but here we're a router, not a Stop-hook condition setter.

## Operating Principle

Every existing `/sc:*` command stays unchanged. `/sc:do` is a thin intent classifier that picks the right one (or asks the user when ambiguous).

```
user: /sc:do <freeform>
   │
   ▼
1. Read state (project.json + role-state-board + latest checkpoint + pending escalations)
2. Classify intent (rules + state + freeform text)
3. If confidence < 0.8 OR multiple plausible matches → ASK BACK (max 3 questions, one batch)
4. Route to target command's logic — invoke its body inline (do NOT spawn a separate command)
```

## Step 1 — Pre-flight (always)

Read these in parallel:
- `state/project.json` (or detect absence)
- `state/role-state-board.json` (if exists)
- Latest `state/checkpoints/*.json` (if exists)
- `state/project.json:pending_escalations[]`

Build a state snapshot for routing decisions:

```
state = {
  has_project: true | false,
  phase: "DISCOVERY" | ... | null,
  active_role: "role-sa" | null,
  status: "in_progress" | "complete" | null,
  pending_escalations: [...],
  last_checkpoint_at: ISO-8601 | null,
  budget_status: "ok" | "warning" | "exceeded"
}
```

## Step 2 — Classify intent (skills/intent-router pattern)

Apply rules IN ORDER (first match wins). Free-form `$ARGUMENTS` is matched case-insensitively against keywords + state context.

### State-driven routing (takes priority over keyword)

| If state says... | And user says... | → Route to |
|---|---|---|
| `pending_escalations[].length > 0` | anything | **Surface escalation first** — refuse to route until user answers |
| `has_project=false` | anything sounding like a project idea ("build X", "ทำ X", "create Y") | `/sc:launch <idea>` |
| `has_project=false` | "status" / "help" / "what can you do" | Reply with this command's own help |
| `has_project=true` AND `status=complete` | "new" / "another" / "ใหม่" | offer archive-vs-append (per `/sc:launch §1.2`) |
| `has_project=true` AND `active_role != null` AND last_checkpoint_at > 1hr ago | anything | suggest `/sc:resume` first |

### Keyword routing (when state alone isn't decisive)

| User intent signal (TH/EN keywords) | → Route to |
|---|---|
| "continue", "ต่อ", "resume", "ทำต่อ", "พิจารณาต่อ" | `/sc:resume` |
| "status", "ดู", "เช็ค", "where", "อยู่ไหนแล้ว", "phase ไหน" | `/sc:status` |
| "stop", "abort", "หยุด", "ยกเลิก", "cancel" | `/sc:abort` |
| "replay", "ซ้ำ", "redo", "ทำใหม่", "rewind to <phase>" | `/sc:replay <PHASE>` |
| "swap owner", "failover", "owner ค้าง", "owner หยุด" | `/sc:failover` |
| "cost", "ราคา", "ใช้ token เท่าไหร่", "how much" | `/sc:cost-report` |
| "stats", "metrics", "across projects", "ทุก project" | `/sc:stats` |
| "compact", "archive", "clean", "เก็บ" | `/sc:compact` |
| "doctor", "health", "check", "diagnose", "ตรวจสุขภาพ", "เช็คระบบ", "preflight" | `/sc:doctor` |
| "codemap", "code TOC", "structure", "modules", "files", "สารบัญ code" | `/sc:codemap` |
| "kb", "knowledge", "find <X>", "search <X>", "decisions", "risks", "ค้นหา" | `/sc:kb <query>` |
| "add info: X", "context: X", "inject X", "ใส่ข้อมูล X" | `/sc:inject "<X>"` |
| Brand-new project description AND `has_project=false` | `/sc:launch "<text>"` |

### Compound intents

If user says "show me the design then continue" → execute sequentially: `/sc:kb design` → ask "found N artifacts; continue with /sc:resume?" → on yes → `/sc:resume`.

### Unknown / ambiguous → ASK BACK (Step 3)

If no rule matches with confidence ≥ 0.8, OR multiple rules match equally → trigger Step 3.

## Step 3 — Ask back (max 3 questions, ONE batch)

Format:

```
[BLUE] /sc:do — INTENT CLARIFICATION

Current state:
- Project: <name or "none">
- Phase: <phase or "—">
- Active role: <role or "—">
- Pending escalations: <count>
- Last checkpoint: <Δt ago or "—">

I see your request: "<sanitized user text>"

Possible interpretations:
  (a) <option 1> — will run /sc:<command>
  (b) <option 2> — will run /sc:<command>
  (c) <option 3> — will run /sc:<command>
  (d) new project (use /sc:launch)
  (e) other — explain what you mean

Reply (a/b/c/d/e or freeform).
```

Wait for user reply. On reply → re-classify with the new context (skip back to Step 2).

Hard cap: 3 clarification rounds. If still unclear → "I cannot route this. Try a specific /sc:* command directly (see /sc:do --help)."

## Step 4 — Route inline (do NOT shell out)

Once intent confidently classified, **execute the target command's body inline** by reading its `commands/<target>.md` and following its steps. Do NOT spawn a new Claude Code command invocation (would require a turn boundary user doesn't want).

Surface to user: 1-line preamble showing the routing decision, then execute:

```
[/sc:do → /sc:resume]
<then run /sc:resume's full body — pre-flight, verify integrity, surface summary, dispatch owner-ceo>
```

Routing decision logged as event `do_routed` with payload `{intent_classified, target_command, confidence, asked_back: true|false}`.

## Special cases

### Help (`--help`, "help", "what can you do", "ช่วยอะไรได้บ้าง")

Reply with:

```
/sc:do — meta-command router

Reads state + understands intent in plain Thai/English, then routes to:
  - /sc:launch (new project)
  - /sc:resume (continue)
  - /sc:status, /sc:cost-report, /sc:stats (observability)
  - /sc:inject (add context), /sc:replay <phase>, /sc:abort, /sc:failover
  - /sc:codemap, /sc:kb (knowledge navigation)
  - /sc:compact (cleanup)

Examples:
  /sc:do ดู status ปัจจุบัน
  /sc:do ต่อจากที่หยุด
  /sc:do หา design decision เรื่อง auth
  /sc:do ทำใหม่ phase BUILD
  /sc:do build a markdown to PDF CLI
  /sc:do owner ค้างมา 10 นาที

Don't want routing? Use the underlying command directly. /sc:do is purely additive.
```

### Forced bypass

`/sc:do --raw <command-text>` → no classification, no asking back; runs the literal text as if user typed `/sc:<command-text>` (still goes through that command's own pre-flight).

### Forced dry-run

`/sc:do --plan <freeform>` → classify + print routing decision, but DO NOT execute. User confirms with `y` to actually run.

## Anti-Patterns (NEVER DO)

- Asking > 3 clarifying questions (cognitive load; refuse to route at that point)
- Routing without reading state first (you may suggest the wrong command)
- Calling a routed command's body if its pre-flight would fail (e.g., `/sc:resume` without a project) — instead, surface the precondition error and suggest alternatives
- Modifying state in `/sc:do` body (only the routed command writes state)
- Suppressing pending escalations (they ALWAYS surface first, even if routing was clear)

## v0.1 limits

- Intent classifier is rule-based (no learned weights yet)
- Thai keyword coverage is initial set — expand via PRs
- Multi-step intents like "resume then immediately abort if budget low" not supported (sequence only via separate user turns)
- `--raw` does not auto-pass complex args; for `/sc:replay BUILD` use `/sc:do --raw "replay BUILD"`

## Integration

- `skills/intent-router/SKILL.md` — the classification technique (rules + state-driven priority)
- `rules/handoff-checkpoint-protocol.md` — `/sc:do` reads checkpoint/board same as `/sc:resume`
- `rules/escalation.md` — pending escalations always surface first (never bypassed)
- `rules/discovery-interview-protocol.md` — if `/sc:do` routes to `/sc:launch`, interview still runs

## Cost

Routing cost: ~100-300 tokens per invocation (state read + classification + 1-line preamble). Negligible compared to routed command's own cost. Asking back costs +200 tokens per round.
