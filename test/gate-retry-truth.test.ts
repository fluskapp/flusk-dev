/**
 * Truth in the data layer across gate retries: a continueRun restarts turn
 * numbering at 1, so the retry's turn entries must not inherit the first
 * run's checkpoint set; and the run-detail status applies the same
 * last-gate-wins fold the feed scan does, so the transcript header pill can
 * never contradict the feed row on blocked ≠ completed.
 */
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { loadSessionDetail } from "../src/features/projects/detail.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/features/provider/fake.js";
import { createAgent } from "../src/features/run/agent.js";
import type { RunStats } from "../src/features/run/run.types.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { SessionStore } from "../src/features/session/session.repository.js";
import { writeTool } from "../src/features/tools/write.repository.js";
import { SLOW } from "./cli2-helpers.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

function sh(cwd: string, args: string[]): void {
	const res = spawnSync("git", args, { cwd, encoding: "utf8" });
	if (res.status !== 0) throw new Error(`test git ${args.join(" ")}: ${res.stderr}`);
}

/** Scratch repo → git repo with local identity + seed commit (checkpoint.test idiom). */
function gitInit(repo: string): void {
	sh(repo, ["init", "-q"]);
	sh(repo, ["config", "user.email", "test@example.com"]);
	sh(repo, ["config", "user.name", "Test"]);
	sh(repo, ["config", "commit.gpgsign", "false"]);
	sh(repo, ["commit", "-q", "--allow-empty", "-m", "seed"]);
}

it(
	"a continueRun retry's turn entries never inherit the first run's checkpoint set",
	async () => {
		const repo = await setupTestHome("flusk-retry-ckpt-");
		try {
			gitInit(repo);
			const provider = new FakeProvider([
				// Run 1, turn 1: mutates → the per-turn checkpoint commits (committed = {1}).
				{ message: assistantToolCalls([{ id: "w1", name: "write", args: { file_path: "a.txt", content: "x\n" } }]) },
				{ message: assistantText("done (allegedly)") }, // run 1, turn 2: ends
				{ message: assistantText("no tools this time") }, // retry, turn 1: text-only
			]);
			const agent = createAgent({
				provider,
				model: fakeModel,
				tools: [writeTool],
				task: "t",
				repoRoot: repo,
				isolation: { repoRoot: repo, branch: "flusk/test" },
			});
			expect((await agent.run()).reason).toBe("completed");
			// The gate's steer path: same session, fresh run, turn numbering restarts at 1.
			expect((await agent.continueRun("verify failed: fix it")).reason).toBe("completed");
			agent.session.close();

			const turns = SessionStore.read(agent.session.path)
				.filter((e) => e.type === "decision")
				.map((e) => e.decision)
				.filter((d) => d.kind === "turn");
			expect(turns.map((t) => t.turn)).toEqual([1, 2, 1]);
			expect(turns[0]?.checkpointed).toBe(true); // run 1's turn 1 mutated and committed
			const retry = turns[2];
			expect(retry?.tools).toEqual([]); // the retry's turn 1 is tool-less…
			// …so it must not attest a checkpoint the first run's turn 1 made.
			expect(retry !== undefined && "checkpointed" in retry).toBe(false);
		} finally {
			teardownTestHome();
		}
	},
	SLOW,
);

const stats: RunStats = {
	turns: 1,
	usage: { input: 1, output: 1, cacheRead: 0, costUsd: 0.01 },
	startedAt: "2026-01-01T00:00:00Z",
};

function sessionWith(repo: string, decisions: Array<Parameters<Session["appendDecision"]>[0]>): string {
	const sess = Session.create({ task: "t", repoRoot: repo, model: fakeModel });
	sess.appendMessage({ role: "user", content: "t" });
	sess.appendMessage({
		role: "assistant",
		content: [{ type: "text", text: "done" }],
		stopReason: "end",
		usage: stats.usage,
	});
	for (const d of decisions) sess.appendDecision(d);
	sess.appendStats(stats, "completed");
	sess.close();
	return sess.path;
}

it("run-detail status folds the last gate entry: blocked beats a completed reason", async () => {
	const repo = await setupTestHome("flusk-detail-fold-");
	try {
		const path = sessionWith(repo, [{ kind: "gate", outcome: "blocked", retries: 1, verified: [] }]);
		const d = loadSessionDetail(path);
		expect(d.reason).toBe("completed");
		expect(d.status).toBe("blocked"); // the feed row and header pill agree
	} finally {
		teardownTestHome();
	}
});

it("the LAST gate entry wins in the detail too: a passing retry clears the block", async () => {
	const repo = await setupTestHome("flusk-detail-lastgate-");
	try {
		const path = sessionWith(repo, [
			{ kind: "gate", outcome: "blocked", retries: 1, verified: [] },
			{ kind: "gate", outcome: "completed", retries: 2, verified: ["npm test"] },
		]);
		expect(loadSessionDetail(path).status).toBe("completed");
	} finally {
		teardownTestHome();
	}
});
