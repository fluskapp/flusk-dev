/**
 * One project's row, computed. Split from project-scan.ts, which now only
 * finds the roots and their parts: turning parts into a summary is where the
 * attention rules, the spend comparison and the worktree lookup live, and all
 * three change for reasons that have nothing to do with scanning a directory.
 */
import type { ProjectSummary } from "./api-types.js";
import { computeAttention } from "./project-attention.js";
import type { ProjectParts } from "./project-scan.js";
import { lastActivity, liveRuns, projectSpend } from "./project-scan.js";
import { mainRepoName } from "../profile/worktree.js";

export function summarize(p: ProjectParts, nowMs: number, median?: number): ProjectSummary {
	const at = lastActivity(p);
	const live = liveRuns(p);
	const costUsd = Number(projectSpend(p).toFixed(6));
	const input = {
		journals: p.journals,
		sessions: p.sessions,
		liveRuns: live,
		costUsd,
		...(at !== undefined ? { lastActivity: at } : {}),
	};
	// One stat + one small read per project, not two.
	const parent = mainRepoName(p.path);
	return {
		name: p.name,
		...(parent === null ? {} : { worktreeOf: parent }),
		path: p.path,
		kind: p.kind,
		runs: p.journals.length + p.sessions.length,
		liveRuns: live,
		sessions: p.sessions.length,
		docs: p.docs.length,
		costUsd,
		...(at !== undefined ? { lastActivity: at } : {}),
		attention: computeAttention(input, {
			nowMs,
			...(median !== undefined ? { medianCostUsd: median } : {}),
		}),
	};
}
