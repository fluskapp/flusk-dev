/**
 * The Web panel's typed server functions — the same two reads /api/web and
 * /api/web/list serve (web.router.ts), for the React route. Bodies delegate to
 * the same modules: readPage for the fetch-or-cache decision, the one markdown
 * renderer for the body, asFetchedContext for the quote — so nothing ever
 * hands a page's raw text to a prompt from here either.
 *
 * A failed fetch answers with `error` rather than throwing, because every one
 * of those failures is about the URL rather than about the server, and the
 * sentence — "refusing file:", "timed out after 10000ms" — is the whole
 * answer the panel has to show.
 */
import { createServerFn } from "@tanstack/react-start";
import { listCached } from "./cache.repository.js";
import { asFetchedContext } from "./quote.js";
import { readPage } from "./read.js";
import type { FetchedPage } from "./types.js";
import type { WebReply } from "./web.router.js";
import { renderMarkdown } from "../../ui/render/markdown.js";

export type { WebReply } from "./web.router.js";

/** A reading-list row: everything about a cached page except its body. */
export type WebListItem = Omit<FetchedPage, "markdown">;

/** Discriminates on `error`: absent means the full reply is present. */
export type WebPageAnswer = { url: string; error: string } | (WebReply & { error?: undefined });

/** The same sentence web.router.ts answers with — kept verbatim so the two
 * surfaces cannot say different things about the same page. */
const NO_PROSE =
	"this page carried no readable prose — it may build its content with JavaScript, " +
	"which the reader does not run";

/** Read a URL the USER supplied; `refresh` bypasses the cached copy. */
export const getWebPage = createServerFn()
	.inputValidator((data: { url: string; refresh?: boolean }) => data)
	.handler(async ({ data }): Promise<WebPageAnswer> => {
		try {
			const asked = data.url.trim();
			if (asked === "") return { url: data.url, error: "url is required" };
			const r = await readPage(asked, data.refresh === true);
			if (!r.ok) return { url: asked, error: r.error };
			const { page } = r;
			const empty = page.markdown.trim() === "" ? NO_PROSE : "";
			const note = r.note ?? empty;
			return {
				url: page.url,
				finalUrl: page.finalUrl,
				title: page.title,
				html: renderMarkdown(page.markdown),
				quote: asFetchedContext(page),
				fetchedAt: page.fetchedAt,
				ageMs: Math.max(0, Date.now() - Date.parse(page.fetchedAt)),
				cached: r.cached,
				...(note === "" ? {} : { note }),
			};
		} catch (e) {
			return { url: data.url, error: e instanceof Error ? e.message : String(e) };
		}
	});

/** The pages already in the cache, newest first — the reading list. */
export const getWebList = createServerFn().handler(async (): Promise<WebListItem[]> => {
	return listCached();
});
