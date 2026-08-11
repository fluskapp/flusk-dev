import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMemoryClient } from "../src/memory/client.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { ingestJournals, journalFacts } from "../src/memory/ingest.js";
import type { Journal } from "../src/ui/journal-scan.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

let mock: MockAbagraph;
let mem: MemoryClient;

beforeAll(async () => {
	mock = await startMockAbagraph();
	mem = createMemoryClient({ baseUrl: mock.url });
});
afterAll(async () => {
	await mock.close();
});

const stage = (name: string, status: string) => ({ name, status, duration: "", detail: "" });

function journal(over: Partial<Journal> = {}): Journal {
	const stages = [stage("plan", "done"), stage("gate", "running")];
	return {
		path: "/h/docs/runs/2026-08-10-fix-cache.md",
		harness: "linof-harness",
		harnessRoot: "/h",
		mtimeMs: Date.parse("2026-08-10T09:00:00.000Z"),
		title: "fix cache",
		date: "2026-08-10T09:00:00.000Z",
		status: "completed",
		tool: "claude",
		pr: "https://github.com/x/y/pull/7",
		stages,
		...over,
	};
}

/** Minimal MemoryClient stand-in; only the overridden method is exercised. */
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

const activeCount = (ns: string) => mock.dump(ns).filter((f) => f.status === "active").length;

describe("journalFacts", () => {
	it("carries the vocabulary cardinality: stage/ran/uses coexist, outcome/pr do not", () => {
		const flags = new Map(
			journalFacts(journal()).map((f) => [`${f.subject.split(":")[0]} ${f.predicate}`, f.coexist]),
		);
		expect(flags.get("Run stage")).toBe(true);
		expect(flags.get("Harness ran")).toBe(true);
		expect(flags.get("Harness uses")).toBe(true);
		expect(flags.get("Run outcome")).toBeUndefined();
		expect(flags.get("Run pr")).toBeUndefined();
	});

	it("omits pr and uses when the journal has neither, and defaults a blank status", () => {
		const bare = journalFacts(journal({ pr: undefined, tool: undefined, status: "" }));
		expect(bare.map((f) => f.predicate).sort()).toEqual(["outcome", "ran", "stage", "stage"]);
		expect(bare[0]?.object).toBe("unknown");
	});
});

describe("ingestJournals", () => {
	it("writes the run, its stages and the harness edges", async () => {
		const ns = "repo:ingest-basic";
		const res = await ingestJournals(mem, ns, [journal()]);
		expect(res.skipped).toBe(0); // a (subject,predicate) collision would 400 here
		expect(res.notes).toEqual([]);
		expect(res.written).toBe(6);
		const run = `Run:/h/docs/runs/2026-08-10-fix-cache.md`;
		const rows = mock
			.dump(ns)
			.map((f) => `${f.subject} ${f.predicate} ${String(f.object)}`)
			.sort();
		expect(rows).toEqual(
			[
				`${run} outcome completed`,
				`${run} pr https://github.com/x/y/pull/7`,
				`${run} stage gate:running`,
				`${run} stage plan:done`,
				"Harness:linof-harness ran " + run,
				"Harness:linof-harness uses Model:claude",
			].sort(),
		);
		expect(mock.dump(ns).every((f) => f.confidence === 1)).toBe(true);
	});

	it("is idempotent: re-ingesting the same journals adds no active facts", async () => {
		const ns = "repo:ingest-idem";
		const js = [journal(), journal({ path: "/h/docs/runs/2026-08-09-b.md", status: "failed" })];
		await ingestJournals(mem, ns, js);
		const before = activeCount(ns);
		const again = await ingestJournals(mem, ns, js);
		expect(again.skipped).toBe(0);
		expect(activeCount(ns)).toBe(before);
		expect(mock.dump(ns).some((f) => f.status === "superseded")).toBe(false);
	});

	it("supersedes a changed outcome but keeps accumulated stages", async () => {
		const ns = "repo:ingest-update";
		const running = journal({ status: "running", stages: [] });
		await ingestJournals(mem, ns, [running]);
		await ingestJournals(mem, ns, [journal({ status: "completed" })]);
		const outcomes = await mem.query(ns, { predicate: "outcome" });
		expect(outcomes.map((f) => f.object)).toEqual(["completed"]);
		const stages = await mem.query(ns, { predicate: "stage", status: "active" });
		expect(stages.map((f) => f.object).sort()).toEqual(["gate:running", "plan:done"]);
	});

	it("collapses the repeated harness edge across many journals of one harness", async () => {
		const ns = "repo:ingest-dedupe";
		const js = [1, 2, 3].map((n) => journal({ path: `/h/docs/runs/r${n}.md`, stages: [] }));
		const res = await ingestJournals(mem, ns, js);
		expect(res.skipped).toBe(0);
		expect(mock.dump(ns).filter((f) => f.predicate === "uses")).toHaveLength(1);
		expect(mock.dump(ns).filter((f) => f.predicate === "ran")).toHaveLength(3);
	});

	it("tolerates a rejecting client and a null one without throwing", async () => {
		const boom = stubClient({
			transact: async () => {
				throw new Error("ECONNREFUSED");
			},
		});
		const failed = await ingestJournals(boom, "repo:x", [journal()]);
		expect(failed.written).toBe(0);
		expect(failed.skipped).toBe(6);
		expect(failed.notes.join(" ")).toContain("ECONNREFUSED");

		const none = await ingestJournals(null, "repo:x", [journal()]);
		expect(none).toMatchObject({ written: 0, skipped: 6 });
		expect(none.notes).toHaveLength(1);
		expect(await ingestJournals(null, "repo:x", [])).toEqual({
			written: 0,
			skipped: 0,
			notes: [],
		});
	});
});
