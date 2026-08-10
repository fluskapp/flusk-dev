/**
 * Wire-shape mapping between ah's MemFact types and the abagraph REST JSON.
 * SDK types are extended via intersection/Omit — never mutated. Internal to
 * src/memory/; nothing outside imports it.
 */
import type { Fact as WireFact, FactInput as SdkFactInput } from "@abagraph/client";
import type { MemFact, MemFactInput } from "./client-types.js";

export type { WireFact };

/**
 * Wire extension of the SDK input: `tenant` (honored for admin transacts,
 * abagraph src/server/routes/transact.rs `scoped`) and unix-ms `valid_until`
 * (the server parses it with `as_i64`; an ISO string would be dropped).
 */
export type WireFactInput = Omit<SdkFactInput, "valid_until"> & {
	tenant: string;
	valid_until?: number;
};

/**
 * Namespace tag carried in `properties`, which survives the server's parser
 * verbatim (abagraph src/server/dto/parse.rs `parse_fact_input`).
 *
 * The `tenant` field alone is NOT sufficient: that same parser hardcodes
 * `tenant: None` ("server stamps from auth context"), and `scoped` returns
 * admin asserts unchanged — so on an auth-free (admin) server every fact
 * lands untenanted and tenant-filtered reads would match nothing. Tagging
 * our own namespace keeps ah correct on both admin and per-token servers.
 */
export const NS_PROP = "ah_ns";

export function toWire(ns: string, f: MemFactInput): WireFactInput {
	return {
		subject: f.subject,
		predicate: f.predicate,
		object: f.object,
		confidence: f.confidence,
		source: f.source,
		properties: { ...f.properties, [NS_PROP]: ns },
		// Multi-valued predicates map to the Coexist conflict policy; the wire
		// value is "coexist" (abagraph src/server/dto/parse.rs `parse_policy`).
		policy: f.coexist ? "coexist" : undefined,
		transient: f.transient,
		valid_until: f.validUntil !== undefined ? Date.parse(f.validUntil) : undefined,
		tenant: ns,
	};
}

/** Wire timestamps are unix-ms; ah's MemFact carries ISO strings. */
function isoOf(v: unknown): string | undefined {
	if (typeof v === "number") return new Date(v).toISOString();
	return typeof v === "string" ? v : undefined;
}

export function fromWire(f: WireFact): MemFact {
	return {
		id: f.id,
		subject: f.subject,
		predicate: f.predicate,
		object: typeof f.object === "string" ? f.object : String(f.object ?? ""),
		confidence: typeof f.confidence === "number" ? f.confidence : 1,
		source: f.source,
		status: f.status,
		validFrom: isoOf(f.valid_from),
		validUntil: f.valid_until === null ? null : isoOf(f.valid_until),
	};
}

/**
 * `GET /api/facts` answers with a bare JSON array (abagraph
 * src/server/dto/render.rs `facts_to_json`), while `/api/context` wraps its
 * rows in `{facts}`. Accept either, and fail with a legible message rather
 * than a `.filter is not a function` stack when a server answers with
 * something else entirely.
 */
export function asFactArray(raw: unknown, endpoint: string): WireFact[] {
	if (Array.isArray(raw)) return raw as WireFact[];
	if (typeof raw === "object" && raw !== null) {
		const wrapped = (raw as { facts?: unknown }).facts;
		if (Array.isArray(wrapped)) return wrapped as WireFact[];
	}
	throw new Error(
		`${endpoint} did not return facts (got ${typeof raw}) — is memory.baseUrl an abagraph server?`,
	);
}

/**
 * Admin reads see every tenant — namespace isolation is enforced client-side,
 * accepting either the server-side tenant or our own `properties` tag (see
 * NS_PROP: the tenant is dropped entirely on auth-free servers).
 */
export function inNs(ns: string): (f: WireFact) => boolean {
	return (f) => {
		if (f.tenant === ns) return true;
		const props = f.properties;
		return typeof props === "object" && props !== null && props[NS_PROP] === ns;
	};
}
