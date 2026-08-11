/**
 * YAML frontmatter as a compact definition table.
 *
 * `renderMarkdown` strips frontmatter, which left a journal's metadata — its
 * title, status, PR and per-stage results — either invisible or dumped as raw
 * YAML above the document. This renders the same block as key/value rows so a
 * run view can show it the way an IDE shows file properties.
 *
 * Only the shape harness journals actually write is understood: scalar keys
 * plus one level of indented nesting, and values that wrap onto later lines.
 */
import { escapeHtml } from "./markdown-inline.js";

export interface FrontmatterHtml {
	/** A `<table class="fm">`, or "" when the document has no frontmatter. */
	html: string;
	/** How many rows the table has; 0 means nothing was rendered. */
	keys: number;
}

interface Row {
	key: string;
	value: string;
}

const KEY = /^(\s*)([\w.$/-]+):\s*(.*)$/;

const EMPTY: FrontmatterHtml = { html: "", keys: 0 };

/** The text between the opening `---` and its closing fence, or null. */
export function frontmatterBlock(src: string): string | null {
	if (typeof src !== "string" || !src.startsWith("---")) return null;
	const first = src.indexOf("\n");
	if (first === -1 || src.slice(3, first).trim() !== "") return null;
	const end = src.indexOf("\n---", first);
	return end === -1 ? null : src.slice(first + 1, end);
}

function unquote(value: string): string {
	const t = value.trim();
	const quoted = t.length > 1 && (t.startsWith('"') || t.startsWith("'"));
	return quoted && t.endsWith(t.charAt(0)) ? t.slice(1, -1) : t;
}

/** Scalar keys, one level of `parent.child` nesting, wrapped values joined. */
export function frontmatterRows(block: string): Row[] {
	const rows: Row[] = [];
	let parent = "";
	for (const line of block.split("\n")) {
		if (line.trim() === "") continue;
		const m = KEY.exec(line);
		const last = rows[rows.length - 1];
		if (!m) {
			if (last !== undefined) last.value = `${last.value} ${line.trim()}`.trim();
			continue;
		}
		const nested = (m[1] ?? "").length > 0;
		const name = m[2] ?? "";
		const value = unquote(m[3] ?? "");
		if (!nested && value === "") {
			parent = name;
			continue;
		}
		if (!nested) parent = "";
		rows.push({ key: nested && parent !== "" ? `${parent}.${name}` : name, value });
	}
	return rows;
}

export function renderFrontmatter(src: string): FrontmatterHtml {
	const block = frontmatterBlock(src);
	if (block === null) return EMPTY;
	const rows = frontmatterRows(block);
	if (rows.length === 0) return EMPTY;
	const body = rows
		.map(
			(r) =>
				`<tr><th class="fm-k">${escapeHtml(r.key)}</th>` +
				`<td class="fm-v">${escapeHtml(r.value)}</td></tr>`,
		)
		.join("");
	return { html: `<table class="fm"><tbody>${body}</tbody></table>`, keys: rows.length };
}
