/**
 * ID DERIVATION for the code graph — the ONE place a node id is minted.
 *
 * Every builder goes through here because invariant 3 of types.ts is a
 * correctness rule, not a style one: two builders that mint the same thing
 * differently do not fail, they fork the graph into two half-populated islands
 * and every query then quietly answers about one of them.
 *
 * The traps this file exists to close:
 *  - an absolute path bakes in the machine's home directory, so two clones of
 *    one repo would share no node at all: ids carry repo-relative POSIX paths,
 *    NFC-normalised, never a leading "./" (invariant 3);
 *  - HistoryCard.id abbreviates a sha to 8 chars (src/history/source-git.ts
 *    mints `commit:<project>:<sha.slice(0,8)>`), so commit ids are minted from
 *    `card.ref` — the full 40-hex — and an abbreviated sha is REFUSED rather
 *    than turned into a node nothing else will ever match (invariant 4);
 *  - nothing here may contain a line or an mtime (invariant 5).
 *
 * Anything underivable returns null and the caller then emits NO edge, rather
 * than a plausible-looking one pointing at a node that will never exist.
 */
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

/** Everything an id needs about a project, resolved once per build. */
export interface Ids {
	/** Absolute, realpath-free project root. */
	root: string;
	/** FindRoot.project: the root's BASENAME, never a path (src/find/files.ts). */
	project: string;
}

const FULL_SHA = /^[0-9a-f]{40}$/;

export function idsFor(root: string): Ids {
	const abs = resolve(root);
	return { root: abs, project: basename(abs) || abs };
}

/**
 * `path` as a repo-relative POSIX path, or null when it is outside the root.
 * Callers pass both absolute paths (the language service speaks those) and
 * already-relative ones (git and the session cards speak those), so both are
 * accepted — but anything that escapes the root is null, never a "../" id.
 */
export function relPath(ids: Ids, path: string): string | null {
	if (path === "") return null;
	const abs = isAbsolute(path) ? resolve(path) : resolve(ids.root, path);
	const rel = relative(ids.root, abs);
	if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
	return rel.split(sep).join("/").normalize("NFC");
}

/** Absolute path for a repo-relative one — display only (invariant 2). */
export function absPath(ids: Ids, rel: string): string {
	return resolve(ids.root, rel);
}

export function fileId(ids: Ids, path: string): string | null {
	const rel = relPath(ids, path);
	return rel === null ? null : `file:${ids.project}/${rel}`;
}

export function docId(ids: Ids, path: string): string | null {
	const rel = relPath(ids, path);
	return rel === null ? null : `doc:${ids.project}/${rel}`;
}

/**
 * `symbol:<project>/<rel>#<name>`, where `<rel>` is the file the symbol is
 * DEFINED in (SymbolDoc.defined.file) and never one it is referenced from.
 * Overloads and same-named members collapse into one node by design.
 */
export function symbolId(ids: Ids, definedFile: string, name: string): string | null {
	const rel = relPath(ids, definedFile);
	const clean = name.trim();
	if (rel === null || clean === "" || clean.includes("\n")) return null;
	return `symbol:${ids.project}/${rel}#${clean.normalize("NFC")}`;
}

/**
 * `commit:<project>:<sha>` with the FULL sha. An abbreviated one is refused:
 * it would look right, sit next to the 40-char node the git builder mints, and
 * never join to it.
 */
export function commitId(ids: Ids, sha: string): string | null {
	const full = sha.trim().toLowerCase();
	return FULL_SHA.test(full) ? `commit:${ids.project}:${full}` : null;
}

/** `run:<runId>` — deliberately UNQUALIFIED, because one run spans projects. */
export function runId(ref: string): string | null {
	const clean = ref.trim();
	return clean === "" ? null : `run:${clean}`;
}
