/**
 * `imports` edges: which file pulls in which other file.
 *
 * The specifiers come from `ts.preProcessFile`, which is TypeScript's own
 * scanner — it already sees static imports, re-exports, `require`, dynamic
 * `import()` and triple-slash references, and a hand-rolled regex would see
 * about half of those. Resolution then goes through `ts.resolveModuleName`
 * with the PROGRAM'S OWN compiler options, because a repo with `paths` or a
 * `baseUrl` in its tsconfig resolves "@app/x" to a real file and nothing else
 * would: a builder that resolved with defaults would silently drop every
 * aliased import in the repos most likely to have them.
 *
 * COST. The language service here is the one from src/doc/ts-service.ts, with
 * its file cap, its per-call deadline and its LRU — this builder does not open
 * its own. One `run` PER FILE, never one for the batch, so a deadline costs
 * that file's edges and the rest of the build still lands; that is the whole
 * reason a graph build cannot stall the workbench.
 */
import { getService, type ServiceOptions } from "../doc/ts-service.js";
import { fileId, type Ids } from "./ids.js";
import type { GraphEdge } from "./types.js";

type TS = typeof import("typescript");
type LS = import("typescript").LanguageService;

/** Absolute importing file → absolute imported files, in-project only. */
export type ImportMap = Map<string, string[]>;

function targetsOf(ls: LS, ts: TS, file: string): string[] {
	const program = ls.getProgram();
	const sf = program?.getSourceFile(file);
	if (program === undefined || sf === undefined) return [];
	const options = program.getCompilerOptions();
	const seen = new Set<string>();
	for (const ref of ts.preProcessFile(sf.text, true, true).importedFiles) {
		const resolved = ts.resolveModuleName(ref.fileName, file, options, ts.sys).resolvedModule;
		if (resolved === undefined || resolved.isExternalLibraryImport === true) continue;
		// A declaration file describes a dependency rather than being part of
		// this repo's structure, and node_modules is not this repo at all.
		if (resolved.extension === ts.Extension.Dts) continue;
		if (resolved.resolvedFileName.includes("/node_modules/")) continue;
		seen.add(resolved.resolvedFileName);
	}
	return [...seen];
}

/**
 * Import targets for each of `files`. A file the service ANSWERED for maps to
 * its targets, even when that is `[]` — a file with no imports is a real answer.
 * A file the service could NOT answer for (no service at all, or past the
 * deadline) is ABSENT from the map, which is a different fact and the one the
 * caller needs: its edges were just retracted, so recording it as indexed would
 * leave the graph permanently missing them (build-structure.ts). Never a throw
 * and never a half-written build.
 */
export async function resolveImports(
	root: string,
	files: string[],
	opts: ServiceOptions = {},
): Promise<ImportMap> {
	const map: ImportMap = new Map();
	const service = await getService(root, opts);
	if (service === null) return map;
	for (const file of files) {
		service.include(file);
		const res = service.run((ls, ts) => targetsOf(ls, ts, file));
		if (res.ok) map.set(file, res.value);
	}
	return map;
}

/** The map as edges. A self-import (a file re-exporting itself) is dropped. */
export function importEdges(ids: Ids, map: ImportMap): GraphEdge[] {
	const edges: GraphEdge[] = [];
	for (const [file, targets] of map) {
		const from = fileId(ids, file);
		if (from === null) continue;
		for (const target of targets) {
			const to = fileId(ids, target);
			if (to !== null && to !== from) edges.push({ from, kind: "imports", to });
		}
	}
	return edges;
}
