/**
 * The project endpoints over a real socket: the front-page list, one project
 * in full, the unified run feed, and the ingest trigger.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { ProjectDetail, ProjectSummary, RunRow } from "../src/ui/api-types.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call, post } from "./api-http.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";
import { journal, session, type Tree, tree } from "./project-fixture.js";

let t: Tree;
let ui: UiServer;
let mock: MockAbagraph;
let project: string;

/** Config is re-read per request, so a test can retune the server mid-flight. */
function configure(memory: Record<string, unknown>): void {
	writeFileSync(join(t.home, "config.json"), JSON.stringify({ ui: t.cfg.ui, memory }));
}

const getJson = async <T>(path: string): Promise<T> =>
	JSON.parse((await call(ui.url, path)).body) as T;

beforeAll(async () => {
	t = tree();
	project = join(t.work, "proj-a");
	journal(project, "2026-08-01-one", { title: "Run: one", date: "2026-08-01", status: "done" }, [
		["plan", "done|1s|"],
		["gate", "running|2s|"],
	]);
	journal(join(t.work, "proj-b"), "2026-08-02-two", {
		title: "Run: two",
		date: "2026-08-02",
		status: "failed",
	});
	session({ repoRoot: project, task: "tidy the feed", costUsd: 0.5 });
	mock = await startMockAbagraph();
	configure({ enabled: true, baseUrl: mock.url });
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	await mock.close();
	t.cleanup();
});

it("lists every configured project with its counts", async () => {
	const list = await getJson<ProjectSummary[]>("/api/projects");
	const a = list.find((p) => p.name === "proj-a");
	expect(list.map((p) => p.name).sort()).toEqual(["proj-a", "proj-b"]);
	expect(a).toMatchObject({ path: project, kind: "harness", runs: 2, sessions: 1 });
	expect(a?.costUsd).toBeCloseTo(0.5);
});

it("serves one project in full and 404s an unknown name", async () => {
	const detail = await getJson<ProjectDetail>("/api/project?name=proj-a");
	expect(detail.name).toBe("proj-a");
	expect(Array.isArray(detail.models)).toBe(true);
	expect(Array.isArray(detail.tools)).toBe(true);
	expect(Array.isArray(detail.verify)).toBe(true);
	const missing = await call(ui.url, "/api/project?name=ghost");
	expect(missing.status).toBe(404);
	expect(missing.body).toContain("ghost");
});

it("serves the run feed, filtered by project and capped by limit", async () => {
	const all = await getJson<RunRow[]>("/api/runs");
	expect(all.map((r) => r.kind).sort()).toEqual(["journal", "journal", "session"]);

	const mine = await getJson<RunRow[]>("/api/runs?project=proj-a");
	expect(mine.every((r) => r.project === "proj-a")).toBe(true);
	expect(mine.find((r) => r.kind === "journal")?.progress).toBe("1/2 · gate");

	expect(await getJson<RunRow[]>("/api/runs?limit=1")).toHaveLength(1);
	// Garbage limits fall back to the default rather than emptying the feed.
	expect((await getJson<RunRow[]>("/api/runs?limit=abc")).length).toBe(3);
});

interface Ingest {
	written: number;
	skipped: number;
	connected: boolean;
	journals: number;
}

it("ingests the scanned journals into the harness namespace", async () => {
	const body = JSON.parse((await post(ui.url, "/api/ingest", {})).body) as Ingest;
	expect(body).toMatchObject({ connected: true, skipped: 0, journals: 2 });
	expect(body.written).toBeGreaterThan(0);
	const stored = mock.dump("harness");
	expect(stored.map((f) => f.subject)).toContain(`Harness:proj-a`);
	expect(stored.find((f) => f.predicate === "outcome")?.object).toBeDefined();
});

it("reports ingest as unconnected instead of failing when memory is off", async () => {
	configure({ enabled: false });
	try {
		const res = await post(ui.url, "/api/ingest", {});
		expect(res.status).toBe(200);
		const body = JSON.parse(res.body) as Ingest;
		expect(body).toMatchObject({ connected: false, written: 0, journals: 2 });
		expect(body.skipped).toBeGreaterThan(0);
	} finally {
		configure({ enabled: true, baseUrl: mock.url });
	}
});

it("keeps the pre-existing session endpoints working", async () => {
	expect((await call(ui.url, "/api/sessions")).status).toBe(200);
	expect((await call(ui.url, "/api/nope")).status).toBe(404);
	expect((await call(ui.url, "/")).status).toBe(200);
});
