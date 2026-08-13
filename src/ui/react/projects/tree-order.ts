/**
 * How the project list is ordered before it is drawn (client-tree-order.ts).
 * Ordering is its own concern from rendering because it is the part with the
 * rules: worktrees sort directly under the repo they belong to, and projects
 * with nothing in them sink below a divider.
 */
import type { ProjectSummary } from "../../../features/projects/projects.functions.js";

/** Anything worth looking at today: work in flight, or something asking. */
export const isBusy = (p: ProjectSummary): boolean =>
	p.liveRuns > 0 || p.attention.length > 0 || p.runs > 0;

export function orderProjects(list: ProjectSummary[]): ProjectSummary[] {
	const busy = list.filter(isBusy);
	const quiet = list.filter((p) => !isBusy(p));
	const out: ProjectSummary[] = [];
	const placed = new Set<string>();
	for (const p of [...busy, ...quiet]) {
		if (placed.has(p.name) || p.worktreeOf !== undefined) continue;
		placed.add(p.name);
		out.push(p);
		for (const w of list) {
			if (w.worktreeOf === p.name && !placed.has(w.name)) {
				placed.add(w.name);
				out.push(w);
			}
		}
	}
	// A worktree whose main repo is not itself indexed still has to appear.
	for (const p of list) {
		if (!placed.has(p.name)) {
			placed.add(p.name);
			out.push(p);
		}
	}
	return out;
}

/**
 * Where the quiet run begins, read off the ORDERED list, not from a count: a
 * busy repo's worktrees sort directly beneath it, and counting busy projects
 * put the divider in the middle of them. A worktree belongs with its parent
 * whatever its own activity, so it is never the row the divider lands on.
 */
export function firstQuietIndex(shown: ProjectSummary[]): number {
	const busyNames = new Set(shown.filter(isBusy).map((p) => p.name));
	for (let i = 0; i < shown.length; i++) {
		const p = shown[i];
		if (p === undefined || isBusy(p)) continue;
		if (p.worktreeOf !== undefined && busyNames.has(p.worktreeOf)) continue;
		return i;
	}
	return -1;
}
