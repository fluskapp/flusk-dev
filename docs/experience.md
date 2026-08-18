# The experience — one sentence per surface, or the surface dies

The workbench grew ten tool windows because three branches each grew their
own. This document is the information architecture that survives: what each
number means, and where every capability lives. A window that cannot state
its sentence gets merged.

## The toolbar, finally

| # | Window | The sentence |
| --- | --- | --- |
| 1 | Projects | What you have. |
| 2 | Specs | What you intend — the driving surface of spec-driven work. |
| 3 | Runs | What happened: sessions, harness journals AND flow runs, one table. |
| 4 | Find | Find text in your files. |
| 5 | Chat | Talk — with your code, with a spec, with a run. Context rides as visible attachments. |
| 6 | Docs | Read your own indexed markdown. |
| 7 | Graph | What am I about to break. |
| 8 | Web | Read an external URL beside the code (fetched text is data, loudly). |
| 9 | Documentation | Symbol docs for the code on screen (LSP). |
| 0 | Harness | What runs your code: the loop, its tools, and what it has learned. |

Gone as windows: **Flows** (a flow run IS a run — it is a segment of Runs
now) and **Ask** (talking with your code is what Chat is for; Ask's visible
context card became Chat's attachment block). Their routes redirect.

## Spec-driven development

A spec is a markdown file in your repo — `.flusk/specs/<name>.md` — with
frontmatter the harness reads:

```yaml
---
title: Ship the retry hook
status: draft | planned | building | verifying | done
mode: plan | architecture | refactor | build
acceptance:
  - dispatch retries with backoff, capped at five
  - the journal names every attempt
---
```

The body is yours: context, constraints, sketches. The harness's contract:

- `flusk spec new <name> [--template <t>]` scaffolds one (**factories**).
- `flusk run --spec <name>` starts a run whose task IS the spec — mode maps
  to the routing kind, the acceptance list rides into the prompt, and the
  run records which spec it served as a decision entry, so `flusk explain`
  answers "which intent did this serve".
- The Specs window (2) lists them by status, shows each spec beside the runs
  that served it, and starts runs in a chosen mode.
- **Talk with spec**: Chat attaches the spec as a quoted block — same
  fencing, same distrust, as every other quoted material.

## Where every capability lives

| Ask for | It lives at |
| --- | --- |
| Summary / conclusion of a run | Run page → Summary block: outcome, gate verdicts, files touched, cost — harness-observed, never model-authored |
| Shorten a long message | Transcript items collapse; Chat turns past a threshold fold with "show all" |
| Talk with your code | Chat (5) with a code attachment — the old Ask, kept whole |
| Talk with spec | Chat (5) with a spec attachment |
| Plan / architecture / refactor mode | A spec's `mode:`, honored by `flusk run --spec` and the Specs window |
| Graph and loops | Graph (7) for impact; Harness (0) for the loop's anatomy; flow runs in Runs (3) |
| Harness anatomy | Harness (0) |
| Harness building | `flusk spec new` + verify detection + `docs/harness-plan.md` |
| Observers | `flusk watch` queues; live runs stream over SSE into the workbench |
| Factories | Spec templates (`--template feature|bugfix|refactor`) |
| Singletons | Per-repo: one container, one index, one store namespace — by construction |
| Adapters | Chat backends (`chat.backends`) and orchestra workers (cli/http/internal) |
| Automation | `flusk watch` (nightly work) + `flusk maintain` (self-maintenance) |

Everything in the right column existed before this document; the point of
the document is that now you can find it.
