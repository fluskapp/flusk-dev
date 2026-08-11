/**
 * Which "projects" are actually the same repository checked out twice.
 *
 * A git worktree looks exactly like a project to a directory scanner: its own
 * root, its own name, its own docs. So a repo with three worktrees appears as
 * four entries in the tree, none of them saying they are related, and the
 * question "which of these is which" has no answer on screen. That is not a
 * hypothetical — this workbench was built across ah, ah-ui, ah-orch and
 * ah-lang, and the tree showed four projects.
 *
 * The distinction is a fact on disk rather than a guess: a worktree's `.git`
 * is a FILE containing `gitdir: <main repo>/.git/worktrees/<name>`, where a
 * main checkout's `.git` is a directory. Reading one small file per project
 * is cheap enough to do on every scan, and cheaper than being wrong.
 */
import { readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

/** How far up from `.git/worktrees/<name>` the main repo root sits. */
const WORKTREE_MARKER = "/.git/worktrees/";

/**
 * The absolute root of the repository this checkout belongs to, or null when
 * it is a main checkout, not a repo at all, or unreadable. Never throws: an
 * unreadable .git must leave the project listed, not hide it.
 */
export function mainRepoOf(root: string): string | null {
	const dotGit = join(root, ".git");
	let isFile = false;
	try {
		isFile = statSync(dotGit).isFile();
	} catch {
		return null; // no .git at all, or no permission — treat as its own thing
	}
	if (!isFile) return null; // a directory: this IS the main checkout

	let text: string;
	try {
		text = readFileSync(dotGit, "utf8");
	} catch {
		return null;
	}
	const match = /^gitdir:\s*(.+)$/m.exec(text.trim());
	const gitdir = match?.[1]?.trim();
	if (gitdir === undefined) return null;
	const at = gitdir.indexOf(WORKTREE_MARKER);
	// A gitdir that is not under .git/worktrees is a submodule or something
	// else entirely; claiming a parent we did not find would be worse than
	// leaving the project standing on its own.
	if (at === -1) return null;
	return resolve(gitdir.slice(0, at));
}

/** The display name of the repo a worktree belongs to, or null. */
export function mainRepoName(root: string): string | null {
	const main = mainRepoOf(root);
	return main === null ? null : basename(main) || main;
}
