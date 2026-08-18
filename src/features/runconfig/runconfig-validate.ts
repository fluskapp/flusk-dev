/**
 * The red-line idiom, computed: hard errors disable Run/Save, warnings render
 * amber and block nothing. Pure — no I/O. The server-known facts (root
 * membership, the verify probe) arrive pre-computed in the context, so the
 * dialog can run this locally for instant feedback and the launcher can run
 * it against the file fresh off disk with the same messages.
 */
import type { RunConfig, RunConfigIssue } from "./runconfig.types.js";

/**
 * "2h", "30m", "45s", "1h30m" → milliseconds; null when unparseable. The
 * run-args duration grammar verbatim (src/cli/run-args.ts keeps its private
 * copy — that CLI file is outside this feature's seam).
 */
export function parseDuration(text: string): number | null {
	const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
	if (!m || m[0] === "") return null;
	return (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) * 1000;
}

export interface ValidateCtx {
	/** Is config.repo a configured project root? null = repo unset, nothing to check. */
	repoOk: boolean | null;
	/** detectVerifyCommands for the target repo; null = not probed (never blocks). */
	verifyCommands: string[] | null;
	/** The named harness as probed. Absent or null = unset/not probed (never
	 * blocks) — the hard gate is readHarness at launch, same message. */
	harness?: { known: boolean; available: boolean; note?: string } | null;
}

const error = (message: string): RunConfigIssue => ({ level: "error", message });
const warning = (message: string): RunConfigIssue => ({ level: "warning", message });

/** Every issue, errors first in the order the form reads top to bottom. */
export function validateRunConfig(config: RunConfig, ctx: ValidateCtx): RunConfigIssue[] {
	const issues: RunConfigIssue[] = [];
	const task = config.task?.trim() ?? "";
	const spec = config.spec?.trim() ?? "";
	if (task === "" && spec === "") issues.push(error("task and spec are both empty"));
	if (task !== "" && spec !== "") issues.push(error("task and spec are both set — the spec IS the task"));
	if (ctx.repoOk === false) issues.push(error("repo is not a configured project root"));
	if (config.model !== undefined && !/^[^/\s]+\/\S+$/.test(config.model)) {
		issues.push(error('model must look like "provider/id"'));
	}
	const b = config.budgets;
	if (b?.for !== undefined && parseDuration(b.for) === null) {
		issues.push(error("--for must look like 2h, 30m, 45s or 1h30m"));
	}
	if (b?.maxCostUsd !== undefined && !(b.maxCostUsd > 0)) {
		issues.push(error("budgets.maxCostUsd must be a positive number of dollars"));
	}
	if (b?.maxTurns !== undefined && (!Number.isInteger(b.maxTurns) || b.maxTurns <= 0)) {
		issues.push(error("budgets.maxTurns must be a positive integer"));
	}
	if (config.harness !== undefined && config.harness !== "native") {
		const probe = ctx.harness ?? null;
		if (probe !== null && !probe.known) {
			issues.push(error(`harness "${config.harness}" is not a configured harness`));
		} else if (probe !== null && !probe.available) {
			issues.push(error(probe.note ?? `harness "${config.harness}" is unavailable`));
		}
		if (config.fake !== undefined) {
			issues.push(error("fake scripts the native provider — not a foreign harness"));
		}
		if (config.isolation?.container === true) {
			issues.push(error("container execution applies to the native loop only"));
		}
		if (config.model !== undefined) {
			issues.push(warning("model is ignored — a harness chooses its model in its own args"));
		}
		if (b?.maxTurns !== undefined || b?.maxCostUsd !== undefined) {
			issues.push(warning("turn/cost budgets are not enforceable on an external harness"));
		}
	}
	if (config.fake !== undefined) issues.push(warning("runs against the scripted provider"));
	if (config.verify !== false && ctx.verifyCommands !== null && ctx.verifyCommands.length === 0) {
		issues.push(warning("repo has no verify commands — the gate would pass vacuously"));
	}
	return issues;
}
