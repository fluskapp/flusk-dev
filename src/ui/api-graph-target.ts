/**
 * Turning a request into "which node, in which project's graph" — and holding
 * the store open between requests.
 *
 * Two traps this file exists to close.
 *
 * CONTAINMENT is the same story every other route tells: the path a request
 * names must be one the scanners already listed, matched by exact membership
 * (api-doc-util.ts owns that test), and the owning root is the LONGEST root
 * that contains it, so a project nested inside another cannot be answered
 * about from its parent's graph.
 *
 * THE SYMBOL TRAP: `symbol:<project>/<rel>#<name>` qualifies the name by the
 * file the symbol is DEFINED in, never one it is referenced from (ids.ts). So
 * `file` here must be the DEFINING file when `symbol` is present — the panel
 * sends `doc.defined.file` for exactly this reason. Sending the referencing
 * file instead does not fail; it mints an id nothing has ever put, which is
 * indistinguishable from "not indexed yet" and would be a lie.
 *
 * Nothing here throws: an unreadable graph file reads as an empty one, which
 * the caller then reports as `unindexed` (invariant 12).
 */
import { statSync } from "node:fs";
import type { FluskConfig } from "../config/types.js";
import { type FindRoot, searchRoots } from "../find/files.js";
import { fileId, type Ids, idsFor, symbolId } from "../graph/ids.js";
import { graphPath } from "../graph/store-io.js";
import { type JsonlGraph, openGraphAt } from "../graph/store-jsonl.js";

export interface GraphTarget {
	root: FindRoot;
	ids: Ids;
	file: string;
	symbol: string | null;
	/** The derived node id. Never parsed downstream — compared only. */
	id: string;
}

/** The longest configured root containing `file`, or null. */
export function rootFor(cfg: FluskConfig, file: string): FindRoot | null {
	let best: FindRoot | null = null;
	for (const r of searchRoots(cfg)) {
		if (file !== r.path && !file.startsWith(`${r.path}/`)) continue;
		if (best === null || r.path.length > best.path.length) best = r;
	}
	return best;
}

/** The node a request names, or null when no id is derivable from it. */
export function targetFor(root: FindRoot, file: string, symbol: string | null): GraphTarget | null {
	const ids = idsFor(root.path);
	const id = symbol === null ? fileId(ids, file) : symbolId(ids, file, symbol);
	if (id === null) return null;
	return { root, ids, file, symbol, id };
}

interface Held {
	store: JsonlGraph;
	/** The log's identity when it was replayed: size and mtime. */
	stamp: string;
}

const held = new Map<string, Held>();

/** The log's current identity; "0" when it does not exist yet. */
function stampOf(path: string): string {
	try {
		const s = statSync(path);
		return `${s.size}:${s.mtimeMs}`;
	} catch {
		return "0";
	}
}

/**
 * The project's store, replayed at most once per change to its log.
 *
 * Reopening per request re-reads and replays the whole JSONL — tens of
 * thousands of lines on a real repo — and this panel is opened by a click.
 * The stamp is what keeps that cache from serving a graph a build has since
 * moved on from.
 */
export function storeFor(rootPath: string): JsonlGraph {
	const path = graphPath(rootPath);
	const stamp = stampOf(path);
	const hit = held.get(path);
	if (hit !== undefined && hit.stamp === stamp) return hit.store;
	const store = openGraphAt(path);
	held.set(path, { store, stamp });
	return store;
}

/** Drops the cached stores — a build has just rewritten the log under them. */
export function forgetGraphStores(): void {
	held.clear();
}
