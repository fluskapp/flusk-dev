/**
 * The shapes the web reader passes around. They live apart from the modules
 * that produce them so the cache, the route and the tests can name a page
 * without importing the network.
 *
 * Note what a FetchedPage is NOT: it is not trusted text. Everything in
 * `title` and `markdown` was written by whoever runs the remote server. It is
 * rendered for a human to read and, if it is ever put in front of a model, it
 * goes through quote.ts first (see the note there).
 */

/** One page, as it is cached and as it is rendered. */
export interface FetchedPage {
	/** Exactly what the user asked for — the cache key. */
	url: string;
	/** Where the redirects ended; may differ from `url`. */
	finalUrl: string;
	/** From <title> or the first heading. Untrusted text. */
	title: string;
	/** The readable extract, as markdown source. Untrusted text. */
	markdown: string;
	/** ISO timestamp of the fetch this content came from. */
	fetchedAt: string;
}

/** Transport-level answer: the bytes, or the reason there are none. */
export type FetchOutcome =
	| { ok: true; finalUrl: string; contentType: string; text: string }
	| { ok: false; error: string };

/**
 * A read: the page (from cache or network), or why there is no page. `note`
 * carries a second sentence the panel must show even on success — "this is
 * the cached copy because the refetch failed with …".
 */
export type WebResult =
	| { ok: true; page: FetchedPage; cached: boolean; note?: string }
	| { ok: false; error: string };
