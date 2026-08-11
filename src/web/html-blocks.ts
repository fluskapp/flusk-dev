/**
 * HTML block structure → markdown source.
 *
 * The output is markdown TEXT, not HTML, and that is the point: ah already
 * has exactly one renderer with exactly one escaping rule (src/ui/markdown.ts)
 * and a second HTML sanitiser here would be a second place to get it wrong.
 * So a fetched page is reduced to headings, paragraphs, lists, quotes and
 * fenced code, and handed to the renderer every other document goes through.
 *
 * Code blocks come out FIRST and travel as placeholders, because everything
 * below this line collapses whitespace — and whitespace is the only structure
 * a code sample has.
 */
import { decodeEntities, inlineToMarkdown, stripTags } from "./html-inline.js";
import { firstSpan } from "./html-scan.js";

/**
 * The placeholder a lifted <pre> leaves behind. Any occurrence the PAGE
 * carried is deleted before the real ones are written, so fetched text can
 * never forge one and have a code block of its choosing substituted in.
 */
const MARK = "@@AHCODE";
const MARK_RE = /@@AHCODE(\d+)@@/g;

/**
 * The fence is one backtick longer than the longest run inside the sample.
 * A page whose <pre> contains ``` would otherwise close the block early and
 * spill the remainder of the page out as prose.
 */
function fence(text: string): string {
	const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
	return "`".repeat(Math.max(3, longest + 1));
}

function codeBlock(inner: string): string {
	const lang = /class\s*=\s*["']?[^"'>]*\b(?:language|lang|highlight)-([\w+#.-]+)/i.exec(inner);
	const text = decodeEntities(stripTags(inner)).replace(/^\n+/, "").replace(/\s+$/, "");
	const bars = fence(text);
	return `${bars}${lang?.[1] ?? ""}\n${text}\n${bars}`;
}

/** Every <pre> lifted out, replaced by a placeholder line. */
export function takeCodeBlocks(html: string): { rest: string; blocks: string[] } {
	const blocks: string[] = [];
	let rest = html.split(MARK).join("");
	for (let span = firstSpan(rest, "pre"); span !== null; span = firstSpan(rest, "pre")) {
		blocks.push(codeBlock(rest.slice(span.innerStart, span.innerEnd)));
		const tag = `\n\n${MARK}${blocks.length - 1}@@\n\n`;
		rest = rest.slice(0, span.open) + tag + rest.slice(span.end);
	}
	return { rest, blocks };
}

const RULES: Array<[RegExp, string]> = [
	[/<br\s*\/?>/gi, "\n"],
	[/<hr\s*\/?>/gi, "\n\n---\n\n"],
	[/<li\b[^>]*>/gi, "\n- "],
	[/<\/li\s*>/gi, "\n"],
	[/<blockquote\b[^>]*>/gi, "\n\n> "],
	[/<(?:p|div|section|ul|ol|dl|table|tr)\b[^>]*>/gi, "\n\n"],
	[/<\/(?:p|div|section|ul|ol|dl|table|blockquote)\s*>/gi, "\n\n"],
	[/<\/(?:tr|dt|dd)\s*>/gi, "\n"],
	[/<\/t[dh]\s*>/gi, " "],
];

/** One space per run, one blank line between blocks, no orphan bullets. */
function tidy(text: string): string {
	return text
		.split("\n")
		.map((l) => l.replace(/[^\S\n]+/g, " ").trim())
		.filter((l, i, all) => l !== "-" && !(l === "" && all[i - 1] === ""))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function htmlToMarkdown(html: string, base: string): string {
	const { rest, blocks } = takeCodeBlocks(html);
	let text = rest
		.replace(/<h([1-6])\b[^>]*>/gi, (_m, n: string) => `\n\n${"#".repeat(Number(n))} `)
		.replace(/<\/h[1-6]\s*>/gi, "\n\n");
	for (const [re, sub] of RULES) text = text.replace(re, sub);
	text = decodeEntities(stripTags(inlineToMarkdown(text, base)));
	// The samples go back in after tidying, untouched — see the note above.
	return tidy(text).replace(MARK_RE, (whole, i: string) => blocks[Number(i)] ?? whole);
}
