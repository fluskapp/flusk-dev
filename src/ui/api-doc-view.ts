/**
 * The two routes the code viewer needs: a file's structure, and its source.
 *
 * Both carry a bound and SAY SO. The strip is fetched when a file opens,
 * before any /api/doc call, so it cannot borrow that route's sentence — an
 * engine-less .rs file and an over-cap project would otherwise both render a
 * reasonless "no structure for this file". And a 20,000-row outline or a
 * megabyte of minified source does not render slowly, it hangs the tab, so
 * both are capped where the client can still describe what was cut.
 *
 * Split from api-doc.ts, which owns the symbol lookup itself.
 */
import { readFile, stat } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { extname } from "node:path";
import { loadConfig } from "../config/config.js";
import type { OutlineItem } from "../doc/types.js";
import { engineFor } from "./api-doc-engines.js";
import { indexedFile, json } from "./api-doc-util.js";

/**
 * Past this a reader wants an editor, not a browser tab — and the ceiling is
 * not a taste judgement: the viewer POSTs the whole text back to /api/render,
 * whose body cap is 1,000,000 bytes, so anything the JSON encoding pushes past
 * that would be served here and then die as "cannot be read here". 512KB is
 * the same figure /api/file already truncates at, for the same reason.
 */
export const MAX_SOURCE_BYTES = 512 * 1024;
/** Rows past this are a scroll nobody finishes; the strip says it was cut. */
export const MAX_OUTLINE_ITEMS = 500;

/** A file's structure, plus the reason there is none of it. */
export interface OutlineReply {
	items: OutlineItem[];
	note?: string;
	truncated?: boolean;
}

export async function handleOutline(query: URLSearchParams, res: ServerResponse): Promise<void> {
	try {
		const cfg = loadConfig(process.cwd());
		const file = await indexedFile(cfg, query.get("file"));
		if (file === null) return json(res, 400, { error: "not an indexed file" });
		// The strip is fetched when a file OPENS, before any /api/doc call, so it
		// cannot borrow that route's sentence: a .rs file with no configured
		// server and an over-cap project would both render a reasonless line.
		const choice = await engineFor(cfg, file);
		if (choice.provider === null) {
			const note = choice.reason ?? "no documentation engine for this file";
			return json(res, 200, { items: [], note } satisfies OutlineReply);
		}
		const all = await choice.provider.outline(file);
		const items = all.slice(0, MAX_OUTLINE_ITEMS);
		const cut = all.length > items.length ? { truncated: true } : {};
		json(res, 200, { items, ...cut } satisfies OutlineReply);
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}

export async function handleSource(query: URLSearchParams, res: ServerResponse): Promise<void> {
	const cfg = loadConfig(process.cwd());
	const file = await indexedFile(cfg, query.get("file"));
	if (file === null) return json(res, 400, { error: "not an indexed file" });
	try {
		const bytes = (await stat(file)).size;
		// Refused, not truncated: half a file scrolls and clicks like a whole
		// one, and every position past the cut would document the wrong symbol.
		if (bytes > MAX_SOURCE_BYTES) {
			return json(res, 413, { error: `file is larger than ${MAX_SOURCE_BYTES} bytes`, bytes });
		}
		const text = await readFile(file, "utf8");
		json(res, 200, { path: file, text, lang: extname(file).slice(1).toLowerCase(), bytes });
	} catch (e) {
		json(res, 404, { error: e instanceof Error ? e.message : String(e) });
	}
}
