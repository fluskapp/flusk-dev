/**
 * POST /api/verify decision core for the mock server, mirroring abagraph's
 * core/truth/decide.rs + compare.rs: per-claim ALLOW on a record match,
 * BLOCK on a record mismatch, WARN on missing / expired / conflicting
 * evidence; the folded verdict is the most severe claim's.
 */
import type { Store } from "./mock-abagraph-state.js";

export interface MockClaim {
	subject: string;
	predicate: string;
	expect: unknown;
	op?: string;
}

interface ClaimResult {
	subject: string;
	predicate: string;
	expect: unknown;
	op: string;
	verdict: "ALLOW" | "WARN" | "BLOCK";
	reason: string;
}

const SEVERITY = { ALLOW: 0, WARN: 1, BLOCK: 2 } as const;

export function decide(
	store: Store,
	tenant: string | undefined,
	claims: MockClaim[],
	now: number,
): { decision: "ALLOW" | "WARN" | "BLOCK"; reason: string; permitted: boolean; claims: ClaimResult[] } {
	const results = claims.map((c) => decideClaim(store, tenant, c, now));
	// decide.rs: most-severe verdict wins; no claims folds to WARN
	let decision: "ALLOW" | "WARN" | "BLOCK" = results.length ? "ALLOW" : "WARN";
	for (const r of results) if (SEVERITY[r.verdict] > SEVERITY[decision]) decision = r.verdict;
	const reason =
		results.find((r) => r.verdict === decision)?.reason ?? "no claims supplied";
	return { decision, reason, permitted: true, claims: results };
}

function decideClaim(
	store: Store,
	tenant: string | undefined,
	c: MockClaim,
	now: number,
): ClaimResult {
	const op = c.op ?? "eq"; // verify_parse.rs: op defaults to eq
	const done = (verdict: ClaimResult["verdict"], reason: string): ClaimResult => ({
		subject: c.subject,
		predicate: c.predicate,
		expect: c.expect,
		op,
		verdict,
		reason,
	});
	// verify.rs gather: Active + Disputed for (subject, predicate), tenant-scoped
	// (in_scope: admin sees all — the mock honors the body tenant when given)
	const group = store.facts.filter(
		(f) =>
			(f.status === "active" || f.status === "disputed") &&
			f.subject === c.subject &&
			f.predicate === c.predicate &&
			(tenant === undefined || f.tenant === tenant),
	);
	if (group.length === 0)
		return done("WARN", `no fact of record for ${c.predicate} on ${c.subject}`);
	// decide.rs: only facts current at `now` count as the record
	const current = group.filter(
		(f) => f.valid_from <= now && (f.valid_until === null || f.valid_until > now),
	);
	if (current.length === 0)
		return done("WARN", `the record for ${c.predicate} expired with no current value`);
	const distinct = new Set(current.map((f) => JSON.stringify(f.object ?? null)));
	if (current.some((f) => f.status === "disputed") || distinct.size >= 2)
		return done("WARN", `sources disagree on ${c.predicate}`);
	const best = current.reduce((a, b) => (b.recorded_at > a.recorded_at ? b : a));
	return matches(c.expect, op, best.object)
		? done("ALLOW", `${c.predicate} verified against record`)
		: done("BLOCK", `record for ${c.predicate} contradicts the claim`);
}

/** compare.rs: numeric compare (with eq/lte/gte) when both sides parse as
 * numbers; otherwise normalized-text equality; type mismatch = mismatch. */
function matches(expect: unknown, op: string, object: unknown): boolean {
	const e = toNum(expect);
	const o = toNum(object);
	if (e !== null && o !== null) {
		if (op === "lte") return o <= e;
		if (op === "gte") return o >= e;
		return Math.abs(o - e) <= 1e-9 * Math.max(Math.abs(o), Math.abs(e), 1);
	}
	if (op !== "eq") return false; // ordered ops require two numbers
	if (typeof expect === "boolean" || typeof object === "boolean") return expect === object;
	return norm(expect) === norm(object);
}

function toNum(v: unknown): number | null {
	if (typeof v === "number") return v;
	if (typeof v !== "string") return null;
	const cleaned = v.replace(/[,_$ ]/g, "");
	if (cleaned === "") return null;
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : null;
}

function norm(v: unknown): string {
	return String(v ?? "null").split(/\s+/).join(" ").trim().toLowerCase();
}
