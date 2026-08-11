/**
 * Read filtering: status, time, pattern, order, cap — in that order. The cap
 * keeps the newest rows, because every question this store is asked is a
 * question about now.
 *
 * The status filter is applied independently of `asOf`, because a row's status
 * is its status NOW while `asOf` asks what was true then. A snapshot read that
 * wants the values a later transact closed must therefore ask for
 * "active,candidate,superseded"; folding status into the time filter would
 * make the change feed's before-and-after diff return two identical sets.
 */
import type { Stored } from "./materialize.js";
import type { Fact, QueryParams } from "./types.js";
import { atMs, DEFAULT_LIMIT, statusSet, visibleAt } from "./visibility.js";

export function runQuery(rows: Stored[], params: QueryParams): Fact[] {
	const at = atMs(params.asOf);
	const admitted = statusSet(params.status);
	const hits: Fact[] = [];
	for (const row of rows) {
		const f = row.fact;
		if (!admitted.has(f.status)) continue;
		if (!visibleAt(f, at)) continue;
		if (params.subject !== undefined && f.subject !== params.subject) continue;
		if (params.predicate !== undefined && f.predicate !== params.predicate) continue;
		if (params.object !== undefined && f.object !== params.object) continue;
		hits.push(f);
	}
	// Oldest first, and the cap drops the OLDEST rows. Every read in this
	// program asks about the present — the run that just ended, the goal just
	// planned — so a cap that kept the oldest page would answer a namespace
	// past its cap with nothing but history, silently and without an error.
	// A caller whose answer needs every row asks for NO_LIMIT.
	hits.sort((a, b) => a.validFrom.localeCompare(b.validFrom));
	const limit = params.limit ?? DEFAULT_LIMIT;
	return hits.slice(Math.max(0, hits.length - Math.max(0, limit)));
}
