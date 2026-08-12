/**
 * The read a caller actually wants: cache, else network, else the reason.
 *
 * The cache key is the NORMALIZED url (what checkUrl produced), so
 * "example.com/x" and "https://example.com/x" are one entry rather than two,
 * and a refused URL never reaches the disk at all.
 *
 * A refetch that fails does not throw away the copy already on disk: a
 * flaky network is not a reason to lose the page you were reading, so the
 * stale copy comes back with a note saying it is stale and why.
 */
import { readCached, writeCached } from "./cache.repository.js";
import { extractPage } from "./extract.js";
import { fetchText } from "./fetch.js";
import type { WebResult } from "./types.js";
import { checkUrl } from "./url.js";

export async function readPage(raw: string, refresh = false): Promise<WebResult> {
	const checked = checkUrl(raw);
	if (!checked.ok) return { ok: false, error: checked.error };
	const key = checked.url.href;
	const cached = readCached(key);
	if (cached !== null && !refresh) return { ok: true, page: cached, cached: true };
	const got = await fetchText(key);
	if (!got.ok) {
		if (cached === null) return { ok: false, error: got.error };
		return { ok: true, page: cached, cached: true, note: `refetch failed: ${got.error}` };
	}
	const page = extractPage(key, got.finalUrl, got.contentType, got.text);
	const failed = writeCached(page);
	const note = failed === null ? {} : { note: `not cached: ${failed}` };
	return { ok: true, page, cached: false, ...note };
}
