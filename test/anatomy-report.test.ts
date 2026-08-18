/**
 * The Harness window's report assembler, against real tmp repos: config-
 * sourced verify wins over detection and says so, unavailable backends stay
 * listed with their reason, and mcp is the honest stub — configured: false,
 * because no runtime exists (H0 D5).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { buildAnatomy } from "../src/features/anatomy/anatomy.repository.js";

let home: string;
let repoA: string;
let repoB: string;
let repoC: string;
const savedPath = process.env.PATH;

beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-anatomy-home-"));
	process.env.FLUSK_HOME = home;
	// No PATH: every detected CLI backend must be an unavailable ROW, not a gap.
	process.env.PATH = "";
	writeFileSync(
		join(home, "benchmarks.json"),
		`${JSON.stringify({ code: { "anthropic/claude-sonnet-5": 0.65 } })}\n`,
	);
	repoA = mkdtempSync(join(tmpdir(), "flusk-anatomy-a-"));
	mkdirSync(join(repoA, ".flusk", "workspace"), { recursive: true });
	writeFileSync(join(repoA, ".flusk", "config.json"), '{ "verify": ["npm run check"] }\n');
	writeFileSync(join(repoA, ".flusk", "workspace", "IDENTITY.md"), "You are the repo agent.\n");
	writeFileSync(join(repoA, "package.json"), '{ "scripts": { "test": "vitest" } }\n');
	repoB = mkdtempSync(join(tmpdir(), "flusk-anatomy-b-"));
	writeFileSync(join(repoB, "package.json"), '{ "scripts": { "test": "vitest" } }\n');
	repoC = mkdtempSync(join(tmpdir(), "flusk-anatomy-c-"));
});

afterAll(() => {
	process.env.PATH = savedPath;
	delete process.env.FLUSK_HOME;
	for (const dir of [home, repoA, repoB, repoC]) rmSync(dir, { recursive: true, force: true });
});

it("carries the default toolbelt plus the conditional task tool", async () => {
	const report = await buildAnatomy(repoA);
	const names = report.tools.map((t) => t.name);
	for (const n of ["read", "bash", "write", "edit", "glob", "grep", "task"]) {
		expect(names).toContain(n);
	}
	expect(report.tools.every((t) => t.source === "builtin")).toBe(true);
	expect(report.tools.find((t) => t.name === "task")?.description).toContain("depth cap");
});

it("labels config-sourced verify as config, beating detection", async () => {
	const report = await buildAnatomy(repoA);
	// package.json would detect "npm test"; the .flusk/config.json verify[] wins.
	expect(report.verify).toEqual({ commands: ["npm run check"], source: "config" });
});

it("labels detected and absent verify chains honestly", async () => {
	expect((await buildAnatomy(repoB)).verify).toEqual({ commands: ["npm test"], source: "detected" });
	expect((await buildAnatomy(repoC)).verify).toEqual({ commands: [], source: "none" });
});

it("keeps unavailable backends as rows with their reason", async () => {
	const report = await buildAnatomy(repoA);
	expect(report.backends.length).toBeGreaterThan(0);
	for (const b of report.backends) {
		expect(b.available).toBe(false);
		expect(b.note).toBeTruthy();
	}
	expect(report.backends.find((b) => b.id === "claude")?.note).toContain("not found on PATH");
});

it("reports the loop, the workspace origin, routing scores and the mcp stub", async () => {
	const report = await buildAnatomy(repoA);
	expect(report.loop).toMatchObject({
		maxSubagentDepth: 2,
		memoryEnabled: true,
		contextBudgetTokens: 4000,
		budgets: { maxTurns: 100 },
	});
	const identity = report.workspace.find((w) => w.kind === "identity");
	expect(identity?.scope).toBe("repo");
	expect(identity?.path).toBe(join(repoA, ".flusk", "workspace", "IDENTITY.md"));
	expect(identity?.bytes).toBeGreaterThan(0);
	const byKind = Object.fromEntries(report.routing.models.map((m) => [m.taskKind, m.score]));
	expect(byKind.code).toBe(0.65); // measured
	expect(byKind.plan).toBeNull(); // unmeasured is null, never 0
	expect(report.routing.scoresPath).toBe(join(home, "benchmarks.json"));
	expect(report.extensions).toBeNull(); // no extension files anywhere
	expect(report.mcp.configured).toBe(false);
});
