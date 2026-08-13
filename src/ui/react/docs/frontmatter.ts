/**
 * The frontmatter of an already-rendered document, as a property-table HTML
 * string (client-md.ts's fmTable). A string, not JSX, because it is
 * concatenated ahead of the server-rendered body inside the one `.md`
 * element — the reading-measure selectors there address DIRECT children, so
 * a wrapper node around either half would break them.
 *
 * The packed stage keys are lifted out and drawn as one pipeline row: left
 * as ordinary properties they filled the table with "stages.gate" /
 * "running|0.0s|" pairs, which is the file format leaking through the UI.
 */
import { stageClass, stageIcon, stagesOfFm, type StageView } from "../runs/stages.js";

export function esc(s: unknown): string {
	return String(s ?? "").replace(
		/[&<>"]/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
	);
}

/** Journals are files a harness wrote; only ever link out to http(s). */
export function safeUrl(u: unknown): string | null {
	return /^https?:\/\//.test(String(u)) ? String(u) : null;
}

/** " #188" when the URL names one, so the button says which PR it opens. */
export function prNumber(u: string): string {
	const m = /\/pull\/(\d+)/.exec(u);
	return m ? ` #${m[1]}` : "";
}

/** A URL becomes something you can click; a pull request becomes a labelled
 * button, because "open PR #187" is the action and the href never was. */
function fmValue(k: string, v: string): string {
	const url = safeUrl(v);
	if (url === null) return esc(v);
	if (k === "pr") {
		return `<a class="act" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open PR${prNumber(url)}</a>`;
	}
	return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
}

function stageChipHtml(s: StageView): string {
	const title = `${s.name} · ${s.status || "unknown"}${s.duration ? ` · ${s.duration}` : ""}${s.detail ? ` · ${s.detail}` : ""}`;
	const time = s.duration && s.duration !== "0.0s" ? ` <span class="stg-t">${esc(s.duration)}</span>` : "";
	return (
		`<span class="stage ${stageClass(s.status)}" title="${esc(title)}">` +
		`<span class="stg-i">${stageIcon(s.status)}</span>${esc(s.name)}${time}</span>`
	);
}

export function fmTable(fm: Record<string, string>): string {
	const keys = Object.keys(fm).filter((k) => !k.startsWith("stages."));
	const stages = stagesOfFm(fm);
	if (keys.length === 0 && stages === null) return "";
	const rows = keys.map(
		(k) => `<tr><th class="fm-k">${esc(k)}</th><td class="fm-v">${fmValue(k, fm[k] ?? "")}</td></tr>`,
	);
	if (stages !== null) {
		rows.push(
			`<tr><th class="fm-k">stages</th><td class="fm-v"><div class="stg-row">${stages
				.map(stageChipHtml)
				.join("")}</div></td></tr>`,
		);
	}
	return `<table class="fm"><tbody>${rows.join("")}</tbody></table>`;
}
