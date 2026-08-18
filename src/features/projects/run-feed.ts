/**
 * The unified run feed: flusk's own sessions and the harnesses' run journals
 * in one newest-first list. "What ran recently, and how did it go?" is one
 * question, so the dashboard must not make you ask it twice.
 */
import { basename } from "node:path";
import type { FluskConfig } from "../../platform/config/types.js";
import { ageStatus } from "../run/liveness.js";
import { statusToVerdict } from "../run/verdict.types.js";
import type { RunRow } from "./projects.types.js";
import type { Journal } from "./journal-scan.repository.js";
import { collectParts, type ProjectParts } from "./project-scan.repository.js";

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

function rowsFor(p: ProjectParts, nowMs: number): RunRow[] {
	// Liveness is VERIFIED, never taken on trust: a run whose file stopped
	// being written an hour ago is stalled, and reads dim instead of pulsing
	// (features/run/liveness.ts — the one rule every surface counts with).
	const sessions: RunRow[] = p.sessions.map((s) => {
		const status = ageStatus(s.status, s.updatedAtMs, nowMs);
		// A demoted row cannot keep the recorded verdict: that one says "live".
		const kept = status === s.status ? s.verdict : undefined;
		return {
			id: s.sessionId,
			kind: "session" as const,
			project: p.name,
			title: s.task,
			status,
			at: new Date(s.updatedAtMs).toISOString(),
			ref: s.key,
			costUsd: s.costUsd,
			verdict: kept ?? statusToVerdict(status),
			...(s.filesTouched !== undefined ? { filesTouched: s.filesTouched } : {}),
		};
	});
	const journals: RunRow[] = p.journals.map((j) => {
		const progress = journalProgress(j);
		const status = ageStatus(j.status, j.mtimeMs, nowMs);
		return {
			id: basename(j.path).replace(/\.md$/, ""),
			kind: "journal",
			project: p.name,
			title: j.title.replace(/^Run:\s*/, ""),
			status,
			at: j.date,
			ref: j.path,
			verdict: statusToVerdict(status),
			...(progress !== undefined ? { progress } : {}),
			...(j.costUsd !== undefined ? { costUsd: j.costUsd } : {}),
		};
	});
	return [...sessions, ...journals];
}

export function runFeed(
	cfg: FluskConfig,
	opts: RunFeedOpts = {},
	nowMs: number = Date.now(),
): RunRow[] {
	const limit = Math.max(0, opts.limit ?? DEFAULT_LIMIT);
	const rows: RunRow[] = [];
	for (const p of collectParts(cfg)) {
		if (opts.project !== undefined && p.name !== opts.project) continue;
		rows.push(...rowsFor(p, nowMs));
	}
	rows.sort((a, b) => b.at.localeCompare(a.at));
	// Running rows ride ahead of the cap: a live run that started before the
	// newest N finished ones must not be cut from the list whose Live section
	// exists to show it — the toolbar's "live" count links here.
	const live = rows.filter((r) => r.status === "running");
	const rest = rows.filter((r) => r.status !== "running");
	return [...live, ...rest].slice(0, limit);
}
