/**
 * The docs feature's typed server functions: the symbol lookup the
 * Documentation window calls, and the one markdown/highlight renderer.
 *
 * Everything here is CLIENT-INITIATED. The LSP warms for seconds and holds
 * hundreds of MB, so no route loader may call lookupDoc on the SSR path — the
 * /doc route is ssr:'data-only' and fires these from effects.
 *
 * The lookup body mirrors doc.router.ts's serveDoc (whose helpers are private
 * to it): membership via indexedFile, engine via the LRU in doc-engines.ts,
 * history via relatedCached — a related lookup that throws yields null and a
 * note, never a failure, because a signature with no history beats a 500.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import type { FluskConfig } from "../../platform/config/types.js";
import { engineFor } from "./doc-engines.js";
import { relatedCached } from "./doc-related.repository.js";
import type { DocReply } from "./doc.router.js";
import { indexedFile } from "./doc-util.js";
import { renderPayload } from "./render.router.js";
import { serviceStatus } from "./ts-service.js";
import type { SymbolDoc } from "./types.js";
import { servedIndex } from "../history/history.router.js";
import { isIndexedFile } from "../search/files.js";

export type { DocReply } from "./doc.router.js";
export type { DocTag, SourceLoc, SymbolDoc } from "./types.js";
export type { Related, RelatedItem } from "./related.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** POST /api/render's body, as a server function: ONE renderer, ONE escaping rule. */
export const renderText = createServerFn()
	.inputValidator((data: { text: string; lang?: string }) => data)
	.handler(async ({ data }): Promise<{ html: string }> => {
		return renderPayload(data.text, data.lang ?? "");
	});

/** An empty answer is never bare: the note is its only actionable half. */
const refuse = (note: string): DocReply => ({ doc: null, related: null, note });

/** doc.router.ts's rule: the service must not answer for a different project. */
function emptyReason(file: string): string {
	const s = serviceStatus();
	const mine = s.root !== null && file.startsWith(`${s.root}/`);
	return mine && s.reason !== undefined && s.state === "refused"
		? s.reason
		: "no symbol at this position";
}

/** Which of a symbol's locations this server can serve a body for. */
async function openableOf(c: FluskConfig, doc: SymbolDoc): Promise<string[]> {
	const wanted = new Set<string>(doc.references.map((r) => r.file));
	if (doc.defined !== null) wanted.add(doc.defined.file);
	const out: string[] = [];
	for (const file of wanted) if (await isIndexedFile(c, file)) out.push(file);
	return out;
}

async function replyAt(c: FluskConfig, file: string, line: number, col: number): Promise<DocReply> {
	const choice = await engineFor(c, file);
	if (choice.provider === null) return refuse(choice.reason ?? "no documentation engine");
	const doc = await choice.provider.docAt(file, line, col);
	if (doc === null) return refuse(emptyReason(file));
	const related = await relatedCached(doc.name, file, c, servedIndex);
	const note = related === null ? { note: "related history is unavailable" } : {};
	return { doc, related, openable: await openableOf(c, doc), ...note };
}

/** The window's lookup: an indexed file plus a 1-based position. */
export const lookupDoc = createServerFn()
	.inputValidator((data: { file: string; line: number; col: number }) => data)
	.handler(async ({ data }): Promise<DocReply> => {
		const c = cfg();
		const file = await indexedFile(c, data.file);
		if (file === null) return refuse("not an indexed file");
		const ok = (n: number): boolean => Number.isInteger(n) && n >= 1;
		if (!ok(data.line) || !ok(data.col)) return refuse("line and col are required");
		return replyAt(c, file, data.line, data.col);
	});

/**
 * The /doc route's deep link: `sym` is either a "line:col" position or a
 * symbol name. A name resolves through the engine's own outline to that
 * declaration's line; the column is not recorded there, so a name-based link
 * can miss an identifier that does not start its line — the position form is
 * the exact one.
 */
export const lookupSymbol = createServerFn()
	.inputValidator((data: { path: string; sym?: string }) => data)
	.handler(async ({ data }): Promise<DocReply> => {
		const c = cfg();
		const file = await indexedFile(c, data.path);
		if (file === null) return refuse("not an indexed file");
		const sym = (data.sym ?? "").trim();
		if (sym === "") return refuse("no symbol named — add sym=<line>:<col> or sym=<name>");
		const at = /^(\d+):(\d+)$/.exec(sym);
		if (at !== null) return replyAt(c, file, Number(at[1]), Number(at[2]));
		const choice = await engineFor(c, file);
		if (choice.provider === null) return refuse(choice.reason ?? "no documentation engine");
		const item = (await choice.provider.outline(file)).find((o) => o.name === sym);
		if (item === undefined) return refuse(`no symbol named ${sym} in this file's outline`);
		return replyAt(c, file, item.line, 1);
	});
