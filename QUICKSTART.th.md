# 🚀 วิธีใช้งานต่อ — Solomon Agent

คู่มือสั้นๆ ภาษาไทยสำหรับใช้งาน + พัฒนา Solomon Agent ต่อจาก v0.1 implementation

---

## 📋 Pre-flight: ตรวจสอบก่อนใช้งาน

```bash
node --version    # ต้อง >= 18
cd D:/Research/solomon-agent
ls .claude-plugin/ agents/ commands/ rules/ scripts/ hooks/
```

---

## 🧪 Phase 1: ทดสอบ Local (ไม่ต้อง git/network)

### 1.1 ตรวจ manifest + Node version
```bash
node scripts/preflight.mjs
```
**คาดหวัง:** `[preflight] OK (node 18.x.x)`

### 1.2 ตรวจ frontmatter agents + commands
```bash
node scripts/lint-frontmatter.mjs agents/ commands/
```
**คาดหวัง:** `[lint-frontmatter] OK`

### 1.3 Init state จำลอง
```bash
node scripts/state-store.mjs init \
  --goal "test markdown to pdf cli" \
  --project-id 01HFAKEULID123 \
  --sc-version 0.1.0
```
**คาดหวัง:** สร้าง `state/project.json`, `state/budget.json`, `state/dispatch-stack.json`, `state/session.key`, `state/lock`

### 1.4 Event log + verify HMAC chain
```bash
node scripts/event-log.mjs project_init test=1
node scripts/event-log.mjs phase_start phase=DISCOVERY
node scripts/verify-log.mjs
```
**คาดหวัง:** `VALID: 3 events`

### 1.5 ทดสอบ guard hooks (security)
```bash
# guard-secrets ต้อง block AKIA
echo '{"tool_name":"Write","tool_input":{"content":"key=AKIA1234567890ABCDEF"}}' | node scripts/guard-secrets.mjs
echo $?    # ต้อง = 2

# guard-isolation ต้อง block path traversal
CLAUDE_AGENT_NAME=role-pm node scripts/guard-isolation.mjs <<< '{"tool_name":"Read","tool_input":{"file_path":"../etc/passwd"}}'
echo $?    # ต้อง = 2
```

### 1.6 Cleanup
```bash
rm -rf state/
```

---

## 🌐 Phase 2: Install เข้า Claude Code

### 2.1 Git init + push
```bash
cd D:/Research/solomon-agent
git init
git add -A
git commit -m "feat: v0.1.0 initial release"

# สร้าง repo github.com/warnyin/solomon-agent ก่อน
git remote add origin https://github.com/warnyin/solomon-agent
git branch -M main
git push -u origin main

git tag v0.1.0
git push --tags
```

### 2.2 Install ใน Claude Code session
```
/plugin marketplace add https://github.com/warnyin/solomon-agent
/plugin install solomon-agent@solomon-agent-marketplace
```

### 2.3 ทดสอบ launch แรก
```
/solomon-agent:launch "build a markdown to PDF CLI in Node.js"
```

**คาดหวัง:**
- Owner-CEO spawn
- **`[BLUE] DISCOVERY INTERVIEW — Round 1/5`** — owner ถาม 3-5 คำถามก่อน (WHO/WHAT/WHY/...) ตอบไปเรื่อยๆ จนกว่า confidence ≥ 0.85 หรือพิมพ์ "ลุย"
- เมื่อจบ interview → `state/artifacts/discovery-brief.md` ถูกเขียน
- DISCOVERY phase proper → dispatch role-pm + role-ba parallel (ใช้ brief เป็น input)
- ไปถึง HANDOFF
- Final report ที่ `state/artifacts/final-report.md`

> **ข้ามการถาม:** ถ้า scope แน่นแล้วและไม่อยากถูกถาม → ใส่ `sc.config.json: {"discovery_interview": {"skip": true}}` (ไม่แนะนำสำหรับ project ใหญ่)

---

## 🛠️ Phase 3: Iterate / Customize

### 3.1 Operational commands
```
/solomon-agent:status                   # ดู phase + active dispatches
/solomon-agent:inject "use TypeScript"  # ส่งข้อมูลเพิ่มระหว่าง run
/solomon-agent:abort                    # หยุดอย่างนุ่มนวล
/solomon-agent:replay DESIGN            # รัน phase ใหม่
/solomon-agent:failover                 # swap to backup-owner ถ้า owner ค้าง
/solomon-agent:cost-report              # token usage per role
/solomon-agent:stats                    # cross-project metrics
/solomon-agent:compact                  # archive logs ถ้า state/ ใหญ่
```

