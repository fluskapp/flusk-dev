/**
 * One frontier task = one gated agent session on a fresh memory snapshot.
 * Split out of goal-cmd.ts to keep both files within the size standard.
 */
import { createAgent } from "../agent/agent.js";
import { loadConfig, loadRepoConfig } from "../config/config.js";
import { createEventBus } from "../core/events.js";
import { goalBrief } from "../goals/resume.js";
import { AbagraphMemoryPort } from "../memory/abagraph-port.js";
import type { MemorySetup } from "../memory/bootstrap.js";
import type { Provider } from "../provider/provider.js";
import { createAhPolicy } from "../safety/ah-policy.js";
import { type CliOutcome, runWithGate } from "./gate-loop.js";
import { taskDescription } from "./goal-list.js";
import type { GoalCmdOpts } from "./goal-cmd.js";
import { attachRenderer } from "./render.js";
import { DEFAULT_TOOLS, fakeModel, pickModel } from "./run-support.js";

export async function runTask(
	opts: GoalCmdOpts,
	env: { mem: MemorySetup; provider: Provider; g: string; taskId: string; runId: string },
): Promise<CliOutcome> {
	const client = env.mem.client as NonNullable<MemorySetup["client"]>;
	const cfg = loadConfig(opts.repo);
	const repoConfig = loadRepoConfig(opts.repo);
	const out = opts.out ?? process.stdout;
	const desc = await taskDescription(client, env.mem.ns, env.taskId);
	const brief = await goalBrief(client, env.mem.ns, env.g);
	const events = createEventBus();
	if (opts.quiet !== true) attachRenderer(events, out);
	const agent = createAgent({
		provider: env.provider,
		model: opts.fake !== undefined ? fakeModel : await pickModel(cfg, "code"),
		tools: DEFAULT_TOOLS,
		task: `${desc}\n\nGoal context: ${brief}`,
		repoRoot: opts.repo,
		// Fresh port per task so each session gets a current <memory> snapshot.
		memory: new AbagraphMemoryPort({ client, repoNs: env.mem.ns, budgets: cfg.memory.budgets }),
		policy: createAhPolicy({ config: cfg, repoRoot: opts.repo }),
		events,
		config: cfg,
		taskKind: "code",
		goalId: env.g.replace(/^Goal:/, ""),
		runId: env.runId,
	});
	try {
		const res = await runWithGate(agent, {
			cfg, repoRoot: opts.repo, repoConfig, client, ns: env.mem.ns, out,
			noVerify: opts.noVerify === true,
		});
		return res.outcome;
	} finally {
		agent.session.close();
	}
}

