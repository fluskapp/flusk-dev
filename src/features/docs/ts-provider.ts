/**
 * The DocProvider that works on a machine with no language server installed:
 * the TypeScript compiler API, driven through the bounded service in
 * ts-service.ts. This is the engine flusk ships with; the LSP client is the
 * pluggable second provider for projects that have a real server.
 *
 * Contract, restated because it is the easy thing to break: this provider
 * NEVER throws. A file outside the project, a file that does not parse, a
 * click on whitespace and a timed-out lookup all answer null / [] — every
 * language-service call goes through `service.run`, which swallows both the
 * cancellation exception and anything the compiler throws on bad input.
 */
import { extname } from "node:path";
import { withDocCache } from "./cache.repository.js";
import { offsetAt, spanLoc } from "./ts-map.js";
import { outlineFor } from "./ts-outline.js";
import { getService, releaseRoot, type ServiceOptions, serviceStatus } from "./ts-service.js";
import type { DocProvider, DocTag, OutlineItem, SourceLoc, SymbolDoc } from "./types.js";

type TS = typeof import("typescript");
type LS = import("typescript").LanguageService;

/** Usages beyond this are counted, not listed: `referenceCount` stays true. */
export const MAX_REFERENCES = 200;

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);

export type TsProviderResult = { ok: true; provider: DocProvider } | { ok: false; reason: string };

function supports(file: string): boolean {
	return EXTENSIONS.has(extname(file).toLowerCase());
}

function tagsOf(ts: TS, qi: import("typescript").QuickInfo): DocTag[] {
	return (qi.tags ?? []).map((t) => ({ name: t.name, text: ts.displayPartsToString(t.text) }));
}

const sameLoc = (a: SourceLoc, b: SourceLoc): boolean =>
	a.file === b.file && a.line === b.line && a.col === b.col;

/**
 * USAGES, which means the declaration is not one of them.
 * `getReferencesAtPosition` includes it and LSP's `includeDeclaration: false`
 * does not, so without this filter the same field means two different things
 * per engine and the panel prints "3 usages" for a symbol with two call sites,
 * repeating the declaration as the first usage row under "Defined in".
 */
function referencesAt(
	ls: LS,
	program: import("typescript").Program,
	file: string,
	pos: number,
	defined: SourceLoc | null,
): { locs: SourceLoc[]; total: number } {
	const entries = ls.getReferencesAtPosition(file, pos) ?? [];
	const locs: SourceLoc[] = [];
	let total = 0;
	for (const entry of entries) {
		const loc = spanLoc(program, entry.fileName, entry.textSpan);
		if (loc === null || (defined !== null && sameLoc(loc, defined))) continue;
		total += 1;
		if (locs.length < MAX_REFERENCES) locs.push(loc);
	}
	return { locs, total };
}

function docFor(ls: LS, ts: TS, file: string, line: number, col: number): SymbolDoc | null {
	const program = ls.getProgram();
	const sf = program?.getSourceFile(file);
	if (program === undefined || sf === undefined) return null; // outside the project
	const pos = offsetAt(sf, line, col);
	if (pos === null) return null;
	const qi = ls.getQuickInfoAtPosition(file, pos);
	if (qi === undefined) return null; // whitespace, a comment, an unresolved name
	const def = ls.getDefinitionAtPosition(file, pos)?.[0];
	const defined = def === undefined ? null : spanLoc(program, def.fileName, def.textSpan);
	const refs = referencesAt(ls, program, file, pos, defined);
	return {
		name: sf.text.slice(qi.textSpan.start, qi.textSpan.start + qi.textSpan.length),
		kind: qi.kind,
		signature: ts.displayPartsToString(qi.displayParts),
		docs: ts.displayPartsToString(qi.documentation),
		tags: tagsOf(ts, qi),
		defined,
		references: refs.locs,
		referenceCount: refs.total,
		provider: "typescript",
		...(refs.total > refs.locs.length ? { truncated: true } : {}),
	};
}

/**
 * A provider for `root`, or the reason there cannot be one (typescript absent,
 * project too large). The service is re-fetched per call rather than captured,
 * so a provider survives the LRU evicting its service for another project.
 */
export async function createTsProvider(
	root: string,
	opts: ServiceOptions = {},
): Promise<TsProviderResult> {
	if ((await getService(root, opts)) === null) {
		return { ok: false, reason: serviceStatus().reason ?? "no TypeScript service" };
	}
	const use = async <T>(file: string, fn: (ls: LS, ts: TS) => T, fallback: T): Promise<T> => {
		if (!supports(file)) return fallback;
		const service = await getService(root, opts);
		if (service === null) return fallback;
		service.include(file);
		const result = service.run(fn);
		return result.ok ? result.value : fallback;
	};
	// Memoised at construction, which is the only place that can be sure every
	// caller gets it: without this the workbench re-ran quickinfo, definition and
	// findReferences on every click, including a re-click on the same identifier.
	return {
		ok: true,
		provider: withDocCache({
			id: "typescript",
			supports,
			docAt: (file, line, col) => use(file, (ls, ts) => docFor(ls, ts, file, line, col), null),
			outline: (file) => use<OutlineItem[]>(file, (ls) => outlineFor(ls, file), []),
			dispose: () => releaseRoot(root),
		}),
	};
}