### 3.2 ปรับ config ผ่าน `sc.config.json`

สร้างที่ project root (ไม่ gitignored — ห้ามใส่ secret):

```json
{
  "budget": { "tokens_budget": 500000, "cost_estimate_usd_max": 20.00 },
  "language": "th",
  "escalation_relax": ["AMBIGUITY", "DEAD_END"],
  "ba": { "allow_market_research": true }
}
```

ดู `docs/configuration.md` สำหรับ schema ครบ

### 3.3 Swap role agent
```json
{ "role_swap": { "role-developer": "agents/custom/role-rust-developer.md" } }
```
File MUST อยู่ใต้ repo (`validate-config.mjs` enforce)

### 3.4 เพิ่ม role ใหม่
```json
{
  "extra_roles": [{
    "name": "role-marketing",
    "tools": ["Read", "Write", "Glob", "Grep", "WebFetch"],
    "model": "sonnet",
    "color": "magenta",
    "charter_path": "rules/custom/role-marketing-charter.md"
  }]
}
```
แล้วรัน: `node scripts/build-manifest.mjs`

---

## 🧬 Phase 4: Develop / Contribute

### 4.1 รัน CI checks local
```bash
npm run lint:plugin            # validate JSON manifests
npm run lint:frontmatter       # validate YAML frontmatter
npm run build:skills:check     # ตรวจ skill drift
npm test                       # run script tests
node scripts/check-drift.mjs   # agent ↔ rule drift
```

### 4.2 เพิ่ม role/command/hook ใหม่
ดู [CONTRIBUTING.md](CONTRIBUTING.md) — checklist ละเอียด

### 4.3 เพิ่ม migration script (v0.2+)
ดู [docs/migration-policy.md](docs/migration-policy.md)

### 4.4 เพิ่ม eval test
ตาม pattern ใน `tests/integration/*.spec.md`

---

## 🆘 Troubleshooting

| ปัญหา | วิธีแก้ |
|---|---|
| Owner ค้าง >10 นาที | `/solomon-agent:failover` |
| Budget เกิน | `/solomon-agent:status` ดู → แก้ `sc.config.json:budget` → `/solomon-agent:abort` + รันใหม่ |
| State ใหญ่เกิน | `/solomon-agent:compact` |
| Audit log ถูกแก้ | `node scripts/verify-log.mjs` บอกบรรทัดที่ break |
| Hook scripts crash | ดู `state/hook-errors.log` |
| Uninstall | `node scripts/uninstall.mjs` แล้ว `/plugin uninstall solomon-agent` |

---

## 📚 อ่านเพิ่มเติม

| ไฟล์ | สำหรับ |
|---|---|
| [README.md](README.md) | ภาพรวม install + quickstart |
| [docs/architecture.md](docs/architecture.md) | Sequence + state machine + file layout |
| [docs/roles.md](docs/roles.md) | 10 role agents + anti-scope |
| [docs/escalation-rules.md](docs/escalation-rules.md) | 14 escalation conditions |
| [docs/configuration.md](docs/configuration.md) | `sc.config.json` schema เต็ม |
| [docs/security-model.md](docs/security-model.md) | Threat model in/out of scope |
| [docs/comparison.md](docs/comparison.md) | vs LangGraph/CrewAI/mbruhler/mpm/corps/resin |
| [docs/when-to-use.md](docs/when-to-use.md) | Decision matrix + cost heuristic |
| [docs/hook-contract.md](docs/hook-contract.md) | Hook stdin/stdout JSON |
| [CONTRIBUTING.md](CONTRIBUTING.md) | สำหรับนักพัฒนา |
| [.claude/PRPs/plans/meta-agent-orchestrator.plan.md](.claude/PRPs/plans/meta-agent-orchestrator.plan.md) | PRP plan เต็ม (110 gaps) |

---

## 💰 Cost Transparency (Round 16)

3 surfaces เผยต้นทุนชัด:

