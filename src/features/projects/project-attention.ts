/**
 * The attention rules — the product idea behind the dashboard. The front
 * page must answer "what needs me?", so a project is described by the small
 * set of things that want a human, not by everything it contains.
 *
 * Two properties matter as much as the rules themselves:
 *  - Every row leads somewhere. A row with no `ref` renders an em-dash, is
 *    unclickable and is skipped by the j/k cursor, so it is noise wearing the
 *    costume of a finding.
 *  - The list must be able to reach zero. Rules are gated on RECENCY, not on
 *    existence: a failure nobody has touched in two days is history, and an
 *    archive that can never empty trains you to ignore the badge.
 *
 * Every rule lives in `computeAttention` on purpose: they are meant to be
 * read, argued with and tuned in one place, and tested one at a time.
 */
import type { Attention } from "./projects.types.js";
import { lastWriteMs, oldestLive, priciestSession } from "./attention-evidence.js";
import type { Journal } from "./journal-scan.repository.js";
import type { SessionSummary } from "./scan.repository.js";

const MINUTE_MS = 60_000;
/** A run still "running" this long after its last write is stalled, not busy. */
const STALL_MS = 60 * MINUTE_MS;
/** Past this, a finished-badly run is history rather than something to do. */
const RECENT_MS = 48 * 60 * MINUTE_MS;
export const STALE_MS = 14 * 24 * 60 * MINUTE_MS;
const SPEND_FACTOR = 3;
const ATTENTION_LIMIT = 12;

/** Just enough of a project to judge it; keeps this file free of scanning. */
export interface AttentionInput {
	journals: Journal[];
	sessions: SessionSummary[];
	liveRuns: number;
	costUsd: number;
	lastActivity?: string;
}

export interface AttentionCtx {
	nowMs: number;
	/** Median spend across projects; the runaway-spend rule needs it. */
	medianCostUsd?: number;
}

/** undefined below three spending projects — a median of two means nothing. */
export function medianSpend(costs: number[]): number | undefined {
	const xs = costs.filter((c) => c > 0).sort((a, b) => a - b);
	if (xs.length < 3) return undefined;
	const mid = Math.floor(xs.length / 2);
	const hi = xs[mid] ?? 0;
	return xs.length % 2 === 1 ? hi : ((xs[mid - 1] ?? 0) + hi) / 2;
}

function journalAttention(j: Journal, nowMs: number): Attention | null {
	const status = j.status.toLowerCase();
	const title = j.title.replace(/^Run:\s*/, "");
	const stage = j.stages.at(-1);
	const idleMs = nowMs - lastWriteMs(j);
	// Nothing has touched this run in two days: it is the archive, not the
	// inbox. Without this the list only ever grows.
	if (idleMs > RECENT_MS) return null;
	if (status === "failed" || status === "error")
		return { severity: "high", label: `run ${status}: ${title}`, ref: j.path };
	if (status === "running" && idleMs > STALL_MS)
		return { severity: "high", label: `run stalled >60m: ${title}`, ref: j.path };
	if (stage !== undefined && stage.status.toLowerCase() === "failed")
		return { severity: "high", label: `stage ${stage.name} failed: ${title}`, ref: j.path };
	if (status === "blocked")
		return { severity: "medium", label: `run blocked: ${title}`, ref: j.path };
	return null;
}

function sessionAttention(s: SessionSummary, nowMs: number): Attention | null {
	if (nowMs - s.updatedAtMs > RECENT_MS) return null;
	if (s.status === "error" || s.status === "stopped")
		return { severity: "high", label: `session ${s.status}: ${s.task}`, ref: s.key };
	// A session with no stats entry reads as "running" forever, so a run killed
	// overnight would otherwise pulse "live" in the sidebar and raise nothing.
	if (s.status === "running" && nowMs - s.updatedAtMs > STALL_MS)
		return { severity: "high", label: `session stalled >60m: ${s.task}`, ref: s.key };
	return null;
}

/** Every rule, highest severity first. Tune here, nowhere else. */
export function computeAttention(p: AttentionInput, ctx: AttentionCtx): Attention[] {
	const out: Attention[] = [];
	for (const j of p.journals) {
		const hit = journalAttention(j, ctx.nowMs);
		if (hit !== null) out.push(hit);
	}
	for (const s of p.sessions) {
		const hit = sessionAttention(s, ctx.nowMs);
		if (hit !== null) out.push(hit);
	}
	const stale = oldestLive(p.journals, p.sessions);
	if (
		p.liveRuns > 0 &&
		stale !== undefined &&
		p.lastActivity !== undefined &&
		ctx.nowMs - Date.parse(p.lastActivity) > STALE_MS
	)
		out.push({
			severity: "medium",
			label: "live runs but nothing has moved in 14 days",
			ref: stale,
		});
	const priciest = priciestSession(p.sessions);
	if (
		ctx.medianCostUsd !== undefined &&
		p.costUsd > SPEND_FACTOR * ctx.medianCostUsd &&
		priciest !== undefined
	)
		out.push({
			severity: "medium",
			label: `spend $${p.costUsd.toFixed(2)} is over 3× the median`,
			ref: priciest,
		});
	return dedupe([
		...out.filter((a) => a.severity === "high"),
		...out.filter((a) => a.severity === "medium"),
	]).slice(0, ATTENTION_LIMIT);
}

/**
 * A harness that retries the same PR ten times produces ten identical
 * failures; the newest one is the one that wants a human, and nine copies
 * of it are noise that pushes everything else off the list.
 */
function dedupe(list: Attention[]): Attention[] {
	const seen = new Set<string>();
	const out: Attention[] = [];
	for (const a of list) {
		if (seen.has(a.label)) continue;
		seen.add(a.label);
		out.push(a);
	}
	return out;
}
