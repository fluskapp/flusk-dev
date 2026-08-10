/**
 * Route handlers for the mock abagraph server — each cites the abagraph
 * source file (/Users/ashb/projects/abagraph) whose semantics it mirrors.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { assertFact, evalCompares, type MockFact, type Store } from "./mock-abagraph-state.js";
import { decide, type MockClaim } from "./mock-abagraph-verify.js";

export type Body = Record<string, unknown>;

export function json(res: ServerResponse, status: number, value: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(value));
}

/** dto/mod.rs error_to_json envelope. */
export function fail(res: ServerResponse, status: number, code: string, message: string): void {
	json(res, status, { error: { code, message } });
}

export async function readBody(req: IncomingMessage): Promise<Body> {
	const chunks: Buffer[] = [];
	for await (const c of req) chunks.push(c as Buffer);
	const text = Buffer.concat(chunks).toString("utf8");
	return text ? (JSON.parse(text) as Body) : {};
}

export function transact(store: Store, body: Body, res: ServerResponse): void {
	const asserts = Array.isArray(body.asserts) ? (body.asserts as Body[]) : [];
	const retracts = Array.isArray(body.retracts) ? body.retracts : [];
	if (asserts.length === 0 && retracts.length === 0)
		return fail(res, 400, "SchemaInvalid", "transact needs at least one assert or retract");
	// transact_guards.rs check_distinct_asserts: same (s,p) twice is rejected
	const seen = new Set<string>();
	for (const a of asserts) {
		const key = `${a.subject} ${a.predicate}`;
		if (seen.has(key))
			return fail(res, 400, "SchemaInvalid", "transact asserts touch a (subject, predicate) twice");
		seen.add(key);
	}
	// transact_guards.rs evaluate_compares: all-or-nothing, 409 with failures
	const failures = evalCompares(store, body.compares);
	if (failures.length > 0)
		return json(res, 409, { error: { code: "CompareFailed", message: "compare failed", failures } });
	const tx = store.nextTx();
	const now = store.now();
	const facts = asserts.map((a) => assertFact(store, a, tx, now));
	json(res, 200, { tx, facts, retracted: [] }); // routes/transact.rs response shape
}

/** routes/facts.rs + dto/parse.rs: default Active-only; admin sees ALL
 * tenants (facts_page.rs tenant_scope); limit defaults to 200. */
export function listFacts(store: Store, params: URLSearchParams, res: ServerResponse): void {
	const statuses = params.get("status")?.split(",") ?? ["active"];
	let out = store.facts.filter((f) => statuses.includes(f.status));
	for (const k of ["subject", "predicate", "object"] as const) {
		const v = params.get(k);
		if (v !== null) out = out.filter((f) => String(f[k] ?? "") === v);
	}
	json(res, 200, out.slice(0, Number(params.get("limit") ?? 200)));
}

/** routes/context.rs parse_request: admin keeps the BODY tenant; assembly
 * filters by it. core/rank.rs: confidence desc, recency tiebreak, then a
 * greedy ~4-chars-per-token budget fill. */
export function contextPack(store: Store, body: Body, res: ServerResponse): void {
	const tenant = typeof body.tenant === "string" ? body.tenant : undefined;
	// core/acl.rs ReadScope::allows — an absent scope tenant matches every
	// fact; a present one matches only exact-tenant facts (so untenanted
	// facts are invisible to a tenant-scoped context read).
	const ranked = store.facts
		.filter((f) => f.status === "active" && (tenant === undefined || f.tenant === tenant))
		.sort((a, b) => b.confidence - a.confidence || b.recorded_at - a.recorded_at);
	const budget = typeof body.token_budget === "number" ? body.token_budget : 0;
	let used = 0;
	const est = (f: MockFact) =>
		Math.ceil(
			(f.subject.length + f.predicate.length + String(f.object ?? "").length +
				(f.source?.length ?? 0) + 4) / 4,
		);
	const capped =
		typeof body.max_facts === "number" && body.max_facts > 0
			? ranked.slice(0, body.max_facts)
			: ranked;
	const facts =
		budget > 0
			? capped.filter((f) => {
					const t = est(f);
					if (used + t > budget) return false;
					used += t;
					return true;
				})
			: capped;
	json(res, 200, { kind: "context_packet", goal: body.goal ?? "", facts });
}

/** routes/search.rs: admin tenant_scope passes ALL tenants — the wrapper must
 * filter. Substring match over s/p/o stands in for the kNN embedding scan. */
export function search(store: Store, q: string, res: ServerResponse): void {
	const needle = q.toLowerCase();
	const hits = store.facts.filter(
		(f) =>
			f.status === "active" &&
			`${f.subject} ${f.predicate} ${String(f.object ?? "")}`.toLowerCase().includes(needle),
	);
	json(res, 200, { kind: "search_result", question: q, answer_facts: hits });
}

export function verify(store: Store, body: Body, res: ServerResponse): void {
	const claims = Array.isArray(body.claims) ? (body.claims as MockClaim[]) : [];
	if (claims.length === 0)
		return fail(res, 400, "SchemaInvalid", "claims: non-empty array required"); // verify_parse.rs
	const tenant = typeof body.tenant === "string" ? body.tenant : undefined;
	const decision = decide(store, tenant, claims, store.now());
	// verify.rs audit_fact: every call writes one `Verify:<id> verification` fact
	const audit = assertFact(
		store,
		{ subject: `Verify:${Math.random().toString(16).slice(2, 10)}`, predicate: "verification",
			object: decision.decision.toLowerCase(), confidence: 1, source: "truth", tenant },
		store.nextTx(),
		store.now(),
	);
	json(res, 200, { ...decision, verification_id: audit.subject, mode: body.mode ?? "shadow" });
}
