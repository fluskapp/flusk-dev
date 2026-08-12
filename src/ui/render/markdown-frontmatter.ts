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
import { parseStage, stagePipeline, valueHtml } from "../../features/projects/stage-format.js";

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

/**
 * Scalar keys, one level of `parent.child` nesting, wrapped values joined.
 *
 * Quotes are stripped only AFTER the continuation lines are joined. A value
 * that wraps opens its quote on one line and closes it on another, so
 * unquoting each line as it arrived saw an opening quote with no closing one,
 * declined, and left BOTH quotes embedded in the joined result — which turned
 * a stage status of `failed` into `"failed` and quietly rendered a failure as
 * pending.
 */
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
		const value = (m[3] ?? "").trim();
		// An empty value opens a nested block; test it before unquoting, since
		// `key: ""` is a value and `key:` is a parent.
		if (!nested && value === "") {
			parent = name;
			continue;
		}
		if (!nested) parent = "";
		rows.push({ key: nested && parent !== "" ? `${parent}.${name}` : name, value });
	}
	for (const r of rows) r.value = unquote(r.value);
	return rows;
}

const STAGE_PREFIX = "stages.";

export function renderFrontmatter(src: string): FrontmatterHtml {
	const block = frontmatterBlock(src);
	if (block === null) return EMPTY;
	const rows = frontmatterRows(block);
	if (rows.length === 0) return EMPTY;

	// The stage keys become ONE pipeline row. Left as ordinary properties they
	// were the majority of the table — thirteen rows of the storage encoding,
	// pushing the values a reader came for off the bottom of the screen.
	const stages = rows
		.filter((r) => r.key.startsWith(STAGE_PREFIX))
		.map((r) => ({ name: r.key.slice(STAGE_PREFIX.length), stage: parseStage(r.value) }));
	const plain = rows.filter((r) => !r.key.startsWith(STAGE_PREFIX));

	const body = plain
		.map(
			(r) =>
				`<tr><th class="fm-k">${escapeHtml(r.key)}</th>` +
				`<td class="fm-v">${valueHtml(r.key, r.value)}</td></tr>`,
		)
		.join("");
	const stageRow =
		stages.length === 0
			? ""
			: `<tr><th class="fm-k">stages</th><td class="fm-v">${stagePipeline(stages)}</td></tr>`;
	return {
		html: `<table class="fm"><tbody>${body}${stageRow}</tbody></table>`,
		keys: plain.length + (stages.length === 0 ? 0 : 1),
	};
}
