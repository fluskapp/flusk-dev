# flusk

An autonomous coding agent that owns its whole loop.

flusk is not a wrapper around another agent CLI. It runs its own
turn/tool/session engine, keeps every run on an isolated git branch with
per-turn checkpoints, and writes what it learns about your repos (verify
commands, cross-repo lessons, goal graphs, the unattended ledger) to a local
bitemporal fact store, so that knowledge outlives the context window.

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

(`npm link` gives you a global `flusk` command instead of `node dist/cli/main.js`.)

Real runs use the pi-ai model catalog and need a provider key
(`ANTHROPIC_API_KEY` for the defaults); `--fake` replays a scripted transcript
instead, which is how the demo and the whole test suite run without a key or a
network. `--dry` composes and prints the prompt, model, and isolation plan
without calling anything.

The fact store is local files under `~/.flusk/store` — no server, nothing to
reach. Setting `memory.enabled: false` is a request to leave no trace: `flusk run`
and `flusk resume` proceed and record nothing, while `flusk goal` and `flusk watch`,
whose subject matter IS the stored state, refuse to start.

## Commands

```
flusk run <task> [--model <provider/id>] [--kind <plan|code|review|summarize>]
               [--max-cost <usd>] [--for <2h|30m>] [--max-turns <n>] [--repo <path>]
               [--dry] [--no-isolation] [--allow-dirty] [--no-verify] [--quiet]
               [--fake <script.json>]
flusk resume <path-or-id> [--steer <msg>] [--no-verify] [--quiet]
flusk goal <text> [--repo <path>] [--dry] [--no-verify]
flusk goal --list [--repo <path>]
flusk watch [--repo <path>] [--once]
flusk feedback <good|bad>
flusk workspace <init|show|path> [--project]
flusk runs [-n <count>]
flusk ui [--port <n>] [--no-open]
```

- **`flusk run <task>`** — run one task. `--repo` selects the working
  directory (default: cwd); `--max-turns` caps the loop; `--quiet` silences
  the streaming renderer; `--fake` replays a JSON array of scripted
  assistant turns (how the demo and tests work). Exit code 0 only when the
  run ends `completed`.
- **`flusk ui`** — IntelliJ-styled dashboard over `~/.flusk/sessions/`
  (loopback-only HTTP; `--port`, default 4877; `--no-open` skips opening the
  browser). Panels: **sessions** (list + full transcripts), **Overview**
  (`o`) — stat tiles, recent activity across sessions and harness runs,
  repos and harnesses; **Runs** (`n`) — live pipeline view of other
  harnesses' run journals, read from the `docs/runs/*.md` files they already
  write, so a watch autopilot can be followed here; **Docs** (`d`) — every
  markdown file across your projects (context files, plans, skills, docs)
  with a rendered preview.

  Configure what is indexed with `ui.harnessDirs` and `ui.projectDirs` in
  `~/.flusk/config.json`; both default to `~/projects/*` and
  `~/projects/playground/*`. The markdown renderer is dependency-free and
  escapes its input before rendering, so an indexed document cannot inject
  markup into the dashboard.
- **`flusk resume <path-or-id>`** — continue a stopped or crashed session,
  repairing any tool call left dangling by the interruption. `--steer` adds
  a new instruction on the way back in.
- **`flusk goal <text>`** — decompose a goal into a task graph stored in the
  fact store, then work the frontier task by task across sessions.
- **`flusk watch`** — unattended queue mode (see below).
- **`flusk feedback good|bad`** — score the last run's model for its task kind;
  routing learns from it.
- **`flusk runs`** — recent sessions with status, turns, and cost.
- **`flusk workspace`** — scaffold (`init`), inspect (`show`) or locate (`path`)
  the prompt workspace (see below).

## Workspace

flusk's prompt is not only flusk's. Three markdown files you own are injected into
every system prompt, so behaviour is tuned by editing files rather than
TypeScript:

| file | section | what it is for |
| --- | --- | --- |
| `IDENTITY.md` | `## Identity` | who the agent is and how it should sound |
| `SOUL.md` | `## Hard constraints` | the lines it may never cross |
| `TOOLS.md` | `## Tool guidance` | how to use the toolbelt in your world |

They are read from `~/.flusk/workspace/` (global), then `<repo>/.flusk/workspace/`
which **replaces** the global file of the same name, then the repository's own
`AGENTS.md` — or `CLAUDE.md`, or both when both exist — as
`## House rules for this repository`. The rules your team already wrote are
therefore in front of the agent that edits your code, with no extra step.

