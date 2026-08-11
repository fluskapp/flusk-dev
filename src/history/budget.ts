/**
 * How much text fits, and which text earns its place.
 *
 * The estimator is `ceil(chars / 4)`. It is an estimate on purpose: a real
 * tokenizer would be a dependency, and this path must stay cheap enough to run
 * on every keystroke. Anything else that counts prompt tokens should use this
 * function rather than its own arithmetic, so the budgets ah spends are all
 * counted in one currency.
 *
 * Packing is greedy by value PER TOKEN, not by value: a 40-token house rule
 * that changes how everything else is read beats a 900-token diff that is
 * merely relevant. And a block is never cut mid-sentence — a prompt that ends
 * "the gate blocks when the report cla" has spent tokens to say nothing, so a
 * block that cannot fit whole is trimmed back to its last sentence or line
 * boundary, or dropped.
 */

/** `ceil(chars / 4)` — the one token estimate every budget here is spent in. */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

export interface Candidate {
	text: string;
	/** Higher is more useful; the packer maximises value per token. */
	value: number;
	/** Taken first and never dropped — the task itself, and nothing else. */
	required?: boolean;
}

export interface PackedBlock<T> {
	item: T;
	/** `item.text`, possibly trimmed back to a sentence boundary. */
	text: string;
	tokens: number;
}

export interface Packed<T> {
	kept: PackedBlock<T>[];
	tokens: number;
	omitted: number;
}

/** Trimming below this is not worth a block header, so the block is dropped. */
const MIN_BLOCK_TOKENS = 24;

/** The only places a block may be cut: end of sentence, or end of line. */
const BOUNDARY = /[.!?](?=\s|$)|\n/g;

/** Longest prefix of `text` that ends on a boundary and fits `maxTokens`. */
export function trimToSentence(text: string, maxTokens: number): string {
	if (maxTokens <= 0) return "";
	const maxChars = maxTokens * 4;
	if (text.length <= maxChars) return text;
	let cut = 0;
	for (const m of text.matchAll(BOUNDARY)) {
		const end = (m.index ?? 0) + m[0].length;
		if (end > maxChars) break;
		cut = end;
	}
	return text.slice(0, cut).trimEnd();
}

/**
 * Greedy fill by value-per-token. Required items are taken first, in order,
 * whatever they cost — dropping the task to fit a precedent would be an
 * absurd trade, so the caller marks it `required` and owns the consequence.
 * `kept` comes back in selection order; callers that want the canonical
 * reading order re-sort it themselves.
 */
export function packToBudget<T extends Candidate>(items: T[], budget: number): Packed<T> {
	const kept: PackedBlock<T>[] = [];
	let used = 0;
	const take = (item: T, text: string): void => {
		const tokens = estimateTokens(text);
		used += tokens;
		kept.push({ item, text, tokens });
	};
	const rest: { item: T; order: number; tokens: number }[] = [];
	items.forEach((item, order) => {
		if (item.required === true) take(item, item.text);
		else rest.push({ item, order, tokens: Math.max(1, estimateTokens(item.text)) });
	});
	rest.sort((a, b) => b.item.value / b.tokens - a.item.value / a.tokens || a.order - b.order);
	for (const c of rest) {
		const room = budget - used;
		if (room <= 0) continue;
		if (c.tokens <= room) {
			take(c.item, c.item.text);
			continue;
		}
		if (room < MIN_BLOCK_TOKENS) continue;
		const trimmed = trimToSentence(c.item.text, room);
		if (trimmed !== "") take(c.item, trimmed);
	}
	return { kept, tokens: used, omitted: items.length - kept.length };
}
