/**
 * Fact construction and supersession for the mock — core/build_fact.rs and
 * core/supersede.rs. Split from the store to stay within the size standard.
 */
import {
	type Body,
	type MockFact,
	num,
	objectsEqual,
	str,
	type Store,
} from "./mock-abagraph-state.js";

let idSeq = 0;

export function assertFact(store: Store, a: Body, tx: number, now: number): MockFact {
	const confidence = num(a.confidence) ?? 1;
	const status = confidence < 0.75 ? "candidate" : "active"; // build_fact.rs:37 threshold 0.75
	const fact: MockFact = {
		id: `mockfact-${++idSeq}`,
		subject: String(a.subject),
		predicate: String(a.predicate),
		object: a.object ?? null,
		valid_from: num(a.valid_from) ?? now,
		valid_until: num(a.valid_until) ?? null,
		recorded_at: now,
		confidence,
		source: str(a.source),
		properties: a.properties,
		status,
		tenant: store.dropTenantOnWrite ? undefined : str(a.tenant),
		transient: a.transient === true,
		tx,
	};
	const peers =
		status === "active"
			? store.active(fact.subject, fact.predicate, fact.tenant)
			: store.facts.filter(
					(f) =>
						f.subject === fact.subject &&
						f.predicate === fact.predicate &&
						f.status === status &&
						f.tenant === fact.tenant,
				);
	const dup = peers.find(
		(f) =>
			objectsEqual(f.object, fact.object) &&
			f.source === fact.source &&
			Math.abs(f.confidence - fact.confidence) < 0.001,
	);
	if (dup) return dup; // supersede.rs is_duplicate: idempotent, no new row
	if (status === "active" && a.policy !== "coexist") {
		// dto/parse.rs parse_policy: "coexist" keeps peers; default AutoSupersede
		for (const f of peers.filter((f) => !objectsEqual(f.object, fact.object))) {
			f.status = "superseded"; // supersede.rs close_fact
			f.valid_until = now;
			f.tx = tx;
		}
	}
	store.facts.push(fact);
	return fact;
}
