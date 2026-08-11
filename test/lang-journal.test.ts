/**
 * What a flow run leaves behind on disk and in memory.
 *
 * The journal is a harness-shaped markdown file the workbench Runs view already
 * reads, so the assertions here are about its FRONTMATTER: one stage line per
 * node carrying that node's last attempt, and the run id the Flows panel joins
 * on. The facts are ordinary `Run:` rows — a flow run IS a run, so it needs no
 * new predicate and no new reader.
 */
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { recordFlowRun } from "../src/lang/record.js";
import type { FlowResult, FlowStep, NodeKind } from "../src/lang/types.js";
import type { MemFact, MemoryClient } from "../src/memory/client-types.js";
import { scanJournals } from "../src/ui/journal-scan.js";
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

it("the journal it writes is one the Runs view can already read", async () => {
	const tried = [step("code1", "code", false, "boom"), step("code1", "code", true)];
	const result = run([step("plan1", "plan", true), ...tried], { ok: true, outcome: "completed" });
	const written = await recordFlowRun(result, { repoRoot: repo });
	expect(written.journalPath).toContain(join("docs", "runs"));
	expect(written.runId).toContain("flow-ship-it-");
	const journal = scanJournals([join(repo, "docs", "runs")])[0];
	expect(journal?.kind).toBe("flow");
	expect(journal?.tool).toBe("ship-it");
	expect(journal?.status).toBe("done");
	expect(journal?.costUsd).toBe(0.42);
	// One line per node, carrying its last attempt: a retried step is not a failed run.
	expect(journal?.stages.map((s) => `${s.name}:${s.status}`)).toEqual([
		"plan1:done",
		"code1:done",
		"gate:done",
	]);
	expect(journal?.stages[1]?.detail).toContain("attempt 2");
	expect(journal?.stages[0]?.duration).toBe("4.5s");
	expect(journal?.stages.at(-1)?.detail).toBe("pass");
	// The run id, so the Flows panel joins a checkpoint to ITS journal rather
	// than to whichever run of the same flow started nearby.
	expect(journal?.runId).toBe(written.runId);
});

it("a run's facts land on the Run rows ah already reads", async () => {
	const mem = memory();
	const result = run([step("code1", "code", false, "the build died")]);
	const written = await recordFlowRun(result, { repoRoot: repo, client: mem.client, ns: "repo:t" });
	expect(written.facts).toBe(3);
	const rows = mem.rows("repo:t").map((f) => `${f.predicate}=${f.object}`);
	expect(rows).toEqual([
		"outcome=blocked",
		"stage=code1:failed",
		"failed_because=code1: the build died",
	]);
});
