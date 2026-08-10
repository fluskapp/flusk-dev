# abagraph server behavior hit depends on

Notes taken from the abagraph source while building the memory layer, kept
here because they are load-bearing: if any of these change, hit's memory
breaks in ways tests against a mock would not catch.

## Namespaces do not ride on `tenant` alone

hit isolates memory into namespaces (`repo:<slug>`, `lessons`, `hit`). The
obvious carrier is abagraph's `tenant` field. It is not sufficient:

- `src/server/dto/parse.rs` → `parse_fact_input` hardcodes `tenant: None`
  ("server stamps from auth context"), so a body tenant never survives parse.
- `src/server/routes/transact.rs` → `scoped` returns admin asserts
  **unchanged**; only the non-admin branch stamps `req.tenant`.
- `src/server/auth.rs`: with no `ABAGRAPH_TOKENS`/`ABAGRAPH_ADMIN_TOKEN`
  configured — the normal local, loopback setup — **every request is admin**.

Net effect on an auth-free server: every fact is stored untenanted, and any
tenant-scoped read matches nothing (`src/core/acl.rs` `ReadScope::allows`
keeps a fact only when `f.tenant == scope.tenant`). Memory would look
permanently empty while silently accumulating unnamespaced facts.

hit therefore carries its own tag in `properties.hit_ns` (`src/memory/wire.ts`
`NS_PROP`), which `parse_fact_input` passes through verbatim
(`properties: obj.get("properties").cloned()`), and filters reads on
`tenant === ns || properties.hit_ns === ns`. This is correct on both server
modes and needs no abagraph change. `test/memory-untenanted.test.ts` pins the
behavior against a mock configured to drop tenants like the real admin path.

**Suggested abagraph fix (optional, not required by hit):** have `scoped`
re-apply body tenants for admin requests, matching its own doc comment
("admin requests pass through with whatever tenants the body named").

## Never send a scope tenant on `/api/context`

`routes/context.rs` keeps the body tenant for admin, and the ranker then
drops every fact whose tenant differs — including untenanted ones. Sending
it hides hit's own memory; omitting it is harmless for non-admin callers
because auth overwrites the value anyway. hit omits it and filters
client-side.

## Never use `/api/digest` for namespaced facts

`src/server/routes/digest_facts.rs` explicitly nulls the tenant for admin
requests. All hit writes go through `/api/transact`.

## The budget must be applied client-side

Because hit cannot scope server-side, a server-applied `token_budget` would
be spent on other namespaces' facts before hit filters them. hit requests
ranked rows with `max_facts` and trims to the budget itself, mirroring
`core/rank.rs` (`ceil(chars / 4)`, greedy in confidence order) —
`src/memory/rank.ts`.

## Other semantics relied upon

- **Supersession**: a new active fact on the same tenant+subject+predicate
  with a different object closes the prior one (`status: superseded`,
  `valid_until: now`) — `core/supersede.rs`. Identical re-asserts dedup.
- **Candidate rung**: `confidence < 0.75` lands as `status: candidate`,
  hidden from default reads and never superseding settled facts
  (`core/build_fact.rs`). hit's LLM-extracted lessons rely on this.
- **Coexist**: multi-valued predicates send `policy: "coexist"`
  (`dto/parse.rs` `parse_policy`).
- **CAS**: transact `compares` are all-or-nothing, failing the call with
  HTTP 409 `CompareFailed` (`core/transact_guards.rs`). Task claiming
  depends on this.
- **One (subject, predicate) per transact**: `check_distinct_asserts`
  rejects duplicates in a single call, even for coexist predicates — hit
  splits those into separate transacts.
- **Timestamps** are unix-ms integers; `valid_until` is read with `as_i64`,
  so an ISO string is silently dropped. `wire.ts` converts both ways.
- **`/api/verify`** responds with `decision` (not `verdict`), and the
  published `@abagraph/client` has no wrapper for the route — hit uses raw
  fetch.
