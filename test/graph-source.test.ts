import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMemoryClient } from "../src/memory/client.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { ingestJournals } from "../src/memory/ingest.js";
import type { ModelRef, RunRow } from "../src/ui/api-types.js";
import { createGraphSource } from "../src/ui/graph-source.js";
import type { Journal } from "../src/ui/journal-scan.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

let mock: MockAbagraph;
let mem: MemoryClient;

const NS = "repo:gs";

const stage = (name: string, status: string) => ({ name, status, duration: "", detail: "" });
const BASE = {
	harness: "linof",
	harnessRoot: "/h",
	mtimeMs: Date.parse("2026-08-10T09:00:00.000Z"),
	title: "t",
	date: "2026-08-10T09:00Z",
	status: "completed",
};

function journal(path: string, over: Partial<Journal> = {}): Journal {
	const stages = [stage("plan", "done"), stage("gate", "running")];
	return { ...BASE, path, tool: "claude", stages, ...over };
}

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

beforeAll(async () => {
	mock = await startMockAbagraph();
	mem = createMemoryClient({ baseUrl: mock.url });
	await ingestJournals(mem, NS, [
		journal("/h/docs/runs/2026-08-09-a.md", { status: "failed" }),
		journal("/h/docs/runs/2026-08-10-b.md"),
		journal("/h/docs/runs/other.md", { harness: "ab", tool: "kimi", stages: [] }),
	]);
});
afterAll(async () => {
	await mock.close();
});

describe("graph source, connected", () => {
	it("serves runs from the graph, newest first, with stage progress", async () => {
		const gs = createGraphSource(mem, FALLBACK);
		const rows = await gs.harnessRuns(NS, "linof");
		expect(gs.connected).toBe(true);
		expect(rows.map((r) => r.id)).toEqual([
			"/h/docs/runs/2026-08-10-b.md",
			"/h/docs/runs/2026-08-09-a.md",
		]);
		expect(rows[0]).toMatchObject({
			kind: "journal",
			project: "linof",
			title: "2026-08-10-b",
			status: "completed",
			ref: "/h/docs/runs/2026-08-10-b.md",
			progress: "1/2 · gate",
		});
		expect(Date.parse(rows[0]?.at ?? "")).toBeGreaterThan(0);
		expect(rows[1]?.status).toBe("failed");
	});

	it("does not drift when a stage advances and both statuses stay live", async () => {
		// `stage` is coexist, so re-ingesting an advanced journal leaves
		// gate:running AND gate:done active. Counting them raw reported
		// "2/3 · gate" for a two-stage run, and worse on every later poll.
		const ns = "repo:gs-drift";
		const path = "/h/docs/runs/advance.md";
		await ingestJournals(mem, ns, [journal(path)]);
		await ingestJournals(mem, ns, [
			journal(path, { stages: [stage("plan", "done"), stage("gate", "done")] }),
		]);
		const live = await mem.query(ns, { predicate: "stage", status: "active" });
		expect(live.map((f) => f.object).sort()).toEqual(["gate:done", "gate:running", "plan:done"]);
		const rows = await createGraphSource(mem, FALLBACK).harnessRuns(ns, "linof");
		expect(rows[0]?.progress).toBe("2/2 · gate");
	});

	it("keeps harnesses apart and omits progress for a run with no stages", async () => {
		const gs = createGraphSource(mem, FALLBACK);
		const rows = await gs.harnessRuns(NS, "ab");
		expect(rows.map((r) => r.ref)).toEqual(["/h/docs/runs/other.md"]);
		expect(rows[0]?.progress).toBeUndefined();
	});

	it("serves models from the graph", async () => {
		const gs = createGraphSource(mem, FALLBACK);
		expect(await gs.harnessModels(NS, "linof")).toEqual([{ id: "claude" }]);
		expect(await gs.harnessModels(NS, "ab")).toEqual([{ id: "kimi" }]);
	});

	it("falls back when the graph holds nothing for this harness or namespace", async () => {
		const gs = createGraphSource(mem, FALLBACK);
		expect(await gs.harnessRuns(NS, "never-ingested")).toEqual(FALLBACK.runs);
		expect(await gs.harnessModels("repo:empty", "linof")).toEqual(FALLBACK.models);
		expect(gs.connected).toBe(true); // an empty graph is not a broken one
	});
});
