/**
 * One frontier task = one gated agent session. Split out of goal-cmd.ts to
 * keep both files within the size standard.
 */
import { createAgent } from "../agent/agent.js";
import { loadConfig, loadRepoConfig } from "../config/config.js";
import { createEventBus } from "../core/events.js";
import { goalBrief } from "../goals/resume.js";
import type { Provider } from "../provider/provider.js";
import { createAhPolicy } from "../safety/ah-policy.js";
import type { FactStore } from "../store/types.js";
import { type CliOutcome, runWithGate } from "./gate-loop.js";
import type { GoalCmdOpts } from "./goal-cmd.js";
import { taskDescription } from "./goal-list.js";
import { attachRenderer } from "./render.js";
import { DEFAULT_TOOLS, fakeModel, pickModel } from "./run-support.js";

export async function runTask(
	opts: GoalCmdOpts,
	env: {
		store: FactStore;
		ns: string;
		provider: Provider;
		g: string;
		taskId: string;
		runId: string;
	},
): Promise<CliOutcome> {
	const cfg = loadConfig(opts.repo);
	const repoConfig = loadRepoConfig(opts.repo);
	const out = opts.out ?? process.stdout;
	const desc = await taskDescription(env.store, env.ns, env.taskId);
	const brief = await goalBrief(env.store, env.ns, env.g);
	const events = createEventBus();
	if (opts.quiet !== true) attachRenderer(events, out);
	const agent = createAgent({
		provider: env.provider,
		model: opts.fake !== undefined ? fakeModel : await pickModel(cfg, "code"),
		tools: DEFAULT_TOOLS,
		task: `${desc}\n\nGoal context: ${brief}`,
		repoRoot: opts.repo,
		policy: createAhPolicy({ config: cfg, repoRoot: opts.repo }),
		events,
		config: cfg,
		taskKind: "code",
		goalId: env.g.replace(/^Goal:/, ""),
		runId: env.runId,
	});
	try {
		const res = await runWithGate(agent, {
			cfg, repoRoot: opts.repo, repoConfig, store: env.store, ns: env.ns, out,
			noVerify: opts.noVerify === true,
		});
		return res.outcome;
	} finally {
		agent.session.close();
	}
}
