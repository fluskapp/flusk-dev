/**
 * The palette's transport odds and ends. History search and prompt compose
 * still ride the legacy loopback endpoints (`/api/history/*`) — the history
 * feature has no typed server-function surface yet, and inventing one here
 * would duplicate a seam another port owns. Go to File is typed
 * (goto.functions.ts); these two degrade to "search failed" where the legacy
 * API is not being served.
 */
export async function getJson<T>(url: string): Promise<T> {
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${r.status}`);
	return (await r.json()) as T;
}

/** Clipboard write; the caller owns the "copied" sentence in the footer. */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

/** Session key, harness journal, or indexed document — decided by shape. */
export function refKind(ref: string): "session" | "journal" | "doc" {
	if (/\.jsonl$/.test(ref)) return "session";
	if (ref.includes("/docs/runs/")) return "journal";
	if (/\.md$/.test(ref)) return "doc";
	return "journal";
}
