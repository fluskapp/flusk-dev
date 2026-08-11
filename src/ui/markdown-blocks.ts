/**
 * Multi-line block builders. Each takes the escaped line array plus the index
 * of its opening line and returns the HTML with the index to continue from.
 */
import { highlightCode } from "./highlight.js";
import { renderInline } from "./markdown-inline.js";

export type Block = [html: string, next: number];

/**
 * CommonMark's closing rule, stated exactly: a fence is closed by a BARE run
 * of backticks at least as long as the one that opened it. A line carrying an
 * info string — ```bash — never closes, it opens.
 *
 * What this does NOT do is nest. A run journal that quotes an agent's
 * transcript inside a plain ``` block, where the transcript has its own
 * ```bash fence, is closed by that inner block's own bare ``` — because in
 * CommonMark it is. The way to quote a transcript containing bare fences is
 * an outer fence that is LONGER than any fence inside it (````), which this
 * honours; there is no rule by which a three-backtick fence can hold another.
 */
function closesFence(line: string, width: number): boolean {
	const m = /^\s*(`{3,})\s*$/.exec(line);
	return m !== null && (m[1] ?? "").length >= width;
}

/**
 * A bare fence whose body is obviously a patch.
 *
 * Measured across 301 real journals: 309 bare ``` fences, 300 ```mermaid, one
 * ```bash and ZERO ```diff — so gating diff colour on an explicit info string
 * meant every patch a journal ever wrote rendered unhighlighted.
 */
const DIFF_SNIFF = /^(?:diff --git |@@ .*@@|index [0-9a-f]{4,}\.\.)|^--- .*\n\+\+\+ /m;

function looksLikeDiff(text: string): boolean {
	return DIFF_SNIFF.test(text.split("\n").slice(0, 6).join("\n"));
}

/**
 * Fenced code: no inline formatting, and the language gets highlighted.
 *
 * `raw` is the *unescaped* line array — the same lines, before renderMarkdown
 * escaped the document — because the highlighter tokenizes source and escapes
 * every slice itself. Without it the block falls back to the escaped text.
 */
export function takeCode(lines: string[], start: number, lang: string, raw?: string[]): Block {
	const width = (/^\s*(`{3,})/.exec(lines[start] ?? "")?.[1] ?? "```").length;
	const body: string[] = [];
	let i = start + 1;
	for (; i < lines.length; i++) {
		if (closesFence(lines[i] ?? "", width)) {
			i++;
			break;
		}
		body.push((raw ?? lines)[i] ?? "");
	}
	const text = body.join("\n");
	const name = lang === "" && looksLikeDiff(text) ? "diff" : lang;
	const inner = raw === undefined ? text : highlightCode(text, name);
	const cls = name === "" ? "" : ` class="lang-${name}"`;
	return [`<pre class="code"><code${cls}>${inner}</code></pre>`, i];
}

/** `>` survives escaping as `&gt;`, which is what the caller matched on. */
export function takeQuote(lines: string[], start: number): Block {
	const body: string[] = [];
	let i = start;
	for (; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (!line.startsWith("&gt;")) break;
		body.push(line.replace(/^&gt; ?/, ""));
	}
	return [`<blockquote><p>${renderInline(body.join(" ").trim())}</p></blockquote>`, i];
}

export function takeParagraph(lines: string[], start: number, stop: (l: string) => boolean): Block {
	const body: string[] = [];
	let i = start;
	for (; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (line.trim() === "" || (i > start && stop(line))) break;
		body.push(line.trim());
	}
	return [`<p>${renderInline(body.join(" "))}</p>`, i];
}
