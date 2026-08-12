/**
 * The history half of one build: decide whether history moved at all, and if
 * it did, fold in only the commits that are new.
 *
 * Two skips, at two granularities, because history is the cheap source to get
 * expensively wrong. HEAD unchanged means not a single COMMIT can be new, so
 * the git walk is not performed. It does NOT mean nothing is new: sessions,
 * journals and docs are refreshed off their own mtimes (src/history/corpus.ts)
 * and arrive between commits, so an injected corpus is still folded and only
 * the git walk is skipped. Gating the whole fold on HEAD left every agent run
 * and every doc out of the graph until somebody committed. The resume record's
 * sha set is what keeps the 800 already-folded commits from being re-folded;
 * only their weights would be affected, and those ACCUMULATE, so
 * double-counting is a real corruption rather than a wasted cycle.
 *
 * A DISCARDED RESUME IS A REBUILD, not an increment. The record and the graph
 * log are separate files, so a version bump or a corrupt record leaves the log
 * with weights the recount is about to produce again. When nothing is `seen`,
 * this pass is counting the whole history it can see, so its counts REPLACE the
 * stored weights instead of being added to them — otherwise a pair that
 * co-changed 7 times is persisted as 14, and again as 21 next time.
 *
 * Which is why the co-change read happens before the write: `coChangeEdges`
 * reads the stored weight and adds this pass's delta, so it must run against a
 * store that has not yet seen this pass's edges.
 */
import { gitCards } from "../history/source-git.repository.js";
import type { HistoryCard } from "../history/types.js";
import { coChangeEdges, coChangePairs } from "./build-cochange.js";
import { historyGraph } from "./build-history.repository.js";
import type { Ids } from "./ids.js";
import type { GraphResume } from "./state.repository.js";
import type { GraphEdge, GraphNode, GraphStore } from "./types.js";

export interface HistoryFold {
	nodes: GraphNode[];
	edges: GraphEdge[];
	commitsIndexed: number;
	commitsSkipped: number;
}

const empty = (skipped: number): HistoryFold => ({
	nodes: [],
	edges: [],
	commitsIndexed: 0,
	commitsSkipped: skipped,
});

/**
 * `head` is the current HEAD (null when this is not a git checkout); `resume`
 * is mutated with the shas folded in, so the caller saves it afterwards.
 * `cards` is injected: the dashboard already has an index of them.
 */
export async function foldHistory(
	ids: Ids,
	store: GraphStore,
	resume: GraphResume,
	head: string | null,
	cards?: HistoryCard[],
): Promise<HistoryFold> {
	// Only the git walk is skipped: `gitCards` yields commits and nothing else,
	// so with HEAD unmoved it can only re-offer shas the sha set already holds.
	const headStill = head !== null && head === resume.head;
	const all = cards ?? (headStill ? [] : gitCards(ids.root));
	if (all.length === 0) return empty(resume.commits.length);
	const seen = new Set(resume.commits);
	const part = historyGraph(ids, all, seen);
	const edges = await coChangeEdges(store, coChangePairs(ids, all, seen), seen.size > 0);
	resume.commits.push(...part.commits);
	return {
		nodes: part.nodes,
		edges: [...part.edges, ...edges],
		commitsIndexed: part.commits.length,
		commitsSkipped: all.filter((c) => c.kind === "commit").length - part.commits.length,
	};
}