- **Pre-flight** ก่อน `/solomon-agent:launch` → `scripts/estimate-cost.mjs` แสดง expected ~$X (low—high band) → user confirm y/n/budget=
- **Mid-flight** ทุก checkpoint → `scripts/burn-rate-watch.mjs` แสดง `[$] BURN — N% used · X k tok/min · projected $Y`
- **Retrospective** ที่ HANDOFF → `/solomon-agent:cost-report` เทียบ pre-flight vs actual + per-feature + per-role + calibration

Bypass: `sc.config.json: {"cost_transparency": {"preflight": false}}` (ไม่แนะนำ) per [`rules/cost-transparency-protocol.md`](rules/cost-transparency-protocol.md)

---

## 🩺 `/solomon-agent:doctor` — Health Check (Round 17)

17 checks: node version, manifests, scripts runnable, hook schema, role/command/skill counts, consultant profile staleness + ACL presence, HMAC chain, codemap/KB freshness

```
/solomon-agent:doctor              # quick check
/solomon-agent:doctor --verbose    # per-check detail
/solomon-agent:doctor --fix        # safe auto-repair (rebuild stale codemap/KB)
```

---

## 🧪 Dry-Run Harness (Round 18)

CI ที่ผ่านมาเป็น stub — ตอนนี้ `scripts/dry-run-harness.mjs` simulate full /solomon-agent:launch lifecycle ด้วย mock owner-ceo + fixtures:

```bash
node scripts/dry-run-harness.mjs --scenario tests/fixtures/launch-simulation/basic.json
```

`.github/workflows/eval.yml` รัน dry-run จริงทุก manual trigger

---

## 🌐 Open-Source Readiness (Round 19)

- [`SECURITY.md`](SECURITY.md) — vulnerability disclosure
- [`docs/telemetry-policy.md`](docs/telemetry-policy.md) — **zero telemetry** by default
- [`.github/ISSUE_TEMPLATE/bug.yml`](.github/ISSUE_TEMPLATE/bug.yml) + [`feature.yml`](.github/ISSUE_TEMPLATE/feature.yml)
- [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) — strictness checklist

---

## 📚 Extender Cookbooks (Round 20)

สำหรับ community ที่อยากเพิ่ม:
- [`docs/extending-add-role.md`](docs/extending-add-role.md) — เพิ่ม role agent ใหม่ 7 ขั้น
- [`docs/extending-add-command.md`](docs/extending-add-command.md) — เพิ่ม `/solomon-agent:*` command ใหม่ 5 ขั้น
- [`docs/extending-add-skill.md`](docs/extending-add-skill.md) — เพิ่ม cognitive skill ใหม่ 4 ขั้น

---

## 🎯 `/solomon-agent:do` — Meta-Command (Round 15)

ถ้าจำไม่ได้ว่าจะใช้ command ไหน — ใช้ **`/solomon-agent:do "<พิมพ์อะไรก็ได้>"`** ทำได้ทุกอย่าง:

- อ่าน state ปัจจุบัน (project / phase / active_role / pending_escalations) ก่อนเสมอ
- จัดประเภท intent จากคำที่พิมพ์ (ภาษาไทย + อังกฤษ)
- **ถามกลับ 1-3 คำถาม** ถ้าไม่แน่ใจ (confidence < 0.8)
- **เรียก command เดิมแบบ inline** (ไม่กระทบ command อื่น — ทุกตัวยังใช้งานได้ปกติ)

**ตัวอย่าง:**
```
/solomon-agent:do ดู status ปัจจุบัน        → /solomon-agent:status
/solomon-agent:do ต่อจากที่หยุด              → /solomon-agent:resume
/solomon-agent:do หา design เรื่อง auth     → /solomon-agent:kb auth
/solomon-agent:do owner ค้างมา 10 นาที       → /solomon-agent:failover
/solomon-agent:do build markdown to PDF      → /solomon-agent:launch "build markdown to PDF" (พร้อม Discovery Interview)
/solomon-agent:do ทำใหม่ phase BUILD         → /solomon-agent:replay BUILD
```

**Bypass:**
- `/solomon-agent:do --raw <text>` → ส่งตรงไม่ classify
- `/solomon-agent:do --plan <text>` → dry-run (แสดง routing decision ก่อน confirm)
- `/solomon-agent:do --help` → ดู help

Pure additive layer — ไม่กระทบกับ 12 command เดิม per [`commands/do.md`](commands/do.md) + [`skills/intent-router/SKILL.md`](skills/intent-router/SKILL.md)

---

## 🔁 Resumable Hand-Off / Codemap / KB (Round 14)

