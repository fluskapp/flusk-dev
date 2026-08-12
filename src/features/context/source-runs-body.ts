/**
 * The body of the one block a resume cannot do without: where the prior run
 * stopped, in the fewest lines that are still checkable.
 *
 * Every line here is a FACT the resume would otherwise have to re-derive by
 * reading its own transcript — the task as it was phrased, the branch it ran
 * on, the RunEndReason, whether anything green ran after the last edit, and
 * which files were already written. The verify verdict is not recomputed:
 * `outcome === "verified"` is deliberately expensive to earn in
 * src/history/source-sessions.ts (ended `completed`, the stats entry says so,
 * and a verify command exited zero AFTER the last edit), so restating it here
 * would be a second, weaker judge of the same question.
 *
 * When a half is missing the line says so ("unknown — no history card"), which
 * is the difference between a run that wrote nothing and a run whose record we
 * could not read (L2).
 */
import type { HistoryCard } from "../history/types.js";
import type { RunFile } from "./source-runs-locate.repository.js";

const NO_CARD = "unknown — no history card for this session";

/** refLabel only reads `kind` and `ref` for a session; the rest is filler. */
export const stubCard = (key: string): HistoryCard => ({
	id: `session:${key}`,
	kind: "session",
	project: "",
	title: "",
	text: "",
	at: "",
	paths: [],
	outcome: "unknown",
	ref: key,
});

function verifyLine(card: HistoryCard | undefined): string {
	if (card === undefined) return NO_CARD;
	return card.outcome === "verified"
		? "yes — a verify command exited zero after the last edit"
		: "no — nothing green ran after the last edit";
}

/** Redacted upstream: `file` by readRunFile, `card` by sessionCards(). */
export function stateBody(file: RunFile | null, card: HistoryCard | undefined): string {
	const lines: string[] = [];
	if (file !== null) {
		lines.push(`task: ${file.task}`);
		if (file.taskKind !== null) lines.push(`kind: ${file.taskKind}`);
		if (file.gitBranch !== null) lines.push(`branch: ${file.gitBranch}`);
		const ended = file.unfinished
			? "no stats entry — the run was still going"
			: (file.reason ?? "unrecorded");
		lines.push(`ended: ${ended}`);
	} else if (card !== undefined) lines.push(`task: ${card.title}`);
	lines.push(`outcome: ${card?.outcome ?? NO_CARD}`);
	lines.push(`verified after the last edit: ${verifyLine(card)}`);
	if (card !== undefined) {
		const paths = card.paths;
		lines.push(`files written: ${paths.length === 0 ? "none recorded" : paths.join(", ")}`);
	}
	return lines.join("\n");
}
