import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import {
	branchFor,
	commitCount,
	createWorktree,
	currentBranch,
	removeWorktree,
} from "../src/watch/isolation.js";

let repo: string;

const git = (args: string[], cwd = repo): string =>
	execFileSync("git", args, { cwd, encoding: "utf8" });

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "flusk-wt-repo-"));
	git(["init", "-q", "-b", "main"]);
	git(["config", "user.email", "t@t"]);
	git(["config", "user.name", "t"]);
	writeFileSync(join(repo, "seed.txt"), "seed");
	git(["add", "-A"]);
	git(["commit", "-qm", "init"]);
});

it("sanitizes item keys into legal branch names", () => {
	expect(branchFor("flusk/", "gh-prs-7")).toBe("flusk/gh-prs-7");
	expect(branchFor("flusk/", "weird key/../..")).toBe("flusk/weird-key");
	expect(branchFor("flusk/", "!!!")).toBe("flusk/item");
});

it("gives each item its own checkout and branch, then cleans up", () => {
	const wt = createWorktree(repo, "flusk/item-a");
	expect(existsSync(wt.dir)).toBe(true);
	expect(currentBranch(wt.dir)).toBe("flusk/item-a");
	// The main tree is untouched by work in the worktree.
	expect(currentBranch(repo)).toBe("main");

	writeFileSync(join(wt.dir, "work.txt"), "done");
	git(["add", "-A"], wt.dir);
	git(["commit", "-qm", "work"], wt.dir);
	expect(commitCount(repo, "flusk/item-a", "main")).toBe(1);

	removeWorktree(repo, wt);
	expect(existsSync(wt.dir)).toBe(false);
	// The branch survives removal, so the night's work stays reviewable.
	expect(git(["branch", "--list", "flusk/item-a"]).trim()).toContain("flusk/item-a");
});

it("two items get independent worktrees", () => {
	const a = createWorktree(repo, "flusk/item-a");
	const b = createWorktree(repo, "flusk/item-b");
	expect(a.dir).not.toBe(b.dir);
	writeFileSync(join(a.dir, "a.txt"), "a");
	git(["add", "-A"], a.dir);
	git(["commit", "-qm", "a"], a.dir);
	expect(commitCount(repo, "flusk/item-a", "main")).toBe(1);
	expect(commitCount(repo, "flusk/item-b", "main")).toBe(0);
	removeWorktree(repo, a);
	removeWorktree(repo, b);
});

it("reports a clear error when the branch already exists", () => {
	const a = createWorktree(repo, "flusk/dup");
	expect(() => createWorktree(repo, "flusk/dup")).toThrow(/worktree add failed for flusk\/dup/);
	removeWorktree(repo, a);
});