ตอนนี้ระบบ **checkpoint บ่อยๆ** + **broadcast ทุก role** + **auto-build KB/codemap ทุก feature เสร็จ**:

- **Checkpoint บ่อย:** ทุก role return, phase exit, feature complete, escalation, interview round, heartbeat 15 นาที — เขียน `state/checkpoints/{ulid}-{phase}-{trigger}.json` + อัปเดต `state/role-state-board.json` (per [`rules/handoff-checkpoint-protocol.md`](rules/handoff-checkpoint-protocol.md))
- **Role broadcast:** ทุก role อ่าน `state/role-state-board.json` ก่อนเริ่มงาน → ถ้า `active_role != ตัวเอง` → reply "[BROADCAST] Standing by ..." แล้วยุติ (กัน role กระโดดทำก่อนถึงคิว)
- **Resume:** `/solomon-agent:resume` อ่าน 3 sources of truth (board + checkpoint + artifacts) → re-dispatch จากจุดที่หยุด (idempotent)
- **Codemap auto-rebuild:** ทุก feature_complete + phase_exit → `scripts/build-codemap.mjs` → สร้าง `docs/codemap/index.md` + `by-module/*` + `entry-points.md` + `manifest.json` (per [`rules/codemap-protocol.md`](rules/codemap-protocol.md))
- **KB auto-rebuild:** เช่นกัน → `scripts/build-kb-index.mjs` → สร้าง `docs/kb/index.md` + `by-phase/*` + `by-role/*` + `by-type/*` + `decisions.md` + `risks.md` + `glossary.md` + `search-index.json` (per [`rules/knowledge-base-protocol.md`](rules/knowledge-base-protocol.md))
- **Manual:** `/solomon-agent:codemap` (view/rebuild code TOC), `/solomon-agent:kb <query>` (search artifacts)

**Bypass (ไม่แนะนำ):** `sc.config.json: {"checkpoint": {"heartbeat_min": 0, "skip_role_return": true}}` — แต่ phase_exit + feature_complete + escalation_emitted ห้าม disable

---

## 🔒 ความเข้มงวด (Strictness / Sign-Off Gate)

ทุก role ต้อง **self-verify ก่อน → peer-review ก่อน → owner ตรวจ phase exit** (per [`rules/role-strictness-protocol.md`](rules/role-strictness-protocol.md)):

- artifact ทุกตัวมี `signed_off_by[]` ใน frontmatter (self → peer → owner; safety-class +adversarial)
- ใช้ checklist ใน [`templates/role-verification-checklists.md`](templates/role-verification-checklists.md) — 10-15 ข้อต่อ role พร้อมแท็ก `[SAFETY]` ที่ "waiver ไม่ได้"
- ถ้า `failed_items[]` มี item ที่ไม่ใช่ `[SAFETY]` + ทำ waiver ได้ → ต้องมี `## Waiver` (reason + compensating control + expires_at) + ผ่าน peer + owner
- Owner ห้ามขึ้น phase ถัดไปถ้า required artifact ยังไม่ approved → escalate `VERIFICATION_FAILED` (escalation #15)
- Token cost คูณ ~2.0× (~2.5× safety-class) เพราะ peer/adversarial dispatch — owner ตรวจ budget ก่อน phase

**Bypass (ไม่แนะนำ):** `sc.config.json: {"strictness": {"skip_peer_review": true}}` — safety-class adversarial ยัง bypass ไม่ได้

---

## ⚠️ ข้อจำกัด v0.1 (จำให้ได้)

- ❌ ไม่มี automatic owner liveness — ต้องเรียก `/solomon-agent:failover` เอง
- ❌ Determinism = structural เท่านั้น
- ❌ Budget tracking อาจเป็น char-heuristic
- ❌ Write-path enforcement = best-effort (LLM มี FS access)
- ❌ HMAC chain ป้องกัน accidental เท่านั้น
- ❌ Single-host lock — multi-host รอ v0.2

---

## 🎯 v0.2 Ideas

1. Automatic owner heartbeat (ถ้า Claude Code เพิ่ม supervisor API)
2. Cross-LLM portability (Cursor / Codex / Gemini)
3. Web dashboard
4. External observability sinks (Datadog / Loki / Sentry)
5. Multi-host collab
6. Migration scripts v0.1 → v0.2

---

`/solomon-agent:launch "เริ่มเลย!"` 🚀
