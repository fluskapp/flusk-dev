/**
 * Frozen contract between the abagraph transport (client.ts) and everything
 * that consumes memory (contextpack, digestion, tools, verify, goals).
 * hit-owned shapes; @abagraph/client types stay inside src/memory/.
 */

export interface MemFact {
	id: string;
	subject: string;
	predicate: string;
	object: string;
	confidence: number;
	source?: string;
	status?: string;
	validFrom?: string;
	validUntil?: string | null;
}

export interface MemFactInput {
	subject: string;
	predicate: string;
	object: string;
	confidence?: number;
	source?: string;
	/** Multi-valued predicate: new asserts coexist instead of superseding. */
	coexist?: boolean;
	/** TTL ephemera: hard-deleted by the sweeper at validUntil. */
	transient?: boolean;
	validUntil?: string;
	properties?: Record<string, unknown>;
}

/** Guard for compare-and-swap transacts (e.g. task claiming). */
export interface MemCompare {
	subject: string;
	predicate: string;
	object: string;
}

export interface MemClaim {
	subject: string;
	predicate: string;
	expect: string;
	op?: "eq" | "lte" | "gte";
}

export type MemVerdict = "ALLOW" | "WARN" | "BLOCK";

/**
 * Namespace-disciplined transport. Every method stamps/filters the given
 * namespace; callers never talk to abagraph directly. Methods reject
 * (AbagraphError or network error) — callers own graceful degradation.
 */
export interface MemoryClient {
	health(): Promise<boolean>;
	transact(
		ns: string,
		asserts: MemFactInput[],
		compares?: MemCompare[],
	): Promise<{ tx: number; ids: string[] }>;
	query(
		ns: string,
		params: {
			subject?: string;
			predicate?: string;
			object?: string;
			status?: string;
			limit?: number;
			asOf?: string | number;
		},
	): Promise<MemFact[]>;
	/** Goal-directed recall (POST /api/context), confidence-ranked, token-trimmed. */
	contextPack(
		ns: string,
		req: { goal: string; seeds?: string[]; tokenBudget?: number; asOf?: string | number },
	): Promise<MemFact[]>;
	search(ns: string, q: string, limit?: number): Promise<MemFact[]>;
	/** POST /api/verify claim check; writes an audit fact server-side. */
	verifyClaims(
		ns: string,
		claims: MemClaim[],
	): Promise<{ verdict: MemVerdict; details: unknown }>;
	consolidate(): Promise<void>;
}
