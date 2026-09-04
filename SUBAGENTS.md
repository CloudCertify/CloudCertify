# Subagent routing

Delegate by task complexity. The parent agent owns the final decision.

| Complexity | Model | Use for |
| --- | --- | --- |
| Very simple | `cursor/gpt-5.6-luna@272k:high` | Small lookups, tiny edits, formatting, and obvious fixes |
| Medium | `cursor/grok-4.6:medium` | Normal implementation, debugging, tests, and code review |
| Complex | `cursor/gpt-5.6-sol@272k:medium` | Cross-cutting work, architecture, hard bugs, and ambiguous tasks |
| Complex but bounded | `cursor/gpt-5.6-sol@272k:low` | Web research, context gathering, and well-defined orchestration steps |

## Rules

1. Pick the lowest complexity tier that can solve the task.
2. Use Sol for web work and multi-agent orchestration, even when each step looks simple.
3. Split large tasks into bounded children. Keep one writer per checkout or isolate writers in worktrees.
4. Escalate failed or uncertain work from Luna to Grok, then Sol. Do not repeat the same prompt at the same tier.
5. For disagreements, trust tests, source code, and specifications before model opinions. If evidence is still unclear, ask the next tier to review the exact disputed claims.
6. The parent accepts, rejects, or asks the user. Subagents advise and execute; they do not make product or scope decisions.

Use one async `workflowScript` for coordinated work. Run independent read-only tasks in parallel. Give each child a clear goal, scope, validation step, and expected output.
