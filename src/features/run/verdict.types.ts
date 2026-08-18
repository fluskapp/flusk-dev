/**
 * The unified verdict: the run-level answer to "how did it go / how carefully
 * must I read it". Zero imports — importable from routes, features, and the
 * client bundle alike (the run.types.ts precedent for pure value helpers).
 */

export type Verdict = "ok" | "warn" | "err" | "live" | "none";

/** Run/journal/session/flow status grammar → verdict. Unknown strings are
 * "none": no basis to judge is not the same as fine. */
export function statusToVerdict(status: string): Verdict {
	switch (status.toLowerCase()) {
		case "running":
		case "active":
			return "live";
		case "completed":
		case "done":
		case "ok":
		case "pass":
		case "passed":
			return "ok";
		case "error":
		case "failed":
			return "err";
		case "blocked":
		case "stopped":
			return "warn";
		default:
			return "none";
	}
}

/** The combined row-level verdict: status first, then the gate's recorded
 * judgment. Blocked — by status or by gate — is warn, not err; a WARN/BLOCK
 * report check demotes a completed run to warn. */
export function runVerdict(
	status: string,
	gate?: { outcome?: string; reportCheck?: string } | null,
): Verdict {
	const v = statusToVerdict(status);
	if (v === "live" || v === "err") return v;
	if (status.toLowerCase() === "blocked" || gate?.outcome === "blocked") return "warn";
	if (v === "ok") {
		return gate?.reportCheck === "BLOCK" || gate?.reportCheck === "WARN" ? "warn" : "ok";
	}
	return v;
}
