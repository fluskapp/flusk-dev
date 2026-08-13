/**
 * The differential harness for the first Rust port: both implementations run
 * over the golden corpus IN THE SAME PROCESS and must agree — same cards in
 * the same order with the same scores (to float print precision), for every
 * golden query and a sweep of adversarial ones. When the prebuilt is absent
 * (fresh checkout, foreign platform) the suite skips rather than lies.
 */
import { describe, expect, it } from "vitest";
import { createHistorySearcher } from "../src/platform/native/history-search.js";
import { nativeModule } from "../src/platform/native/native.repository.js";
import { buildIndex } from "../src/features/history/bm25.js";
import { search as tsSearch } from "../src/features/history/rank.js";
import type { HistoryCard, SearchQuery } from "../src/features/history/types.js";
import { FX, NOW } from "./history-eval-harness.js";

const native = nativeModule();
const describeNative = native === null ? describe.skip : describe;

const index = buildIndex(FX.cards as HistoryCard[]);
const searcher = native === null ? null : createHistorySearcher(FX.cards as HistoryCard[]);

/** id + rounded score: the comparison that catches reordering AND drift. */
const digest = (hits: { card: { id: string }; score: number }[]): string[] =>
	hits.map((h) => `${h.card.id}@${h.score.toFixed(9)}`);

function both(query: SearchQuery): { ts: string[]; rs: string[] } {
	const opts = { now: NOW };
	return {
		ts: digest(tsSearch(index, query, opts)),
		rs: digest((searcher as NonNullable<typeof searcher>).search(query, opts)),
	};
}

describeNative("native history search ≡ TypeScript reference", () => {
	it("is actually the native implementation under test", () => {
		expect(searcher?.impl).toBe("native");
	});

	it("agrees on every golden query, ids and scores", () => {
		for (const c of FX.golden) {
			const q: SearchQuery = { text: c.query, limit: 10, ...(c.paths ? { paths: c.paths } : {}) };
			const { ts, rs } = both(q);
			expect(rs, `query: ${c.query}`).toEqual(ts);
		}
	});

	it("agrees on typo, filter and edge queries", () => {
		const queries: SearchQuery[] = [
			{ text: "retyr hook", limit: 10 },
			{ text: "the a an of", limit: 10 },
			{ text: "", limit: 10 },
			{ text: "RetryHook exponential_backoff HTTPServer", limit: 20 },
			{ text: "budget", kinds: ["commit", "doc"], limit: 10 },
			{ text: "budget", project: FX.cards[0]?.project ?? "flusk", limit: 10 },
			{ text: "verify gate", paths: ["src/worker/dispatch.ts"], limit: 10 },
			{ text: "zzzzzz nothing matches this", limit: 10 },
		];
		for (const q of queries) {
			const { ts, rs } = both(q);
			expect(rs, `query: ${q.text}`).toEqual(ts);
		}
	});

	it("FLUSK_NATIVE=0 forces the TypeScript path", () => {
		process.env.FLUSK_NATIVE = "0";
		try {
			expect(createHistorySearcher(FX.cards as HistoryCard[]).impl).toBe("ts");
		} finally {
			delete process.env.FLUSK_NATIVE;
		}
	});
});
