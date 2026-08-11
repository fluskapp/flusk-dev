import { writeFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadFlowStats, statsPath } from "../src/lang/flow-stats.js";
import { improveFromRun } from "../src/lang/improve.js";
import { recordFlowRun } from "../src/lang/record.js";
import type { FlowResult, FlowStep, NodeKind } from "../src/lang/types.js";
import type { MemFact, MemoryClient } from "../src/memory/client-types.js";
import { LESSONS_NS } from "../src/memory/namespaces.js";
import { loadScores } from "../src/provider/scores.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-lang-improve-");
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

/** In-memory MemoryClient. Anything under 0.75 reads as a Candidate, exactly
 * as abagraph parks it — a lenient mock would make promotion untestable. */
function memory(): { client: MemoryClient; rows: (ns: string) => MemFact[] } {
	const store = new Map<string, MemFact[]>();
	const client: MemoryClient = {
		health: async () => true,
		transact: async (ns, asserts) => {
			const list = store.get(ns) ?? [];
			for (const a of asserts)
				list.push({ ...a, id: `f${list.length}`, confidence: a.confidence ?? 1 });
			store.set(ns, list);
			return { tx: list.length, ids: [] };
		},
		query: async (ns, p) => {
			const want = p.status ?? "active";
			return (store.get(ns) ?? []).filter(
				(f) => (f.confidence >= 0.75 ? "active" : "candidate") === want,
			);
		},
		contextPack: async () => [],
		search: async () => [],
		verifyClaims: async () => ({ verdict: "ALLOW", details: null }),
		consolidate: async () => {},
	};
	return { client, rows: (ns) => store.get(ns) ?? [] };
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
	expect((await improveFromRun(blocked, { repoRoot: repo, client: warn.client })).lessons).toBe(0);
	expect(warn.rows(LESSONS_NS)).toHaveLength(0);

	const allow = memory();
	const verified = run([...attempts, step("verify1", "verify", true)], {
		ok: true,
		outcome: "completed",
	});
	const report = await improveFromRun(verified, { repoRoot: repo, client: allow.client });
	expect(report.lessons).toBe(1);
	const lesson = allow.rows(LESSONS_NS)[0];
	expect(lesson?.subject).toBe("ErrorClass:tsc-cannot-find-module");
	expect(lesson?.object).toContain("added the missing import");
	expect(lesson?.confidence).toBe(0.9);
});

it("a memory client that throws costs one note, never the run", async () => {
	const dead: MemoryClient = {
		...memory().client,
		transact: () => Promise.reject(new Error("abagraph is down")),
	};
	const result = run([step("code1", "code", false, "boom"), step("code1", "code", true)]);
	const written = await recordFlowRun(result, { repoRoot: repo, client: dead });
	expect(written.facts).toBe(0);
	expect(written.journalPath).not.toBe("");
	expect(written.notes).toEqual(["memory not updated: abagraph is down"]);
	const cfg = { repoRoot: repo, client: dead, models: { code1: "anthropic/good" } };
	const report = await improveFromRun(result, cfg);
	expect(report.notes).toEqual(["lessons not updated: abagraph is down"]);
	expect(report.nudged).toEqual(["code/anthropic/good-", "code/anthropic/good+"]);
	expect(report.stat?.attempts).toBe(1);
});
