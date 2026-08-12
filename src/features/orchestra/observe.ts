/**
 * What a delegation actually changed on disk.
 *
 * WorkerResult.filesTouched is what the verify gate diffs against, so it has
 * to be OBSERVED, never parroted from the agent's summary: a CLI agent that
 * says "I updated three files" and touched none, or edited a fourth it never
 * mentioned, must not be able to steer the gate. Snapshot the tree before the
 * worker runs, snapshot it after, and report the difference.
 *
 * Traps this covers:
 *  - a file already dirty before the run and edited again during it keeps its
 *    porcelain code, so identity is a content hash (see git-probe.ts);
 *  - an agent CLI that COMMITS its work leaves a clean tree, so a moved HEAD
 *    contributes the commit range's paths as well;
 *  - a repo with no commits yet has no HEAD, which is not an error.
 *
 * "Cannot tell" is [] and never a guess: a non-git directory yields no
 * evidence rather than fabricated evidence.
 */
import { resolveWithin } from "../safety/paths.repository.js";
import { fingerprint, gitOut, porcelainPaths } from "./git-probe.repository.js";

export interface TreeSnapshot {
	/** False when cwd is not a git work tree; the diff is then unknowable. */
	git: boolean;
	/** HEAD sha, or null in a repo without commits. */
	head: string | null;
	/** Dirty path (repo-relative) -> content fingerprint. */
	dirty: Map<string, string>;
}

export function snapshotTree(cwd: string): TreeSnapshot {
	const status = gitOut(cwd, ["status", "--porcelain", "-z", "--untracked-files=all"]);
	const dirty = new Map<string, string>();
	if (status !== null) {
		for (const rel of porcelainPaths(status)) dirty.set(rel, fingerprint(cwd, rel));
	}
	const head = gitOut(cwd, ["rev-parse", "HEAD"]);
	return { git: status !== null, head: head === null ? null : head.trim(), dirty };
}

/** Absolute, deduped, sorted paths changed since `before`. Never throws. */
export function touchedSince(cwd: string, before: TreeSnapshot): string[] {
	const after = snapshotTree(cwd);
	if (!before.git || !after.git) return [];
	const rels = new Set<string>();
	for (const [rel, hash] of after.dirty) {
		if (before.dirty.get(rel) !== hash) rels.add(rel);
	}
	for (const [rel, hash] of before.dirty) {
		if (after.dirty.get(rel) !== hash) rels.add(rel);
	}
	if (before.head !== null && after.head !== null && before.head !== after.head) {
		const range = gitOut(cwd, ["diff", "--name-only", "-z", `${before.head}..${after.head}`]);
		for (const rel of (range ?? "").split("\0")) if (rel !== "") rels.add(rel);
	}
	return jail(cwd, rels);
}

/**
 * Every reported path is proven to live under cwd with the existing jail. A
 * path that escapes it (a symlinked submodule, a repo-relative path pointing
 * outside the root) is dropped rather than reported: filesTouched is read as
 * a claim about this project, so it may not name a file outside it.
 */
function jail(cwd: string, rels: Set<string>): string[] {
	const out = new Set<string>();
	for (const rel of rels) {
		try {
			out.add(resolveWithin([cwd], rel, cwd));
		} catch {
			// outside the project root: not this delegation's evidence
		}
	}
	return [...out].sort();
}
