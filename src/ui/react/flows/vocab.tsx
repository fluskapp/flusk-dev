/**
 * The client vocabulary this window speaks: status classes, stage glyphs, the
 * cost/time formats, pills and section headers — ported from client-core.ts /
 * client-stages.ts so a flow run looks like every other run in the workbench.
 * Local to flows/ only because no shared React kit exists yet; the class names
 * and mappings are the shared contract, and this module should be hoisted the
 * moment a second window needs it.
 */
import type { ReactNode } from "react";

/** "blocked" gets its own class: the attention rules rate it MEDIUM, so
 * painting it the same red as a failure makes the two views contradict. */
export function statusClass(s: string): string {
	if (s === "done" || s === "completed" || s === "ok" || s === "passed") return "completed";
	if (s === "failed" || s === "error") return "error";
	if (s === "blocked") return "blocked";
	if (s === "running" || s === "active") return "running";
	return "stopped";
}

/** The glyph carries the status as well as the colour does: colour alone
 * fails anyone who cannot separate the greens from the reds. */
const STAGE_ICON: Record<string, string> = {
	done: "✓", ok: "✓", pass: "✓", passed: "✓", completed: "✓",
	failed: "✗", error: "✗", blocked: "✗",
	running: "●", active: "●",
	skipped: "⊘", skip: "⊘",
	pending: "○", queued: "○",
};

export function stageIcon(status: string): string {
	return STAGE_ICON[String(status || "").toLowerCase()] ?? "○";
}

const STAGE_CLASS: Record<string, string> = {
	done: "completed", ok: "completed", pass: "completed", passed: "completed",
	running: "running", failed: "error", error: "error",
	skipped: "stopped", skip: "stopped", pending: "",
};

export function stageClass(status: string): string {
	return STAGE_CLASS[String(status).toLowerCase()] ?? "";
}

export function fmtCost(n: number): string {
	return "$" + Math.round((n || 0) * 10000) / 10000;
}

export function fmtTime(iso: string): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return String(iso);
	return d.toLocaleString(undefined, {
		month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
	});
}

export function Pill({ status }: { status: string }) {
	return <span className={`pill ${statusClass(status)}`}>{status || "unknown"}</span>;
}

/** IntelliJ's group header: label, optional count, then its rows. */
export function Sec(props: { title: string; count?: number; children: ReactNode }) {
	return (
		<section className="sec">
			<h3>
				{props.title}
				{props.count === undefined ? null : <span className="count">{props.count}</span>}
			</h3>
			{props.children}
		</section>
	);
}
