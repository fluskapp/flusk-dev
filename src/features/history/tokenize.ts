/**
 * The one tokenizer the whole retrieval path shares — index and query must
 * agree or nothing matches.
 *
 * Code history is written in identifiers, so an identifier is kept WHOLE and
 * ALSO split into its parts: "retryHook" indexes as `retryhook`, `retry` and
 * `hook`, which is what makes a task phrased in prose ("the retry hook")
 * find a commit phrased in code. The whole form still scores separately, so
 * an exact identifier match stays ahead of the sum of its pieces.
 */

/**
 * Deliberately tiny. A big stopword list is a way to lose real queries —
 * "test", "error" and "run" are words this corpus is actually about.
 */
const STOPWORDS = new Set(
	(
		"the a an and or of to in on for with is are was were be been by at it its this that " +
		"from as but not we you if then so do does did has have had will would can into when " +
		"what how why all any our my me there their they"
	).split(" "),
);

/** Tokens under two characters carry no signal and blow up the posting lists. */
function keep(term: string): boolean {
	return term.length >= 2 && !STOPWORDS.has(term);
}

/**
 * "retryHook" → ["retry", "Hook"]; "retry_hook" → ["retry", "hook"];
 * "HTTPServer" → ["HTTP", "Server"] (an acronym keeps its head).
 */
function splitIdentifier(raw: string): string[] {
	return raw
		.replace(/_+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(/\s+/)
		.filter((part) => part !== "");
}

/**
 * A token that is all one case with no underscore has no parts to split, and
 * that is the overwhelming majority of every corpus. Checking is one linear
 * scan; splitting it anyway costs three regex passes and a join per token —
 * ~40% of the whole index build over 2600 cards.
 */
function isPlain(raw: string): boolean {
	let upper = false;
	let lower = false;
	for (let i = 0; i < raw.length; i++) {
		const c = raw.charCodeAt(i);
		if (c === 95)
			return false; // "_"
		else if (c >= 65 && c <= 90) upper = true;
		else if (c >= 97 && c <= 122) lower = true;
		if (upper && lower) return false;
	}
	return true;
}

/**
 * Lowercased terms in occurrence order, duplicates intact — BM25 wants the
 * term frequency, so de-duplication is the caller's business.
 */
export function tokenize(text: string): string[] {
	const out: string[] = [];
	for (const raw of text.split(/[^A-Za-z0-9_]+/)) {
		if (raw === "") continue;
		const whole = raw.toLowerCase();
		if (keep(whole)) out.push(whole);
		if (isPlain(raw)) continue;
		const parts = splitIdentifier(raw);
		if (parts.length < 2) continue;
		for (const part of parts) {
			const term = part.toLowerCase();
			if (keep(term)) out.push(term);
		}
	}
	return out;
}

/** Query terms, de-duplicated: repeating a word must not double its weight. */
export function queryTerms(text: string): string[] {
	return [...new Set(tokenize(text))];
}

/**
 * Anchored character trigrams ("hook" → ^ho, hoo, ook, ok$) — the candidate
 * generator for fuzzy matching. Anchoring matters: it keeps a typo at the
 * head or tail of a word visible instead of averaging it away.
 */
export function trigrams(term: string): string[] {
	const padded = `^${term.toLowerCase()}$`;
	const out: string[] = [];
	for (let i = 0; i + 3 <= padded.length; i++) out.push(padded.slice(i, i + 3));
	return out;
}
