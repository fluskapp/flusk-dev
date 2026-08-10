# Adversarial review findings (2026-08-11)

Two hostile reviews, one over the memory/verify/goals layer and one over
unattended `hit watch`, both checked against the real abagraph source rather
than hit's mock. They found a systemic problem worth stating up front:

> **The mock is more permissive than the real server, so a green suite is not
> evidence that a memory-dependent feature works.**

Three divergences caused most of the false confidence: the mock ignores
`valid_until` (real: `core/match.rs` hides still-valid-until facts from
default reads), ignores `seeds` in `/api/context` (real: `context/collect.rs`
only collects from seeds + a 1-hop walk), and implements `/api/search` as a
substring scan (real: needs an embedding provider, else returns nothing).

Nothing below is fixed unless it says FIXED. Items are ordered by expected
damage, not by discovery order.

## Corrections to earlier claims

- **"A fabricated 'tests pass' report gets BLOCKed" is false.** The gate builds
  its claims from harness state, not from the agent's report, so every claim
  is self-fulfilling; and missing evidence yields `WARN`
  (`core/truth/decide.rs`), which the gate treats as a pass. The claim check
  as written cannot block anything.
- **"Lesson promotion closes the self-improvement loop" is not yet true.**
  Extracted lessons are written at ≤0.7 confidence, which abagraph parks as
  `Candidate`, and every read path is active-only — so lessons are write-only.
  (The same bug was found and fixed once in `src/watch/promote.ts`; its
  siblings in `src/memory/` were missed.)

## HIGH — money, security, or "the feature does not work"

1. **Untrusted config from the worked checkout (security).**
   `watch-cmd.ts` → `runCmd({ repo: worktreeDir })` → `loadConfig(dir)` merges
   `<worktree>/.hit.json` — content controlled by the PR branch being worked.
   A hostile PR can set `unattended.onUnknownCommand: "allow"` (disabling the
   bash classifier), `verify: ["curl … | sh"]` (executed by the gate), or
   redirect `memory.baseUrl`. **FIXED**: watch resolves config from the
   trusted main tree and passes it into the run.
2. **Cooldowns are invisible to the real server → retry storm.**
   `cooldown_until` facts carry `validUntil`, and a default query requires
   `valid_until.is_none()` (`core/match.rs`), so `isCoolingDown` always
   returned false: the same item would be re-worked every tick until the
   nightly cap burned out. The mock hid this by ignoring `valid_until`.
   **FIXED**: query with `as_of`, keep the timestamp comparison, and make the
   mock honor validity.
3. **Watch runs write memory into a throwaway namespace.** The run's namespace
   is derived from the temporary worktree path, so outcomes and lessons land
   in `repo:hit-wt-<tmp>` — never read again — and `observeRun` (reading the
   real repo namespace) always sees nothing, so `runId` is `""`, the verdict
   is always `WARN`, and promotion can never fire.
4. **CAS task claiming can never succeed on an auth-free server.** Compares are
   stamped with a tenant, asserts land untenanted, so the guard set is always
   empty and every claim 409s. Same root cause as the `/api/context` tenant
   issue in `abagraph-notes.md`, not applied to compares.
5. **Unbounded spin when a claim fails.** `goal-cmd.ts` retries the same
   frontier task with no bound and no delay.
6. **Agent memories and extracted lessons are unreadable** (`memory_remember`,
   digestion, `memory_changes`): written ≤0.7 → `Candidate` → excluded from
   every active-only read path.
7. **Namespace filtering happens after the server's row cap.** Reads default to
   200 rows across *all* tenants and are filtered client-side afterwards, so on
   a shared abagraph a caller can get zero of its own facts. Affects recall,
   the goal scheduler/frontier, `goal --list`, changes, and promotion.
8. **Semantic recall is dead by default.** The spawned server gets no
   `ABAGRAPH_EMBEDDING`, so `/api/search` returns nothing and `memory_recall`
   in semantic mode always answers "no matching memory".
9. **Leftover branch kills the whole night.** `openWorktree` is called outside
   the tick's try/catch and throws when the branch exists (which it always
   does on a second attempt), terminating watch. Fork PRs crash the same way
   because `item.ref` is never fetched.
10. **Nightly cap resets mid-night** (UTC date key), so a night in a non-UTC
    timezone can spend the cap twice.

## MEDIUM

11. Verdict observation can never read `ALLOW`: abagraph writes the audit
    object lowercase, and the audit fact is untenanted so `inNs` drops it.
12. Claims on coexist predicates (`verified_by`, `touched`) degrade to `WARN`
    whenever a run has ≥2 of them — i.e. always, in practice.
13. Ledger keys are not repo-qualified: PR #7 in two repos share one cooldown.
14. Night counter is a read-modify-write with no CAS.
15. A crash mid-run never raises the backoff (outcome recorded only on the
    non-crash path).
16. No `try/finally` around post-run steps: a throw leaks the worktree, and any
    abagraph hiccup ends the night silently (no per-tick catch).
17. Empty branches are pushed; PRs for the `gh-prs` queue get no `--base`.
18. `preTurn` has no catch: abagraph dying after bootstrap fails the whole run.
19. Client-side budget trimming assumes a confidence-ordered response the
    server only produces when it applied a budget itself (hit omits it).
20. Cross-namespace supersession: with tenants dropped, a functional predicate
    written to two namespaces silently supersedes across them —
    `memory_remember` writes lesson-typed subjects into the repo namespace
    while digestion writes them into `lessons`.
21. A failed task wedges its goal permanently (no reset path), and `hit goal`
    always plans a new graph instead of resuming an active one.
22. `/api/verify` is admin-global on a real server (the body tenant is
    ignored), so claims can be satisfied by another namespace's facts.

## Test honesty

- The cooldown test passes only because the mock ignores `valid_until` — it
  asserts the mock's behavior, not abagraph's.
- The memory-weave e2e asserts a `<memory>` block containing facts that a real
  seeded context read would not return (seeds are ignored by the mock).
- The "attempt recorded before the run" test would pass with `recordAttempt`
  deleted, because the failure path cools the item anyway.
- Promotion tests inject the verdict from the harness, so the verdict's
  provenance is untested. `observe.ts`, `push.ts` and `watchCmd` have no
  coverage at all — which is where several HIGH items live.

## Standing rule this produced

When a behavior depends on abagraph semantics, the mock must be made faithful
to the Rust source *first*, and the test written against that. A test that
passes only because the mock is lenient is worse than no test.
