/**
 * GET /api/web — read a URL the USER supplied and hand back the readable
 * version, rendered by the dashboard's one markdown renderer.
 * GET /api/web/list — the pages already in the cache, newest first.
 *
 * The reply always carries its provenance: the final URL after redirects,
 * when the copy was fetched, how old it is, and whether it came off the disk
 * — a reader must be able to tell a live page from a week-old one. `quote` is
 * the same content wrapped for a model (src/web/quote.ts): the panel offers
 * it to chat so nothing ever pastes raw fetched text into a prompt.
 *
 * A failure answers 200 with `error` rather than a status code, because every
 * one of these failures is about the URL rather than about the server, and
 * the sentence — "refusing file:", "timed out after 10000ms", "more than 5
 * redirects" — is the whole answer the panel has to show.
 */
import type { ServerResponse } from "node:http";
import { listCached } from "../web/cache.js";
import { asFetchedContext } from "../web/quote.js";
import { readPage } from "../web/read.js";
import { json } from "./api-doc-util.js";
import { renderMarkdown } from "./markdown.js";

export interface WebReply {
	url: string;
	finalUrl: string;
	title: string;
	/** Rendered from markdown source, escaped by the renderer. */
	html: string;
	/** The same content, delimited and labelled as untrusted, for a model. */
	quote: string;
	fetchedAt: string;
	ageMs: number;
	cached: boolean;
	note?: string;
	error?: string;
}

/** A page whose prose did not survive extraction still explains itself. */
const NO_PROSE =
	"this page carried no readable prose — it may build its content with JavaScript, " +
	"which the reader does not run";

async function serveWeb(query: URLSearchParams, res: ServerResponse): Promise<void> {
	try {
		const asked = query.get("url") ?? "";
		if (asked.trim() === "") return json(res, 400, { error: "url is required" });
		const r = await readPage(asked, query.get("refresh") === "1");
		if (!r.ok) return json(res, 200, { url: asked, error: r.error });
		const { page } = r;
		const empty = page.markdown.trim() === "" ? NO_PROSE : "";
		const note = r.note ?? empty;
		json(res, 200, {
			url: page.url,
			finalUrl: page.finalUrl,
			title: page.title,
			html: renderMarkdown(page.markdown),
			quote: asFetchedContext(page),
			fetchedAt: page.fetchedAt,
			ageMs: Math.max(0, Date.now() - Date.parse(page.fetchedAt)),
			cached: r.cached,
			...(note === "" ? {} : { note }),
		} satisfies WebReply);
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}

/** Returns true when it handled the route. */
export function handleWeb(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method !== "GET") return false;
	if (pathname === "/api/web") void serveWeb(query, res);
	else if (pathname === "/api/web/list") json(res, 200, listCached());
	else return false;
	return true;
}
