/**
 * Turning a pile of facts into transacts abagraph will accept.
 *
 * Split from ingest.ts so the two rules that shape a transact — collapse
 * identical triples, then never touch a (subject, predicate) twice in one
 * call — can be read and tested without a client.
 */
import type { MemFactInput } from "./client-types.js";

/**
 * Collapse identical (subject, predicate, object) triples. Without this, N
 * journals of one harness would each re-assert `Harness:h uses Model:x` — all
 * sharing a (subject, predicate), so the batcher below would spend N
 * transacts to have the server dedup N-1 of them.
 */
export function dedupe(facts: MemFactInput[]): MemFactInput[] {
	const seen = new Set<string>();
	return facts.filter((f) => {
		const key = `${f.subject} ${f.predicate} ${f.object}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Split into transacts that each touch a (subject, predicate) at most once —
 * abagraph rejects the whole call otherwise, coexist predicates included
 * (core/transact_guards.rs `check_distinct_asserts`). First-fit, so a
 * harness's N `ran` edges land in N transacts while everything else rides
 * along in the first.
 *
 * Every FUNCTIONAL predicate survives dedupe exactly once per subject (one
 * journal declares one outcome, one status per stage), so all of them land in
 * bin 0. Only coexist repeats spill over — which is why ingest may run these
 * bins concurrently without making supersession order-dependent.
 */
export function batchDistinct(facts: MemFactInput[]): MemFactInput[][] {
	const bins: { pairs: Set<string>; facts: MemFactInput[] }[] = [];
	for (const f of facts) {
		const key = `${f.subject} ${f.predicate}`;
		let bin = bins.find((b) => !b.pairs.has(key));
		if (bin === undefined) {
			bin = { pairs: new Set(), facts: [] };
			bins.push(bin);
		}
		bin.pairs.add(key);
		bin.facts.push(f);
	}
	return bins.map((b) => b.facts);
}
