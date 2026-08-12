/**
 * Documentation lookup for the workbench: the symbol under a position, the
 * agent history fused onto it, a file's structure view, and the source the
 * code viewer renders.
 *
 * Four rules this file exists to keep:
 *
 *  - Every path a request names must be one the scanners already indexed
 *    (`rg --files`, the listing Go-to-File offers), matched by EXACT
 *    MEMBERSHIP the way /api/artifact matches documents: a lexical prefix test
 *    admits a symlink that resolves out of the root, and every unindexed file
 *    sitting beside the indexed ones. `isIndexedFile` resolves the owning root
 *    first, so one huge repo cannot push another project out of the answer.
 *  - The history half is folded in SERVER-SIDE so the panel costs one request,
 *    but it can never sink the answer: a related lookup that throws yields
 *    `related: null` and a note — a signature with no history beats a 500.
 *  - A refusal carries its reason: `doc: null` with no note is
 *    indistinguishable from a broken panel, and "timed out while indexing" is
 *    a different sentence from "no symbol at this position".
 *  - Every row the panel makes CLICKABLE must be openable. A definition inside
 *    node_modules is real and useful to read about, and completely unopenable
 *    here, so the reply says which files can be served and the panel renders
 *    the rest inert rather than as a promise it cannot keep.
 */
import type { ServerResponse } from "node:http";
import { loadConfig } from "../config/config.js";
import type { FluskConfig } from "../config/types.js";
import type { Related } from "../doc/related.js";
import { serviceStatus } from "../doc/ts-service.js";
import type { SymbolDoc } from "../doc/types.js";
import { isIndexedFile } from "../find/files.js";
import { engineFor } from "./api-doc-engines.js";
import { relatedCached } from "./api-doc-related.js";
import { indexedFile, json } from "./api-doc-util.js";
import { handleOutline, handleSource } from "./api-doc-view.js";
import { servedIndex } from "./api-history.js";

export { disposeDocRegistries } from "./api-doc-engines.js";
export { MAX_OUTLINE_ITEMS, MAX_SOURCE_BYTES, type OutlineReply } from "./api-doc-view.js";

/** One panel's answer: the IntelliJ half, the history half, and any refusal. */
export interface DocReply {
	doc: SymbolDoc | null;
	related: Related | null;
	note?: string;
	/** Files among `defined`/`references` this server can actually serve. */
	openable?: string[];
}

/** An empty answer is never bare: the note is its only actionable half. */
const refuse = (res: ServerResponse, note: string): void =>
	json(res, 200, { doc: null, related: null, note } satisfies DocReply);

/** A 1-based coordinate, or null when it is absent or not a position. */
function coord(raw: string | null): number | null {
	const n = Number(raw ?? "");
	return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * "no symbol at this position" is true for whitespace and false for a lookup
 * that timed out while indexing. The service knows which; it must not answer
 * for a different project, so the root has to contain the file.
 */
function emptyReason(file: string): string {
	const s = serviceStatus();
	const mine = s.root !== null && file.startsWith(`${s.root}/`);
	return mine && s.reason !== undefined && s.state === "refused"
		? s.reason
		: "no symbol at this position";
}

/** Which of a symbol's locations this server can serve a body for. */
async function openableOf(cfg: FluskConfig, doc: SymbolDoc): Promise<string[]> {
	const wanted = new Set<string>(doc.references.map((r) => r.file));
	if (doc.defined !== null) wanted.add(doc.defined.file);
	const out: string[] = [];
	for (const file of wanted) if (await isIndexedFile(cfg, file)) out.push(file);
	return out;
}

async function serveDoc(query: URLSearchParams, res: ServerResponse): Promise<void> {
	try {
		const cfg = loadConfig(process.cwd());
		const file = await indexedFile(cfg, query.get("file"));
		const line = coord(query.get("line"));
		const col = coord(query.get("col"));
		if (file === null) return json(res, 400, { error: "not an indexed file" });
		if (line === null || col === null) {
			return json(res, 400, { error: "line and col are required" });
		}
		const choice = await engineFor(cfg, file);
		if (choice.provider === null) return refuse(res, choice.reason ?? "no documentation engine");
		const doc = await choice.provider.docAt(file, line, col);
		if (doc === null) return refuse(res, emptyReason(file));
		const related = await relatedCached(doc.name, file, cfg, servedIndex);
		const note = related === null ? { note: "related history is unavailable" } : {};
		const openable = await openableOf(cfg, doc);
		json(res, 200, { doc, related, openable, ...note } satisfies DocReply);
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}

/** Returns true when it handled the route. */
export function handleDoc(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method !== "GET") return false;
	if (pathname === "/api/doc") void serveDoc(query, res);
	else if (pathname === "/api/doc/outline") void handleOutline(query, res);
	else if (pathname === "/api/source") void handleSource(query, res);
	else return false;
	return true;
}
