/**
 * History arranged as a narrative rather than a result list.
 *
 * Four questions, four rankings — which is why this is not one search with
 * four filters. "What shipped here" wants outcome-weighted precedent; "have I
 * tried this before" wants outcome-BLIND recall of runs about this exact task,
 * newest first, because a failed attempt at YOUR task beats a successful one
 * at somebody else's; "what are the house rules" wants writing, not work; and
 * "what goes wrong here" wants the ranker INVERTED, since the default weights
 * bury exactly the cards a trap is made of.
 *
 * A warning you cannot check is a rumour: every trap names what was attempted,
 * how it ended, and where to read it — no citation, no trap.
 */
import { type Bm25Index, buildIndex } from "./bm25.js";
import { trapLine } from "./citation.js";
import { selectDiverse } from "./diverse.js";
import { type RankOptions, search } from "./rank.js";
import { ATTEMPT, attempts, CONVENTION_FLOOR, conventions } from "./sections.js";
import { queryTerms } from "./tokenize.js";
import type { CardKind, HistoryCard, HistoryIndex, SearchHit, Walkthrough } from "./types.js";

export { refLabel, trapLine } from "./citation.js";
export { HOUSE_RULE, isHouseRule } from "./sections.js";
export { extractPaths } from "./task-paths.js";

import { extractPaths } from "./task-paths.js";

/** Section caps; `project` scopes the answer, omitted the whole corpus does. */
export interface WalkthroughOptions {
	now?: number;
	project?: string;
	precedent?: number;
	attempts?: number;
	conventions?: number;
	traps?: number;
}

/** Either shape a caller might hold: the stored index, or a built one. */
export type Searchable = Bm25Index | HistoryIndex;

const DEFAULTS = { precedent: 3, attempts: 4, conventions: 4, traps: 6 };
/** Candidates each section re-ranks; wide enough that filtering has choices. */
const POOL = 60;
/**
 * A failure warns only if it is lexically close to the best answer overall
 * (`work`) AND not far behind the best failure (`broke`). Measured on the real
 * corpus: the inverted weights otherwise promote any rolled-back commit that
 * shares a word with the task, and a run of off-topic warnings teaches the
 * reader to skip the section that matters most. No relevant failure, no trap.
 */
const TRAP_FLOOR = { work: 0.25, broke: 0.35 };
const WORK: CardKind[] = ["commit", "session", "journal"];
const RUNS: CardKind[] = ["session", "journal"];
const WRITING: CardKind[] = ["doc", "skill"];
/** Outcome-blind: "did I try THIS" must not prefer the attempts that worked. */
const FLAT = { verified: 1, shipped: 1, unknown: 1, blocked: 1, failed: 1 };
/** Inverted weights: ask the ranker for what it normally buries. */
const TRAPS = { failed: 2.2, blocked: 2, unknown: 0.6, shipped: 0.4, verified: 0.3 };
export const asBm25 = (i: Searchable): Bm25Index => ("postings" in i ? i : buildIndex(i.cards));

export function buildWalkthrough(
	index: Searchable,
	task: string,
	opts: WalkthroughOptions = {},
): Walkthrough {
	const bm = asBm25(index);
	const paths = extractPaths(bm, task);
	const limits = { ...DEFAULTS, ...opts };
	// `bm` by identity, never copied: fuzzy.ts caches its trigram index per
	// index object, and the four searches below must share that one build.
	const q = { text: task, paths, limit: POOL, project: opts.project };
	const find = (kinds: CardKind[], w?: RankOptions["outcomeWeights"]): SearchHit[] =>
		search(bm, { ...q, kinds }, { now: opts.now, outcomeWeights: w });
	const landed = (h: SearchHit): boolean =>
		h.card.outcome === "verified" || h.card.outcome === "shipped";
	const work = find(WORK);
	const runs = find(RUNS, FLAT);
	const top = (hs: SearchHit[]): number => Math.max(0, ...hs.map((h) => h.why.lexical));
	const broke = find(WORK, TRAPS).filter((h) => !landed(h) && h.card.outcome !== "unknown");
	const bar = Math.max(top(work) * TRAP_FLOOR.work, top(broke) * TRAP_FLOOR.broke);
	const bad = broke.filter((h) => h.why.lexical >= bar);
	const traps: string[] = [];
	for (const hit of selectDiverse(bad, limits.traps)) {
		const line = trapLine(hit.card);
		if (line !== "" && !traps.includes(line)) traps.push(line);
	}
	const home = opts.project ?? work[0]?.card.project ?? runs[0]?.card.project;
	return {
		precedent: selectDiverse(work.filter(landed), limits.precedent),
		attempts: attempts(runs, queryTerms(task).length, top(work) * ATTEMPT.floor, limits.attempts),
		conventions: conventions(find(WRITING), home, top(work) * CONVENTION_FLOOR, limits.conventions),
		traps,
	};
}
