# hit

An autonomous coding agent with [abagraph](../abagraph) as its brain.

hit owns its whole agent loop (inspired by prime-agent, not wrapping any
agent CLI) and stores everything it learns — repo conventions, verify
commands, goal graphs, cross-repo lessons — as bitemporal facts in abagraph.

```bash
hit run "fix the failing test"     # one task, verified before it may claim done
hit ui                             # IntelliJ-styled dashboard over ~/.hit sessions
hit resume <session>               # continue after a crash or stop
hit goal "migrate to ESM"          # decompose into a task graph, work it across sessions
hit watch                          # unattended: open PRs + failing CI, overnight
```

## Architecture

- `src/core` — the loop: turns, tool dispatch, steering, stop conditions
- `src/provider` — provider port; `pi-ai.ts` is the only file importing `@earendil-works/pi-ai`
- `src/tools` — bash, read, write, edit, grep, glob, task (subagents)
- `src/safety` — command classification, path jail, git-branch isolation, budgets
- `src/session` — append-only JSONL sessions under `~/.hit/sessions/`
- `src/memory` — the `MemoryPort` seam; abagraph client, context weave, digestion
- `src/verify` — verify-command detection, retry-with-evidence gate, claim checking
- `src/goals` — goal/task graphs stored as facts in abagraph
- `src/watch` — unattended queue loop (gh PRs, failing CI) with fact-based cooldowns

Contracts worth knowing: providers never throw (errors are messages with
`stopReason: "error"`); tools throw and the dispatcher converts to error
results; parallel tool results always land in call order; memory context is
injected on first turn and resume only. Predicate vocabulary: `docs/vocabulary.md`.
