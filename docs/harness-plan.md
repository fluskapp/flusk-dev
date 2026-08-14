# The harness plan — an IDE for running agents you can defend to a senior engineer

Three pillars, each turning something flusk already records into something a
reviewer can act on, plus one that keeps the installation healthy without a
human driving it.

## A. Decisions — every run explains itself

The data already exists and is already honest: every context block carries a
`why` (frozen contract, never empty), `context:built` reports every source
including the ones that found nothing, the router picks models from measured
scores, the gate writes verdict facts, and checkpoints name their turns. What
is missing is ONE surface that assembles them.

- `decisions.ts` in features/run: the DecisionLog — model choice (and what it
  was chosen FROM), context report (kept/omitted per source, budget spent),
  isolation plan, gate chain with verdicts, per-turn checkpoint trail.
- `flusk explain <run>` in the CLI and a Decisions tab on the run page: the
  same object, rendered. A senior engineer reads it top to bottom and every
  line names its evidence (file, fact, event).
- Run control from the workbench: start (fake or real, policy identical to
  the CLI's), steer, abort — the IDE half of "harness running".

## B. Containers — the same run, locally or in the cloud

Isolation today is a git branch. The container runtime adds process/OS
isolation with ONE seam and no new trust:

- `features/containers/`: `docker.repository.ts` (the only file that spawns
  `docker`), devcontainer.json discovery, a per-repo container lifecycle
  (up/exec/down), and `runtime.ts` — an Executor the bash tool can be handed.
- The bash tool grows an injectable executor: default is today's `/bin/sh`
  spawn, a container executor routes the same command through `docker exec`.
  The command classifier runs BEFORE either — the security boundary does not
  move.
- Local vs cloud is a Docker *context* (`docker context use`, ssh:// or a
  cloud engine): config names it (`containers.context`), the repository
  passes `--context`. Same interface, same tests, no separate cloud code path.
- `flusk container up|status|down`, `flusk run --container` to opt a run in.

## C. Self-maintenance — the setup that keeps itself current

- `flusk doctor`: named checks (node/git/docker versions, prebuilt present
  and current vs the crate, config parses, index freshness, store lock
  health, orphaned session locks), each with a pass/fail and the exact fix
  command. Written as facts (`Setup:` subjects) so the workbench Attention
  panel surfaces regressions.
- `flusk maintain`: the nightly tick — doctor + history index refresh +
  store sweep + lessons promotion, each step recorded with outcome facts and
  a journal entry, budget-capped like watch. Designed to run from launchd/
  cron/CI; the workbench shows the last maintenance run beside every other
  run because it IS a run record.

## Order

A (decisions + run control) → B (containers) → C (doctor + maintain).
Each phase lands with tests, gates green, and a commit that argues for
itself. This document is the map a reviewer starts from.
