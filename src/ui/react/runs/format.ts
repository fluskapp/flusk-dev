/**
 * The formatting vocabulary the legacy client-core.ts gave every view —
 * ported once, imported by all three editor windows (runs, projects, docs).
 */
export function fmtCost(n?: number | null): string {
	return `$${Math.round((n ?? 0) * 10000) / 10000}`;
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

export function base(p?: string | null): string {
	const parts = String(p ?? "").split("/");
	return parts[parts.length - 1] ?? String(p);
}

/** Session key, harness journal, or indexed document — decided by shape. */
export function refKind(ref: string): "session" | "journal" | "doc" {
	if (/\.jsonl$/.test(ref)) return "session";
	if (ref.includes("/docs/runs/")) return "journal";
	if (/\.md$/.test(ref)) return "doc";
	return "journal";
}

/**
 * A ref travels inside one path segment ($runId), so it is URI-encoded when
 * the link is built; decoding tolerates a router that already decoded once
 * (decoding a plain ref is the identity).
 */
export function decodeRef(param: string): string {
	try {
		return decodeURIComponent(param);
	} catch {
		return param;
	}
}
