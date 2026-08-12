/**
 * The handles the project-level attention rules point at.
 *
 * A rule that fires without a `ref` renders an em-dash, carries no
 * `data-open`, and is skipped by the j/k cursor — so it is noise dressed as a
 * finding. "Live runs but nothing has moved" and "spend is over 3× the
 * median" are both about a project rather than one row, so each has to name
 * the row that is the best evidence for it.
 */
import type { Journal } from "./journal-scan.repository.js";
import type { SessionSummary } from "./scan.repository.js";

/**
 * When a run last moved. `date` is what the harness declared at the top of
 * the journal; `mtimeMs` is when it last WROTE to it. A pipeline appending a
 * stage line every few minutes is plainly alive however old its start date
 * is, so "stalled" has to be measured from the write.
 */
export function lastWriteMs(j: Journal): number {
	const declared = Date.parse(j.date);
	return Math.max(j.mtimeMs, Number.isNaN(declared) ? 0 : declared);
}

/** The oldest thing still claiming to be in flight. */
export function oldestLive(journals: Journal[], sessions: SessionSummary[]): string | undefined {
	const live: { at: number; ref: string }[] = [
		...journals
			.filter((j) => j.status === "running")
			.map((j) => ({ at: lastWriteMs(j), ref: j.path })),
		...sessions
			.filter((s) => s.status === "running")
			.map((s) => ({ at: s.updatedAtMs, ref: s.key })),
	];
	return live.sort((a, b) => a.at - b.at)[0]?.ref;
}

/** The priciest recorded session — what a runaway spend figure is made of. */
export function priciestSession(sessions: SessionSummary[]): string | undefined {
	return [...sessions].sort((a, b) => b.costUsd - a.costUsd)[0]?.key;
}
