/**
 * Unordered/ordered list blocks. Nesting is by two-space indent only — the
 * dashboard renders hand-written notes, not the whole CommonMark grammar.
 */
import { renderInline } from "./markdown-inline.js";

export const LIST_RE = /^(\s*)(?:([-*])|(\d+)\.)\s+(.*)$/;
/** GFM task item. The text is already escaped, so the brackets survive. */
const TASK_RE = /^\[([ xX])\]\s+(.*)$/;

/** A checkbox is rendered disabled: a preview shows state, it does not edit. */
function taskHtml(m: RegExpExecArray): string {
	const done = (m[1] ?? " ").toLowerCase() === "x";
	return `<input type="checkbox" disabled${done ? " checked" : ""}> ${renderInline(m[2] ?? "")}`;
}

interface Item {
	depth: number;
	ordered: boolean;
	text: string;
}

function parseItem(line: string): Item | null {
	const m = LIST_RE.exec(line);
	if (!m) return null;
	return {
		depth: Math.floor((m[1] ?? "").length / 2),
		ordered: m[2] === undefined,
		text: m[4] ?? "",
	};
}

function renderLevel(items: Item[], start: number, depth: number): [string, number] {
	const ordered = items[start]?.ordered === true;
	let html = ordered ? "<ol>" : "<ul>";
	let i = start;
	while (i < items.length) {
		const it = items[i];
		if (!it || it.depth < depth || (it.depth === depth && it.ordered !== ordered)) break;
		i++;
		const task = TASK_RE.exec(it.text);
		let inner = task === null ? renderInline(it.text) : taskHtml(task);
		const next = items[i];
		if (next && next.depth > depth) {
			const [sub, after] = renderLevel(items, i, depth + 1);
			inner += sub;
			i = after;
		}
		html += `<li${task === null ? "" : ' class="task"'}>${inner}</li>`;
	}
	return [html + (ordered ? "</ol>" : "</ul>"), i];
}

/** `lines` is the run of consecutive list lines; returns one or more list tags. */
export function renderList(lines: string[]): string {
	const items: Item[] = [];
	for (const line of lines) {
		const it = parseItem(line);
		if (it) items.push(it);
	}
	if (items.length === 0) return "";
	const base = Math.min(...items.map((it) => it.depth));
	for (const it of items) it.depth -= base;
	let html = "";
	let i = 0;
	while (i < items.length) {
		const [chunk, next] = renderLevel(items, i, 0);
		html += chunk;
		i = next > i ? next : i + 1; // never spin on an item the level loop refused
	}
	return html;
}
