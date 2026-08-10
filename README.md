# hit

An autonomous coding agent that owns its whole loop.

hit is not a wrapper around another agent CLI. It runs its own
turn/tool/session engine, keeps every run on an isolated git branch with
per-turn checkpoints, and is built around a memory seam that will bind it to
[abagraph](https://github.com/adirbenyossef/abagraph) — so what it learns
about your repos (conventions, verify commands, cross-repo lessons, goal
graphs) persists as bitemporal facts instead of evaporating with the context
window.

Design goals:

- **Own the loop.** Small core, frozen contracts between modules, no
  framework. The engine is a few hundred lines you can actually read.
- **Safe unattended.** Command classification, a filesystem write jail,
  git-branch isolation, and hard budgets — designed for runs nobody is
  watching.
- **Everything on disk.** Sessions are append-only, fsynced JSONL files.
  Crash mid-run, lose at most one entry, resume from where you were.
- **Offline-testable.** The entire suite runs against a scripted fake
  provider: no network, no API keys.

## Quickstart

Requires Node >= 22.

```bash
npm i
npm run build
node dist/cli/main.js run "demo"     # offline demo run (scripted fake provider)
node dist/cli/main.js ui             # dashboard over your sessions
```

(`npm link` gives you a global `hit` command instead of `node dist/cli/main.js`.)

`hit run` today drives the engine end to end — loop, tools, policy, JSONL
session, renderer — against the built-in fake script, so it works with no API
key. The real-provider path (Anthropic models via the pi-ai catalog, using
`ANTHROPIC_API_KEY`) is wired through the engine and is being connected to
the CLI in Phase 2.

## Commands

```
hit run <task> [--repo <path>] [--fake <script.json>] [--max-turns <n>] [--quiet]
hit ui [--port <n>] [--no-open]
hit resume <session>
```

- **`hit run <task>`** — run one task. `--repo` selects the working
  directory (default: cwd); `--max-turns` caps the loop; `--quiet` silences
  the streaming renderer; `--fake` replays a JSON array of scripted
  assistant turns (how the demo and tests work). Exit code 0 only when the
  run ends `completed`.
- **`hit ui`** — IntelliJ-styled dashboard over `~/.hit/sessions/`
  (loopback-only HTTP; `--port`, default 4877; `--no-open` skips opening the
  browser). Run list, full transcripts, reveal-in-Finder.
- **`hit resume <session>`** — continue a stopped or crashed session;
  currently a stub, landing with the rest of the Phase 2 CLI.

The Phase 2 CLI surface being wired up on top of the engine (which already
supports all of it internally): `hit resume` for real, `hit feedback` (steer
a live run), `hit runs` (list sessions), and real-provider flags for
`hit run` — `--model`, `--kind` (plan|code|review|summarize routing),
`--max-cost`, `--for` (deadline), `--dry`, `--no-isolation`, `--allow-dirty`.

## Safety model

Four layers, all on by default for unattended runs:

1. **Command classification** — bash commands are conservatively parsed
   (pipelines, redirects, `sh -c` nesting, curl-piped-to-shell detection);
   anything not provably safe is denied rather than guessed at.
2. **Write jail** — file writes must resolve inside the repo root.
3. **Git isolation** — a run refuses a dirty tree, works on its own
   `hit/<runId>` branch, and checkpoint-commits every mutating turn (with the
   repo's own git hooks disabled), so you review or discard the whole session
   as one diff. `git push` is blocked at the command classifier; hit is not a
   network sandbox, so an allowed interpreter could still reach the network.
4. **Budgets** — max cost, max turns, optional deadline; on breach the agent
   gets one wrap-up turn to summarize, then stops.

Subagents are depth-capped and share their parent's budget.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the module map,
contracts, and roadmap. The short version: `core` (loop/turns/dispatch),
`provider` (model port; only `provider/pi-ai*.ts` may import the pi-ai SDK),
`tools`, `safety`, `session` (JSONL), `compaction`, `agent` (assembly),
`memory` (the abagraph seam — Phase 3), `ui`, `config`, `cli`. Two contracts
worth knowing everywhere: providers never throw (failures are messages with
`stopReason: "error"`), and tools throw while the dispatcher converts throws
into model-visible error results.

## Status

Phase 1 (engine, tools, sessions, CLI, dashboard) and Phase 2 (real provider
adapter, routing, safety stack, compaction, subagents, resume machinery) are
in the tree. Phase 3 (abagraph memory, verification gate, goal graphs) and
Phase 4 (`hit watch`, unattended PR/CI queue) are roadmap — see
[`docs/architecture.md`](docs/architecture.md#roadmap).

## License

Apache-2.0 — see [LICENSE](LICENSE). Copyright 2026 Adir Ben Yossef.
