# Comparison with Alternatives

> Round 9 #104. Honest positioning.

| Tool | Stars | Abstraction | Strength | Why not us? |
|---|---|---|---|---|
| Solomon Agent | new | CEO + 10 fixed roles | Charter escalation; Thai L10N | Unproven |
| mbruhler/claude-orchestration | 215 | `.flow` DSL | Community registry | Declarative ≠ open-ended CEO loop |
| bobmatnyc/claude-mpm | — | PM + 47 specialists | SDK + channel hub | No CEO persona; more agents = more drift |
| josephneumann/claude-corps | 2 | `/dispatch` + git worktree | Autonomous `/auto-run` | No charters; less structured |
| suxxes/resin.ai | 2 | State-machine + hierarchy | Hierarchical TDD | Heavier ceremony |
| barkain/claude-code-workflow-orchestration | — | Plan-mode + Agent Teams | Native `TeamCreate`/`SendMessage` | Workflow-shaped, not company-shaped |
| LangGraph | — | DAG engine | Not Claude Code-native | Different runtime |
| CrewAI | — | Multi-agent | Cross-LLM | Not Claude Code plugin |
| AutoGen | — | Conversational | Research-focused | Not production |

## Choose Solomon Agent if
- Want one slash command end-to-end
- Think in org-chart roles
- Need 14 explicit escalation conditions
- Want Thai native L10N
- Want HMAC-audited event log

## Borrowed Ideas
- ECC plugin layout
- mbruhler: autonomous loop + crash recovery
- josephneumann: `isolation:"worktree"` for parallel BUILD
- resin.ai: explicit role specialization
- barkain: native `TeamCreate`/`SendMessage` mode detection
