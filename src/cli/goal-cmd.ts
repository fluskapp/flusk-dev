/**
 * `hit goal <text>`: plan a task graph with the plan-kind model, write it to
 * abagraph, then execute frontier tasks one by one — each as a full agent
 * session behind the same verification gate as `hit run`. Requires a live
 * memory client; the goal graph IS memory. `--dry` plans and prints only.
 */
import { randomUUID } from "node:crypto";
import { createAgent } from "../agent/agent.js";
import { loadConfig, loadRepoConfig } from "../config/config.js";
import { createEventBus } from "../core/events.js";
import { type GoalPlan, planGoal, writeGoalGraph } from "../goals/planner.js";
import { goalBrief } from "../goals/resume.js";
import { claimTask, completeTask, failTask, frontier } from "../goals/scheduler.js";
import { writeGoalStatus } from "../goals/schema.js";
import { AbagraphMemoryPort } from "../memory/abagraph-port.js";
import { createMemory, type MemorySetup } from "../memory/bootstrap.js";
import { FakeProvider } from "../provider/fake.js";
import { hasAuth, PiAiProvider } from "../provider/pi-ai.js";
import type { Provider } from "../provider/provider.js";
import { createHitPolicy } from "../safety/hit-policy.js";
import { type CliOutcome, runWithGate } from "./gate-loop.js";
import { allTasksDone, renderGoalList, taskDescription } from "./goal-list.js";
import { attachRenderer } from "./render.js";
import { DEFAULT_TOOLS, envKeyVar, fakeModel, loadFakeScript, pickModel } from "./run-support.js";

export interface GoalCmdOpts {
	goal?: string;
	list?: boolean;
	repo: string;
	dry?: boolean;
	fake?: string;
	noVerify?: boolean;
	quiet?: boolean;
	out?: NodeJS.WritableStream;
}

function renderPlan(plan: GoalPlan): string {
	const lines = [`plan: ${plan.title}`];
	for (const t of plan.tasks) {
		const deps = t.dependsOn.length > 0 ? ` (after ${t.dependsOn.join(", ")})` : "";
		lines.push(`  ${t.id} ${t.description}${deps}`);
	}
	for (const note of plan.notes) lines.push(`  note: ${note}`);
	return `${lines.join("\n")}\n`;
}

/** One frontier task = one gated agent session on a fresh memory snapshot. */
async function runTask(
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
		policy: createHitPolicy({ config: cfg, repoRoot: opts.repo }),
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

export async function goalCmd(opts: GoalCmdOpts): Promise<CliOutcome> {
	const out = opts.out ?? process.stdout;
	const cfg = loadConfig(opts.repo);
	const mem = await createMemory(cfg, opts.repo, loadRepoConfig(opts.repo));
	if (mem.client === null) {
		throw new Error(
			`hit goal needs a reachable abagraph memory server (memory.enabled + ${cfg.memory.baseUrl})`,
		);
	}
	if (opts.list === true) {
		out.write(await renderGoalList(mem.client, mem.ns));
		return "completed";
	}
	if (opts.goal === undefined) throw new Error("hit goal needs <text> or --list");
	const isFake = opts.fake !== undefined;
	const planModel = isFake ? fakeModel : await pickModel(cfg, "plan");
	if (!isFake && !(await hasAuth(planModel.provider))) {
		throw new Error(`no credentials for provider "${planModel.provider}"; set ${envKeyVar(planModel.provider)}`);
	}
	const provider: Provider = isFake
		? new FakeProvider(await loadFakeScript(opts.fake as string))
		: new PiAiProvider();
	const plan = await planGoal(provider, planModel, opts.goal);
	out.write(renderPlan(plan));
	if (opts.dry === true) return "completed";
	const g = await writeGoalGraph(mem.client, mem.ns, plan);
	await writeGoalStatus(mem.client, mem.ns, g, "active");
	out.write(`goal ${g} written (${plan.tasks.length} tasks)\n`);
	for (;;) {
		const front = await frontier(mem.client, mem.ns, g);
		if (front.length === 0) {
			if (await allTasksDone(mem.client, mem.ns, g)) {
				await writeGoalStatus(mem.client, mem.ns, g, "done");
				out.write("goal done\n");
				return "completed";
			}
			out.write("goal stalled: no runnable tasks remain\n");
			return "blocked";
		}
		const taskId = front[0] as string;
		const runId = randomUUID().slice(0, 8);
		if ((await claimTask(mem.client, mem.ns, taskId, runId)) === null) continue;
		const outcome = await runTask(opts, { mem, provider, g, taskId, runId });
		if (outcome !== "completed") {
			await failTask(mem.client, mem.ns, taskId);
			out.write(`task ${taskId} failed (${outcome}); stopping\n`);
			return outcome;
		}
		await completeTask(mem.client, mem.ns, taskId);
		out.write(`task ${taskId} done\n`);
	}
}
