/**
 * What just happened, read back from memory rather than threaded through the
 * CLI. The run writes its own record (`Run:<id> outcome …`) and abagraph
 * writes an audit fact for every claim check (`Verify:<id> verification …`),
 * so the ledger can learn the run id and verdict without changing runCmd's
 * contract.
 */
import type { MemFact, MemVerdict, MemoryClient } from "../memory/client-types.js";

function newest(facts: MemFact[]): MemFact | undefined {
	return [...facts].sort((a, b) => (a.validFrom ?? "").localeCompare(b.validFrom ?? "")).pop();
}

/** Ignore anything recorded before the run started. */
function since(facts: MemFact[], sinceIso: string): MemFact[] {
	return facts.filter((f) => (f.validFrom ?? "") >= sinceIso);
}

export interface RunObservation {
	runId: string;
	/** Conservative default: without a confirmed ALLOW nothing gets promoted. */
	verdict: MemVerdict;
}

export async function observeRun(
	client: MemoryClient,
	repoNs: string,
	sinceIso: string,
): Promise<RunObservation> {
	const runs = since(await client.query(repoNs, { predicate: "outcome", limit: 200 }), sinceIso);
	const latest = newest(runs);
	const runId = latest?.subject.startsWith("Run:") ? latest.subject.slice("Run:".length) : "";

	const audits = since(
		await client.query(repoNs, { predicate: "verification", limit: 200 }),
		sinceIso,
	);
	const object = newest(audits)?.object;
	const verdict: MemVerdict =
		object === "ALLOW" || object === "BLOCK" || object === "WARN" ? object : "WARN";
	return { runId, verdict };
}
