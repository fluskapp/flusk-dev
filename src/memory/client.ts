/**
 * The abagraph transport — the ONLY module (with wire.ts) that touches
 * @abagraph/client, and the ONLY place tenants (namespaces) are stamped on
 * writes and filtered on reads. /api/context and /api/verify go over raw
 * fetch: the published SDK has no verify wrapper and its context body lacks
 * `tenant`. Never /api/digest for namespaced facts — it nulls the tenant for
 * admin requests (abagraph src/server/routes/digest_facts.rs); all writes go
 * via /api/transact.
 */
import { AbagraphError, createClient, type FactInput as SdkFactInput, type TransactBody } from "@abagraph/client";
import type { MemFact, MemoryClient, MemVerdict } from "./client-types.js";
import { CONTEXT_FETCH_CAP, trimToBudget } from "./rank.js";
import { asFactArray, fromWire, inNs, toWire, type WireFact } from "./wire.js";

export interface MemoryClientOptions {
	baseUrl: string;
	apiKey?: string | null;
}


export function createMemoryClient(opts: MemoryClientOptions): MemoryClient {
	const sdk = createClient({ baseUrl: opts.baseUrl, apiKey: opts.apiKey ?? undefined });
	const base = opts.baseUrl.replace(/\/+$/, "");

	/** Raw POST for the routes the SDK cannot send a tenant on. */
	async function post(path: string, body: unknown): Promise<unknown> {
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;
		const res = await fetch(`${base}${path}`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});
		const text = await res.text();
		let parsed: unknown = null;
		try {
			parsed = text ? JSON.parse(text) : null;
		} catch {
			parsed = text;
		}
		if (!res.ok) {
			const env = (parsed as { error?: { code?: string; message?: string } } | null)?.error;
			throw new AbagraphError(env?.message ?? `HTTP ${res.status}`, res.status, env?.code);
		}
		return parsed;
	}

	return {
		async health() {
			try {
				return (await sdk.health()).ok === true;
			} catch {
				return false;
			}
		},

		async transact(ns, asserts, compares) {
			const body: TransactBody = {
				// No tenant on compares, for the same reason contextPack sends no
				// scope tenant: the guard set is filtered by tenant equality
				// (core/transact_guards.rs) while asserts land untenanted on an
				// auth-free server, so a stamped compare matches nothing and every
				// guarded transact would 409. Subjects are globally unique
				// (`Task:t-<hex>`), so this does not weaken isolation.
				compares: compares?.map((c) => ({
					subject: c.subject,
					predicate: c.predicate,
					expect: c.object,
				})),
				// The SDK type spells valid_until as a string; the wire wants
				// unix-ms — hence the cast through the wire shape.
				asserts: asserts.map((f) => toWire(ns, f)) as unknown as SdkFactInput[],
			};
			const out = await sdk.transact(body);
			return { tx: out.tx, ids: out.facts.map((f) => f.id) };
		},

		async query(ns, p): Promise<MemFact[]> {
			const raw = await sdk.query({
				subject: p.subject,
				predicate: p.predicate,
				object: p.object,
				status: p.status,
				limit: p.limit,
				as_of: p.asOf,
			});
			return asFactArray(raw, "GET /api/facts").filter(inNs(ns)).map(fromWire);
		},

		async contextPack(ns, req) {
			// No body tenant on purpose. routes/context.rs keeps it for admin and
			// core/acl.rs ReadScope::allows then drops every fact whose tenant
			// differs — including the untenanted ones an auth-free server writes
			// (see wire.ts NS_PROP), which would hide all of ah's own memory.
			// Non-admin auth overwrites the body value anyway, so omitting it is
			// correct on both server modes; isolation comes from inNs below.
			// Nor a token_budget: the server would spend it on other namespaces'
			// facts before inNs runs, starving this one. It still ranks by
			// confidence, so ah trims the ranked survivors itself.
			const out = (await post("/api/context", {
				goal: req.goal,
				seeds: req.seeds,
				max_facts: CONTEXT_FETCH_CAP,
				as_of: req.asOf,
			})) as { facts?: WireFact[] };
			const mine = (out.facts ?? []).filter(inNs(ns)).map(fromWire);
			return trimToBudget(mine, req.tokenBudget);
		},

		async search(ns, q, limit) {
			const out = (await sdk.search(q)) as { answer_facts?: WireFact[] };
			const hits = (out.answer_facts ?? []).filter(inNs(ns)).map(fromWire);
			return limit !== undefined ? hits.slice(0, limit) : hits;
		},

		async verifyClaims(ns, claims) {
			const out = (await post("/api/verify", {
				tenant: ns,
				claims: claims.map((c) => ({
					subject: c.subject,
					predicate: c.predicate,
					expect: c.expect,
					op: c.op,
				})),
			})) as { decision?: string };
			const verdict: MemVerdict =
				out.decision === "ALLOW" || out.decision === "BLOCK" ? out.decision : "WARN";
			return { verdict, details: out };
		},

		async consolidate() {
			await sdk.consolidate();
		},
	};
}
