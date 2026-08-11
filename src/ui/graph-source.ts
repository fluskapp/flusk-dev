/**
 * The dashboard's harness reads, served from the graph when abagraph has the
 * facts (written by src/memory/ingest.ts) and from the file scanners when it
 * does not. abagraph is optional in ah, so every path here degrades instead
 * of failing: a null client, a rejected query, or an empty graph all end up
 * serving the caller's scanned fallback.
 */
import type { MemFact, MemoryClient } from "../memory/client-types.js";
import type { ModelRef, RunRow } from "./api-types.js";
import { buildRows, idOf } from "./graph-rows.js";

/**
 * Reads admit Candidates and ask for far more rows than a view shows. Both
 * are load-bearing (docs/review-findings.md): the server applies its row cap
 * BEFORE MemoryClient's client-side namespace filter (#7), so a modest limit
 * on a shared server returns none of ah's own facts; and active-only reads
 * once made every sub-0.75 fact invisible (#6).
 */
const STATUS = "active,candidate";
const LIMIT = 500;
/**
 * Runs whose detail one call will fetch, newest `ran` edge first.
 *
 * Detail is read BY SUBJECT, never by predicate alone: `outcome` and `stage`
 * are written by ah's own runs and by every ingested harness, so a
 * predicate-only read spends the row cap on other subjects long before it
 * covers this harness — and then serves rows with status "unknown", an empty
 * timestamp and no stages. One bounded query per run costs more round trips
 * and cannot be starved.
 */
const RUN_LIMIT = 60;
/** Detail queries in flight at once. */
const LANES = 6;

export interface GraphFallback {
	runs: RunRow[];
	models: ModelRef[];
}

export interface GraphSource {
	/** False once the client is absent or a query has rejected. */
	connected: boolean;
	harnessRuns(ns: string, harness: string): Promise<RunRow[]>;
	harnessModels(ns: string, harness: string): Promise<ModelRef[]>;
}

export function createGraphSource(
	client: MemoryClient | null,
	fallback: GraphFallback,
): GraphSource {
	/**
	 * Runs the reads concurrently and reports failure as null. allSettled, not
	 * all: with `all`, a second rejection among the in-flight queries surfaces
	 * as an unhandled rejection after the first one has already been caught.
	 */
	async function read(
		ns: string,
		queries: { subject?: string; predicate?: string }[],
	): Promise<MemFact[] | null> {
		if (client === null) return null;
		const settled = await Promise.allSettled(
			queries.map((q) => client.query(ns, { ...q, status: STATUS, limit: LIMIT })),
		);
		if (settled.some((s) => s.status === "rejected")) {
			source.connected = false;
			return null;
		}
		return settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
	}

	/** Every fact about each subject, a few subjects at a time. */
	async function readSubjects(ns: string, subjects: string[]): Promise<MemFact[] | null> {
		const out: MemFact[] = [];
		for (let i = 0; i < subjects.length; i += LANES) {
			const page = await read(
				ns,
				subjects.slice(i, i + LANES).map((subject) => ({ subject })),
			);
			if (page === null) return null;
			out.push(...page);
		}
		return out;
	}

	const source: GraphSource = {
		connected: client !== null,

		async harnessRuns(ns, harness) {
			const ran = await read(ns, [{ subject: `Harness:${harness}`, predicate: "ran" }]);
			if (ran === null) return fallback.runs;
			// Newest edges first, then bounded: the run ids drive one query each.
			const ids = [
				...new Set(
					[...ran]
						.sort((a, b) => (b.validFrom ?? "").localeCompare(a.validFrom ?? ""))
						.map((f) => idOf(f.object)),
				),
			].slice(0, RUN_LIMIT);
			// An empty graph is not an answer — a harness ah has never ingested
			// would otherwise read as "no runs" and blank the view.
			if (ids.length === 0) return fallback.runs;
			const detail = await readSubjects(
				ns,
				ids.map((id) => `Run:${id}`),
			);
			if (detail === null) return fallback.runs;
			const rows = buildRows(harness, [...ran, ...detail]);
			return rows.length > 0 ? rows : fallback.runs;
		},

		async harnessModels(ns, harness) {
			const facts = await read(ns, [{ subject: `Harness:${harness}`, predicate: "uses" }]);
			if (facts === null) return fallback.models;
			const ids = [...new Set(facts.map((f) => idOf(f.object)))].filter((id) => id !== "");
			return ids.length > 0 ? ids.map((id) => ({ id })) : fallback.models;
		},
	};
	return source;
}
