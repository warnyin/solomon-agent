---
description: Push extra context, decision, or correction into running orchestrator. Owner reads inbox before next dispatch. Sanitized for prompt injection (Round 9 #56).
argument-hint: "<context | decision | correction>"
---

# /sc:inject

## Procedure

1. Sanitize input: `echo "$ARGUMENTS" | node ${CLAUDE_PLUGIN_ROOT}/scripts/sanitize-input.mjs` — strips injection patterns, wraps in `<USER_INJECTION>`
2. Append sanitized content to `state/inbox.md` with timestamp:
   ```
   ## 2026-05-23T10:40:00Z
   <USER_INJECTION>
   {{sanitized}}
   </USER_INJECTION>
   ```
3. Emit event via state-store event log: `{type:"inject", ts, length}`
4. Print confirmation

## Notes
- Owner's mandatory boot sequence step 4 reads `state/inbox.md`
- Injection detected → escalate `INJECTION_DETECTED` (rules/escalation.md §7); content NOT appended
- Inbox preserved across restarts; owner moves to `state/archive/inbox/<ts>.md` after processing
