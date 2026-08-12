/**
 * `flusk flow` — the whole flow runtime, in three subcommands and no prompt.
 *
 *   flusk flow run <task>   the shape is chosen from the task unless --flow names
 *                        one; --dry composes and prints every node's prompt
 *                        without calling a model, so a run can be audited
 *                        before it is paid for.
 *   flusk flow list         built-in and user flows as one arrow chain each.
 *   flusk flow resume <id>  continue a run from its last checkpoint.
 *
 * The only string a user writes is the task: everything a model sees is
 * composed by src/history/compose.ts (see src/ui/flow-plan.ts). Exit 0 only
 * when the run completed and was not blocked.
 *
 * A real run isolates itself first (flow-isolation.ts) and says which verify
 * commands it is about to execute, because a flow node's gate runs those in the
 * user's own checkout.
 */
import { loadConfig, loadRepoConfig } from "../platform/config/config.js";
import { type Importer, langMissing, loadLang } from "../features/flows/deps.js";
import { loadFlows } from "../features/flows/flow-files.repository.js";
import { flowByName, flowResolver } from "../features/flows/library.js";
import { planFlow } from "../features/flows/planner.js";
import { newRunId } from "../features/flows/record.repository.js";
import { type RunFlowOpts, runFlow } from "../features/flows/runner.js";
import type { FlowSpec } from "../features/flows/types.js";
import { createFactStore } from "../features/facts/facts.repository.js";
import { shapeOf } from "../features/flows/flow-shape.js";
import { prepareRun } from "./flow-isolation.js";
import { renderRunSummary } from "./flow-render.js";
import { resumed } from "./flow-resume.js";
import { dryPlanText, flowListText } from "./flow-views.js";
import type { CliOutcome } from "./gate-loop.js";

export interface FlowCmdOpts {
	/** "run", "list" or "resume". */
	sub: string;
	/** The task for `run`, the run id for `resume`. */
	arg?: string;
	repo: string;
	flow?: string;
	project?: string;
	maxCostUsd?: number;
	/** `--no-isolation`: skip the run branch and the clean-tree demand. */
	noIsolation?: boolean;
	/** `--allow-dirty`: isolate, but do not insist on a clean tree first. */
	allowDirty?: boolean;
	dry?: boolean;
	json?: boolean;
	quiet?: boolean;
	out?: NodeJS.WritableStream;
	/** Test seam handed straight to the runtime: an already-built chat model. */
	chat?: RunFlowOpts["chat"];
	/** Test seam: how the optional LangGraph packages are resolved. */
	lang?: Importer;
}

export const FLOW_USAGE = `Usage:
  flusk flow run <task> [--flow <name>] [--project <p>] [--max-cost <usd>] [--dry] [--json]
                     [--no-isolation] [--allow-dirty]
  flusk flow list [--json]
  flusk flow resume <runId>
`;

const write = (out: NodeJS.WritableStream, text: string): void => void out.write(text);

export async function flowCmd(opts: FlowCmdOpts): Promise<CliOutcome> {
	const out = opts.out ?? process.stdout;
	if (opts.sub !== "list" && opts.sub !== "run" && opts.sub !== "resume") {
		write(out, FLOW_USAGE);
		return "error";
	}
	if (opts.sub === "list") {
		write(out, await flowListText(opts.repo, opts.json === true));
		return "completed";
	}
	if (opts.arg === undefined || opts.arg.trim() === "") {
		write(out, FLOW_USAGE);
		return "error";
	}
	const { flows, errors } = await loadFlows(opts.repo);
	for (const error of errors) write(out, `flow skipped: ${error}\n`);
	if (opts.flow !== undefined && flowByName(opts.flow, flows) === null) {
		write(out, `flusk: no flow named "${opts.flow}" — try: ${flows.map((f) => f.name).join(", ")}\n`);
		return "error";
	}
	const resume = opts.sub === "resume";
	let spec: FlowSpec;
	let task: string;
	try {
		const from = resume ? await resumed(opts.arg, flows) : null;
		task = from?.task ?? opts.arg;
		spec =
			from?.spec ??
			planFlow(task, { flows, ...(opts.flow === undefined ? {} : { flow: opts.flow }) }).spec;
	} catch (e) {
		write(out, `flusk: ${e instanceof Error ? e.message : String(e)}\n`);
		return "error";
	}
	const scope = opts.project === undefined ? {} : { project: opts.project };
	if (opts.dry === true) {
		const named = opts.flow ?? spec.name;
		const at = { repoRoot: opts.repo, flows, ...scope, flow: named };
		write(out, await dryPlanText(task, at, opts.json === true));
		return "completed";
	}
	if ((await loadLang(opts.lang)) === null) {
		write(out, `flusk flow needs the LangGraph runtime:\n  ${langMissing()}\n`);
		return "error";
	}
	const cfg = loadConfig(opts.repo);
	if (opts.maxCostUsd !== undefined) cfg.budgets.maxCostUsd = opts.maxCostUsd;
	const repoConfig = loadRepoConfig(opts.repo);
	// Said out loud before a model is paid for: where the run will happen, and
	// which commands it is about to execute in the user's checkout.
	const ready = prepareRun(opts.repo, cfg, repoConfig, {
		off: opts.noIsolation === true,
		allowDirty: opts.allowDirty === true,
	});
	if ("error" in ready) {
		write(out, `flusk: ${ready.error}\n`);
		return "error";
	}
	if (opts.quiet !== true) write(out, `${ready.lines.join("\n")}\n`);
	const runId = resume ? opts.arg : newRunId(spec.name);
	// `memory.enabled: false` is a request to leave no trace: the flow still
	// runs, it just has nowhere to write its facts of record.
	const store = cfg.memory.enabled ? createFactStore() : null;
	const result = await runFlow(spec, task, cfg, {
		repoRoot: opts.repo,
		repoConfig,
		flows,
		store,
		...scope,
		runId,
		...(resume ? { resume: true } : {}),
		...(opts.chat === undefined ? {} : { chat: opts.chat }),
	});
	const text =
		opts.json === true
			? `${JSON.stringify(result, null, 2)}\n`
			: renderRunSummary(result, shapeOf(spec, flowResolver(flows)), runId);
	write(out, text);
	return result.ok && result.outcome === "completed" ? "completed" : "blocked";
}
