/**
 * Structure for one slice of files: the file nodes, their imports, the symbols
 * they define and the references to those symbols.
 *
 * Everything here is per-file and order-independent, which is what makes the
 * build resumable — the caller can hand over 40 files now and 40 more on the
 * next call, and the graph is correct at every point in between rather than
 * only at the end.
 *
 * The retraction comes FIRST and per file: a file's own pass owns its imports
 * and defines, plus the references arriving at the symbols it defines, so all
 * of those are dropped before any of them are recomputed. Doing it after would
 * delete edges the pass had just written.
 *
 * A missing language service is not a failure. `createTsProvider` refuses when
 * typescript is not installed or the project is over the file cap, and this
 * still returns the file nodes and import edges it could derive, with the
 * reason attached — half a graph beats a dashboard that says nothing.
 *
 * BUT HALF A PASS IS NEVER `indexed`. That list is what the resume record
 * stamps, and a stamp means "this file's structure IS in the graph". A file
 * whose edges were retracted above and whose symbols were then not re-derived —
 * because the service refused, or because its own import lookup missed its
 * deadline — must stay dirty, or the graph is permanently short those edges:
 * installing typescript moves no mtime, so the file never looks dirty again.
 */
import { basename } from "node:path";
import { createTsProvider } from "../docs/ts-provider.js";
import type { ServiceOptions } from "../docs/ts-service.js";
import type { DocProvider } from "../docs/types.js";
import { type ImportMap, importEdges, resolveImports } from "./build-imports.js";
import { forgetFile } from "./build-plan.js";
import { symbolGraph } from "./build-symbols.repository.js";
import { fileId, type Ids, relPath } from "./ids.js";
import type { JsonlGraph } from "./store-jsonl.js";
import type { GraphEdge, GraphNode } from "./types.js";

export interface StructurePart {
	nodes: GraphNode[];
	edges: GraphEdge[];
	/** Absolute paths actually indexed — what the resume record may record. */
	indexed: string[];
	/** Why symbols are missing, when they are. */
	reason?: string;
}

function fileNode(ids: Ids, path: string): GraphNode | null {
	const rel = relPath(ids, path);
	const id = rel === null ? null : fileId(ids, rel);
	if (rel === null || id === null) return null;
	return { id, kind: "file", label: basename(rel), file: path };
}

/** Imports for every file in the slice, reusing what the planner already resolved. */
async function importsFor(
	root: string,
	files: string[],
	seed: ImportMap,
	opts: ServiceOptions,
): Promise<ImportMap> {
	const missing = files.filter((f) => !seed.has(f));
	const map: ImportMap = new Map(seed);
	for (const [file, targets] of await resolveImports(root, missing, opts)) map.set(file, targets);
	// Only the slice: the seed also holds files this pass is not indexing, and
	// emitting their edges would claim they were refreshed when they were not.
	return new Map(files.filter((f) => map.has(f)).map((f) => [f, map.get(f) ?? []]));
}

export async function structureGraph(
	ids: Ids,
	store: JsonlGraph,
	files: string[],
	seed: ImportMap,
	opts: ServiceOptions = {},
): Promise<StructurePart> {
	const part: StructurePart = { nodes: [], edges: [], indexed: [] };
	if (files.length === 0) return part;
	for (const file of files) await forgetFile(ids, store, file);
	const map = await importsFor(ids.root, files, seed, opts);
	part.edges.push(...importEdges(ids, map));
	const made = await createTsProvider(ids.root, opts);
	const provider: DocProvider | null = made.ok ? made.provider : null;
	if (!made.ok) part.reason = made.reason;
	for (const file of files) {
		const node = fileNode(ids, file);
		if (node === null) continue; // outside the root: not this project's file
		part.nodes.push(node);
		if (provider === null) continue; // symbols not derived: leave it dirty
		const symbols = await symbolGraph(ids, provider, file);
		part.nodes.push(...symbols.nodes);
		part.edges.push(...symbols.edges);
		// `map` holds only the files the import lookup actually answered for, so a
		// file missing from it lost its import edges to a deadline this pass.
		if (map.has(file)) part.indexed.push(file);
	}
	return part;
}
