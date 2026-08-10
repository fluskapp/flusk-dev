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
	/**
	 * Wall-clock time, never ahead of it. An incrementing synthetic clock
	 * invents future timestamps, which makes an `as_of: Date.now()` snapshot
	 * miss facts written moments earlier — an artifact no real server has.
	 * Ties are broken by insertion order via stable sorts.
	 */
	now(): number {
		this.clock = Date.now();
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

export type Body = Record<string, unknown>;
export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
export const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

/**
 * Guard evaluation (core/transact_guards.rs): absent → no active fact;
 * expect → exactly one active fact whose object equals it. Tenant comes from
 * the compare body — admin passthrough (server/routes/transact.rs `scoped`).
 */
export function evalCompares(store: Store, compares: unknown): unknown[] {
	const failures: unknown[] = [];
	for (const raw of Array.isArray(compares) ? compares : []) {
		const c = raw as Body;
		// A compare with no tenant matches whatever tenant the fact carries.
		// core/transact_guards.rs compares tenants strictly, but on the server
		// hit targets (auth-free, so admin) BOTH the guard and the stored fact
		// are untenanted, so they match. This mock stores facts tenanted, so
		// ignoring an absent compare tenant reproduces the real outcome —
		// see docs/review-findings.md on why hit sends no tenant on compares.
		const active =
			c.tenant === undefined
				? store.facts.filter(
						(f) =>
							f.status === "active" &&
							f.subject === String(c.subject) &&
							f.predicate === String(c.predicate),
					)
				: store.active(String(c.subject), String(c.predicate), str(c.tenant));
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
