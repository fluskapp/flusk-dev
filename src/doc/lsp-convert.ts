/**
 * LSP's wire shapes → the frozen contract in types.ts.
 *
 * THE conversion this file exists for: LSP is 0-based line/character with an
 * EXCLUSIVE range end, and SourceLoc (types.ts) is 1-based with an EXCLUSIVE
 * end too — "a 3-character name at col 5 ends at col 8". Both ends are
 * exclusive, so there is nothing to cancel: every coordinate simply gains its
 * +1, `endCol` included. The end is the one that used to be written without
 * it, which made the LSP engine disagree with `ts-map.locIn` about the same
 * span. Getting this wrong does not throw, it answers about the character
 * next door (see the warning at the top of types.ts).
 *
 * Everything here takes `unknown`: these values came off a pipe from a
 * process ah did not write, so nothing is assumed about their shape and a
 * malformed member is dropped rather than thrown over.
 */
import { pathToFileURL } from "node:url";
import type { OutlineItem, SourceLoc } from "./types.js";

type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
	return typeof v === "object" && v !== null;
}

export function fileToUri(file: string): string {
	return pathToFileURL(file).href;
}

function uriToFile(uri: unknown): string | null {
	if (typeof uri !== "string" || !uri.startsWith("file://")) return null;
	try {
		return decodeURIComponent(new URL(uri).pathname);
	} catch {
		return null;
	}
}

/** LSP Range (0-based, end-exclusive) → SourceLoc (1-based, end-exclusive). */
export function toLoc(file: string, range: unknown): SourceLoc | null {
	if (!isObj(range)) return null;
	const start = range["start"];
	const end = range["end"];
	if (!isObj(start) || typeof start["line"] !== "number") return null;
	const loc: SourceLoc = {
		file,
		line: start["line"] + 1,
		col: (typeof start["character"] === "number" ? start["character"] : 0) + 1,
	};
	if (isObj(end) && typeof end["line"] === "number") {
		loc.endLine = end["line"] + 1;
		// No clamp: character 0 names the line boundary and legitimately becomes
		// column 1 under the same +1 every other coordinate gets.
		loc.endCol = (typeof end["character"] === "number" ? end["character"] : 0) + 1;
	}
	return loc;
}

/** Location, LocationLink, or an array of either → SourceLocs. */
export function toLocs(value: unknown): SourceLoc[] {
	const list = Array.isArray(value) ? value : value === null ? [] : [value];
	const out: SourceLoc[] = [];
	for (const item of list) {
		if (!isObj(item)) continue;
		const file = uriToFile(item["uri"] ?? item["targetUri"]);
		if (file === null) continue;
		const loc = toLoc(file, item["range"] ?? item["targetSelectionRange"] ?? item["targetRange"]);
		if (loc !== null) out.push(loc);
	}
	return out;
}

/** SymbolKind (LSP 3.17, 1-based) → the contract's lowercase kind string. */
const KINDS = [
	"file",
	"module",
	"namespace",
	"package",
	"class",
	"method",
	"property",
	"field",
	"constructor",
	"enum",
	"interface",
	"function",
	"variable",
	"constant",
	"string",
	"number",
	"boolean",
	"array",
	"object",
	"key",
	"null",
	"enum-member",
	"struct",
	"event",
	"operator",
	"type-parameter",
];

function kindName(kind: unknown): string {
	return typeof kind === "number" ? (KINDS[kind - 1] ?? "symbol") : "symbol";
}

/** The DocumentSymbol/SymbolInformation range, whichever shape arrived. */
function symbolRange(sym: Json): unknown {
	const loc = sym["location"];
	return sym["selectionRange"] ?? sym["range"] ?? (isObj(loc) ? loc["range"] : undefined);
}

/** Deeper than any real symbol tree; past it a reply is malformed, not nested. */
const MAX_DEPTH = 32;

/**
 * textDocument/documentSymbol → outline rows. Both replies are handled: the
 * nested DocumentSymbol tree (depth from nesting) and the flat, older
 * SymbolInformation list (everything at depth 0).
 */
export function toOutline(value: unknown, depth = 0): OutlineItem[] {
	// Bounded: the tree came off a pipe from a process ah did not write, and an
	// unbounded recursion over a cyclic or absurdly deep reply is a stack
	// overflow inside a request handler.
	if (!Array.isArray(value) || depth > MAX_DEPTH) return [];
	const out: OutlineItem[] = [];
	for (const sym of value) {
		if (!isObj(sym) || typeof sym["name"] !== "string") continue;
		const range = symbolRange(sym);
		const start = isObj(range) ? range["start"] : undefined;
		const line = isObj(start) && typeof start["line"] === "number" ? start["line"] + 1 : 1;
		out.push({ name: sym["name"], kind: kindName(sym["kind"]), line, depth });
		out.push(...toOutline(sym["children"], depth + 1));
	}
	return out;
}

/** The outline row whose declaration is nearest above `line` — the symbol's kind. */
export function kindAt(outline: OutlineItem[], name: string, line: number): string | null {
	const named = outline.filter((o) => o.name === name);
	if (named.length === 0) return null;
	const above = named.filter((o) => o.line <= line);
	const best = above.length > 0 ? above[above.length - 1] : named[0];
	return best?.kind ?? null;
}
