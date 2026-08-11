/**
 * The graph source when abagraph is absent, empty or failing. ah treats every
 * one of those as normal, so each must serve the caller's scanned fallback
 * rather than blank the view.
 */
import { describe, expect, it } from "vitest";
import type { MemFact, MemoryClient } from "../src/memory/client-types.js";
import type { ModelRef, RunRow } from "../src/ui/api-types.js";
import { createGraphSource } from "../src/ui/graph-source.js";

const NS = "repo:gs";

const scanned: RunRow = {
	id: "scanned",
	kind: "journal",
	project: "linof",
	title: "from the file scanner",
	status: "completed",
	at: "2026-08-01T00:00:00.000Z",
	ref: "/h/docs/runs/scanned.md",
};
const FALLBACK: { runs: RunRow[]; models: ModelRef[] } = {
	runs: [scanned],
	models: [{ id: "scanned-model" }],
};

function stubClient(over: Partial<MemoryClient>): MemoryClient {
	return {
		health: async () => true,
		transact: async () => ({ tx: 0, ids: [] }),
		query: async () => [],
		contextPack: async () => [],
		search: async () => [],
		verifyClaims: async () => ({ verdict: "WARN", details: null }),
		consolidate: async () => {},
		...over,
	};
}

describe("graph source, degraded", () => {
	it("serves the fallback and reports disconnected with no client", async () => {
		const gs = createGraphSource(null, FALLBACK);
		expect(gs.connected).toBe(false);
		expect(await gs.harnessRuns(NS, "linof")).toEqual(FALLBACK.runs);
		expect(await gs.harnessModels(NS, "linof")).toEqual(FALLBACK.models);
		expect(gs.connected).toBe(false);
	});

	it("survives a query that rejects mid-flight and marks itself disconnected", async () => {
		let calls = 0;
		const edge: MemFact = {
			id: "1",
			subject: "Harness:linof",
			predicate: "ran",
			object: "Run:/h/docs/runs/a.md",
			confidence: 1,
		};
		const flaky = stubClient({
			query: async (_ns, p): Promise<MemFact[]> => {
				calls += 1;
				// The `ran` read resolves; the per-run detail read blows up.
				if (p.predicate === "ran") return [edge];
				throw new Error("500 InternalError");
			},
		});
		const gs = createGraphSource(flaky, FALLBACK);
		expect(gs.connected).toBe(true);
		expect(await gs.harnessRuns(NS, "linof")).toEqual(FALLBACK.runs);
		expect(gs.connected).toBe(false);
		expect(calls).toBe(2);
	});

	it("reads run detail BY SUBJECT, never by predicate alone", async () => {
		// A predicate-only read of `outcome`/`stage` shares its row cap with
		// every other harness's runs and with the watch ledger, so it comes back
		// having covered none of this harness's own.
		const seen: Record<string, unknown>[] = [];
		const spy = stubClient({
			query: async (_ns, p) => {
				seen.push(p);
				if (p.predicate === "ran") {
					return [
						{
							id: "1",
							subject: "Harness:linof",
							predicate: "ran",
							object: "Run:/h/docs/runs/a.md",
							confidence: 1,
						},
					];
				}
				return [];
			},
		});
		await createGraphSource(spy, FALLBACK).harnessRuns(NS, "linof");
		expect(seen.slice(1)).toEqual([
			{ subject: "Run:/h/docs/runs/a.md", status: "active,candidate", limit: 500 },
		]);
		expect(seen.every((q) => q.subject !== undefined)).toBe(true);
	});

	it("asks for candidates and a generous limit, not the server default", async () => {
		const seen: Record<string, unknown>[] = [];
		const spy = stubClient({
			query: async (_ns, p) => {
				seen.push(p);
				return [];
			},
		});
		await createGraphSource(spy, FALLBACK).harnessModels(NS, "linof");
		expect(seen).toEqual([
			{ subject: "Harness:linof", predicate: "uses", status: "active,candidate", limit: 500 },
		]);
	});
});
