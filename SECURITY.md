# Security

flusk runs an autonomous coding agent against your repositories, so its
security model is not an afterthought — it is the product. This page says
what the model is, and how to tell us when you get past it.

## The four-layer safety model

1. **Command classification** (`src/features/safety/classify*.ts`). Every
   bash command an unattended run wants to execute is conservatively parsed
   and classified before it runs; unknown commands are denied by default
   (`unattended.onUnknownCommand: "deny"`). The classifier is deliberately
   TypeScript and deliberately boring: its value is that it has been read.
2. **Filesystem write jail** (`src/features/safety/paths.repository.ts`).
   Writes resolve through realpath and must land inside the run's declared
   write roots. Symlinks out of the jail are followed to their target and
   refused there.
3. **Git-branch isolation** (`src/features/safety/git-isolation.repository.ts`).
   Every run happens on its own `flusk/<runId>` branch with per-turn
   checkpoint commits, hooks disabled (`core.hooksPath=/dev/null`,
   `--no-verify`) so a repository's own hooks cannot bypass classification.
   All operations are local; flusk never pushes unless you opt in to
   `watch.push`.
4. **Hard budgets** (`src/features/safety/budget.ts`). Turns, dollars and
   wall-clock deadlines end a run that classification alone would let wander.

Two further boundaries matter in the workbench:

- **Repo-layer config distrust** (`src/platform/config/config.ts`): a cloned
  repository's `.flusk/config.json` cannot name chat backends, language
  servers, or the directories the history indexer reads and serves.
- **Prompt-injection fencing** (`src/features/context/render.ts`): everything
  quoted into a prompt sits inside `<<<FLUSK-CONTEXT ...>>>` fences, and the
  sentinel is neutralised inside quoted bodies so a document cannot close the
  quotation it was placed in and continue as instructions.

## Reporting a vulnerability

If you find a way through any of these layers — a command the classifier
misjudges, a write that escapes the jail, a fence that can be closed from
data, a way for a repo to influence what the workbench executes — please
report it privately.

- Email: security@flusk.dev
- Or open a GitHub security advisory (Security → Advisories → New draft)
  on the repository.

Please include a minimal reproduction. We aim to acknowledge within 72
hours. Please do not open public issues for suspected vulnerabilities.

## Scope notes

- Runs you start with `--no-isolation`, `--allow-dirty` or a permissive
  policy are explicitly outside the unattended guarantees.
- The fake provider (`--fake`) executes scripted tool calls; the safety
  layers still apply to them.
