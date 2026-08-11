/**
 * The unified run feed: ah's own sessions and the harnesses' run journals
 * in one newest-first list. "What ran recently, and how did it go?" is one
 * question, so the dashboard must not make you ask it twice.
 */
import { basename } from "node:path";
import type { AhConfig } from "../config/types.js";
import type { RunRow } from "./api-types.js";
import type { Journal } from "./journal-scan.js";
import { collectParts, type ProjectParts } from "./project-scan.js";

const DEFAULT_LIMIT = 100;
/** Stage statuses that count as finished when measuring progress. */
const DONE = new Set(["done", "ok", "pass", "passed", "skip", "skipped"]);

export interface RunFeedOpts {
	project?: string;
	limit?: number;
}

/** "8/13 · gate" — finished stages, total, and the stage it is sitting on. */
function journalProgress(j: Journal): string | undefined {
	if (j.stages.length === 0) return undefined;
	const done = j.stages.filter((s) => DONE.has(s.status.toLowerCase())).length;
	return `${done}/${j.stages.length} · ${j.stages.at(-1)?.name ?? ""}`;
}

function rowsFor(p: ProjectParts): RunRow[] {
	const sessions: RunRow[] = p.sessions.map((s) => ({
		id: s.sessionId,
		kind: "session",
		project: p.name,
		title: s.task,
		status: s.status,
		at: new Date(s.updatedAtMs).toISOString(),
		ref: s.key,
		costUsd: s.costUsd,
	}));
	const journals: RunRow[] = p.journals.map((j) => {
		const progress = journalProgress(j);
		return {
			id: basename(j.path).replace(/\.md$/, ""),
			kind: "journal",
			project: p.name,
			title: j.title.replace(/^Run:\s*/, ""),
			status: j.status,
			at: j.date,
			ref: j.path,
			...(progress !== undefined ? { progress } : {}),
		};
	});
	return [...sessions, ...journals];
}

export function runFeed(cfg: AhConfig, opts: RunFeedOpts = {}): RunRow[] {
	const limit = Math.max(0, opts.limit ?? DEFAULT_LIMIT);
	const rows: RunRow[] = [];
	for (const p of collectParts(cfg)) {
		if (opts.project !== undefined && p.name !== opts.project) continue;
		rows.push(...rowsFor(p));
	}
	return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
