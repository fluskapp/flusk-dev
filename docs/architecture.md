# Architecture

ah owns its whole agent loop. Modules talk to each other only through a
handful of frozen contract files; everything else is replaceable. This page
maps the modules, states the contracts, and is honest about what exists today
versus what is roadmap.

## Module map

- **`src/core`** — the engine. `loop.ts` runs turns until an end reason and
  guarantees exactly one `run:end` and one `memory.postRun` for every outcome;
  `turn.ts` streams one provider completion, records it, and dispatches tool
  calls; `dispatch.ts` executes a tool batch; `steering.ts` queues mid-run
  user feedback; `stop.ts` checks turn/deadline limits; `types.ts` and
  `events.ts` are the shared vocabulary (messages, usage, the event bus).

- **`src/provider`** — the model port. `provider.ts` defines
  `Provider.stream()`; `fake.ts` is the scripted offline provider the test
  suite runs on; `pi-ai.ts`/`pi-ai-map.ts` adapt the real model catalog and
  are the **only** files allowed to import `@earendil-works/pi-ai`;
  `router.ts` + `scores.ts` + `intent.ts` pick a model per task kind
  (plan/code/review/summarize).

- **`src/tools`** — what the agent can do: `bash`, `read`, `write`, `edit`,
  `grep`, `glob`, and `task` (spawn a subagent). `tool.ts` is the contract,
  `registry.ts` validates args against each tool's typebox schema,
  `truncate.ts` caps outputs.

- **`src/safety`** — the unattended-run guardrails. `classify.ts` +
  `classify-rules.ts` conservatively classify shell commands; `paths.ts` is
  the realpath write jail; `git-isolation.ts` puts each run on its own
  branch with per-turn checkpoint commits; `budget.ts` tracks spend and
  deadlines; `ah-policy.ts` composes them behind the `Policy` port in
  `policy.ts`.

- **`src/session`** — durable state. Append-only JSONL files under
  `~/.ah/sessions/<repo-slug>/`, fsynced per entry so a crash loses at most
  the entry being written. `entries.ts` is the format, `store.ts` the file
  handle, `session.ts` the context rebuild, `repair.ts` fixes dangling tool
  calls on resume, `paths.ts` maps repos to session directories (`AH_HOME`
  overrides the root for tests).

- **`src/compaction`** — context management. Estimates tokens, and when the
  context nears the model window, summarizes the dropped prefix with the
  summarize model and rebuilds the context (summary-as-user-message + kept
  tail). Best-effort: a summarize failure never takes the run down.

- **`src/agent`** — assembly. `agent.ts` wires provider, tools, policy,
  session, budget and compaction into a runnable `Agent`;
  `subagent.ts` spawns depth-capped child agents sharing the parent's
  budget; `system-prompt.ts` builds the base system prompt.

- **`src/store`** — the local bitemporal fact store: one append-only JSONL
  log per namespace, visibility computed on every read, compare-and-swap
  guards on write. `types.ts` is the frozen `FactStore` contract; goals,
  watch and verify are built above it and nothing below it grows a third
  method.

- **`src/ui`** — `ah ui`, a loopback-only HTTP dashboard (IntelliJ-styled)
  over the session files: run list, transcript detail, reveal-in-Finder.

- **`src/config`** — `types.ts` is the frozen contract; global config plus
  per-repo `<repo>/.ah.json` sections deep-merged over it (`config.ts`,
  `defaults.ts`): models per task kind, budgets, unattended policy,
  isolation, compaction thresholds.

- **`src/cli`** — `main.ts` parses argv and maps run outcomes to exit codes;
  `run-cmd.ts`/`ui-cmd.ts` implement the commands; `render.ts` is the
  terminal renderer driven purely by events.

## The contracts

Frozen files: `core/types.ts`, `core/events.ts`, `provider/provider.ts`,
`tools/tool.ts`, `safety/policy.ts`, `store/types.ts`, `session/entries.ts`,
`config/types.ts`. Changes to these are architecture decisions, not drive-by
edits.

- **Providers never throw.** `stream()` reports every failure as the final
  `done` event with `stopReason: "error"` (or `"aborted"`). The loop
  therefore has no try/catch around provider calls.
- **Tools throw; the dispatcher converts.** A throw becomes a
  `ToolResultMsg` with `isError: true`. If any call in an assistant batch
  resolves to a `"sequential"` tool (or an unknown tool), the whole batch
  runs sequentially in call order; otherwise calls run concurrently. Results
  are always appended in the original call order, one result per call, even
  on abort.
- **`run:end` fires exactly once**, whatever the outcome. It is where the
  run is closed out: the CLI collects the evidence trail off the same bus
  (`src/core/run-record.ts` — files touched, commands run) and the gate turns
  it into the run's facts of record.
- **Sessions are append-only JSONL** — header, message, compaction, and
  stats entries, fsynced per append; a torn final line is dropped on read.
  Format: `src/session/entries.ts`. The predicates the harness may assert:
  `src/store/facts.ts`.

## Safety model (4 layers)

1. **Command classification** — every bash command is conservatively parsed
   (pipelines, redirects, `sh -c` nesting, curl-into-shell detection) into
   read/write/unknown/deny; unknown commands are denied by default in
   unattended mode (`unattended.onUnknownCommand`). False denials are
   acceptable; false allows are not.
2. **Path jail** — file writes must realpath-resolve inside the repo root
   (or explicitly granted extra roots); everything else is refused.
3. **Git isolation** — runs refuse dirty trees (unless `--allow-dirty`),
   happen on their own `ah/<runId>` branch, and checkpoint-commit after
   every mutating turn, so an autonomous session is always reviewable or
   discardable as one diff. Never pushes, never touches global git config.
4. **Budgets** — max cost (USD), max turns, and an optional wall-clock
   deadline. On breach the agent gets exactly one wrap-up turn to summarize,
   then the run ends with the breach reason.

Subagents are additionally depth-capped (max depth 2) and share the parent's
budget, so children cannot multiply spend.

## Roadmap

- **Phase 1 — done.** The loop, tools, JSONL sessions, steering, CLI against
  FakeProvider, and the IntelliJ-styled `ah ui` dashboard.
- **Phase 2 — done.** The real provider adapter (pi-ai catalog) with model
  routing, the full safety stack (classification, path jail, git isolation,
  budgets), context compaction, subagents, config loading, and resume.
- **Phase 3 — done.** The local fact store: bitemporal facts (goal graphs,
  the attempt ledger, a run's facts of record — the predicate table lives in
  `src/store/facts.ts`), the verification gate (detected verify commands,
  retry-with-evidence, then checking the run's own report against what the
  harness observed), and goal/task graphs worked across sessions.
- **Phase 4 — done.** `ah watch`: the unattended queue loop over open PRs
  and failing CI, worktree-per-item isolation, a fact-based attempt ledger
  with quadratic backoff, nightly caps, and opt-in publishing (`src/watch/`).

### Known gaps

- Nothing generalizes a run's experience beyond its own repository. Every
  fact ah writes belongs to one namespace, and no step reads a finished run
  and proposes a lesson from it, so what one repo learns stays there.
- The Phase 3 adversarial review was cut short; the goal scheduler's edge
  cases and the gate's retry semantics have had less hostile scrutiny than
  the safety layer did.
- `ah watch` queues are GitHub-only (`gh`); other sources mean writing a
  poller returning `WorkItem[]`.
