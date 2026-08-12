/**
 * The project endpoints over a real socket: the front-page list, one project
 * in full, and the unified run feed.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { ProjectDetail, ProjectSummary, RunRow } from "../src/features/projects/projects.types.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { journal, session, type Tree, tree } from "./project-fixture.js";

let t: Tree;
let ui: UiServer;
let project: string;

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
	// The server re-reads config per request and globs projects from it, so the
	// scan roots have to name this fixture tree and not the developer's own.
	writeFileSync(join(t.home, "config.json"), JSON.stringify({ ui: t.cfg.ui }));
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
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


it("keeps the pre-existing session endpoints working", async () => {
	expect((await call(ui.url, "/api/sessions")).status).toBe(200);
	expect((await call(ui.url, "/api/nope")).status).toBe(404);
	expect((await call(ui.url, "/")).status).toBe(200);
});
