/**
 * POSITION IS BAKED IN AT RENDER TIME. The server already escapes and
 * highlights the file (highlight.ts owns that invariant); this makes a single
 * pass over that HTML and wraps every identifier run in a span carrying its
 * 1-based line and col. A click is then an attribute read — no client-side
 * tokenizer, no second escaping rule, no way for the viewer and the compiler
 * to disagree about the caret. An `&…;` entity counts as ONE column: it is
 * one character of the file the service is looking at.
 *
 * Two bounds, both load-bearing rather than tidy. The identifier pattern is
 * UNICODE (`gréet` is one span, not two, and a CJK name gets one at all), and
 * the pass STOPS wrapping past a budget: an 866KB minified file became 12.8MB
 * of DOM and 120,000 span nodes, which does not render slowly, it hangs the
 * tab. Past the budget the source is still shown, still highlighted, still
 * scrollable — it simply is not clickable, and says so.
 */

/** Past these the DOM, not the parse, is what hangs the tab. */
export const CODE_MAX_IDS = 20000;
export const CODE_MAX_COL = 2000;

/**
 * Identifier spans over already-highlighted HTML, each carrying the 1-based
 * line/col it starts at. Tags are copied verbatim (they are the highlighter's,
 * and they hold no source text); an entity is one column.
 */
export function codePositions(html: string): { html: string; capped: boolean } {
	const ID = /[\p{L}_$][\p{L}\p{N}_$]*/uy;
	let out = "";
	let i = 0;
	let line = 1;
	let col = 1;
	const n = html.length;
	let ids = 0;
	let capped = false;
	while (i < n) {
		const ch = html.charAt(i);
		if (ch === "<") {
			const gt = html.indexOf(">", i);
			if (gt === -1) {
				out += html.slice(i);
				break;
			}
			out += html.slice(i, gt + 1);
			i = gt + 1;
			continue;
		}
		if (ch === "\n") {
			out += ch;
			line++;
			col = 1;
			i++;
			continue;
		}
		if (ch === "&") {
			const sc = html.indexOf(";", i);
			if (sc !== -1 && sc - i < 8) {
				out += html.slice(i, sc + 1);
				i = sc + 1;
				col++;
				continue;
			}
		}
		ID.lastIndex = i;
		const m = ID.exec(html);
		if (m !== null && m.index === i) {
			// Over budget the text still renders; only the click target is dropped.
			if (ids < CODE_MAX_IDS && col <= CODE_MAX_COL) {
				out += `<span class="idn" data-line="${line}" data-col="${col}">${m[0]}</span>`;
				ids++;
			} else {
				out += m[0];
				capped = true;
			}
			i += m[0].length;
			col += m[0].length;
			continue;
		}
		out += ch;
		i++;
		col++;
	}
	return { html: out, capped };
}
