/**
 * "Where did this come from?" — the commits and agent runs that touched a file
 * or symbol, and the docs that describe it, newest first. It is the query a
 * reviewer runs before trusting a line of code and the one an agent runs before
 * editing it.
 *
 * NEWEST FIRST IS NOT FREE. The graph stores no timestamps (invariant 13), so
 * ordering comes from the HistoryCard join in history-clock.ts. Without a clock
 * this query still answers — every row, every edge — but it says
 * `ordered: "id"` instead of pretending the list is chronological. A list
 * silently ordered by something other than what its heading claims is how a
 * reader ends up reverting the wrong commit.
 *
 * The buckets follow the contract's directions exactly: `touched_by` runs
 * artifact → actor, so commits and runs are OUTBOUND; `documents` runs
 * doc → target, so docs are INBOUND. A row is filed by its node's `kind` and
 * never by parsing its id.
 */

import type { GraphClock } from "./history-clock.js";
import type { ProvenanceReport, ProvenanceRow } from "./query-types.js";
import { readNeighbors } from "./safe-read.js";
import { cmp, type Tracker, tracker } from "./truncation.js";
import type { GraphNode, GraphStore, NodeKind } from "./types.js";

export interface ProvenanceOptions {
	/** Supplies the dates. Build one with `historyClock(cards)`. */
	clock?: GraphClock;
	/** Max rows across all three buckets. Default 50. */
	limit?: number;
	/** Max edges read per node. Default 500. */
	fanout?: number;
}

export async function provenance(
	store: GraphStore,
	target: string,
	opts: ProvenanceOptions = {},
): Promise<ProvenanceReport> {
	const t = tracker();
	const fanout = opts.fanout ?? 500;
	const limit = opts.limit ?? 50;
	const rows: ProvenanceRow[] = [];
	let unresolved = 0;
	const seen = [
		...(await readNeighbors(store, target, { direction: "out", kinds: ["touched_by"], fanout }, t)),
		...(await readNeighbors(store, target, { direction: "in", kinds: ["documents"], fanout }, t)),
	];
	for (const n of seen) {
		// Invariant 7: the far end may be an id nobody has put. It is counted, not
		// filed under a guessed bucket.
		if (!n.node) {
			unresolved++;
			continue;
		}
		const stamp = opts.clock?.(n.node) ?? { at: null, ref: null };
		rows.push({
			node: n.node,
			relation: n.edge.kind === "documents" ? "documents" : "touched_by",
			edge: n.edge,
			...stamp,
		});
	}
	rows.sort(byTime);
	return finish(target, rows, unresolved, limit, opts.clock !== undefined, t);
}

/** Dated rows newest first; undated rows after them, by id, so the order is
 * total and identical on every call. */
function byTime(a: ProvenanceRow, b: ProvenanceRow): number {
	const ta = time(a.at);
	const tb = time(b.at);
	if (ta !== tb) return tb - ta;
	return cmp(a.node.id, b.node.id);
}

function time(at: string | null): number {
	if (at === null) return Number.NEGATIVE_INFINITY;
	const ms = Date.parse(at);
	return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

function finish(
	target: string,
	all: ProvenanceRow[],
	unresolved: number,
	limit: number,
	dated: boolean,
	t: Tracker,
): ProvenanceReport {
	if (all.length > limit) {
		t.hit("limit");
		t.drop(all.length - limit);
	}
	const rows = all.slice(0, limit);
	return {
		target,
		rows,
		commits: bucket(rows, "commit"),
		runs: bucket(rows, "run"),
		docs: bucket(rows, "doc"),
		ordered: dated ? "history" : "id",
		truncation: t.done(),
		unresolved,
	};
}

/** The frozen `Provenance` buckets are views of `rows`, in the same order, so
 * the audit trail for any node is the row that carries its edge and its ref. */
function bucket(rows: ProvenanceRow[], kind: NodeKind): GraphNode[] {
	return rows.filter((r) => r.node.kind === kind).map((r) => r.node);
}
