import { writeFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadFlowStats, statsPath } from "../src/features/flows/flow-stats.repository.js";
import { improveFromRun } from "../src/features/flows/improve.js";
import { recordFlowRun } from "../src/features/flows/record.repository.js";
import type { FlowResult, FlowStep, NodeKind } from "../src/features/flows/types.js";
import { createFactStore } from "../src/features/facts/facts.repository.js";
import type { Fact, FactStore } from "../src/features/facts/types.js";
import { LESSONS_NS } from "../src/features/flows/facts.js";
import { loadScores } from "../src/features/provider/scores.repository.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-lang-improve-");
});

afterEach(() => {
	teardownTestHome();
});

const step = (nodeId: string, kind: NodeKind, ok: boolean, note?: string): FlowStep => ({
	nodeId,
	kind,
	ok,
	output: `${nodeId} said something`,
	promptTokens: 900,
	startedAt: "2026-08-11T10:00:00.000Z",
	endedAt: "2026-08-11T10:00:04.500Z",
	...(note === undefined ? {} : { note }),
});

function run(steps: FlowStep[], over: Partial<FlowResult> = {}): FlowResult {
	const ok = steps.every((s) => s.ok);
	const state = {
		task: "add a retry to the uploader",
		project: "demo",
		artifacts: {},
		costUsd: 0.42,
	};
	return {
		spec: "ship-it",
		state: { ...state, steps },
		ok,
		outcome: ok ? "completed" : "blocked",
		...over,
	};
}

/** A real FactStore against the test home. Anything under 0.75 reads as a
 * Candidate, exactly as the store parks it — a lenient fake would make
 * promotion untestable. */
function memory(): { store: FactStore; rows: (ns: string) => Promise<Fact[]> } {
	const store = createFactStore();
	return { store, rows: (ns) => store.query(ns, { status: "active,candidate" }) };
}

it("a passing step rewards its model and a failing step penalizes it", async () => {
	const result = run([step("plan1", "plan", true), step("code1", "code", false, "tsc exploded")]);
	const models = { plan1: "anthropic/good", code1: "anthropic/bad" };
	const report = await improveFromRun(result, { repoRoot: repo, models });
	const scores = await loadScores();
	expect(scores.plan?.["anthropic/good"]).toBeCloseTo(0.55);
	expect(scores.code?.["anthropic/bad"]).toBeCloseTo(0.4);
	expect(report.nudged).toEqual(["plan/anthropic/good+", "code/anthropic/bad-"]);
});

it("flow stats accumulate, and a corrupt file starts over rather than throwing", async () => {
	await improveFromRun(run([step("a", "code", true)]), { repoRoot: repo });
	await improveFromRun(run([step("a", "code", false, "nope")]), { repoRoot: repo });
	const stats = await loadFlowStats();
	expect(stats["ship-it"]?.attempts).toBe(2);
	expect(stats["ship-it"]?.completions).toBe(1);
	expect(stats["ship-it"]?.medianCostUsd).toBeCloseTo(0.42);
	expect(stats["ship-it"]?.shape).toEqual(["a"]);
	await writeFile(statsPath(), "{ not json at all", "utf8");
	expect(await loadFlowStats()).toEqual({});
	const report = await improveFromRun(run([step("a", "code", true)]), { repoRoot: repo });
	expect(report.stat?.attempts).toBe(1);
});

it("a fix becomes a cross-repo lesson only on a verified run", async () => {
	const attempts = [
		step("code1", "code", false, "tsc: cannot find module foo"),
		step("code1", "code", true, "added the missing import"),
	];
	const warn = memory();
	const blocked = run(attempts, { ok: false, outcome: "blocked" });
	expect((await improveFromRun(blocked, { repoRoot: repo, store: warn.store })).lessons).toBe(0);
	expect(await warn.rows(LESSONS_NS)).toHaveLength(0);

	const allow = memory();
	const verified = run([...attempts, step("verify1", "verify", true)], {
		ok: true,
		outcome: "completed",
	});
	const report = await improveFromRun(verified, { repoRoot: repo, store: allow.store });
	expect(report.lessons).toBe(1);
	const lesson = (await allow.rows(LESSONS_NS))[0];
	expect(lesson?.subject).toBe("ErrorClass:tsc-cannot-find-module");
	expect(lesson?.object).toContain("added the missing import");
	expect(lesson?.confidence).toBe(0.9);
});

it("a memory client that throws costs one note, never the run", async () => {
	const dead: FactStore = {
		...memory().store,
		transact: () => Promise.reject(new Error("the store is down")),
	};
	const result = run([step("code1", "code", false, "boom"), step("code1", "code", true)]);
	const written = await recordFlowRun(result, { repoRoot: repo, store: dead });
	expect(written.facts).toBe(0);
	expect(written.journalPath).not.toBe("");
	expect(written.notes).toEqual(["facts not recorded: the store is down"]);
	const cfg = { repoRoot: repo, store: dead, models: { code1: "anthropic/good" } };
	const report = await improveFromRun(result, cfg);
	expect(report.notes).toEqual(["lessons not updated: the store is down"]);
	expect(report.nudged).toEqual(["code/anthropic/good-", "code/anthropic/good+"]);
	expect(report.stat?.attempts).toBe(1);
});
