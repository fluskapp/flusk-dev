/**
 * `defines` and `references` edges, from the DocProvider that already exists.
 *
 * The graph reimplements nothing: `outline` yields the declarations a file
 * makes (already free of import aliases and of every closure a body happens to
 * contain, see doc/ts-outline.ts) and `docAt` yields that symbol's definition
 * and its usages. This file only turns those into triples.
 *
 * TWO traps live here.
 *
 * The outline gives a LINE and `docAt` wants a line and a COLUMN, so the
 * column is found by locating the name on its own declaration line. When that
 * misses, `docAt` answers about the token next door — so the answer is
 * REJECTED unless the symbol it came back with is still the one the outline
 * named. A wrong symbol id is not a wrong pixel, it is a second island in the
 * graph (invariant 3).
 *
 * And a symbol belongs to the file it is DEFINED in, never the one it is
 * listed from: `export { greet } from "./greet.js"` outlines in the re-exporting
 * file, and minting `symbol:<re-exporter>#greet` there would leave two nodes
 * for one function. `SymbolDoc.defined.file` decides, which is exactly what
 * types.ts specifies.
 */
import { readFileSync } from "node:fs";
import type { DocProvider, OutlineItem, SymbolDoc } from "../doc/types.js";
import { fileId, type Ids, symbolId } from "./ids.js";
import { namedSymbols } from "./symbol-names.js";
import type { GraphEdge, GraphNode } from "./types.js";

/** A file with more declarations than this is generated; the graph skips the tail. */
const MAX_SYMBOLS = 150;

/**
 * Declarations that are only ever reached THROUGH their owner. Every field of
 * every interface as its own node multiplies the graph several times over to
 * answer a question nobody asks of it — "who uses `name`" is really "who uses
 * `Person`". Methods deliberately stay: "what calls this method" is a question
 * the graph is built for. Excluding these does NOT prevent same-name
 * collisions — two classes with a `run` method collide — which is what
 * symbol-names.ts exists to resolve.
 */
const MEMBER_KINDS: ReadonlySet<string> = new Set([
	"property",
	"index",
	"call",
	"construct",
	"enum member",
]);

export interface SymbolPart {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

/** 1-based column of `name` on its declaration line, or null when it is not there. */
function colOf(lines: string[], item: OutlineItem): number | null {
	const text = lines[item.line - 1];
	if (text === undefined) return null;
	const at = text.indexOf(item.name);
	return at === -1 ? null : at + 1;
}

/** Referencing file → how many usages it holds. `weight` is strength, not confidence. */
function byFile(doc: SymbolDoc): Map<string, number> {
	const counts = new Map<string, number>();
	for (const loc of doc.references) counts.set(loc.file, (counts.get(loc.file) ?? 0) + 1);
	return counts;
}

function emit(
	ids: Ids,
	doc: SymbolDoc,
	named: { item: OutlineItem; name: string },
	part: SymbolPart,
): void {
	const definedFile = doc.defined?.file ?? "";
	const sid = definedFile === "" ? null : symbolId(ids, definedFile, named.name);
	const owner = definedFile === "" ? null : fileId(ids, definedFile);
	if (sid === null || owner === null) return; // defined outside the repo: not ours
	part.nodes.push({
		id: sid,
		kind: "symbol",
		label: named.name,
		file: definedFile,
		line: doc.defined?.line ?? named.item.line,
		// The provider caps `references` at MAX_REFERENCES and counts the rest, so
		// past the cap whole referencing FILES get no edge and the surviving weights
		// are floors. Carried onto the node because the loss happens HERE: no query
		// cap can notice triples that were never written (types.ts `capped`).
		...(doc.truncated === true ? { capped: true } : {}),
	});
	part.edges.push({ from: owner, kind: "defines", to: sid });
	for (const [file, weight] of byFile(doc)) {
		const from = fileId(ids, file);
		if (from !== null) part.edges.push({ from, kind: "references", to: sid, weight });
	}
}

/** Every symbol one file declares, plus who references it. Never throws. */
export async function symbolGraph(
	ids: Ids,
	provider: DocProvider,
	file: string,
): Promise<SymbolPart> {
	const part: SymbolPart = { nodes: [], edges: [] };
	let lines: string[];
	try {
		lines = readFileSync(file, "utf8").split("\n");
	} catch {
		return part; // vanished between the scan and now
	}
	for (const named of namedSymbols(await provider.outline(file), MEMBER_KINDS, MAX_SYMBOLS)) {
		const col = colOf(lines, named.item);
		if (col === null) continue;
		const doc = await provider.docAt(file, named.item.line, col);
		// The name check is the guard against a mislocated column, above, and
		// compares the RAW outline name: `named.name` may carry a container.
		if (doc === null || doc.name !== named.item.name) continue;
		emit(ids, doc, named, part);
	}
	return part;
}
