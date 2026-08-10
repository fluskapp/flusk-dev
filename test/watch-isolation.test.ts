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
	repo = mkdtempSync(join(tmpdir(), "ah-wt-repo-"));
	git(["init", "-q", "-b", "main"]);
	git(["config", "user.email", "t@t"]);
	git(["config", "user.name", "t"]);
	writeFileSync(join(repo, "seed.txt"), "seed");
	git(["add", "-A"]);
	git(["commit", "-qm", "init"]);
});

it("sanitizes item keys into legal branch names", () => {
	expect(branchFor("ah/", "gh-prs-7")).toBe("ah/gh-prs-7");
	expect(branchFor("ah/", "weird key/../..")).toBe("ah/weird-key");
	expect(branchFor("ah/", "!!!")).toBe("ah/item");
});

it("gives each item its own checkout and branch, then cleans up", () => {
	const wt = createWorktree(repo, "ah/item-a");
	expect(existsSync(wt.dir)).toBe(true);
	expect(currentBranch(wt.dir)).toBe("ah/item-a");
	// The main tree is untouched by work in the worktree.
	expect(currentBranch(repo)).toBe("main");

	writeFileSync(join(wt.dir, "work.txt"), "done");
	git(["add", "-A"], wt.dir);
	git(["commit", "-qm", "work"], wt.dir);
	expect(commitCount(repo, "ah/item-a", "main")).toBe(1);

	removeWorktree(repo, wt);
	expect(existsSync(wt.dir)).toBe(false);
	// The branch survives removal, so the night's work stays reviewable.
	expect(git(["branch", "--list", "ah/item-a"]).trim()).toContain("ah/item-a");
});

it("two items get independent worktrees", () => {
	const a = createWorktree(repo, "ah/item-a");
	const b = createWorktree(repo, "ah/item-b");
	expect(a.dir).not.toBe(b.dir);
	writeFileSync(join(a.dir, "a.txt"), "a");
	git(["add", "-A"], a.dir);
	git(["commit", "-qm", "a"], a.dir);
	expect(commitCount(repo, "ah/item-a", "main")).toBe(1);
	expect(commitCount(repo, "ah/item-b", "main")).toBe(0);
	removeWorktree(repo, a);
	removeWorktree(repo, b);
});

it("reports a clear error when the branch already exists", () => {
	const a = createWorktree(repo, "ah/dup");
	expect(() => createWorktree(repo, "ah/dup")).toThrow(/worktree add failed for ah\/dup/);
	removeWorktree(repo, a);
});
