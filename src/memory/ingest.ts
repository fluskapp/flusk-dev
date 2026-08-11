/**
 * Ingest other harnesses' run journals into abagraph, so the dashboard can
 * read runs from the graph instead of re-walking the filesystem.
 *
 * Identity: a journal's run id IS its journal path. Harness journals carry no
 * stable run id of their own, and the path is the only handle that survives a
 * round trip (`RunRow.ref` is "a journal path"), so `Run:<path>` keeps the
 * graph joinable back to the file. Two harnesses reusing a basename therefore
 * stay distinct — and every fact about a run hangs off that one subject, so a
 * reader can fetch a whole run with a single subject-scoped query.
 *
 * Idempotency is abagraph's, not ours: an assert identical in
 * object+source+confidence to a live fact on the same tenant/subject/predicate
 * is a no-op (core/supersede.rs `is_duplicate`) — for coexist predicates too.
 * ah keeps no dedup table; re-ingesting the same journals writes no new rows.
 *
 * Never throws: a rejected transact costs that batch and leaves a note. The
 * dashboard must keep working when the graph is down (it usually is — see
 * docs/architecture.md: no part of this layer has run against a real server).
 */
import type { Journal } from "../ui/journal-scan.js";
import type { MemFactInput, MemoryClient } from "./client-types.js";
import { batchDistinct, dedupe } from "./ingest-batch.js";
import { fact } from "./vocabulary.js";

export interface IngestResult {
	/** Facts sent in a transact that succeeded (server-side dedup included). */
	written: number;
	/** Facts in a transact that failed, or dropped because there is no client. */
	skipped: number;
	notes: string[];
}

export interface IngestOpts {
	/** Transacts in flight at once. The dashboard is single-threaded. */
	concurrency?: number;
	/** Stop early — a client that hung up, or a deadline that expired. */
	signal?: AbortSignal;
}

const DEFAULT_CONCURRENCY = 4;

/** The run id for a journal: its path (see the identity note above). */
export function journalRunId(j: Journal): string {
	return j.path;
}

/**
 * One journal → its Run facts plus the Harness edges. Coexist flags come from
 * the vocabulary table via `fact()`, never hand-set here.
 */
export function journalFacts(j: Journal): MemFactInput[] {
	const run = `Run:${journalRunId(j)}`;
	const harness = `Harness:${j.harness}`;
	const out: MemFactInput[] = [fact(run, "outcome", j.status || "unknown")];
	if (j.pr) out.push(fact(run, "pr", j.pr));
	// Stages stay under the run's own subject so one subject-scoped query
	// fetches a whole run. They are coexist, so a stage that advances from
	// running to done leaves both statuses live: readers collapse by stage
	// name, newest first (src/ui/graph-source.ts `progressOf`).
	for (const s of j.stages) {
		if (!s.name) continue;
		out.push(fact(run, "stage", `${s.name}:${s.status || "unknown"}`));
	}
	out.push(fact(harness, "ran", run));
	// The journal's `tool` is the model/CLI the harness drove for this run.
	if (j.tool) out.push(fact(harness, "uses", `Model:${j.tool}`));
	return out;
}

function reason(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/**
 * Write every journal's facts into namespace `ns`.
 *
 * Bins run with bounded concurrency and stop at `signal`: one ingest of a
 * real machine's journals is hundreds of transacts, and the dashboard that
 * issues them is also the one serving /api/projects and any in-flight chat
 * SSE on the same event loop. A null client — memory disabled or unreachable
 * — is a normal state, not an error: everything is skipped and noted.
 */
export async function ingestJournals(
	client: MemoryClient | null,
	ns: string,
	journals: Journal[],
	opts: IngestOpts = {},
): Promise<IngestResult> {
	const res: IngestResult = { written: 0, skipped: 0, notes: [] };
	const facts = dedupe(journals.flatMap(journalFacts));
	if (facts.length === 0) return res;
	if (client === null) {
		res.skipped = facts.length;
		res.notes.push(
			`no memory client: skipped ${facts.length} fact(s) from ${journals.length} journal(s)`,
		);
		return res;
	}
	const bins = batchDistinct(facts);
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < bins.length && opts.signal?.aborted !== true) {
			const batch = bins[next++] ?? [];
			try {
				await client.transact(ns, batch);
				res.written += batch.length;
			} catch (e) {
				res.skipped += batch.length;
				res.notes.push(`transact of ${batch.length} fact(s) failed: ${reason(e)}`);
			}
		}
	};
	const lanes = Math.max(1, Math.min(opts.concurrency ?? DEFAULT_CONCURRENCY, bins.length));
	await Promise.all(Array.from({ length: lanes }, worker));
	const dropped = bins.slice(next).reduce((n, b) => n + b.length, 0);
	if (dropped > 0) {
		res.skipped += dropped;
		res.notes.push(`stopped early: ${dropped} fact(s) in ${bins.length - next} batch(es) not sent`);
	}
	return res;
}
