/**
 * The gate writes the run's only facts of record. A store that will not accept
 * them must not change the verdict — a full disk is not evidence of a lie —
 * but it must not pass in silence either: the CLI would print a completion
 * whose claims nothing can ever be checked against, and under `ah watch` the
 * item is marked done off a run that left no trace.
 */
import { expect, it } from "vitest";
import { claimCheck } from "../src/cli/gate-report.js";
import type { GateOpts } from "../src/cli/gate-loop.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { RunRecord } from "../src/core/run-record.js";
import { zeroUsage } from "../src/core/types.js";
import type { FactStore } from "../src/store/types.js";
import { capture } from "./cli2-helpers.js";

const run: RunRecord = {
	runId: "r1",
	sessionId: "s1",
	repoPath: "/tmp/repo",
	task: "",
	outcome: "completed",
	filesTouched: ["src/a.ts"],
	commandsRun: [{ cmd: "npm test", exit: 0 }],
	transcriptTail: [],
	stats: { turns: 1, usage: zeroUsage(), startedAt: "" },
};

const refusing: FactStore = {
	query: async () => [],
	transact: async () => {
		throw new Error("EACCES: permission denied, mkdir '/root/.ah/store'");
	},
};

const accepting = (): { store: FactStore; writes: number } => {
	const state = { writes: 0, store: {} as FactStore };
	state.store = {
		query: async () => [],
		transact: async () => {
			state.writes++;
			return { tx: state.writes, ids: [] };
		},
	};
	return state;
};

function opts(store: FactStore | null, out: NodeJS.WritableStream): GateOpts {
	return { cfg: DEFAULT_CONFIG, repoRoot: "/tmp/repo", store, ns: "repo:x", out };
}

it("says so when the run could not be recorded, and still reports the verdict", async () => {
	const cap = capture();
	const verdict = await claimCheck(refusing, opts(refusing, cap.out), run, [], "I edited src/a.ts");
	expect(verdict).toBe("completed");
	expect(cap.text()).toContain("warning: this run was not recorded");
	expect(cap.text()).toContain("EACCES");
});

it("says nothing extra when the record was written", async () => {
	const cap = capture();
	const { store } = accepting();
	const verdict = await claimCheck(store, opts(store, cap.out), run, [], "I edited src/a.ts");
	expect(verdict).toBe("completed");
	expect(cap.text()).not.toContain("warning");
});
