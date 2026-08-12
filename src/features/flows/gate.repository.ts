/**
 * The gate a verify node runs — the REAL one, the detection, the commands and
 * the report claim-check `flusk run` uses, because a flow that grades its own
 * homework is worth nothing.
 *
 * Two things it refuses to believe:
 *
 * - "nothing to run means it passed". A repo with no detectable gate used to
 *   score every verify node `ok` on zero evidence. Absence of a gate is now
 *   UNVERIFIED, which is what it is.
 * - "the report says it edited files". A flow node is a chat completion with no
 *   tools, so the only actor that can change the tree is the gate's own
 *   commands; `filesTouched` is therefore read off git rather than assumed, and
 *   a report describing edits that left no trace blocks instead of warning.
 *
 * That second one only means anything because `flusk flow run` starts from a clean
 * tree on its own branch (src/cli/flow-isolation.ts): on a dirty tree the diff
 * is somebody else's work, not the run's.
 */
import { spawnSync } from "node:child_process";
import type { FluskConfig } from "../../platform/config/types.js";
import { detectVerifyCommands } from "../verify/detect.repository.js";
import { formatEvidence, runVerify } from "../verify/gate.repository.js";
import { checkReportText } from "../verify/report-check.js";
import type { NodeOutcome } from "./types.js";

export const NO_GATE = "no verification command detected — set verify in .flusk/config.json";
/** checkReportText's own wording for "you said you edited, nothing changed". */
const NO_EDIT = "no file was written";

export interface GateAt {
	repoRoot: string;
	repoConfig?: { verify?: string[] } | undefined;
}

/**
 * Paths the working tree actually differs by. Not a git repo, or git missing,
 * means no observation — which reads as "nothing was touched", the safe way
 * round: a claim of edits then has to answer for itself.
 */
export function filesTouched(repoRoot: string): string[] {
	try {
		const out = spawnSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
		if (out.status !== 0) return [];
		return (out.stdout ?? "")
			.split("\n")
			.map((line) => line.slice(3).trim())
			.filter((path) => path !== "");
	} catch {
		return [];
	}
}

/** The gate, for real. A blocked report blocks the flow, as a red test does. */
export function gate(report: string, base: NodeOutcome, cfg: FluskConfig, at: GateAt): NodeOutcome {
	const cmds = detectVerifyCommands(at.repoRoot, at.repoConfig);
	const ran =
		cmds.length === 0
			? { passed: false, results: [] }
			: runVerify(cmds, at.repoRoot, cfg.verify.evidenceLines);
	const touched = filesTouched(at.repoRoot);
	const check = checkReportText(report, {
		verify: ran.results,
		filesTouched: touched,
		commandsRun: [],
	});
	const claimedEdit = check.reasons.some((r) => r.includes(NO_EDIT));
	const blocked = check.verdict === "BLOCK" || claimedEdit;
	const said = blocked ? check.reasons.join("; ") : cmds.length === 0 ? NO_GATE : "";
	const evidence = formatEvidence(ran.results) || said;
	const ok = cmds.length > 0 && ran.passed && !blocked;
	return {
		...base,
		ok,
		output: [report, evidence].filter((part) => part !== "").join("\n\n"),
		...(ok ? {} : { note: evidence.split("\n")[0] ?? "verification failed" }),
	};
}
