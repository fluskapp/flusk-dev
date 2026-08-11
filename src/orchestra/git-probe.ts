/**
 * Read-only git probing for the orchestra's evidence trail.
 *
 * A delegated agent's prose about what it changed is agent-authored text, so
 * it is never evidence (see WorkerResult.summary). The working tree is. This
 * file is the only place the workers touch git, and it is deliberately
 * read-only: no add, no commit, no checkout — a worker observing a repo must
 * not mutate the very thing it is measuring.
 *
 * Nothing here throws. A directory that is not a repo, a git that is not
 * installed, a broken index: every one of them reads as "cannot tell", which
 * the caller turns into filesTouched: [] rather than a guess.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** stdout of a successful git, or null for any failure at all. */
export function gitOut(cwd: string, args: string[]): string | null {
	// argv array, never a shell string: `cwd` and the ref names reach git as
	// separate arguments so nothing in them can be interpreted as a command.
	const res = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
	if (res.error !== undefined || res.status !== 0) return null;
	return res.stdout ?? "";
}

/**
 * Paths from `git status --porcelain -z`. Rename/copy entries carry a second
 * NUL-terminated field (the source path); both sides count as touched, and
 * consuming the extra field is what keeps the parser aligned after one.
 */
export function porcelainPaths(out: string): string[] {
	const parts = out.split("\0");
	const paths: string[] = [];
	for (let i = 0; i < parts.length; i++) {
		const entry = parts[i];
		if (entry === undefined || entry.length < 4) continue;
		const code = entry.slice(0, 2);
		paths.push(entry.slice(3));
		if (code.includes("R") || code.includes("C")) {
			const source = parts[i + 1];
			i += 1;
			if (source !== undefined && source !== "") paths.push(source);
		}
	}
	return paths;
}

/**
 * Content identity of one working-tree path: sha1 of the bytes, "-" when the
 * file is gone, "?" when it cannot be read. Status codes alone are not
 * enough — a file that was already modified before the delegation and
 * modified again during it keeps the same ` M` code, and comparing hashes is
 * what stops that edit from disappearing from the evidence.
 */
export function fingerprint(cwd: string, rel: string): string {
	try {
		return createHash("sha1")
			.update(readFileSync(join(cwd, rel)))
			.digest("hex");
	} catch (e) {
		return (e as NodeJS.ErrnoException).code === "ENOENT" ? "-" : "?";
	}
}
