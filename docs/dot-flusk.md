# The `.flusk` directory

`.flusk/` needs NO ignore file because machine-local state never lives there —
it lives in `~/.flusk` (store, sessions, logs, benchmarks,
trusted-projects.json) or in the URL/localStorage. Anything in `.flusk/` is
committable by construction: it is the part of how this repository is worked
on that the team shares, the way `.idea/` was meant to be shared.

```
.flusk/
  config.json     # untrusted repo config layer (D1)
  workbench.json  # team UI defaults worth committing (D6)
  specs/*.md      # intent
  runs/*.json     # run configurations (shadow ~/.flusk/runs by name)
  flows/*.json    # flows (project → home → built-ins)
  agents/*.md     # orchestra agent specs
  extensions/*.js # extensions (trust-gated)
  harnesses/*.json# NEW — harness adapters (H3; trust-gated like extensions)
  workspace/      # IDENTITY.md SOUL.md TOOLS.md (replace-per-kind over ~/.flusk/workspace)
```

## config.json

Sections of the config schema, each partial JSON. Layering:
`DEFAULT_CONFIG ← ~/.flusk/config.json (trusted) ← <repo>/.flusk/config.json
(untrusted) ← env` — exactly `loadConfig` in `src/platform/config/config.ts`.
The env layer contributes only `FLUSK_HOME` (relocates the home layer,
`src/platform/paths/paths.ts`). Because a cloned repo authors this file, the
sections in `REPO_STRIPPED` (`config.ts`) are refused from it outright:
`chat.backends`, `doc.servers`, `ui.projectDirs`, `ui.harnessDirs`, and the
whole `watch` section — the last drives unattended spend and `push`, so a repo
must not raise its own caps. The Config window (a project's detail view)
renders the merged result with a per-key origin chip
(`default | home | project | stripped`); a `stripped` chip means the repo
supplied a value and the trust rule refused it — the refused value is never
shown, only the fact of refusal (`src/platform/config/provenance.ts`).

The pre-rename `<repo>/.ah.json` is still read for one release —
`src/platform/config/repo-layer.ts` — and surfaces as a deprecation note in
the resolved view.

## workbench.json

Committable team UI defaults, v1 exactly one field:

```json
{ "defaultRunConfig": "nightly-verify" }
```

Read by `src/features/workbench/workbench-file.repository.ts`. Unknown keys
are ignored with a note in the resolved view, never a refusal — a newer flusk
must open an older repo. The toolbar runner widget uses it last in its
selection precedence: `?rc` (explicit URL) → localStorage (last used on this
machine) → `defaultRunConfig` (team default) → none. Machine-local UI state
(URL search params, theme, last-used run config) never lands here.

## specs/*.md

Intent documents. Scanned by `src/features/specs/`; rendered in the spec
surfaces and offered to run configurations as tasks.

## runs/*.json

Run configurations. Project files shadow `~/.flusk/runs` by name
(`src/features/runconfig/runconfig-files.repository.ts`); the Run
Configurations dialog (`?rc=<name>`) edits both scopes.

## flows/*.json

Flows, resolved project → home → built-ins (`src/features/flows/`). Rendered
in the flows window.

## agents/*.md

Orchestra agent specs (`src/features/orchestra/`).

## extensions/*.js

Extensions, trust-gated: a repo's extensions run only when the repo root is in
`~/.flusk/trusted-projects.json` (`src/features/extensions/`).

## harnesses/*.json

Harness adapters (H3), trust-gated exactly like extensions: always listed,
runnable only from a trusted repo. Resolution by id: builtin ← home ←
project(trusted) — last wins. Rendered in the Harness window.

## workspace/

`IDENTITY.md`, `SOUL.md`, `TOOLS.md` — replace-per-kind over
`~/.flusk/workspace` (`src/features/workspace/`). The project file replaces
the home file of the same kind outright; they never merge.

The Config window's `.flusk` tree (`src/ui/react/projects/DotFluskTree.tsx`)
lists this directory one level deep; every row opens in the file viewer.
