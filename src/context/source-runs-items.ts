/**
 * The three blocks a resume actually needs from the run it continues.
 *
 * Re-quoting the transcript would be wrong twice over. src/cli/resume-cmd.ts
 * hands the same sessionPath to createAgent, so the model is already being
 * replayed those turns — quoting them pays twice for text it receives anyway;
 * and nothing on that path scrubs, so the quote would carry unscrubbed tool
 * output into a prompt. What is genuinely missing at turn one is smaller and
 * sharper: where the run stopped, the handoff it wrote for itself, and the
 * work it had already done.
 *
 * SCORE, and what it means here: 0..1, "how likely this block is to change
 * what the next turn does" — the same scale every other source must use, since
 * a score meaning something different per source silently reorders the whole
 * context. A resume has exactly ONE prior run, so nothing competes inside this
 * source: the constants are per ROLE, not per relevance. Where the run stopped
 * outranks its handoff, which outranks the digest of work the block partly
 * states already. PATH_BONUS is the only task-dependent term.
 *
 * Items are marked untrusted in the TITLE. The assembler delimits and labels
 * gathered content (L3); fencing it here as well would fence it twice.
 */
import { estimateTokens } from "../history/budget.js";
import { refLabel } from "../history/citation.js";
import type { HistoryCard } from "../history/types.js";
import { stateBody, stubCard } from "./source-runs-body.js";
import type { RunFile } from "./source-runs-locate.js";
import type { ContextItem } from "./types.js";

const UNTRUSTED = "[untrusted: prior-run transcript]";
const PATH_BONUS = 0.05;
const SCORE = { state: 0.92, handoff: 0.84, digest: 0.55 } as const;

export interface RunItemsInput {
	/** "<repo-slug>/<file>.jsonl" — both the citation and the id suffix. */
	key: string;
	file: RunFile | null;
	card: HistoryCard | undefined;
	/** Repo-relative paths the new task names, from ContextRequest.paths. */
	taskPaths: string[];
}

const touchesTask = (paths: string[], taskPaths: string[]): boolean =>
	taskPaths.some((p) => paths.includes(p));

/**
 * `tokens` counts exactly what will be rendered — heading, why line, body —
 * with the one estimator in src/history/budget.ts. No `path`: the transcript
 * lives under ~/.flusk, outside the repo, and an absolute path may not reach a
 * rendered field; the citation inside `why` is how a reader opens it.
 */
function make(
	kind: string,
	key: string,
	heading: string,
	body: string,
	why: string,
	score: number,
): ContextItem {
	const title = `Prior run — ${heading} ${UNTRUSTED}`;
	return {
		id: `runs:${kind}:${key}`,
		source: "runs",
		title,
		body,
		why,
		tokens: estimateTokens(`${title}\n${why}\n${body}`),
		score,
		tier: "ranked",
	};
}

/** Sorted by score, then by id — never by discovery order (L5, invariant 14). */
export function buildRunItems(inp: RunItemsInput): ContextItem[] {
	const { key, file, card } = inp;
	const cite = refLabel(card ?? stubCard(key));
	const bonus = touchesTask(card?.paths ?? [], inp.taskPaths) ? PATH_BONUS : 0;
	const items: ContextItem[] = [];
	const state = stateBody(file, card);
	if (state !== "")
		items.push(
			make(
				"state",
				key,
				"where it stopped",
				state,
				`Header and ending of ${cite}, the session this resume continues — the only record of where that run stopped and what it had already changed.`,
				SCORE.state + bonus,
			),
		);
	if (file?.handoff !== null && file?.handoff !== undefined)
		items.push(
			make(
				"handoff",
				key,
				"handoff it wrote for itself",
				file.handoff,
				`The last CompactionEntry.summary in ${cite} — the handoff that run wrote when its own context was rebuilt, quoted rather than re-derived.`,
				SCORE.handoff,
			),
		);
	if (card !== undefined && card.text !== "")
		items.push(
			make(
				"digest",
				key,
				"report, commands and files",
				card.text,
				`The history-index card for ${cite} built by sessionCards() (redacted, capped at 4000 chars): its closing report, the commands it ran and the files it touched.`,
				SCORE.digest + bonus,
			),
		);
	return items.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
