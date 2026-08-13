# Benchmarks

Measured on the dev machine (darwin x64), `node scripts/bench-history.mjs`,
corpus = the golden fixture inflated to 2,600 cards, 520 searches (26 golden
queries x 20 rounds). Budgets from the migration plan.

## History index (Rust port, stage 1)

| Impl | Build (2,600 cards) | Search p95 | Budget |
| --- | --- | --- | --- |
| native (flusk-core) | 91.1ms | 4.25ms | build <100ms, p95 <10ms — **pass** |
| ts (reference) | 75.7ms | 2.04ms | build <100ms, p95 <10ms — **pass** |

Honest reading: at this corpus size the native implementation clears every
budget but does NOT yet beat the TypeScript reference — the JSON marshalling
across the N-API boundary (cards in at build, hits out per search) costs more
than the compute it saves. The differential harness (test/native-history.test.ts)
holds the two byte-equal on ids and scores, so switching the default is a
one-line change the day the boundary is optimized (structured buffers instead
of JSON strings) or the corpus grows past the crossover. `FLUSK_NATIVE=0`
forces the TypeScript path either way.

Numbers regenerate with `npm run build && node scripts/bench-history.mjs`.
