import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	checkpoint,
	ensureCleanTree,
	isGitRepo,
	startRunBranch,
	summarizeRun,
} from "../src/features/safety/git-isolation.repository.js";

const dirs: string[] = [];

afterEach(async () => {
	while (dirs.length > 0) {
		await rm(dirs.pop() as string, { recursive: true, force: true });
	}
});

function sh(cwd: string, args: string[]): string {
	const res = spawnSync("git", args, { cwd, encoding: "utf8" });
	if (res.status !== 0) throw new Error(`test git ${args.join(" ")}: ${res.stderr}`);
	return res.stdout.trim();
}

async function scratchDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "flusk-git-"));
	dirs.push(dir);
	return dir;
}

/** mkdtemp repo with local identity and one seed commit. */
async function scratchRepo(): Promise<string> {
	const dir = await scratchDir();
	sh(dir, ["init", "-q"]);
	sh(dir, ["config", "user.email", "test@example.com"]);
	sh(dir, ["config", "user.name", "Test"]);
	sh(dir, ["config", "commit.gpgsign", "false"]);
	await writeFile(join(dir, "seed.txt"), "seed\n");
	sh(dir, ["add", "-A"]);
	sh(dir, ["commit", "-q", "-m", "seed"]);
	return dir;
}

describe("git isolation", () => {
	it("detects repos and non-repos", async () => {
		expect(isGitRepo(await scratchRepo())).toBe(true);
		expect(isGitRepo(await scratchDir())).toBe(false);
	});

	it("ensureCleanTree passes on a clean tree", async () => {
		const repo = await scratchRepo();
		expect(() => ensureCleanTree(repo)).not.toThrow();
	});

	it("ensureCleanTree throws listing dirty paths with guidance", async () => {
		const repo = await scratchRepo();
		await writeFile(join(repo, "dirty.txt"), "x\n");
		let message = "";
		try {
			ensureCleanTree(repo);
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toContain("dirty.txt");
		expect(message).toContain("commit/stash or pass --allow-dirty");
	});

	it("ensureCleanTree throws clearly outside a repo", async () => {
		const dir = await scratchDir();
		expect(() => ensureCleanTree(dir)).toThrowError(/git status --porcelain failed/);
	});

	it("startRunBranch records the current branch and switches to the run branch", async () => {
		const repo = await scratchRepo();
		const before = sh(repo, ["symbolic-ref", "--short", "HEAD"]);
		const { branch, originalRef } = startRunBranch(repo, "run1", "flusk/");
		expect(branch).toBe("flusk/run1");
		expect(originalRef).toBe(before);
		expect(sh(repo, ["symbolic-ref", "--short", "HEAD"])).toBe("flusk/run1");
	});

	it("startRunBranch from detached HEAD records the SHA", async () => {
		const repo = await scratchRepo();
		const sha = sh(repo, ["rev-parse", "HEAD"]);
		sh(repo, ["checkout", "-q", "--detach"]);
		const { branch, originalRef } = startRunBranch(repo, "run2", "flusk/");
		expect(branch).toBe("flusk/run2");
		expect(originalRef).toBe(sha);
		expect(originalRef).toMatch(/^[0-9a-f]{40}$/);
	});

	it("checkpoint is a no-op on a clean tree", async () => {
		const repo = await scratchRepo();
		expect(checkpoint(repo, 1)).toBe(false);
		expect(sh(repo, ["rev-list", "--count", "HEAD"])).toBe("1");
	});

	it("checkpoint commits with the flusk identity and message format", async () => {
		const repo = await scratchRepo();
		await writeFile(join(repo, "work.txt"), "w\n");
		expect(checkpoint(repo, 3)).toBe(true);
		expect(sh(repo, ["log", "-1", "--format=%s|%an|%ae"])).toBe(
			"flusk: turn 3|flusk|flusk@localhost",
		);
		expect(sh(repo, ["status", "--porcelain"])).toBe("");
	});

	it("never runs the target repo's git hooks (checkout or commit)", async () => {
		const repo = await scratchRepo();
		const marker = join(repo, "HOOK-RAN");
		for (const name of ["pre-commit", "post-commit", "post-checkout"]) {
			await writeFile(
				join(repo, ".git", "hooks", name),
				`#!/bin/sh\ntouch "${marker}"\nexit 1\n`,
				{ mode: 0o755 },
			);
		}
		startRunBranch(repo, "hooked", "flusk/");
		await writeFile(join(repo, "w.txt"), "w\n");
		expect(checkpoint(repo, 1)).toBe(true); // a failing pre-commit hook must not crash it
		expect(existsSync(marker)).toBe(false); // ...and no hook code ever executed
		expect(sh(repo, ["log", "-1", "--format=%s"])).toBe("flusk: turn 1");
	});

	it("summarizeRun counts commits and points at the review diff", async () => {
		const repo = await scratchRepo();
		const { branch, originalRef } = startRunBranch(repo, "run3", "flusk/");
		await writeFile(join(repo, "a.txt"), "a\n");
		checkpoint(repo, 1);
		await writeFile(join(repo, "b.txt"), "b\n");
		checkpoint(repo, 2);
		const summary = summarizeRun(repo, branch, originalRef);
		expect(summary).toContain("2 commits");
		expect(summary).toContain(`review with: git diff ${originalRef}...${branch}`);
	});
});
