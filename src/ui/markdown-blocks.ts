/**
 * Multi-line block builders. Each takes the escaped line array plus the index
 * of its opening line and returns the HTML with the index to continue from.
 */
import { renderInline } from "./markdown-inline.js";

export type Block = [html: string, next: number];

const SEP_CELL = /^:?-+:?$/;

function cells(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((c) => c.trim());
}

/** A GFM separator row: `|---|:--:|`. Decides whether the line above is a table. */
export function isTableSeparator(line: string): boolean {
	if (!line.includes("-") || !line.includes("|")) return false;
	const parts = cells(line);
	return parts.length > 0 && parts.every((c) => SEP_CELL.test(c));
}

export function takeTable(lines: string[], start: number): Block {
	const head = cells(lines[start] ?? "").map((c) => `<th>${renderInline(c)}</th>`);
	let i = start + 2;
	const rows: string[] = [];
	for (; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (!line.includes("|") || line.trim() === "") break;
		rows.push(
			`<tr>${cells(line)
				.map((c) => `<td>${renderInline(c)}</td>`)
				.join("")}</tr>`,
		);
	}
	const body = rows.length > 0 ? `<tbody>${rows.join("")}</tbody>` : "";
	return [`<table><thead><tr>${head.join("")}</tr></thead>${body}</table>`, i];
}

/** Fenced code: contents stay verbatim, so no inline formatting is applied. */
export function takeCode(lines: string[], start: number, lang: string): Block {
	const body: string[] = [];
	let i = start + 1;
	for (; i < lines.length; i++) {
		if (/^\s*```/.test(lines[i] ?? "")) {
			i++;
			break;
		}
		body.push(lines[i] ?? "");
	}
	const cls = lang === "" ? "" : ` class="lang-${lang}"`;
	return [`<pre class="code"><code${cls}>${body.join("\n")}</code></pre>`, i];
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
