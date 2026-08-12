import { lstatSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";

/**
 * Resolves `target` against `cwd` and proves the result lives inside one of
 * `roots`, following symlinks in every existing ancestor so a link inside a
 * root cannot smuggle a write outside it. Returns the vetted absolute path,
 * or throws naming both the offending path and the allowed roots.
 */
export function resolveWithin(roots: string[], target: string, cwd: string): string {
	const abs = resolve(cwd, target);
	// Walk up to the nearest existing ancestor; everything below it is the
	// not-yet-created remainder that gets rejoined after realpathing.
	let existing = abs;
	const remainder: string[] = [];
	while (!entryExists(existing)) {
		const parent = dirname(existing);
		if (parent === existing) break;
		remainder.unshift(basename(existing));
		existing = parent;
	}
	if (remainder.includes("..") || remainder.includes(".")) {
		throw new Error(`refusing unnormalized path "${abs}" (from "${target}")`);
	}
	let resolved: string;
	try {
		resolved = join(realpathSync(existing), ...remainder);
	} catch {
		// lstat saw an entry realpath cannot resolve: a broken symlink. Never
		// write through it — the link target could be anywhere.
		throw new Error(`cannot resolve "${abs}" (from "${target}"): broken link at "${existing}"`);
	}
	const realRoots = roots.map(realRoot);
	for (const root of realRoots) {
		if (resolved === root || resolved.startsWith(root + sep)) return resolved;
	}
	throw new Error(
		`path "${resolved}" (from "${target}") is outside allowed roots: ${realRoots.join(", ")}`,
	);
}

/** lstat, not stat: a broken symlink still counts as an existing entry. */
function entryExists(p: string): boolean {
	try {
		lstatSync(p);
		return true;
	} catch {
		return false;
	}
}

function realRoot(root: string): string {
	try {
		return realpathSync(resolve(root));
	} catch {
		return resolve(root);
	}
}
