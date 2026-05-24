# Observability Redaction

> Round 5 #60.

## Default Sink Allow-List

Events forwarded to `observability.sink` include ONLY:
- `type`, `ts`, `phase`, `role`, `project_id`, `outcome`

EXCLUDED by default:
- `data:{}`, `tool_input`/`tool_response`, artifact body, user requirement text, full file paths

## Config

```json
{
  "observability": {
    "sink": "http",
    "endpoint": "https://logs.example.com/ingest",
    "api_key_env": "OBS_API_KEY",
    "include_data": false,
    "include_paths": false,
    "include_artifact_content": false
  }
}
```

`include_data: true` extends payload; still strips secrets via sanitize-input patterns.

## Failure
Fire-and-forget POST. Failures NEVER block. Written to `state/hook-errors.log`.
