import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import { collectRunRecord } from "../src/core/run-record.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import { bashTool } from "../src/tools/bash.js";
import { writeTool } from "../src/tools/write.js";
import { SLOW } from "./cli2-helpers.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

function sh(cwd: string, args: string[]): string {
	const res = spawnSync("git", args, { cwd, encoding: "utf8" });
	if (res.status !== 0) throw new Error(`test git ${args.join(" ")}: ${res.stderr}`);
	return res.stdout.trim();
}

/** Turns the mkdtemp scratch repo into a git repo with local identity + seed commit. */
function gitInit(repo: string): void {
	sh(repo, ["init", "-q"]);
	sh(repo, ["config", "user.email", "test@example.com"]);
	sh(repo, ["config", "user.name", "Test"]);
	sh(repo, ["config", "commit.gpgsign", "false"]);
	sh(repo, ["commit", "-q", "--allow-empty", "-m", "seed"]);
}

test("isolation: a mutating turn is checkpointed as 'ah: turn N'", async () => {
	const repo = await setupTestHome("ah-checkpoint-");
	try {
		gitInit(repo);
		const provider = new FakeProvider([
			{
				message: assistantToolCalls([
					{ id: "w1", name: "write", args: { file_path: "note.txt", content: "hello\n" } },
					{ id: "b1", name: "bash", args: { command: "printf hi; exit 3" } },
				]),
			},
			{ message: assistantText("done") },
		]);
		const agent = createAgent({
			provider,
			model: fakeModel,
			tools: [writeTool, bashTool],
			task: "make a note",
			repoRoot: repo,
			isolation: { repoRoot: repo, branch: "ah/test" },
		});
		const rec = collectRunRecord(agent.events, repo);
		const { reason } = await agent.run();
		expect(reason).toBe("completed");
		rec.stop();

		const subjects = sh(repo, ["log", "--format=%s"]).split("\n");
		expect(subjects).toEqual(["ah: turn 1", "seed"]);
		// The checkpoint captured the file the write tool produced.
		expect(sh(repo, ["show", "--name-only", "--format=", "HEAD"])).toContain("note.txt");

		// The run record collected the evidence trail off the event bus.
		expect(rec.filesTouched).toEqual([join(repo, "note.txt")]);
		expect(rec.commandsRun).toEqual([{ cmd: "printf hi; exit 3", exit: 3 }]);
		agent.session.close();
	} finally {
		teardownTestHome();
	}
}, SLOW);

test("isolation: non-mutating turns produce no checkpoint commit", async () => {
	const repo = await setupTestHome("ah-checkpoint-clean-");
	try {
		gitInit(repo);
		const provider = new FakeProvider([
			{
				// An errored call is not a successful mutation; no checkpoint fires.
				message: assistantToolCalls([{ id: "b1", name: "unknown_tool", args: {} }]),
			},
			{ message: assistantText("nothing to do") },
		]);
		const agent = createAgent({
			provider,
			model: fakeModel,
			tools: [writeTool, bashTool],
			task: "look around",
			repoRoot: repo,
			isolation: { repoRoot: repo, branch: "ah/test" },
		});
		const { reason } = await agent.run();
		expect(reason).toBe("completed");
		expect(sh(repo, ["log", "--format=%s"]).split("\n")).toEqual(["seed"]);
		agent.session.close();
	} finally {
		teardownTestHome();
	}
}, SLOW);
