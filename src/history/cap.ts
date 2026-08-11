/**
 * Length caps for card text, cut where a reader would cut.
 *
 * Every source caps the body it indexes, because one 200 KB design doc must
 * not outweigh a repo. But a cap applied with `slice` cuts mid-word, and card
 * text is not only indexed — it is REPLAYED into a composed prompt. A commit
 * block that ends "...<noreply@anthropic.com>\n\nRE" has spent tokens to show
 * the reader two letters of "README.md".
 *
 * This is the same rule `budget.ts` already applies when it packs blocks
 * ("a block is never cut mid-sentence"), enforced one stage earlier so the
 * cards themselves are clean and no later consumer has to re-trim them.
 */

/**
 * Drops the partial word a truncation left behind. Callers use this when they
 * KNOW the text was cut — `readHead` cuts on a byte boundary, so its result
 * can end mid-word while still being shorter than any character cap.
 *
 * Text that is all one token is returned untouched: there is no boundary to
 * back off to, and an empty body loses more than a ragged one.
 */
export function dropPartialTail(text: string): string {
	const cut = text.replace(/\S+$/, "").trimEnd();
	return cut === "" ? text : cut;
}

/**
 * `text` capped to `max` characters, never ending mid-word. The trailing
 * partial token is dropped; a window with no whitespace at all is a single
 * enormous token, where a hard cut loses less than dropping everything.
 */
export function capText(text: string, max: number): string {
	if (max <= 0) return "";
	if (text.length <= max) return text;
	const window = text.slice(0, max);
	// The character after the cut is what says whether the last token is whole.
	if (/\s/.test(text[max] ?? "")) return window.trimEnd();
	return dropPartialTail(window);
}
