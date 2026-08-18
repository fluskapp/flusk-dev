/**
 * The formatting vocabulary the legacy client-core.ts gave every view —
 * ported once, imported by all three editor windows (runs, projects, docs).
 */
import type { Verdict } from "../../../features/run/verdict.types.js";

export function fmtCost(n?: number | null): string {
	return `$${Math.round((n ?? 0) * 10000) / 10000}`;
}

/** Running cost per transcript item, prefix-summed client-side; undefined
 * for items that carry no usage (user turns, compactions, old files). A usage
 * missing costUsd (foreign/hand-edited JSONL) contributes 0, never NaN. */
export function cumulativeCosts(
	items: ReadonlyArray<{ usage?: { costUsd: number }; [k: string]: unknown }>,
): Array<number | undefined> {
	let sum = 0;
	return items.map((it) => {
		if (it.usage === undefined) return undefined;
		sum += Number.isFinite(it.usage.costUsd) ? it.usage.costUsd : 0;
		return sum;
	});
}

/** The trust line's honest-absence copy. "Predates gate recording" asserted a
 * false history for live, --no-verify, and budget-stopped runs — the render
 * layer cannot tell those apart, so a missing record is stated neutrally. */
export function gateAbsence(
	source: "entry" | "facts" | "memory-off" | "none",
	verdict: Verdict,
): string | null {
	if (source === "memory-off") return "unverified — memory disabled";
	if (source !== "none") return null;
	return verdict === "live" ? "gate pending — run in progress" : "no gate record for this session";
}

export function fmtTime(iso?: string | null): string {
	if (iso === undefined || iso === null || iso === "") return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return String(iso);
	return d.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** "blocked" gets its own class: the attention rules rate it MEDIUM, so
 * painting it the same red as a failure makes the two views contradict. */
export function statusClass(s?: string): string {
	if (s === "done" || s === "completed" || s === "ok" || s === "passed") return "completed";
	if (s === "failed" || s === "error") return "error";
	if (s === "blocked") return "blocked";
	if (s === "running" || s === "active") return "running";
	return "stopped";
}

/** Verdict → .sys-pill modifier: live takes the running (accent) treatment,
 * none the dim/off one; ok/warn/err are themselves. */
export function verdictClass(v?: Verdict): "ok" | "warn" | "err" | "run" | "dim" {
	if (v === "live") return "run";
	if (v === undefined || v === "none") return "dim";
	return v;
}

export function base(p?: string | null): string {
	const parts = String(p ?? "").split("/");
	return parts[parts.length - 1] ?? String(p);
}

/** Session key, live run id, harness journal, or indexed document — decided
 * by shape. Live ids are the 8-hex tokens launch.repository.ts mints. */
export function refKind(ref: string): "session" | "live" | "journal" | "doc" {
	if (/\.jsonl$/.test(ref)) return "session";
	if (/^[0-9a-f]{8}$/.test(ref)) return "live";
	if (ref.includes("/docs/runs/")) return "journal";
	if (/\.md$/.test(ref)) return "doc";
	return "journal";
}

/**
 * A ref travels inside one path segment ($runId): the ROUTER percent-encodes
 * it when a link is built and decodes it once on match — callers pass the raw
 * ref, never a pre-encoded one. Decoding here is the identity for a plain ref
 * and peels the leftover layer off a stale, pre-fix double-encoded link.
 */
export function decodeRef(param: string): string {
	try {
		return decodeURIComponent(param);
	} catch {
		return param;
	}
}
