/**
 * Worktree-per-item isolation. Each unattended item gets its own checkout and
 * branch, so a long night of runs never fights over one working tree and a
 * bad run is discarded by deleting a directory.
 *
 * Nothing here pushes; publishing is a separate, opt-in step (see `push.ts`).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Worktree {
	dir: string;
	branch: string;
}

function git(repoRoot: string, args: string[]): { ok: boolean; out: string; err: string } {
	const r = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8", timeout: 120_000 });
	return { ok: r.status === 0, out: r.stdout ?? "", err: r.stderr ?? "" };
}

/** Branch name for an item, sanitized for git's refname rules. */
export function branchFor(prefix: string, key: string): string {
	const safe = key.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
	return `${prefix}${safe || "item"}`;
}

/**
 * Create a detached worktree on a fresh branch. `base` is the ref to branch
 * from (the item's own ref when it has one, else current HEAD).
 */
export function createWorktree(repoRoot: string, branch: string, base?: string): Worktree {
	const dir = mkdtempSync(join(tmpdir(), "ah-wt-"));
	const args = ["worktree", "add", "-b", branch, dir];
	if (base !== undefined && base !== "") args.push(base);
	const r = git(repoRoot, args);
	if (!r.ok) {
		// A leftover branch from a killed run is the common cause; surface it.
		throw new Error(`git worktree add failed for ${branch}: ${r.err.trim()}`);
	}
	return { dir, branch };
}

/** Remove the checkout. The branch survives so its commits stay reviewable. */
export function removeWorktree(repoRoot: string, wt: Worktree): void {
	git(repoRoot, ["worktree", "remove", "--force", wt.dir]);
}

/**
 * Branch currently checked out in a worktree. A run does its own branch
 * isolation inside the worktree, so after it finishes HEAD points at the
 * branch actually carrying its checkpoint commits — that is what gets
 * counted and (optionally) published.
 */
export function currentBranch(dir: string): string {
	const r = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]);
	return r.ok ? r.out.trim() : "";
}

/** Commits the run added on top of its base — 0 means it changed nothing. */
export function commitCount(repoRoot: string, branch: string, base: string): number {
	const r = git(repoRoot, ["rev-list", "--count", `${base}..${branch}`]);
	const n = Number(r.out.trim());
	return r.ok && Number.isFinite(n) ? n : 0;
}
