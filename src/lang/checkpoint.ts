/**
 * A flow's crash log, WRITTEN.
 *
 * One append-only JSONL file per run under
 * `<ahHome>/flows/checkpoints/<runId>/steps.jsonl` — the same shape sessions
 * are stored in (src/session/entries.ts), for the same reason: a half-written
 * run is still readable, and `tail -f` is a valid way to watch one.
 *
 * A resume replays what already succeeded rather than re-running it, and picks
 * the run's spend up where it left off. Failed steps stay in the file — they
 * are the record — but never replay: a failure is the thing worth retrying.
 * Nothing here throws; losing a checkpoint costs a resume.
 */
import { appendFile, mkdir } from "node:fs/promises";
import {
	type CheckpointHead,
	type CheckpointLine,
	checkpointDir,
	checkpointPath,
	completed,
	readCheckpoint,
	spentSoFar,
} from "./checkpoint-read.js";
import type { FlowNode, NodeOutcome } from "./types.js";

export interface Checkpoint {
	runId: string;
	path: string;
	/** Node outcomes a resume may replay; empty for a fresh run. */
	done: Map<string, NodeOutcome>;
	/** Dollars this run already spent before the resume; 0 for a fresh run. */
	spent: number;
	save: (node: FlowNode, outcome: NodeOutcome) => Promise<void>;
	/** Anything that went wrong while checkpointing — advisory, never fatal. */
	notes: string[];
}

export interface CheckpointOpts {
	runId: string;
	spec: string;
	task: string;
	/** Replay completed nodes from an earlier run with this id. */
	resume?: boolean;
}

/** Opens (or reopens) a run's log and writes its header line. */
export async function openCheckpoint(opts: CheckpointOpts): Promise<Checkpoint> {
	const path = checkpointPath(opts.runId);
	const notes: string[] = [];
	const earlier = opts.resume === true ? await readCheckpoint(opts.runId) : [];
	const done = opts.resume === true ? completed(earlier) : new Map();
	const spent = spentSoFar(earlier);
	const write = async (line: CheckpointLine): Promise<void> => {
		try {
			await mkdir(checkpointDir(opts.runId), { recursive: true });
			await appendFile(path, `${JSON.stringify(line)}\n`, "utf8");
		} catch (e) {
			notes.push(`checkpoint not written: ${e instanceof Error ? e.message : String(e)}`);
		}
	};
	const head: CheckpointHead = {
		type: "run",
		runId: opts.runId,
		spec: opts.spec,
		task: opts.task,
		at: new Date().toISOString(),
	};
	await write(head);
	return {
		runId: opts.runId,
		path,
		done,
		spent,
		notes,
		save: (node, outcome) =>
			write({
				type: "step",
				nodeId: node.id,
				kind: node.kind,
				at: new Date().toISOString(),
				ok: outcome.ok,
				output: outcome.output,
				promptTokens: outcome.promptTokens,
				costUsd: outcome.costUsd ?? 0,
				...(outcome.note === undefined ? {} : { note: outcome.note }),
			}),
	};
}
