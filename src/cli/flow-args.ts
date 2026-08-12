/**
 * Flag validation for `flusk flow`, kept out of main.ts so the dispatcher stays a
 * readable table of commands — the same split `flusk run` uses (run-args.ts).
 *
 * Positionals are `flow <sub> [arg]`: the subcommand, then the task for `run`
 * or the run id for `resume`. There is no prompt flag here, and there never
 * will be: what a node is told is composed, not typed.
 *
 * `--no-isolation` and `--allow-dirty` mean here exactly what they mean for
 * `flusk run` (run-args.ts): a flow's verify nodes execute the repo's own gate
 * commands, so a flow run is isolated on a branch by default.
 */
import type { FlowCmdOpts } from "./flow-cmd.js";

const SUBS: ReadonlySet<string> = new Set(["run", "list", "resume"]);

export type ParsedFlowArgs = { ok: true; opts: FlowCmdOpts } | { ok: false; error: string };

/** parseArgs values: a repeated flag arrives as an array, hence the union. */
type Values = Record<string, string | boolean | (string | boolean)[] | undefined>;

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function parseFlowArgs(positionals: string[], v: Values, cwd: string): ParsedFlowArgs {
	const [sub, arg] = positionals;
	if (sub === undefined || !SUBS.has(sub)) {
		return { ok: false, error: "flusk: flow takes run, list or resume\n" };
	}
	if (sub !== "list" && (arg === undefined || arg.trim() === "")) {
		const what = sub === "run" ? "<task>" : "<runId>";
		return { ok: false, error: `flusk: flow ${sub} needs ${what}\n` };
	}
	const maxCost = v["max-cost"] === undefined ? undefined : Number(v["max-cost"]);
	if (maxCost !== undefined && !(maxCost > 0)) {
		return { ok: false, error: "flusk: --max-cost must be a positive number of dollars\n" };
	}
	const flow = str(v.flow);
	const project = str(v.project);
	return {
		ok: true,
		opts: {
			sub,
			...(arg === undefined ? {} : { arg }),
			repo: str(v.repo) ?? cwd,
			...(flow === undefined ? {} : { flow }),
			...(project === undefined ? {} : { project }),
			...(maxCost === undefined ? {} : { maxCostUsd: maxCost }),
			noIsolation: v["no-isolation"] === true,
			allowDirty: v["allow-dirty"] === true,
			dry: v.dry === true,
			json: v.json === true,
			quiet: v.quiet === true,
		},
	};
}
