# Hook Contract

> Round 6 #85 #88 + Round 9 #102.

## hooks.json Schema

```json
{
  "<HookEvent>": [
    { "matcher": "<pattern>",
      "hooks": [{ "type": "command"|"prompt", "command": "...", "prompt": "...", "timeout": 10 }] }
  ]
}
```

## Events
- `PreToolUse` — matcher = tool name regex (`Write|Edit`)
- `PostToolUse` — matcher = tool name regex
- `SessionStart` — matcher `*`
- `Stop` — matcher `*`

## Input (stdin)
```json
{
  "tool_name": "Write",
  "tool_input": { "file_path": "...", "content": "..." },
  "tool_response": { "output": "...", "usage": { "total_tokens": 1234 } }
}
```

## Output (stdout)
PreToolUse:
```json
{ "allow": true, "warning": "optional" }
```

SessionStart-specific:
```json
{ "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<text injected to main session>"
}}
```

## Exit Codes
- 0: success / non-blocking
- 2: block (PreToolUse) or violation signal (PostToolUse)

## Env Vars
- `${CLAUDE_PLUGIN_ROOT}` — plugin install dir (Round 6 #88)
- `$CLAUDE_AGENT_NAME` — invoking agent name

## Solomon Agent Conventions
- **One hook per matcher** (Round 8 #100): merge responsibilities
- **Graceful crash** (Round 8 #16): try/catch + write `state/hook-errors.log` + exit 0; EXCEPT `guard-secrets.mjs` fails-closed
- **Use `${CLAUDE_PLUGIN_ROOT}`** in command paths; CI lint enforces

## DO NOT
- Block for non-security; emit warning + exit 0
- Set env vars expecting LLM tool calls to see them (env doesn't propagate)
- Touch `state/` from PreToolUse without lock
