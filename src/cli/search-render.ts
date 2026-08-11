/**
 * The two things a result row says about WHY it matched: the painted terms,
 * and — when the title carries none of them — one line of the body around the
 * term that did. A hit you cannot explain is a hit you have to re-run with
 * --json to argue with, which is the opposite of the point.
 */
import type { SearchHit } from "../history/types.js";

const REGEX_META = /[.*+?^${}()|[\]\\]/g;

/**
 * Paints every matched term inside `text`. Terms are index terms (lowercased,
 * identifier parts split out), so the match is case-insensitive and allowed
 * to carry a suffix — "retry" highlights inside "retrying".
 */
export function highlight(text: string, terms: string[], paint: (s: string) => string): string {
	const unique = [...new Set(terms.map((t) => t.toLowerCase()))]
		.filter((t) => t.length >= 2)
		.sort((a, b) => b.length - a.length);
	if (unique.length === 0) return text;
	const pattern = unique.map((t) => t.replace(REGEX_META, "\\$&")).join("|");
	return text.replace(new RegExp(`(${pattern})`, "gi"), (m) => paint(m));
}

/**
 * Where the match actually is, when it is not in the title. A row whose title
 * carries none of the query's terms is otherwise unexplained: nothing painted,
 * and `--json` the only way to find out why it ranked at all.
 */
export function snippet(hit: SearchHit, width = 72): string | null {
	const title = hit.card.title.toLowerCase();
	const terms = [...new Set(hit.terms.map((t) => t.toLowerCase()))].sort(
		(a, b) => b.length - a.length,
	);
	if (terms.length === 0 || terms.some((t) => title.includes(t))) return null;
	const body = hit.card.text.replace(/\s+/g, " ");
	for (const term of terms) {
		const at = body.toLowerCase().indexOf(term);
		if (at < 0) continue;
		const from = Math.max(0, at - 20);
		return `${from > 0 ? "…" : ""}${body.slice(from, from + width).trim()}…`;
	}
	return null;
}
