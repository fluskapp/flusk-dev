/**
 * Minimal, dependency-free Markdown → HTML for the dashboard preview.
 *
 * The whole document is HTML-escaped up front, so no path through the parser
 * can emit source-supplied markup: a `<script>` in a note renders as text.
 * Block markers survive escaping unchanged except `>`, which becomes `&gt;`.
 * Unknown input is never an error — worst case it comes back as paragraphs.
 */
import { takeCode, takeParagraph, takeQuote } from "./markdown-blocks.js";
import { frontmatterBlock, frontmatterRows } from "./markdown-frontmatter.js";
import { escapeHtml, renderInline } from "./markdown-inline.js";
import { LIST_RE, renderList } from "./markdown-list.js";
import { isTableSeparator, takeTable } from "./markdown-table.js";

export { renderFrontmatter } from "./markdown-frontmatter.js";

const FENCE = /^\s*```\s*([\w+#.-]*)/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})\s*$/;

/**
 * Frontmatter is the caller's business (see journal-scan); it never renders.
 *
 * Only a block that actually PARSES as key/value frontmatter is consumed —
 * the same test renderFrontmatter uses to decide whether there is a table to
 * show. Stripping on the delimiters alone deleted everything up to the second
 * `---` in any text that merely opened with a horizontal rule, and rendered
 * no table in its place, so a model reply beginning with `---` silently lost
 * its first section on the way through /api/render.
 */
export function stripFrontmatter(src: string): string {
	const block = frontmatterBlock(src);
	if (block === null || frontmatterRows(block).length === 0) return src;
	const end = src.indexOf("\n---", src.indexOf("\n"));
	const nl = src.indexOf("\n", end + 1);
	return nl === -1 ? "" : src.slice(nl + 1);
}

/** True for any line that must interrupt a running paragraph. */
function startsBlock(line: string): boolean {
	return (
		FENCE.test(line) ||
		HEADING.test(line) ||
		RULE.test(line.trim()) ||
		line.startsWith("&gt;") ||
		LIST_RE.test(line)
	);
}

function takeList(lines: string[], start: number): [string, number] {
	let i = start;
	while (i < lines.length && LIST_RE.test(lines[i] ?? "")) i++;
	return [renderList(lines.slice(start, i)), i];
}

export function renderMarkdown(src: string): string {
	if (typeof src !== "string" || src === "") return "";
	const body = stripFrontmatter(src).replace(/\r\n?/g, "\n");
	// Escaping never adds or removes a newline, so `raw` and `lines` are the
	// same document line-for-line: index i means the same line in both. Fenced
	// code needs the unescaped text (the highlighter escapes as it wraps).
	const raw = body.split("\n");
	const lines = escapeHtml(body).split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i] ?? "";
		if (line.trim() === "") {
			i++;
			continue;
		}
		const fence = FENCE.exec(line);
		const heading = HEADING.exec(line);
		if (fence) {
			const [html, next] = takeCode(lines, i, fence[1] ?? "", raw);
			out.push(html);
			i = next;
		} else if (heading) {
			const n = (heading[1] ?? "#").length;
			out.push(`<h${n}>${renderInline((heading[2] ?? "").trim())}</h${n}>`);
			i++;
		} else if (RULE.test(line.trim())) {
			out.push("<hr>");
			i++;
		} else if (line.startsWith("&gt;")) {
			const [html, next] = takeQuote(lines, i);
			out.push(html);
			i = next;
		} else if (line.includes("|") && isTableSeparator(lines[i + 1] ?? "")) {
			const [html, next] = takeTable(lines, i);
			out.push(html);
			i = next;
		} else if (LIST_RE.test(line)) {
			const [html, next] = takeList(lines, i);
			out.push(html);
			i = next;
		} else {
			const [html, next] = takeParagraph(lines, i, startsBlock);
			out.push(html);
			i = next > i ? next : i + 1;
		}
	}
	return out.join("\n");
}
