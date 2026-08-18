/**
 * RunConfig → the run manager's option shape. Pure mapping: every field lands
 * exactly where the CLI flag would put it — budgets.for through the duration
 * grammar to deadlineMs, verify:false to noVerify, isolation toggles to their
 * flags — so a config launch and the identical shell invocation walk
 * byte-for-byte the same runCmd path.
 */
import { isAbsolute, join } from "node:path";
import type { RealRunOpts } from "../run/run-manager.repository.js";
import { parseDuration } from "./runconfig-validate.js";
import type { RunConfig } from "./runconfig.types.js";

/** The task label the run carries until resolveSpecRun composes the real one. */
const specTask = (spec: string): string => `(spec: ${spec})`;

export function toRunCmdOpts(config: RunConfig, repoRoot: string): RealRunOpts {
	const b = config.budgets ?? {};
	const deadlineMs = b.for === undefined ? null : parseDuration(b.for);
	const task = config.task?.trim() ?? "";
	// The fake script lives with the config's repo, not the server's cwd.
	const fake =
		config.fake === undefined
			? undefined
			: isAbsolute(config.fake)
				? config.fake
				: join(repoRoot, config.fake);
	return {
		task: task !== "" ? task : specTask(config.spec ?? ""),
		repoRoot,
		...(config.kind !== undefined ? { kind: config.kind } : {}),
		...(config.spec !== undefined ? { spec: config.spec } : {}),
		...(config.model !== undefined ? { model: config.model } : {}),
		...(b.maxCostUsd !== undefined ? { maxCostUsd: b.maxCostUsd } : {}),
		...(deadlineMs !== null ? { deadlineMs } : {}),
		...(b.maxTurns !== undefined ? { maxTurns: b.maxTurns } : {}),
		...(config.verify === false ? { noVerify: true } : {}),
		...(config.isolation?.none === true ? { noIsolation: true } : {}),
		...(config.isolation?.allowDirty === true ? { allowDirty: true } : {}),
		...(config.isolation?.container === true ? { container: true } : {}),
		...(fake !== undefined ? { fake } : {}),
	};
}
