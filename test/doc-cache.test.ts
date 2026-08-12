/**
 * The memoization in front of every DocProvider (src/doc/cache.ts).
 *
 * It is asserted here rather than inferred from a fast lookup because the
 * claim is a COST claim: "the first symbol waits for the language service, the
 * rest are instant" is a sentence the panel prints, and for a long time it was
 * false — `withDocCache` was written, tested, and then never wired into a
 * shipped provider at all. So this file proves both halves: that the wrapper
 * memoizes, and that the engine a caller actually receives is wrapped.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { withDocCache } from "../src/features/docs/cache.repository.js";
import { createTsProvider } from "../src/features/docs/ts-provider.js";
import { disposeService } from "../src/features/docs/ts-service.js";
import type { DocProvider } from "../src/features/docs/types.js";
import { type DocFixture, docProject, GREET_TS, posOf } from "./doc-fixture.js";

let t: DocFixture;
let doc: DocProvider;

beforeAll(async () => {
	t = docProject();
	const made = await createTsProvider(t.root, { fileCap: 100 });
	if (!made.ok) throw new Error(made.reason);
	doc = made.provider;
});

afterAll(() => {
	doc?.dispose();
	disposeService();
	t.cleanup();
});

const decl = posOf(GREET_TS, "greet(who: string)");

it("serves an identical second lookup from the cache", async () => {
	let calls = 0;
	const counting: DocProvider = {
		...doc,
		docAt: (f, l, c) => {
			calls++;
			return doc.docAt(f, l, c);
		},
	};
	const cached = withDocCache(counting);
	const first = await cached.docAt(t.greet, decl.line, decl.col);
	const second = await cached.docAt(t.greet, decl.line, decl.col);
	expect(second).toEqual(first);
	expect(calls).toBe(1);
	expect(cached.stats).toEqual({ hits: 1, misses: 1 });
	await cached.docAt(t.greet, decl.line, decl.col + 1);
	expect(cached.stats.misses).toBe(2); // a different position is a different key
});

it("wraps the provider createTsProvider hands out, not just a test's own", async () => {
	// The bug this pins: cache.ts was imported by exactly one test and by no
	// shipped code, so every click re-ran quickinfo + definition + findReferences.
	const counted = doc as DocProvider & { stats?: { hits: number; misses: number } };
	expect(counted.stats).toBeDefined();
	const before = { ...(counted.stats as { hits: number; misses: number }) };
	await doc.docAt(t.greet, decl.line, decl.col);
	await doc.docAt(t.greet, decl.line, decl.col);
	const after = counted.stats as { hits: number; misses: number };
	expect(after.hits).toBeGreaterThan(before.hits);
	// The outline goes through the same cache, on its own key.
	await doc.outline(t.greet);
	const outlined = after.hits;
	await doc.outline(t.greet);
	expect((counted.stats as { hits: number }).hits).toBe(outlined + 1);
});
