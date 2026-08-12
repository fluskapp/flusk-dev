/**
 * Where a project's graph lives on disk, and the only three things done to it:
 * read every triple, append some, rewrite the lot.
 *
 * APPEND-ONLY is the shape, not an implementation detail. A build appends the
 * triples it derived and never rewrites in place, so a crash mid-build costs
 * the tail of one file rather than the whole graph — `readTriples` drops
 * unparseable lines instead of failing, which is exactly the torn-tail case.
 * Idempotency (invariant 6) is therefore resolved on REPLAY, in store-jsonl.ts:
 * the same triple appended twice is one edge when it is read back.
 *
 * The path is inside the flusk home and is proved so by the existing path jail in
 * src/safety/paths.ts rather than a second copy of that logic — `repoSlug`
 * already sanitises the project name, and this is the belt to its braces.
 *
 * Nothing here throws on a missing or corrupt file: a graph that cannot be
 * read is an EMPTY graph that rebuilds, never a dashboard that will not open.
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveWithin } from "../safety/paths.js";
import { fluskHome, repoSlug } from "../session/paths.js";
import { decode, encode, type Triple } from "./triples.js";

export function graphDir(): string {
	return join(fluskHome(), "graph");
}

/** One file per project, named by the collision-safe slug the rest of flusk uses. */
export function graphPath(root: string): string {
	return within(`${repoSlug(root)}.jsonl`);
}

/** The resume record, beside the graph it describes. */
export function statePath(root: string): string {
	return within(`${repoSlug(root)}.state.json`);
}

/**
 * Proves the target is under the flusk home before anything opens it (S5). The
 * directory is created first because the jail resolves symlinks in existing
 * ancestors, and a home that does not exist yet has none to resolve.
 */
function within(name: string): string {
	const dir = graphDir();
	mkdirSync(dir, { recursive: true });
	return resolveWithin([fluskHome()], join(dir, name), dir);
}

/** Every triple in the file, oldest first. Missing or corrupt reads as empty. */
export function readTriples(path: string): Triple[] {
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch {
		return []; // never built, or unreadable: the caller rebuilds
	}
	const out: Triple[] = [];
	for (const line of text.split("\n")) {
		const t = decode(line);
		if (t !== null) out.push(t);
	}
	return out;
}

/** Appends in one write: a partial line is the only tear a reader can see. */
export function appendTriples(path: string, triples: Triple[]): void {
	if (triples.length === 0) return;
	appendFileSync(path, `${triples.map(encode).join("\n")}\n`);
}

/**
 * Replaces the file with exactly `triples`. Used by compaction and by the
 * forget path — an append-only log cannot express a retraction, so the only
 * honest delete is a rewrite. Atomic enough: a torn write leaves the old file.
 */
export function rewriteTriples(path: string, triples: Triple[]): void {
	const tmp = `${path}.tmp`;
	writeFileSync(tmp, triples.length === 0 ? "" : `${triples.map(encode).join("\n")}\n`);
	renameSync(tmp, path);
}
