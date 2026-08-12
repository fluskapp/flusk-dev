/**
 * Maximal-marginal-relevance selection: the answer to "five paraphrases of one
 * commit", which is the noise this feature exists to remove.
 *
 * It lives beside the ranker rather than inside it because it is a different
 * question: `search` asks which card is best, this asks which SET says the most
 * per token — the property every section of a walkthrough and every block of a
 * composed prompt is spending budget on.
 */
import { tokenize } from "./tokenize.js";
import type { SearchHit } from "./types.js";

function overlap(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 || b.size === 0) return 0;
	let shared = 0;
	for (const term of a) if (b.has(term)) shared++;
	return shared / (a.size + b.size - shared);
}

/**
 * Greedy MMR: take the best hit, then keep taking the hit whose score
 * survives its similarity to what is already chosen. Similarity counts token
 * overlap AND sameness of kind — five commits crowd out the doc that says why
 * they were written.
 */
export function selectDiverse(hits: SearchHit[], n: number, lambda = 0.7): SearchHit[] {
	const tokens = new Map<string, Set<string>>();
	const termsOf = (hit: SearchHit): Set<string> => {
		const cached = tokens.get(hit.card.id);
		if (cached !== undefined) return cached;
		const built = new Set(tokenize(`${hit.card.title} ${hit.card.text}`));
		tokens.set(hit.card.id, built);
		return built;
	};
	const pool = [...hits];
	const picked: SearchHit[] = [];
	while (picked.length < n && pool.length > 0) {
		let bestIndex = 0;
		let bestValue = Number.NEGATIVE_INFINITY;
		pool.forEach((hit, i) => {
			let sim = 0;
			for (const other of picked) {
				const kindSim = hit.card.kind === other.card.kind ? 0.15 : 0;
				sim = Math.max(sim, 0.85 * overlap(termsOf(hit), termsOf(other)) + kindSim);
			}
			const value = hit.score * (1 - lambda * sim);
			if (value > bestValue) {
				bestValue = value;
				bestIndex = i;
			}
		});
		const [chosen] = pool.splice(bestIndex, 1);
		if (chosen !== undefined) picked.push(chosen);
	}
	return picked;
}
