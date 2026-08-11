/**
 * The four answers, assembled into one reply — and the decision about which
 * kind of nothing an empty answer is.
 *
 * ONE REQUEST, FOUR QUESTIONS. The panel shows blast radius, co-change,
 * provenance and the local picture side by side; fetching them separately
 * would make four round trips whose truncation notes could disagree, because
 * a build can land between them. They are read from ONE store snapshot here.
 *
 * THE NOTHINGS ARE NOT THE SAME. "This project has no graph" is fixed by
 * indexing; "the graph has no node for this file" is fixed by re-indexing;
 * "this file has no importers" is the answer. Only the server can tell the
 * first two apart — the client sees empty arrays either way — so the sentence
 * and the remedy are minted here and the panel merely prints them.
 *
 * The clock is a JOIN, not a field: the graph stores no timestamps
 * (invariant 13), so provenance borrows its order from the history corpus. A
 * corpus that cannot be read costs the ORDER, never the rows — provenance
 * then reports `ordered: "id"` and says so itself.
 */

import {
	blastRadius,
	coChange,
	type GraphClock,
	historyClock,
	neighbourhood,
	provenance,
} from "../graph/queries.js";
import type { JsonlGraph } from "../graph/store-jsonl.js";
import { historyCards } from "../history/corpus.js";
import type { GraphTarget } from "./api-graph-target.js";
import { type GraphReply, GRAPH_LIMITS as L } from "./api-graph-types.js";

/**
 * The corpus dates every commit, session and journal; a failure costs the
 * ORDER, never the rows.
 *
 * An EMPTY corpus yields no clock at all rather than a clock that dates
 * nothing. `provenance` reports `ordered: "history"` whenever it was given
 * one, and a clock with nothing in it would earn that claim while ordering
 * every row by id — which is precisely the lie that field exists to prevent.
 */
function clockOf(): GraphClock | undefined {
	try {
		const cards = historyCards();
		return cards.length === 0 ? undefined : historyClock(cards);
	} catch {
		return undefined;
	}
}

const empty = (t: GraphTarget, stats: { nodes: number; edges: number }) => ({
	project: t.root.project,
	root: t.root.path,
	asked: { file: t.file, symbol: t.symbol, id: t.id },
	target: null,
	stats,
	blast: null,
	cochange: null,
	provenance: null,
	local: null,
});

/** What the panel should say when there is no node to answer about. */
function nothing(t: GraphTarget, stats: { nodes: number; edges: number }): GraphReply {
	const what = t.symbol === null ? t.file : `${t.symbol} in ${t.file}`;
	if (stats.nodes === 0) {
		return {
			state: "unindexed",
			...empty(t, stats),
			note: `No code graph for ${t.root.project} yet, so nothing can be implicated by a change to ${what}.`,
			action:
				"Index this project — the first pass reads up to 300 files, records what it finished, " +
				"and continues from there the next time.",
		};
	}
	return {
		state: "unknown",
		...empty(t, stats),
		note:
			`${t.root.project}'s graph holds ${stats.nodes} nodes and ${stats.edges} edges, ` +
			`but none for ${what}.`,
		action:
			t.symbol === null
				? "Re-index the project: this file was added, renamed, or fell outside the last indexed slice."
				: "Re-index the project, and check the symbol is DEFINED in this file — a symbol is " +
					"identified by where it is defined, never by where it is used.",
	};
}

/** One store snapshot, four queries, one payload. Nothing here throws. */
export async function graphReport(t: GraphTarget, store: JsonlGraph): Promise<GraphReply> {
	const s = store.stats();
	const stats = { nodes: s.nodes, edges: s.edges };
	const node = await store.node(t.id);
	if (node === null) return nothing(t, stats);
	const clock = clockOf();
	const [blast, cochange, prov, local] = await Promise.all([
		blastRadius(store, t.id, { limit: L.blast, maxDepth: L.blastDepth }),
		coChange(store, t.id, { limit: L.cochange }),
		provenance(store, t.id, { limit: L.provenance, ...(clock !== undefined ? { clock } : {}) }),
		neighbourhood(store, t.id, { limit: L.local, radius: L.radius }),
	]);
	return {
		state: "ok",
		project: t.root.project,
		root: t.root.path,
		asked: { file: t.file, symbol: t.symbol, id: t.id },
		target: node,
		stats,
		blast,
		cochange,
		provenance: prov,
		local,
	};
}
