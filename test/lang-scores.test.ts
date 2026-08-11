/**
 * What a run teaches the router, and what it is allowed to promote.
 *
 * Both used to point the wrong way. A non-verify step reports `ok` for emitting
 * text at all, so scoring on that rewarded a code model for saying anything
 * while the gate's verdict landed on the verify step and penalized the reviewer
 * for the state of the repository. And `verified()` read `r.ok`, which a run
 * containing a fix can never be — so an honest lesson was always downgraded.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { creditFor, improveFromRun } from "../src/lang/improve.js";
import type { FlowResult, FlowStep, NodeKind } from "../src/lang/types.js";
import type { MemFact, MemoryClient } from "../src/memory/client-types.js";
import { LESSONS_NS } from "../src/memory/namespaces.js";
import { loadScores } from "../src/provider/scores.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-lang-scores-");
});

afterEach(() => {
	teardownTestHome();
});

const step = (
	nodeId: string,
	kind: NodeKind,
	ok: boolean,
	output = "said something",
): FlowStep => ({
	nodeId,
	kind,
	ok,
	output,
	promptTokens: 900,
	startedAt: "2026-08-11T10:00:00.000Z",
	endedAt: "2026-08-11T10:00:04.500Z",
});

function run(steps: FlowStep[], over: Partial<FlowResult> = {}): FlowResult {
	const ok = steps.every((s) => s.ok);
	const state = { task: "add a retry", project: "demo", artifacts: {}, costUsd: 0.42, steps };
	return { spec: "ship-it", state, ok, outcome: ok ? "completed" : "blocked", ...over };
}

it("scores a code step on the gate that judged it, not on it having spoken", () => {
	const steps = [step("code1", "code", true), step("verify1", "verify", false, "red")];
	// The code step said `ok` — it emitted text. The gate says otherwise, and
	// the gate is the only honest signal about a change.
	expect(creditFor(steps, 0)).toBe(false);
	const passed = [step("code1", "code", true), step("verify1", "verify", true, "green")];
	expect(creditFor(passed, 0)).toBe(true);
});

it("scores a verify step on producing a report, never on the gate's verdict", () => {
	const red = [step("verify1", "verify", false, "Verification failed: npm test exited 1")];
	expect(creditFor(red, 0)).toBe(true); // a red gate is the repo's fault
	const stopped = [step("verify1", "verify", false, "")];
	expect(creditFor(stopped, 0)).toBe(false); // budget-stopped: no report at all
});

it("nudges the model that owned the change, not the one that reported on it", async () => {
	const result = run([step("code1", "code", true), step("verify1", "verify", false, "red")]);
	const models = { code1: "anthropic/coder", verify1: "anthropic/reviewer" };
	const report = await improveFromRun(result, { repoRoot: repo, models });
	expect(report.nudged).toEqual(["code/anthropic/coder-", "review/anthropic/reviewer+"]);
	const scores = await loadScores();
	expect(scores.code?.["anthropic/coder"]).toBeCloseTo(0.4);
	expect(scores.review?.["anthropic/reviewer"]).toBeCloseTo(0.55);
});

/** Anything under 0.75 reads as a Candidate, exactly as abagraph parks it. */
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

it("promotes a fix from a run runFlow can actually produce", async () => {
	// A fail-then-succeed pair is always on a blocking kind, so `ok` is false and
	// the outcome is what the LAST attempt of each node made it: completed.
	const attempts = [
		step("code1", "code", false),
		step("code1", "code", true),
		step("verify1", "verify", true, "green"),
	];
	const mem = memory();
	const real = run(attempts, { ok: false, outcome: "completed" });
	expect((await improveFromRun(real, { repoRoot: repo, client: mem.client })).lessons).toBe(1);
	expect(mem.rows(LESSONS_NS)[0]?.confidence).toBe(0.9);
});

it("refuses to promote when the last verification did not pass", async () => {
	const mem = memory();
	const unverified = run(
		[
			step("code1", "code", false),
			step("code1", "code", true),
			step("verify1", "verify", false, "red"),
		],
		{ ok: false, outcome: "blocked" },
	);
	expect((await improveFromRun(unverified, { repoRoot: repo, client: mem.client })).lessons).toBe(
		0,
	);
	expect(mem.rows(LESSONS_NS)).toHaveLength(0);
});
