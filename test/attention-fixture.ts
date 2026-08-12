/**
 * Fixtures for the attention rules: one clock, and the smallest journal and
 * session that satisfy their types. Shared by the rule tests so each file
 * stays about the rules.
 */
import type { Journal } from "../src/features/projects/journal-scan.repository.js";
import { type AttentionInput, computeAttention } from "../src/features/projects/project-attention.js";
import type { SessionSummary } from "../src/features/projects/scan.repository.js";

export const NOW = Date.parse("2026-08-11T00:00:00.000Z");
export const MIN = 60_000;
export const DAY = 24 * 60 * MIN;
export const ago = (ms: number): string => new Date(NOW - ms).toISOString();

export const journal = (over: Partial<Journal>): Journal => {
	const date = over.date ?? ago(5 * MIN);
	return {
		path: "/w/linof/docs/runs/r.md",
		harness: "linof",
		harnessRoot: "/w/linof",
		title: "Run: a thing",
		status: "done",
		stages: [],
		// Unless a test says otherwise the file was last written when it started
		// — the shape of a run that has appended nothing since.
		mtimeMs: Date.parse(date),
		...over,
		date,
	};
};

export const session = (over: Partial<SessionSummary>): SessionSummary => ({
	key: "plain-abcd1234/run.jsonl",
	repoRoot: "/w/plain",
	task: "a task",
	sessionId: "abcd1234",
	createdAt: ago(DAY),
	updatedAtMs: NOW,
	status: "completed",
	turns: 1,
	costUsd: 0,
	model: { provider: "fake", id: "fake-1", contextWindow: 1 },
	...over,
});

/** computeAttention on the fixed clock, with the rest of the input defaulted. */
export function run(
	over: Partial<AttentionInput>,
	median?: number,
): ReturnType<typeof computeAttention> {
	const input: AttentionInput = { journals: [], sessions: [], liveRuns: 0, costUsd: 0, ...over };
	return computeAttention(input, {
		nowMs: NOW,
		...(median !== undefined ? { medianCostUsd: median } : {}),
	});
}
