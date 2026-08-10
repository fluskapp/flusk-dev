# Architecture

hit owns its whole agent loop. Modules talk to each other only through a
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
  deadlines; `hit-policy.ts` composes them behind the `Policy` port in
  `policy.ts`.

- **`src/session`** — durable state. Append-only JSONL files under
  `~/.hit/sessions/<repo-slug>/`, fsynced per entry so a crash loses at most
  the entry being written. `entries.ts` is the format, `store.ts` the file
  handle, `session.ts` the context rebuild, `repair.ts` fixes dangling tool
  calls on resume, `paths.ts` maps repos to session directories (`HIT_HOME`
  overrides the root for tests).

- **`src/compaction`** — context management. Estimates tokens, and when the
  context nears the model window, summarizes the dropped prefix with the
  summarize model and rebuilds the context (summary-as-user-message + kept
  tail). Best-effort: a summarize failure never takes the run down.

- **`src/agent`** — assembly. `agent.ts` wires provider, tools, policy,
  session, budget, compaction, and memory into a runnable `Agent`;
  `subagent.ts` spawns depth-capped child agents sharing the parent's
  budget; `system-prompt.ts` builds the base system prompt.

- **`src/memory`** — today, only the seam. `port.ts` defines `MemoryPort`
  and ships `noopMemory`. The abagraph-backed implementation (Phase 3) is
  injected here; core never imports the abagraph SDK.

- **`src/ui`** — `hit ui`, a loopback-only HTTP dashboard (IntelliJ-styled)
  over the session files: run list, transcript detail, reveal-in-Finder.

- **`src/config`** — `types.ts` is the frozen contract; global config plus
  per-repo `<repo>/.hit.json` sections deep-merged over it (`config.ts`,
  `defaults.ts`): models per task kind, budgets, unattended policy,
  isolation, compaction thresholds.

- **`src/cli`** — `main.ts` parses argv and maps run outcomes to exit codes;
  `run-cmd.ts`/`ui-cmd.ts` implement the commands; `render.ts` is the
  terminal renderer driven purely by events.

## The contracts

Frozen files: `core/types.ts`, `core/events.ts`, `provider/provider.ts`,
`tools/tool.ts`, `safety/policy.ts`, `memory/port.ts`, `session/entries.ts`,
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
- **MemoryPort is the brain seam.** `preTurn` may inject a memory block on
  the first turn and on resume (null otherwise); `postRun` is called exactly
  once after `run:end` regardless of outcome, with the run's evidence trail
  (files touched, commands run, transcript tail); `tools()` contributes
  memory tools. Core ships `noopMemory` and never imports the abagraph SDK.
- **Sessions are append-only JSONL** — header, message, compaction, and
  stats entries, fsynced per append; a torn final line is dropped on read.
  Format: `src/session/entries.ts`. Fact vocabulary for the Phase 3 memory:
  `docs/vocabulary.md`.

## Safety model (4 layers)

1. **Command classification** — every bash command is conservatively parsed
   (pipelines, redirects, `sh -c` nesting, curl-into-shell detection) into
   read/write/unknown/deny; unknown commands are denied by default in
   unattended mode (`unattended.onUnknownCommand`). False denials are
   acceptable; false allows are not.
2. **Path jail** — file writes must realpath-resolve inside the repo root
   (or explicitly granted extra roots); everything else is refused.
3. **Git isolation** — runs refuse dirty trees (unless `--allow-dirty`),
   happen on their own `hit/<runId>` branch, and checkpoint-commit after
   every mutating turn, so an autonomous session is always reviewable or
   discardable as one diff. Never pushes, never touches global git config.
4. **Budgets** — max cost (USD), max turns, and an optional wall-clock
   deadline. On breach the agent gets exactly one wrap-up turn to summarize,
   then the run ends with the breach reason.

Subagents are additionally depth-capped (max depth 2) and share the parent's
budget, so children cannot multiply spend.

## Roadmap

- **Phase 1 — done.** The loop, tools, JSONL sessions, steering, CLI against
  FakeProvider, and the IntelliJ-styled `hit ui` dashboard.
- **Phase 2 — done.** The real provider adapter (pi-ai catalog) with model
  routing, the full safety stack (classification, path jail, git isolation,
  budgets), context compaction, subagents, config loading, and resume.
- **Phase 3 — done.** The abagraph-backed `MemoryPort`: bitemporal facts
  (repo conventions, verify commands, cross-repo lessons — see
  `docs/vocabulary.md`), the verification gate (detected verify commands,
  retry-with-evidence, then claim-checking the run's own report), and
  goal/task graphs worked across sessions. Server behavior this depends on
  is written down in `docs/abagraph-notes.md` — read it before changing the
  transport.
- **Phase 4 — done.** `hit watch`: the unattended queue loop over open PRs
  and failing CI, worktree-per-item isolation, a fact-based attempt ledger
  with quadratic backoff, nightly caps, opt-in publishing, and lesson
  promotion gated on an `ALLOW` verdict (`src/watch/`).

### Known gaps

- The Phase 3 adversarial review was cut short; the goal scheduler's edge
  cases and the gate's retry semantics have had less hostile scrutiny than
  the safety layer did.
- Memory is exercised against a mock that mirrors the abagraph source. There
  is no test against a live abagraph binary.
- `hit watch` queues are GitHub-only (`gh`); other sources mean writing a
  poller returning `WorkItem[]`.
