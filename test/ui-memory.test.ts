/**
 * The dashboard's "what happened overnight" view: goal graphs, lessons, and
 * the unattended ledger — plus the degradation path, which is the normal
 * case on a machine with no abagraph running.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createMemoryClient } from "../src/memory/client.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { HIT_NS, LESSONS_NS, repoNs } from "../src/memory/namespaces.js";
import { goalFact, lessonFact, taskFact, watchFact } from "../src/memory/facts.js";
import type { MemoryView } from "../src/ui/memory-view.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

let home: string;
let repo: string;
let mock: MockAbagraph;
let ui: UiServer;
let client: MemoryClient;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "hit-uimem-home-"));
	repo = mkdtempSync(join(tmpdir(), "hit-uimem-repo-"));
	process.env.HIT_HOME = home;
	mock = await startMockAbagraph();
	writeFileSync(
		join(home, "config.json"),
		JSON.stringify({ memory: { enabled: true, baseUrl: mock.url } }),
	);
	client = createMemoryClient({ baseUrl: mock.url, apiKey: null });
	const ns = repoNs(repo);
	await client.transact(ns, [goalFact.title("g1", "Migrate to ESM")]);
	await client.transact(ns, [goalFact.status("g1", "active")]);
	await client.transact(ns, [goalFact.hasTask("g1", "t1")]);
	await client.transact(ns, [goalFact.hasTask("g1", "t2")]);
	await client.transact(ns, [taskFact.description("t1", "convert requires")]);
	await client.transact(ns, [taskFact.status("t1", "done")]);
	await client.transact(ns, [taskFact.description("t2", "fix imports")]);
	await client.transact(ns, [taskFact.status("t2", "pending")]);
	await client.transact(ns, [taskFact.dependsOn("t2", "t1")]);
	// An extracted lesson lands below the Candidate threshold on purpose.
	await client.transact(LESSONS_NS, [lessonFact.gotcha("vitest", "worker starvation", 0.7)]);
	await client.transact(HIT_NS, [watchFact.attemptedAt("gh-prs-9", "2026-08-10T22:00:00.000Z")]);
	await client.transact(HIT_NS, [watchFact.outcome("gh-prs-9", "completed")]);
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	await mock.close();
	delete process.env.HIT_HOME;
	rmSync(home, { recursive: true, force: true });
	rmSync(repo, { recursive: true, force: true });
});

it("assembles the goal graph with task status and dependencies", async () => {
	const res = await fetch(`${ui.url}/api/memory?repo=${encodeURIComponent(repo)}`);
	expect(res.status).toBe(200);
	const view = (await res.json()) as MemoryView;
	expect(view.connected).toBe(true);
	expect(view.goals).toHaveLength(1);
	const g = view.goals[0];
	expect(g).toMatchObject({ title: "Migrate to ESM", status: "active" });
	expect(g?.tasks.map((t) => t.status).sort()).toEqual(["done", "pending"]);
	const blocked = g?.tasks.find((t) => t.id === "t2");
	expect(blocked?.dependsOn).toEqual(["t1"]);
	expect(blocked?.description).toBe("fix imports");
});

it("surfaces Candidate-status lessons, which default reads would hide", async () => {
	const view = (await (
		await fetch(`${ui.url}/api/memory?repo=${encodeURIComponent(repo)}`)
	).json()) as MemoryView;
	expect(view.lessons.map((f) => f.object)).toContain("worker starvation");
});

it("shows the unattended ledger", async () => {
	const view = (await (
		await fetch(`${ui.url}/api/memory?repo=${encodeURIComponent(repo)}`)
	).json()) as MemoryView;
	expect(view.ledger).toHaveLength(1);
	expect(view.ledger[0]).toMatchObject({ key: "gh-prs-9", outcome: "completed" });
});

it("rejects a non-absolute repo parameter", async () => {
	const res = await fetch(`${ui.url}/api/memory?repo=relative/path`);
	expect(res.status).toBe(400);
});

it("reports not-connected instead of failing when abagraph is down", async () => {
	const otherHome = mkdtempSync(join(tmpdir(), "hit-uimem-down-"));
	writeFileSync(
		join(otherHome, "config.json"),
		JSON.stringify({ memory: { enabled: true, baseUrl: "http://127.0.0.1:9" } }),
	);
	process.env.HIT_HOME = otherHome;
	try {
		const view = (await (
			await fetch(`${ui.url}/api/memory?repo=${encodeURIComponent(repo)}`)
		).json()) as MemoryView;
		expect(view.connected).toBe(false);
		expect(view.note).toContain("unreachable");
		expect(view.goals).toEqual([]);
	} finally {
		process.env.HIT_HOME = home;
		rmSync(otherHome, { recursive: true, force: true });
	}
});

it("ships the Brain panel and its shortcut in the page", async () => {
	const page = await (await fetch(`${ui.url}/`)).text();
	for (const marker of ['id="brain"', 'id="brain-btn"', "<kbd>b</kbd>", "toggleBrain"]) {
		expect(page).toContain(marker);
	}
});
