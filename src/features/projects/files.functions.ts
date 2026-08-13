/**
 * The code viewer's server surface: a file's source (highlighted server-side,
 * the same renderer everything else uses), its structure view, and the
 * truncating fallback body /api/file used to serve.
 *
 * Containment is exact membership — `indexedFile` resolves the path and
 * requires it to be one `rg --files` already listed — so a request still
 * names no directory and `../` stays inexpressible. Every refusal carries its
 * reason: `ok: false` with no note is indistinguishable from a broken viewer.
 */
import { extname } from "node:path";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { createRenderer } from "./native.repository.js";

const renderer = createRenderer();
import { engineFor } from "../docs/doc-engines.js";
import { indexedFile } from "../docs/doc-util.js";
import { MAX_OUTLINE_ITEMS, MAX_SOURCE_BYTES, type OutlineReply } from "../docs/doc.router.js";
import { readBytes } from "./file-read.repository.js";

export type { OutlineReply } from "../docs/doc.router.js";
export type { OutlineItem } from "../docs/types.js";

/** Head of the file checked for NUL — the cheap "is this text?" test. */
const SNIFF = 8_000;

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** /api/source's answer: whole text or a stated refusal, never half a file. */
export type SourceReply =
	| { ok: true; path: string; lang: string; text: string; html: string; bytes: number }
	| { ok: false; note: string };

/** /api/file's answer: a body truncated at the same 512KB, and says so. */
export type FileBodyReply =
	| { ok: true; path: string; text: string; html: string; bytes: number; truncated: boolean }
	| { ok: false; note: string };

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The symbol-aware viewer's payload. Refused (not truncated) past the source
 * cap: half a file scrolls and clicks like a whole one, and every position
 * past the cut would document the wrong symbol.
 */
export const getFileSource = createServerFn({ method: "POST" })
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<SourceReply> => {
		const file = await indexedFile(cfg(), data.path);
		if (file === null) return { ok: false, note: "not an indexed file" };
		let buf: Buffer;
		try {
			buf = await readBytes(file);
		} catch (e) {
			return { ok: false, note: reason(e) };
		}
		if (buf.length > MAX_SOURCE_BYTES) {
			return { ok: false, note: `file is larger than ${MAX_SOURCE_BYTES} bytes` };
		}
		if (buf.subarray(0, SNIFF).includes(0)) return { ok: false, note: "binary file" };
		const text = buf.toString("utf8");
		const lang = extname(file).slice(1).toLowerCase();
		return { ok: true, path: file, lang, text, html: await renderer.highlight(text, lang), bytes: buf.length };
	});

/** The fallback body: truncating rather than refusing, for read-only display. */
export const getFileBody = createServerFn({ method: "POST" })
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<FileBodyReply> => {
		const file = await indexedFile(cfg(), data.path);
		if (file === null) return { ok: false, note: "not a tracked file" };
		let buf: Buffer;
		try {
			buf = await readBytes(file);
		} catch (e) {
			return { ok: false, note: reason(e) };
		}
		if (buf.subarray(0, SNIFF).includes(0)) return { ok: false, note: "binary file" };
		const text = buf.subarray(0, MAX_SOURCE_BYTES).toString("utf8");
		const lang = extname(file).slice(1).toLowerCase();
		return {
			ok: true,
			path: file,
			text,
			html: await renderer.highlight(text, lang),
			bytes: buf.length,
			truncated: buf.length > MAX_SOURCE_BYTES,
		};
	});

/**
 * The structure strip. Fetched when a file OPENS, before any symbol lookup,
 * so it cannot borrow that route's sentence: an engine-less file answers
 * `[]` AND says why, and a cut list says how much of it is shown.
 */
export const getFileOutline = createServerFn({ method: "POST" })
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<OutlineReply> => {
		const c = cfg();
		const file = await indexedFile(c, data.path);
		if (file === null) return { items: [], note: "not an indexed file" };
		try {
			const choice = await engineFor(c, file);
			if (choice.provider === null) {
				return { items: [], note: choice.reason ?? "no documentation engine for this file" };
			}
			const all = await choice.provider.outline(file);
			const items = all.slice(0, MAX_OUTLINE_ITEMS);
			return { items, ...(all.length > items.length ? { truncated: true } : {}) };
		} catch (e) {
			return { items: [], note: reason(e) };
		}
	});
