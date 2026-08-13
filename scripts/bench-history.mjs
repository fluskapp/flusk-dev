/**
 * The performance budgets, measured: index build over ~2,600 cards (<100ms)
 * and search p95 (<10ms), native vs TypeScript. Run after `npm run build`;
 * writes the table docs/benchmarks.md embeds.
 */
import { readFileSync } from "node:fs";
const fx = JSON.parse(readFileSync("test/fixtures/history-golden.json", "utf8"));
// Inflate the 68-card golden corpus to ~2,600 by cloning with distinct ids.
const cards = [];
for (let i = 0; cards.length < 2600; i++) {
	for (const c of fx.cards) {
		if (cards.length >= 2600) break;
		cards.push({ ...c, id: `${c.id}#${i}` });
	}
}
const { createHistorySearcher } = await import("../dist/platform/native/history-search.js");
const queries = fx.golden.map((g) => ({ text: g.query, limit: 10 }));

function bench(impl) {
	if (impl === "ts") process.env.FLUSK_NATIVE = "0";
	else delete process.env.FLUSK_NATIVE;
	const t0 = performance.now();
	const s = createHistorySearcher(cards);
	const build = performance.now() - t0;
	const times = [];
	for (let round = 0; round < 20; round++) {
		for (const q of queries) {
			const t = performance.now();
			s.search(q, { now: Date.parse(fx.now) });
			times.push(performance.now() - t);
		}
	}
	times.sort((a, b) => a - b);
	const p95 = times[Math.floor(times.length * 0.95)];
	return { impl: s.impl, build, p95, n: times.length };
}

for (const impl of ["native", "ts"]) {
	const r = bench(impl);
	console.log(
		`${r.impl.padEnd(6)} build(${cards.length} cards): ${r.build.toFixed(1)}ms   search p95: ${r.p95.toFixed(2)}ms  (${r.n} searches)`,
	);
}
