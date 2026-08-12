/**
 * Bounded edit distance — the second gate of fuzzy matching, after trigram
 * overlap has proposed candidates cheaply.
 */
/**
 * Damerau-Levenshtein that gives up as soon as every path exceeds `max`.
 *
 * The transposition rule is not a refinement, it is the point: swapping two
 * adjacent letters ("retyr" for "retry") is the commonest typo there is, and
 * under plain Levenshtein it costs 2 — which no word of five characters or
 * fewer is ever allowed to spend. Counting it as the single edit it is makes
 * short-word typos correctable at all.
 */
export function editDistance(a: string, b: string, max: number): number {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	let twoBack: number[] = [];
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		let best = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			let value = Math.min(
				(prev[j] ?? max + 1) + 1,
				(row[j - 1] ?? max + 1) + 1,
				(prev[j - 1] ?? max + 1) + cost,
			);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				value = Math.min(value, (twoBack[j - 2] ?? max + 1) + 1);
			}
			row.push(value);
			if (value < best) best = value;
		}
		if (best > max) return max + 1;
		twoBack = prev;
		prev = row;
	}
	return prev[b.length] ?? max + 1;
}
