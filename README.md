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

Real runs use the pi-ai model catalog and need a provider key
(`ANTHROPIC_API_KEY` for the defaults); `--fake` replays a scripted transcript
instead, which is how the demo and the whole test suite run without a key or a
network. `--dry` composes and prints the prompt, model, and isolation plan
without calling anything.

Memory is optional: with no abagraph reachable, `hit run` prints one warning
and proceeds without it. `hit watch` is the exception and requires it.

## Commands

```
hit run <task> [--model <provider/id>] [--kind <plan|code|review|summarize>]
               [--max-cost <usd>] [--for <2h|30m>] [--max-turns <n>] [--repo <path>]
               [--dry] [--no-isolation] [--allow-dirty] [--no-verify] [--quiet]
               [--fake <script.json>]
hit resume <path-or-id> [--steer <msg>] [--no-verify] [--quiet]
hit goal <text> [--repo <path>] [--dry] [--no-verify]
hit goal --list [--repo <path>]
hit watch [--repo <path>] [--once]
hit feedback <good|bad>
hit runs [-n <count>]
hit ui [--port <n>] [--no-open]
```

- **`hit run <task>`** — run one task. `--repo` selects the working
  directory (default: cwd); `--max-turns` caps the loop; `--quiet` silences
  the streaming renderer; `--fake` replays a JSON array of scripted
  assistant turns (how the demo and tests work). Exit code 0 only when the
  run ends `completed`.
- **`hit ui`** — IntelliJ-styled dashboard over `~/.hit/sessions/`
  (loopback-only HTTP; `--port`, default 4877; `--no-open` skips opening the
  browser). Run list, full transcripts, reveal-in-Finder.
- **`hit resume <path-or-id>`** — continue a stopped or crashed session,
  repairing any tool call left dangling by the interruption. `--steer` adds
  a new instruction on the way back in.
- **`hit goal <text>`** — decompose a goal into a task graph stored in
  abagraph, then work the frontier task by task across sessions.
- **`hit watch`** — unattended queue mode (see below).
- **`hit feedback good|bad`** — score the last run's model for its task kind;
  routing learns from it.
- **`hit runs`** — recent sessions with status, turns, and cost.

## Verification

A run does not get to declare victory. When the repo has verify commands —
from `.hit.json`, or auto-detected from `package.json` scripts, `Cargo.toml`,
or a `Makefile` — hit runs them at the end. Failures come back to the agent as
evidence to fix, up to a retry limit. Once they pass, hit checks the agent's
own report against the facts it recorded itself: a claim of "tests pass" with
no matching `verified_by` fact is BLOCKed rather than believed.

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
`memory` (the abagraph seam), `verify`, `goals`, `watch`, `ui`, `config`,
`cli`. Two contracts
worth knowing everywhere: providers never throw (failures are messages with
`stopReason: "error"`), and tools throw while the dispatcher converts throws
into model-visible error results.

## Unattended mode

```bash
hit watch            # poll queues, work the oldest item, repeat
hit watch --once     # a single tick
```

`hit watch` polls GitHub through `gh` (open PRs, failing CI runs), works the
oldest eligible item in its **own git worktree**, and records what happened as
facts. That ledger is what makes it safe to leave running: an item that was
just attempted is resting on a cooldown, and a failing one backs off
quadratically, so the loop can never storm the same item. Nightly run counts,
per-run cost, and wall-clock are all capped.

Memory is **required** here — the ledger lives in abagraph, and without it
there is nothing stopping a retry loop. `hit watch` refuses to start rather
than run unbounded.

Pushing is **off by default** (`watch.push`): a night's work stays on local
branches for you to review. Turn it on to have hit push and open PRs.

Lessons only graduate from a repo's namespace into the shared `lessons`
namespace when the run that produced them passed verification with an `ALLOW`
verdict — an unverified guess never becomes cross-repo advice.

## Status

Phases 1–4 are in the tree: the engine (loop, tools, sessions, dashboard), the
real provider stack (routing, safety, compaction, subagents, resume), abagraph
memory with the verification gate and goal graphs, and unattended `hit watch`
with lesson promotion. See [`docs/architecture.md`](docs/architecture.md) for
the module map and [`docs/abagraph-notes.md`](docs/abagraph-notes.md) for the
server behavior the memory layer depends on.

## License

Apache-2.0 — see [LICENSE](LICENSE). Copyright 2026 Adir Ben Yossef.
