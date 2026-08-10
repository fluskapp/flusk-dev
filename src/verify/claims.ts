/**
 * Claim-checking a run's completion report against the harness's own
 * records. Digestion writes the run facts BEFORE claims are checked, so a
 * fabricated "tests pass" report cannot ALLOW: with no verified_by fact of
 * record the verdict degrades, and a contradicting outcome BLOCKs.
 */
import type { MemClaim, MemoryClient, MemVerdict } from "../memory/client-types.js";
import type { RunRecord } from "../memory/port.js";
import type { VerifyCommandResult } from "./gate.js";

/** touched claims are capped so huge runs do not flood /api/verify. */
export const TOUCHED_CLAIM_CAP = 20;

export function buildClaims(run: RunRecord, verifyResults: VerifyCommandResult[]): MemClaim[] {
	const subject = `Run:${run.runId}`;
	const claims: MemClaim[] = [{ subject, predicate: "outcome", expect: "completed", op: "eq" }];
	for (const r of verifyResults) {
		if (r.skipped || r.exitCode !== 0) continue;
		claims.push({ subject, predicate: "verified_by", expect: r.cmd, op: "eq" });
	}
	for (const path of run.filesTouched.slice(0, TOUCHED_CLAIM_CAP)) {
		claims.push({ subject, predicate: "touched", expect: `File:${path}`, op: "eq" });
	}
	return claims;
}

/** Passthrough to POST /api/verify (audit fact written server-side). */
export async function checkReport(
	client: MemoryClient,
	ns: string,
	claims: MemClaim[],
): Promise<{ verdict: MemVerdict; details: unknown }> {
	return client.verifyClaims(ns, claims);
}