**`SOUL.md` wins over the task.** Its section says so in the prompt: if a task
needs a constraint crossed, the agent does the rest and names the line that
stopped it. Every section is preceded by a comment naming the file it came
from, so any rule in a transcript can be traced back to the file to edit.

Files are capped at 6000 characters each and 16000 in total, cut at a line
boundary and marked `(truncated)`. Every file is run through the same secret
scrubber as indexed history, so a token pasted into your notes does not ride
along into a request. Missing files are normal; with none present the prompt
is exactly what it was before.

```bash
flusk workspace init            # ~/.flusk/workspace/{IDENTITY,SOUL,TOOLS}.md, never overwriting
flusk workspace init --project  # <repo>/.flusk/workspace/… instead
flusk workspace show            # what is loaded, from where, and what is absent
flusk run "…" --dry             # see the assembled prompt
```

## Verification

A run does not get to declare victory. When the repo has verify commands —
from `.flusk/config.json`, or auto-detected from `package.json` scripts, `Cargo.toml`,
or a `Makefile` — flusk runs them at the end. Failures come back to the agent as
evidence to fix, up to a retry limit. Then flusk checks the agent's closing **report** against what it actually
observed — which commands ran, which exited zero, which files the tools
wrote. A report claiming "all tests pass" when nothing was verified is
`blocked`: exit 1, with the code left on its branch for you to look at.

This deliberately checks the one thing the model authored against evidence it
cannot forge. It runs even when memory is down, and it errs toward blocking:
a false block costs one run, a false pass ships a lie unattended.

## Safety model

Four layers, all on by default for unattended runs:

1. **Command classification** — bash commands are conservatively parsed
   (pipelines, redirects, `sh -c` nesting, curl-piped-to-shell detection);
   anything not provably safe is denied rather than guessed at.
2. **Write jail** — file writes must resolve inside the repo root.
3. **Git isolation** — a run refuses a dirty tree, works on its own
   `flusk/<runId>` branch, and checkpoint-commits every mutating turn (with the
   repo's own git hooks disabled), so you review or discard the whole session
   as one diff. `git push` is blocked at the command classifier; flusk is not a
   network sandbox, so an allowed interpreter could still reach the network.
4. **Budgets** — max cost, max turns, optional deadline; on breach the agent
   gets one wrap-up turn to summarize, then stops.

Subagents are depth-capped and share their parent's budget.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the module map,
contracts, and roadmap. The short version: `core` (loop/turns/dispatch),
`provider` (model port; only `provider/pi-ai*.ts` may import the pi-ai SDK),
`tools`, `safety`, `session` (JSONL), `compaction`, `agent` (assembly),
`store` (the bitemporal fact store), `verify`, `goals`, `watch`, `ui`,
`config`, `cli`. Two contracts
worth knowing everywhere: providers never throw (failures are messages with
`stopReason: "error"`), and tools throw while the dispatcher converts throws
into model-visible error results.

## Unattended mode

```bash
flusk watch            # poll queues, work the oldest item, repeat
flusk watch --once     # a single tick
```

`flusk watch` polls GitHub through `gh` (open PRs, failing CI runs), works the
oldest eligible item in its **own git worktree**, and records what happened as
facts. That ledger is what makes it safe to leave running: an item that was
just attempted is resting on a cooldown, and a failing one backs off
quadratically, so the loop can never storm the same item. Nightly run counts,
per-run cost, and wall-clock are all capped.

The ledger is **required** here — without it there is nothing stopping a retry
loop. With `memory.enabled: false`, `flusk watch` refuses to start rather than run
unbounded, and so does `flusk goal`, whose task graph is itself stored facts.

Pushing is **off by default** (`watch.push`): a night's work stays on local
branches for you to review. Turn it on to have flusk push and open PRs.

## Status

Phases 1–4 are in the tree: the engine (loop, tools, sessions, dashboard), the
real provider stack (routing, safety, compaction, subagents, resume), the fact
store with the verification gate and goal graphs, and unattended `flusk watch`.
Nothing yet carries what a run learns from one repository to another. See
[`docs/architecture.md`](docs/architecture.md) for the module map.

## License

Apache-2.0 — see [LICENSE](LICENSE). Copyright 2026 Adir Ben Yossef.
