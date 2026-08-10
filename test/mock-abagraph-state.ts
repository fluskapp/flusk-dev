/**
 * In-memory fact store for the mock abagraph server, mirroring the REAL
 * engine semantics — each behavior is annotated with the abagraph source
 * file it mirrors (/Users/ashb/projects/abagraph). Pure logic, no HTTP.
 */

export interface MockFact {
	id: string;
	subject: string;
	predicate: string;
	object: unknown;
	valid_from: number;
	valid_until: number | null;
	recorded_at: number;
	confidence: number;
	source?: string;
	properties?: unknown;
	status: string;
	tenant?: string;
	transient: boolean;
	tx: number;
}

export class Store {
	facts: MockFact[] = [];
	/** See MockOptions.dropTenantOnWrite — mirrors the real admin write path. */
	dropTenantOnWrite = false;
	private tx = 0;
	private clock = Date.now();
	/** Strictly monotonic ms clock so recorded_at tiebreaks are deterministic. */
	now(): number {
		this.clock += 1;
		return this.clock;
	}
	nextTx(): number {
		this.tx += 1;
		return this.tx;
	}
	/** Active facts for (subject, predicate) within one tenant — the conflict
	 * set (core/supersede.rs plan_assert is tenant-local). */
	active(subject: string, predicate: string, tenant: string | undefined): MockFact[] {
		return this.facts.filter(
			(f) =>
				f.status === "active" &&
				f.subject === subject &&
				f.predicate === predicate &&
				f.tenant === tenant,
		);
	}
}

/** FactObject equality (core/match.rs objects_equal) — primitives only here. */
export function objectsEqual(a: unknown, b: unknown): boolean {
	return a === b || (a == null && b == null);
}

type Body = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

/**
 * Guard evaluation (core/transact_guards.rs): absent → no active fact;
 * expect → exactly one active fact whose object equals it. Tenant comes from
 * the compare body — admin passthrough (server/routes/transact.rs `scoped`).
 */
export function evalCompares(store: Store, compares: unknown): unknown[] {
	const failures: unknown[] = [];
	for (const raw of Array.isArray(compares) ? compares : []) {
		const c = raw as Body;
		const active = store.active(String(c.subject), String(c.predicate), str(c.tenant));
		const absent = c.absent === true;
		const pass = absent
			? active.length === 0
			: active.length === 1 && objectsEqual(active[0]?.object, c.expect);
		if (!pass) {
			failures.push({
				subject: c.subject,
				predicate: c.predicate,
				absent,
				expected: absent ? null : (c.expect ?? null),
				current: active,
			});
		}
	}
	return failures;
}

let idSeq = 0;

/**
 * Assert one fact (core/build_fact.rs + core/supersede.rs plan_assert):
 * confidence < 0.75 lands as Candidate and never supersedes; an identical
 * active fact (object+source+confidence) is an idempotent dedup; otherwise a
 * non-coexist policy closes conflicting active facts as Superseded with
 * valid_until = now (supersede.rs close_fact). Tenant is read from the fact
 * body — admin passthrough (server/routes/transact.rs `scoped`).
 */
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
