/**
 * Inline HTML → inline markdown, and the entity decoder both halves share.
 *
 * Decoding runs AFTER every tag has been removed, and the result is markdown
 * SOURCE that ui/markdown.ts escapes before it emits anything. That ordering
 * is the reason `&lt;script&gt;` in a fetched page cannot become a tag here:
 * by the time it decodes there is no tag-shaped text left to re-parse, and
 * the renderer escapes it again on the way out.
 */

const NAMED: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	mdash: "—",
	ndash: "–",
	hellip: "…",
	rsquo: "’",
	lsquo: "‘",
	ldquo: "“",
	rdquo: "”",
	middot: "·",
	laquo: "«",
	raquo: "»",
	copy: "©",
	reg: "®",
	trade: "™",
};

export function decodeEntities(text: string): string {
	return text.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]{1,10});/gi, (whole, body: string) => {
		if (body.startsWith("#")) {
			const hex = body[1] === "x" || body[1] === "X";
			const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
			return Number.isFinite(code) && code > 0 && code <= 0x10ffff
				? String.fromCodePoint(code)
				: whole;
		}
		return NAMED[body.toLowerCase()] ?? whole;
	});
}

export function stripTags(html: string): string {
	return html.replace(/<[^>]*>/g, "");
}

/**
 * A link is only worth emitting if it can be followed. Relative hrefs are
 * resolved against the page they came from, and anything that is not http(s)
 * after that — javascript:, data:, mailto: — loses its link and keeps its
 * text. The renderer refuses those schemes too; this simply means the panel
 * never shows a link it knows is dead or dangerous.
 */
function absolute(href: string, base: string): string | null {
	try {
		const u = new URL(href, base);
		if (u.protocol !== "http:" && u.protocol !== "https:") return null;
		// ")" would close the markdown link early and leak the rest as text.
		return u.href.replace(/\)/g, "%29");
	} catch {
		return null;
	}
}

const ANCHOR = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))[^>]*>([\s\S]*?)<\/a>/gi;

/** Anchors, code spans and emphasis; every other tag is dropped. */
export function inlineToMarkdown(html: string, base: string): string {
	return html
		.replace(ANCHOR, (_m, dq: string, sq: string, bare: string, body: string) => {
			const label = stripTags(body).replace(/\s+/g, " ").trim();
			if (label === "") return "";
			const href = absolute(decodeEntities(dq ?? sq ?? bare ?? "").trim(), base);
			return href === null ? label : `[${label}](${href})`;
		})
		.replace(/<\/?(?:code|kbd|samp|tt)\b[^>]*>/gi, "`")
		.replace(/<\/?(?:strong|b)\b[^>]*>/gi, "**")
		.replace(/<\/?(?:em|i)\b[^>]*>/gi, "*");
}
