/**
 * The one place ah opens a socket to a stranger.
 *
 * Everything the user typed is a URL and nothing more: no headers are taken
 * from the page, no credentials are sent, and every failure comes back as a
 * value carrying the reason — this module never throws, because "the fetch
 * failed" with no sentence is indistinguishable on screen from a broken
 * panel. The four network limits (timeout, size, redirects, schemes) are
 * named constants in limits.ts; this file is where they are applied.
 *
 * Redirects are followed BY HAND (`redirect: "manual"`) so every hop is
 * re-checked by checkUrl: an https page that redirects to file:// or to
 * 169.254.169.254 is a redirect chain, not a page, and the runtime's own
 * follower would have taken it.
 */
import { readCapped } from "./body.js";
import { FETCH_TIMEOUT_MS, MAX_REDIRECTS } from "./limits.js";
import { resolvedBlock } from "./resolve.js";
import type { FetchOutcome } from "./types.js";
import { checkUrl } from "./url.js";

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/** What the reader can turn into prose. A PDF or an image is not a page. */
const TEXTUAL = /^\s*(?:text\/|application\/(?:xhtml\+xml|xml))/i;

/** No cookies, no referer, and a User-Agent that admits what it is. */
const HEADERS: Record<string, string> = {
	accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
	"accept-language": "en",
	"user-agent": "ah-workbench-web-reader",
};

const fail = (error: string): FetchOutcome => ({ ok: false, error });

/** The abort is ours, so it is a timeout; anything else keeps its own text. */
function transportError(e: unknown, aborted: number | false): string {
	if (aborted !== false) return `timed out after ${aborted}ms`;
	const msg = e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : "";
	return msg === "" ? "the request failed" : msg;
}

async function hop(start: URL, signal: AbortSignal, budget: number): Promise<FetchOutcome> {
	let url = start;
	const seen = new Set<string>();
	for (let i = 0; i <= MAX_REDIRECTS; i++) {
		if (seen.has(url.href)) return fail(`redirect loop: ${url.href} was already visited`);
		seen.add(url.href);
		const blocked = await resolvedBlock(url.hostname);
		if (blocked !== null) return fail(`refusing ${blocked}`);
		let res: Response;
		try {
			res = await fetch(url, { redirect: "manual", signal, headers: HEADERS });
		} catch (e) {
			return fail(transportError(e, signal.aborted && budget));
		}
		const location = res.headers.get("location");
		if (REDIRECTS.has(res.status) && location !== null) {
			await res.body?.cancel().catch(() => undefined);
			const next = checkUrl(location, url.href);
			if (!next.ok) return fail(`redirect to ${location}: ${next.error}`);
			url = next.url;
			continue;
		}
		if (!res.ok) return fail(`HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`);
		const type = res.headers.get("content-type") ?? "";
		if (!TEXTUAL.test(type)) {
			return fail(`content-type "${type || "unknown"}" is not text the reader can render`);
		}
		try {
			return await readCapped(res, url.href, type);
		} catch (e) {
			return fail(transportError(e, signal.aborted && budget));
		}
	}
	return fail(`more than ${MAX_REDIRECTS} redirects`);
}

/**
 * Fetch `raw` as text. Never throws; a refusal and a failure look the same.
 *
 * `budget` exists so the timeout can be exercised without a ten-second test:
 * production callers take the constant, and nothing in ah passes anything
 * else.
 */
export async function fetchText(
	raw: string,
	budget: number = FETCH_TIMEOUT_MS,
): Promise<FetchOutcome> {
	const first = checkUrl(raw);
	if (!first.ok) return fail(first.error);
	// ONE controller for the whole read — connect, headers and body. A
	// per-socket timeout never fires against a server that dribbles bytes.
	const ctl = new AbortController();
	const timer = setTimeout(() => {
		ctl.abort();
	}, budget);
	try {
		return await hop(first.url, ctl.signal, budget);
	} finally {
		clearTimeout(timer);
	}
}
