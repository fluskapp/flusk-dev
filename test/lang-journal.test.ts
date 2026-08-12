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
import { recordFlowRun } from "../src/features/flows/record.repository.js";
import type { FlowResult, FlowStep, NodeKind } from "../src/features/flows/types.js";
import { createFactStore } from "../src/features/facts/facts.repository.js";
import type { Fact, FactStore } from "../src/features/facts/types.js";
import { scanJournals } from "../src/features/projects/journal-scan.repository.js";
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

it("a run's facts land on the Run rows flusk already reads", async () => {
	const mem = memory();
	const result = run([step("code1", "code", false, "the build died")]);
	const written = await recordFlowRun(result, { repoRoot: repo, store: mem.store, ns: "repo:t" });
	expect(written.facts).toBe(3);
	const rows = (await mem.rows("repo:t")).map((f) => `${f.predicate}=${f.object}`);
	expect(rows).toEqual([
		"outcome=blocked",
		"stage=code1:failed",
		"failed_because=code1: the build died",
	]);
});
