# Contributing to ah

Thanks for wanting to help. ah is small on purpose — most of the value is in
its contracts staying stable, so please read this page before opening a PR.

## Dev setup

- Node >= 22 (ESM, `NodeNext` resolution — relative imports end in `.js`)
- `npm i`
- `npm test` — the whole suite is offline: FakeProvider scripts, temp dirs via
  `fs.mkdtemp`, `AH_HOME` pointed at scratch space. No network, no API keys.
- `npm run check` — strict TypeScript, no emit
- `npm run standards` — file-size cap and dependency-boundary lint
- `npm run build` then `node dist/cli/main.js …` to try the CLI

## Frozen contracts

These files are the seams between modules. Changing any of them is an
architecture decision — open an issue and get agreement first; never change
them as a drive-by inside a feature PR:

- `src/core/types.ts` — messages, usage, stop/end reasons
- `src/core/events.ts` — the event bus and `AhEvent` shapes
- `src/provider/provider.ts` — the Provider port
- `src/tools/tool.ts` — the Tool interface and dispatch semantics
- `src/safety/policy.ts` — the Policy port
- `src/store/types.ts` — the FactStore contract
- `src/session/entries.ts` — the on-disk JSONL session format
- `src/config/types.ts` — the config contract

## Standards

- **File size**: one concern per file, aim for <= ~100 lines, hard cap 150
  (enforced by `npm run standards`). If a file wants to grow past that, it is
  two files.
- **Dependencies**: `node:` builtins, `typebox`, and `@earendil-works/pi-ai`
  only. pi-ai may be imported **only** from `src/provider/pi-ai*.ts`; the rest
  of the codebase uses ah's own types. The pi-ai `/compat` entrypoint is
  banned everywhere.
- Tabs for indentation; Biome for formatting.

## The two error contracts

They point in opposite directions — keep them straight:

- **Providers never throw.** `Provider.stream()` reports every failure
  (request, model, runtime, abort) as its final `done` event whose message has
  `stopReason: "error"` (or `"aborted"`). This is why the core loop has no
  try/catch around provider calls. A provider adapter that throws is a bug.
- **Tools throw.** A tool signals failure by throwing; the dispatcher
  (`src/core/dispatch.ts`) catches it and converts it into a tool result with
  `isError: true`, which the model sees and can react to. Tools should not
  hand-craft error results.

## Adding a tool

1. Implement the `Tool` interface from `src/tools/tool.ts`: `name`,
   `description`, a typebox `parameters` schema, `mode`, and `execute`.
2. Pick `mode` honestly: `"sequential"` for anything that mutates state
   (bash, write, edit) — one sequential tool in a batch forces the whole
   batch to run in call order; `"parallel"` for pure reads (read, grep,
   glob), which may run concurrently. Either way, results are appended in
   the original call order.
3. Ask the `Policy` (via `ctx.policy.decide`) before dangerous acts and throw
   on denial — the dispatcher turns that into the model-visible error.
4. Register it where agents are assembled (the `tools` array passed to
   `createAgent`) and add an offline test under `test/`.

## Tests

- Everything lives in `test/`; reuse the fake-run helpers in
  `test/helpers.ts`.
- Temp dirs come from `fs.mkdtemp`; session paths are redirected with the
  `AH_HOME` env var. `git init`/`add`/`commit` are fine **inside** those
  scratch repos (set `user.email`/`user.name` locally); never run mutating
  git against the ah checkout itself.
- Do not weaken or delete existing tests to make a change pass.

## Running the dashboard

```bash
npm run build
node dist/cli/main.js ui        # serves http://127.0.0.1:4877, opens browser on macOS
```

`ah ui` reads sessions from `~/.ah/sessions/` (or `$AH_HOME/sessions/`).
Run a task first — e.g. `node dist/cli/main.js run "demo"` — so there is
something to look at.
