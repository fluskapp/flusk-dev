/**
 * Telling a worktree from a repository, and ordering the list that results.
 *
 * Four of the thirteen rows in this workbench's own project tree were the same
 * repository checked out four times, with nothing on screen saying so. The
 * distinction is a fact on disk, so it is tested against real files rather
 * than against a mock that would agree with whatever the code did.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { mainRepoName, mainRepoOf } from "../src/features/profile/worktree.repository.js";

let root: string;
let main: string;
let tree: string;

beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "flusk-wt-"));
	main = join(root, "flusk");
	tree = join(root, "flusk-ui");
	mkdirSync(join(main, ".git", "worktrees", "flusk-ui"), { recursive: true });
	mkdirSync(tree, { recursive: true });
	writeFileSync(join(tree, ".git"), `gitdir: ${join(main, ".git", "worktrees", "flusk-ui")}\n`);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

it("reads the parent repo out of a worktree's .git file", () => {
	expect(mainRepoOf(tree)).toBe(main);
	expect(mainRepoName(tree)).toBe("flusk");
});

it("calls a main checkout what it is: not a worktree", () => {
	// .git is a DIRECTORY here, which is the whole distinction.
	expect(mainRepoOf(main)).toBeNull();
	expect(mainRepoName(main)).toBeNull();
});

it("leaves a plain directory alone rather than inventing a parent", () => {
	const plain = join(root, "not-a-repo");
	mkdirSync(plain, { recursive: true });
	expect(mainRepoOf(plain)).toBeNull();
});

it("refuses a gitdir that is not under .git/worktrees", () => {
	// A submodule points elsewhere. Claiming a parent we did not find would be
	// worse than leaving the project standing on its own.
	const sub = join(root, "submodule");
	mkdirSync(sub, { recursive: true });
	writeFileSync(join(sub, ".git"), `gitdir: ${join(main, ".git", "modules", "sub")}\n`);
	expect(mainRepoOf(sub)).toBeNull();
});

it("survives an unreadable or malformed .git without hiding the project", () => {
	const broken = join(root, "broken");
	mkdirSync(broken, { recursive: true });
	writeFileSync(join(broken, ".git"), "this is not a gitdir line\n");
	// null means "list it on its own", never "drop it".
	expect(mainRepoOf(broken)).toBeNull();
});
