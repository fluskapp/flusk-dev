/**
 * Per-task-kind model benchmarks (linof learn.js parity). Scores live in
 * <ahHome>/benchmarks.json as { [kind]: { "provider/id": score } }.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TaskKind } from "../config/types.js";
import { ahHome } from "../session/paths.js";

export type Scores = Partial<Record<TaskKind, Record<string, number>>>;

const START = 0.5;
const MIN = 0.05;
const MAX = 1;
const REWARD = 0.05;
const PENALTY = 0.1;

export function scoresPath(): string {
	return join(ahHome(), "benchmarks.json");
}

/** Missing or malformed benchmarks file reads as empty scores. */
export async function loadScores(): Promise<Scores> {
	try {
		const raw = await readFile(scoresPath(), "utf8");
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
		return parsed as Scores;
	} catch {
		return {};
	}
}

export async function saveScores(scores: Scores): Promise<void> {
	const path = scoresPath();
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(scores, null, "\t")}\n`, "utf8");
}

/** Rewards (+0.05) or penalizes (−0.10) "provider/id" for a kind, clamped [0.05, 1]. */
export async function nudge(kind: TaskKind, key: string, good: boolean): Promise<Scores> {
	const scores = await loadScores();
	const byKind = scores[kind] ?? {};
	const current = byKind[key] ?? START;
	const next = current + (good ? REWARD : -PENALTY);
	byKind[key] = Math.min(MAX, Math.max(MIN, next));
	scores[kind] = byKind;
	await saveScores(scores);
	return scores;
}

/** Highest-scoring "provider/id" for a kind, or null when nothing is recorded. */
export function bestFor(kind: TaskKind, scores: Scores): string | null {
	const byKind = scores[kind];
	if (!byKind) return null;
	let best: string | null = null;
	let bestScore = Number.NEGATIVE_INFINITY;
	for (const [key, score] of Object.entries(byKind)) {
		if (score > bestScore) {
			best = key;
			bestScore = score;
		}
	}
	return best;
}
