/**
 * The one HTML scanner the extractor owns: find an element and its matching
 * close, counting nesting.
 *
 * A regex like /<nav[\s\S]*?<\/nav>/ ends at the FIRST close tag, so a nav
 * containing a nested nav leaks the rest of the sidebar into the article; a
 * greedy one swallows the page. Both were tried. This counts depth instead,
 * and treats a self-closing tag as no element at all — without that,
 * `<svg ... />` opened a region that never closed and ate the document.
 *
 * This is deliberately NOT a parser. It is the smallest thing that can say
 * "this span is a <script>" so the span can be deleted before any of it is
 * ever shown; correctness against hostile markup means dropping too much,
 * never keeping too much.
 */
export interface Span {
	/** Index of the `<` that opened it. */
	open: number;
	/** First index of its content. */
	innerStart: number;
	/** One past the last index of its content. */
	innerEnd: number;
	/** One past the `>` that closed it — or the end of the document. */
	end: number;
}

export function firstSpan(html: string, tag: string, from = 0): Span | null {
	const re = new RegExp(`<${tag}(?=[\\s/>])[^>]*>|</${tag}\\s*>`, "gi");
	re.lastIndex = from;
	let depth = 0;
	let open = -1;
	let innerStart = -1;
	for (let m = re.exec(html); m !== null; m = re.exec(html)) {
		const token = m[0];
		if (token.startsWith("</")) {
			if (depth === 0) continue; // a stray close tag closes nothing
			depth--;
			if (depth === 0) return { open, innerStart, innerEnd: m.index, end: re.lastIndex };
		} else {
			if (token.endsWith("/>")) continue; // self-closing: no content to skip
			if (depth === 0) {
				open = m.index;
				innerStart = re.lastIndex;
			}
			depth++;
		}
	}
	// Never closed. An unterminated <script> owns the rest of the document,
	// which is exactly how a browser would read it too.
	return depth > 0 ? { open, innerStart, innerEnd: html.length, end: html.length } : null;
}

/** The content of the first `tag` element, or null when there is none. */
export function innerOf(html: string, tag: string): string | null {
	const span = firstSpan(html, tag);
	return span === null ? null : html.slice(span.innerStart, span.innerEnd);
}
