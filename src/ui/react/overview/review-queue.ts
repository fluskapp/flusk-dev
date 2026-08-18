/**
 * Review-queue derivation, pure: which finished runs still need a human, in
 * what order, minus the ones the human parked. Retries of one task stack into
 * a single group (the JetBrains inspector idiom: one row, a count), and Park
 * is keyed group → newest at, so a group that produces NEW activity (a fresh
 * retry) reappears — parking dismisses a version of a task, never the task.
 */
import type { RunRow } from "../../../features/projects/runs.functions.js";
import { statusToVerdict, type Verdict } from "../../../features/run/verdict.types.js";

/** localStorage key (client-tree.ts "flusk-side-open" / Tabs.tsx "flusk-tabs" precedent). */
export const PARK_KEY = "flusk-review-park";

/** group key → the group's newest `at` when it was parked. */
export type ParkMap = Record<string, string>;

/** Retries share (project, normalized title): five attempts, one queue row. */
export const groupKey = (r: RunRow): string =>
	`${r.project}\u0000${r.title.trim().toLowerCase().replace(/\s+/g, " ")}`;

/** One queue row: the group's newest member, wearing the attempt count. */
export interface ReviewGroup extends RunRow {
	attempts: number;
}

/** Tolerant parse: null, garbage, arrays, and non-string values all → clean map. */
export function parseParkMap(raw: string | null): ParkMap {
	try {
		const v: unknown = JSON.parse(raw ?? "{}");
		if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
		const out: ParkMap = {};
		for (const [k, at] of Object.entries(v)) if (typeof at === "string") out[k] = at;
		return out;
	} catch {
		return {};
	}
}

/** The row's verdict, with the native-scanner fallback (B1 §6.1) applied once. */
export const rowVerdict = (r: RunRow): Verdict => r.verdict ?? statusToVerdict(r.status);

/** Attention order: human-judgment rows first, hard failures next, unknowns,
 * then clean runs that merely touched files. Warn BEFORE err is deliberate:
 * an err run announces itself — it broke; a warn run completed and claims
 * success while a gate or stop condition disputes it, which is exactly where
 * an unreviewed merge does damage. Review urgency, not severity. */
const RANK: Record<Verdict, number> = { warn: 0, err: 1, none: 2, ok: 3, live: 4 };
export const verdictRank = (v: Verdict): number => RANK[v];

/** Membership: finished ∧ (verdict ∈ {warn, err} ∨ touched files). "Finished"
 * is "not live" — there is no verdict to review while a run is still writing. */
export function needsReview(r: RunRow): boolean {
	const v = rowVerdict(r);
	if (v === "live") return false;
	return v === "warn" || v === "err" || (r.filesTouched ?? 0) > 0;
}

/** Hidden only while the stored `at` matches this row's — a retry un-parks. */
export const isParked = (r: RunRow, park: ParkMap): boolean => park[groupKey(r)] === r.at;

/** A new map with this row's GROUP parked at the row's `at`. Never mutates. */
export const parkEntry = (park: ParkMap, r: RunRow): ParkMap => ({ ...park, [groupKey(r)]: r.at });

/** Members stacked by group, each represented by its newest attempt. */
export function reviewGroups(rows: RunRow[]): ReviewGroup[] {
	const byKey = new Map<string, ReviewGroup>();
	for (const r of rows) {
		if (!needsReview(r)) continue;
		const g = byKey.get(groupKey(r));
		const newest = g === undefined || r.at.localeCompare(g.at) > 0 ? r : g;
		byKey.set(groupKey(r), { ...newest, attempts: (g?.attempts ?? 0) + 1 });
	}
	return [...byKey.values()];
}

/** The queue: groups, minus parked, ordered warn → err → none → ok, then
 * most files touched, then newest. */
export function reviewQueue(rows: RunRow[], park: ParkMap): ReviewGroup[] {
	return reviewGroups(rows)
		.filter((g) => !isParked(g, park))
		.sort(
			(a, b) =>
				verdictRank(rowVerdict(a)) - verdictRank(rowVerdict(b)) ||
				(b.filesTouched ?? 0) - (a.filesTouched ?? 0) ||
				b.at.localeCompare(a.at),
		);
}
