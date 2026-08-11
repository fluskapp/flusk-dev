/**
 * A flow's crash log, READ.
 *
 * The same JSONL file checkpoint.ts writes, turned back into answers: what each
 * node last did successfully (the state a resume starts from), and what the run
 * had already spent (the tally a resume owes). The Flows panel reads these
 * files too — they are the only record that keeps every step's OUTPUT.
 *
 * A truncated or corrupt line is skipped, never fatal: a crash mid-write leaves
 * exactly one partial line and the rest of the run still counts.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ahHome } from "../session/paths.js";
import type { NodeKind, NodeOutcome } from "./types.js";

export interface CheckpointHead {
	type: "run";
	runId: string;
	spec: string;
	task: string;
	at: string;
}

export interface CheckpointStep {
	type: "step";
	nodeId: string;
	kind: NodeKind;
	at: string;
	ok: boolean;
	output: string;
	promptTokens: number;
	costUsd: number;
	note?: string;
}

export type CheckpointLine = CheckpointHead | CheckpointStep;

/** Filesystem-safe: a run id reaches this from a flow name and a timestamp. */
const safe = (runId: string): string => runId.replace(/[^\w.-]+/g, "-").slice(0, 120) || "run";

export const checkpointDir = (runId: string): string =>
	join(ahHome(), "flows", "checkpoints", safe(runId));

export const checkpointPath = (runId: string): string => join(checkpointDir(runId), "steps.jsonl");

/** Every readable line. A truncated or corrupt line is skipped, not fatal. */
export async function readCheckpoint(runId: string): Promise<CheckpointLine[]> {
	let text: string;
	try {
		text = await readFile(checkpointPath(runId), "utf8");
	} catch {
		return [];
	}
	const out: CheckpointLine[] = [];
	for (const line of text.split("\n")) {
		if (line.trim() === "") continue;
		try {
			const parsed = JSON.parse(line) as CheckpointLine;
			if (parsed.type === "run" || parsed.type === "step") out.push(parsed);
		} catch {
			// A crash mid-write leaves one partial line; the rest still counts.
		}
	}
	return out;
}

/** What each node last did successfully — the state a resume starts from. */
export function completed(lines: CheckpointLine[]): Map<string, NodeOutcome> {
	const done = new Map<string, NodeOutcome>();
	for (const line of lines) {
		if (line.type !== "step") continue;
		if (!line.ok) {
			done.delete(line.nodeId);
			continue;
		}
		done.set(line.nodeId, {
			ok: true,
			output: line.output,
			promptTokens: line.promptTokens,
			costUsd: line.costUsd,
			...(line.note === undefined ? {} : { note: line.note }),
		});
	}
	return done;
}

/** What the run had already spent when it stopped — a resume owes this. */
export function spentSoFar(lines: CheckpointLine[]): number {
	return lines.reduce((sum, l) => (l.type === "step" ? sum + (l.costUsd || 0) : sum), 0);
}
