import type { TaskKind } from "../platform/config/types.js";
import { loadScores, nudge } from "../features/provider/scores.repository.js";
import { scanSessions } from "../features/projects/scan.repository.js";

const KINDS = new Set<string>(["plan", "code", "review", "summarize"]);
const START = 0.5;

export interface FeedbackCmdOpts {
	good: boolean;
	out?: NodeJS.WritableStream;
}

/**
 * `flusk feedback good|bad` — scores the newest ROOT session that recorded a
 * routing kind (linof feedback parity): nudges benchmarks.json for that
 * kind's "provider/id" and prints the old → new score. Subagent sessions
 * (parentSession set) are skipped so the verdict lands on the run the user
 * is actually judging.
 */
export async function feedbackCmd(opts: FeedbackCmdOpts): Promise<void> {
	const out = opts.out ?? process.stdout;
	const latest = scanSessions().find(
		(s) => s.parentSession === undefined && s.taskKind !== undefined && KINDS.has(s.taskKind),
	);
	if (latest?.taskKind === undefined) {
		throw new Error("no session with a recorded task kind to score; run `flusk run` first");
	}
	const kind = latest.taskKind as TaskKind;
	const key = `${latest.model.provider}/${latest.model.id}`;
	const before = (await loadScores())[kind]?.[key] ?? START;
	const after = (await nudge(kind, key, opts.good))[kind]?.[key] ?? before;
	const verdict = opts.good ? "good" : "bad";
	out.write(`${verdict} → ${kind} ${key}: ${before.toFixed(2)} → ${after.toFixed(2)}\n`);
}
