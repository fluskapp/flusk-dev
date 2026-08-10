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
	repo = mkdtempSync(join(tmpdir(), "hit-wt-repo-"));
	git(["init", "-q", "-b", "main"]);
	git(["config", "user.email", "t@t"]);
	git(["config", "user.name", "t"]);
	writeFileSync(join(repo, "seed.txt"), "seed");
	git(["add", "-A"]);
	git(["commit", "-qm", "init"]);
});

it("sanitizes item keys into legal branch names", () => {
	expect(branchFor("hit/", "gh-prs-7")).toBe("hit/gh-prs-7");
	expect(branchFor("hit/", "weird key/../..")).toBe("hit/weird-key");
	expect(branchFor("hit/", "!!!")).toBe("hit/item");
});

it("gives each item its own checkout and branch, then cleans up", () => {
	const wt = createWorktree(repo, "hit/item-a");
	expect(existsSync(wt.dir)).toBe(true);
	expect(currentBranch(wt.dir)).toBe("hit/item-a");
	// The main tree is untouched by work in the worktree.
	expect(currentBranch(repo)).toBe("main");

	writeFileSync(join(wt.dir, "work.txt"), "done");
	git(["add", "-A"], wt.dir);
	git(["commit", "-qm", "work"], wt.dir);
	expect(commitCount(repo, "hit/item-a", "main")).toBe(1);

	removeWorktree(repo, wt);
	expect(existsSync(wt.dir)).toBe(false);
	// The branch survives removal, so the night's work stays reviewable.
	expect(git(["branch", "--list", "hit/item-a"]).trim()).toContain("hit/item-a");
});

it("two items get independent worktrees", () => {
	const a = createWorktree(repo, "hit/item-a");
	const b = createWorktree(repo, "hit/item-b");
	expect(a.dir).not.toBe(b.dir);
	writeFileSync(join(a.dir, "a.txt"), "a");
	git(["add", "-A"], a.dir);
	git(["commit", "-qm", "a"], a.dir);
	expect(commitCount(repo, "hit/item-a", "main")).toBe(1);
	expect(commitCount(repo, "hit/item-b", "main")).toBe(0);
	removeWorktree(repo, a);
	removeWorktree(repo, b);
});

it("reports a clear error when the branch already exists", () => {
	const a = createWorktree(repo, "hit/dup");
	expect(() => createWorktree(repo, "hit/dup")).toThrow(/worktree add failed for hit\/dup/);
	removeWorktree(repo, a);
});
