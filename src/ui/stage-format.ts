/**
 * The packed stage encoding a harness writes, decoded for display.
 *
 * A journal stores each stage as "status|duration|detail" under a nested
 * `stages:` key. Flattened into a property table that reached the screen as
 * thirteen rows of "stages.gate" beside "running|0.0s|" — the storage format,
 * printed.
 *
 * This is the server-side half. client-stages.ts is the same decoding for
 * markup the browser builds; the two are separate because the client ships as
 * concatenated source strings rather than as modules, and a shared import
 * across that boundary does not exist. Both are tested against the same real
 * journal values so they cannot drift apart silently.
 */
import { escapeHtml } from "./markdown-inline.js";

export interface Stage {
	status: string;
	duration: string;
	detail: string;
}

const ICON: Record<string, string> = {
	done: "✓", ok: "✓", pass: "✓", passed: "✓", completed: "✓",
	failed: "✗", error: "✗", blocked: "✗",
	running: "●", active: "●",
	skipped: "⊘", skip: "⊘",
	pending: "○", queued: "○",
};

const CLASS: Record<string, string> = {
	done: "completed", ok: "completed", pass: "completed", passed: "completed",
	running: "running", failed: "error", error: "error",
	skipped: "stopped", skip: "stopped", pending: "",
};

/** Every field is optional; a stage may be named before it has a status. */
export function parseStage(value: string): Stage {
	const parts = String(value ?? "").split("|");
	return {
		status: (parts[0] ?? "").trim(),
		duration: (parts[1] ?? "").trim(),
		detail: parts.slice(2).join("|").trim(),
	};
}

const lookup = (map: Record<string, string>, status: string, fallback: string): string => {
	const key = status.toLowerCase();
	return Object.hasOwn(map, key) ? (map[key] ?? fallback) : fallback;
};

export const stageIcon = (status: string): string => lookup(ICON, status, "○");
export const stageClass = (status: string): string => lookup(CLASS, status, "");

/**
 * "0.0s" is what the harness writes for a stage that has not started. Printing
 * it claims the work ran and cost nothing, so it is dropped; the glyph already
 * carries "pending" and the full value stays in the tooltip.
 */
function durationHtml(s: Stage): string {
	if (s.duration === "" || s.duration === "0.0s") return "";
	return ` <span class="stg-t">${escapeHtml(s.duration)}</span>`;
}

export function stageChip(name: string, s: Stage): string {
	const title = [name, s.status || "unknown", s.duration, s.detail]
		.filter((p) => p !== "")
		.join(" · ");
	return (
		`<span class="stage ${stageClass(s.status)}" title="${escapeHtml(title)}">` +
		`<span class="stg-i">${stageIcon(s.status)}</span>${escapeHtml(name)}${durationHtml(s)}</span>`
	);
}

export function stagePipeline(stages: { name: string; stage: Stage }[]): string {
	return `<div class="stg-row">${stages.map((s) => stageChip(s.name, s.stage)).join("")}</div>`;
}

/** Only ever links out to http(s): a journal is a file some harness wrote. */
export function safeUrl(value: string): string | null {
	return /^https?:\/\/\S+$/.test(value) ? value : null;
}

/**
 * A pull request is an action, not a string to copy. Everything else that is a
 * URL still becomes clickable, but keeps its text.
 */
export function valueHtml(key: string, value: string): string {
	const url = safeUrl(value);
	if (url === null) return escapeHtml(value);
	const attrs = `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"`;
	if (key === "pr") {
		const num = /\/pull\/(\d+)/.exec(url);
		return `<a class="act" ${attrs}>Open PR${num === null ? "" : ` #${num[1]}`}</a>`;
	}
	return `<a ${attrs}>${escapeHtml(url)}</a>`;
}
