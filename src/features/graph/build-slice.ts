/**
 * The structure half of one build: what is dirty, one bounded slice of it, and
 * what the resume record is allowed to remember afterwards.
 *
 * It lives beside build.ts rather than inside it because the rule it enforces
 * is easy to lose in a longer function: A FILE IS RECORDED ONLY ONCE INDEXED.
 * An optimistic stamp leaves a hole nothing ever fills — the file stops looking
 * dirty, so no later build re-derives the symbols this one failed to derive.
 * `structureGraph` returns `indexed` for exactly that reason and it is the only
 * list this file stamps from.
 */
import { resolve } from "node:path";
import { resolveImports } from "./build-imports.js";
import { dirtySet, forgetRemoved } from "./build-plan.js";
import { type StructurePart, structureGraph } from "./build-structure.js";
// Type-only, so the pair does not become a runtime import cycle.
import type { BuildOptions, BuildReport } from "./build.js";
import { type Ids, relPath } from "./ids.js";
import { diffFiles, type GraphResume } from "./state.repository.js";
import type { JsonlGraph } from "./store-jsonl.js";

/** One call's slice of dirty files. A big repo indexes over several calls. */
export const DEFAULT_MAX_FILES = 300;

export async function sliceStructure(
	ids: Ids,
	store: JsonlGraph,
	resume: GraphResume,
	files: string[],
	opts: BuildOptions,
	report: BuildReport,
): Promise<StructurePart> {
	const diff = diffFiles(resume, ids, files);
	for (const rel of diff.removed) {
		await forgetRemoved(ids, store, rel);
		delete resume.files[rel];
	}
	const seed = await resolveImports(ids.root, diff.changed, opts.service ?? {});
	const known = new Set(files.map((f) => resolve(f)));
	const dirty = await dirtySet(ids, store, diff.changed, seed, known);
	const slice = dirty.slice(0, opts.maxFiles ?? DEFAULT_MAX_FILES);
	const part = await structureGraph(ids, store, slice, seed, opts.service ?? {});
	for (const file of part.indexed) {
		const rel = relPath(ids, file);
		if (rel !== null) resume.files[rel] = diff.stamps.get(rel) ?? "0";
	}
	report.filesIndexed = part.indexed.length;
	report.filesSkipped = files.length - dirty.length;
	report.filesRemaining = dirty.length - slice.length;
	return part;
}
