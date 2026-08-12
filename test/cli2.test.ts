import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { scanSessions } from "../src/features/projects/scan.repository.js";
import { capture, git, initGitRepo, SLOW, writeFakeScript } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-cli2-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

test("--dry on the real path prints model/kind/tools/isolation and system prompt without any provider call", async () => {
	const savedKey = process.env.ANTHROPIC_API_KEY;
	delete process.env.ANTHROPIC_API_KEY; // fake-free: dry must not need auth
	try {
		const cap = capture();
		const reason = await runCmd({
			task: "add a --json flag to the CLI",
			repo,
			real: true,
			dry: true,
			out: cap.out,
		});
		expect(reason).toBe("completed"); // maps to exit 0 in main.ts
		const text = cap.text();
		expect(text).toContain("kind: code");
		expect(text).toContain("model: anthropic/claude-sonnet-5");
		expect(text).toContain("tools: read, bash, write, edit, glob, grep, task");
		expect(text).toContain("isolation: off (not a git repository)");
		expect(text).toContain("You are flusk, an autonomous coding agent.");
		expect(scanSessions()).toHaveLength(0); // no agent, no session, no provider
	} finally {
		if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
	}
}, SLOW);

test("--dry honors --kind and --model overrides and shows the isolation plan for git repos", async () => {
	await initGitRepo(repo);
	const cap = capture();
	const reason = await runCmd({
		task: "whatever",
		repo,
		real: true,
		dry: true,
		kind: "review",
		model: "anthropic/claude-haiku-4-5",
		out: cap.out,
	});
	expect(reason).toBe("completed");
	expect(cap.text()).toContain("kind: review");
	expect(cap.text()).toContain("model: anthropic/claude-haiku-4-5");
	expect(cap.text()).toMatch(/isolation: branch flusk\/<run-id>/);
}, SLOW);

test("real run preflight fails fast on missing auth or missing git, never reaching a provider", async () => {
	const savedKey = process.env.ANTHROPIC_API_KEY;
	delete process.env.ANTHROPIC_API_KEY;
	try {
		// Non-git repo: fails on the auth preflight (naming the env var) or, when
		// ambient auth exists, on the requireGit isolation check — never later.
		await expect(runCmd({ task: "t", repo, real: true, quiet: true })).rejects.toThrow(
			/ANTHROPIC_API_KEY|not a git repository/,
		);
		expect(scanSessions()).toHaveLength(0);
	} finally {
		if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
	}
}, SLOW);

test("fake run with isolation lands checkpoint commits on a flusk/<id> branch and prints the review hint", async () => {
	await initGitRepo(repo);
	const script = await writeFakeScript(join(repo, "..", "script.json"), "echo data > out.txt");
	const cap = capture();
	const reason = await runCmd({ task: "write a file", repo, fake: script, out: cap.out });
	expect(reason).toBe("completed");

	const branch = git(repo, "rev-parse", "--abbrev-ref", "HEAD").trim();
	expect(branch).toMatch(/^flusk\/[0-9a-f-]{8}$/);
	expect(git(repo, "log", "--format=%s")).toContain("flusk: turn 1");
	expect(git(repo, "show", "HEAD:out.txt")).toBe("data\n");
	expect(cap.text()).toMatch(/1 commit on flusk\//);
	expect(cap.text()).toContain("review with: git diff");
}, SLOW);

test("fake run on a dirty tree refuses without --allow-dirty and proceeds with it", async () => {
	await initGitRepo(repo);
	await writeFile(join(repo, "uncommitted.txt"), "dirty\n");
	const script = await writeFakeScript(join(repo, "..", "dirty-script.json"), "echo ok");
	await expect(runCmd({ task: "t", repo, fake: script, quiet: true })).rejects.toThrow(/dirty/);
	const cap = capture();
	const reason = await runCmd({
		task: "t",
		repo,
		fake: script,
		allowDirty: true,
		quiet: true,
		out: cap.out,
	});
	expect(reason).toBe("completed");
}, SLOW);
