/**
 * `ah goal <text>`: plan a task graph with the plan-kind model, write it to
 * abagraph, then execute frontier tasks one by one — each as a full agent
 * session behind the same verification gate as `ah run`. Requires a live
 * memory client; the goal graph IS memory. `--dry` plans and prints only.
 */
import { randomUUID } from "node:crypto";
import { createAgent } from "../agent/agent.js";
import { loadConfig, loadRepoConfig } from "../config/config.js";
import { createEventBus } from "../core/events.js";
import { type GoalPlan, planGoal, writeGoalGraph } from "../goals/planner.js";
import { goalBrief } from "../goals/resume.js";
import { claimTask, completeTask, failTask, frontier } from "../goals/scheduler.js";
import { resetFailedTasks, writeGoalStatus } from "../goals/schema.js";
import { AbagraphMemoryPort } from "../memory/abagraph-port.js";
import { createMemory, type MemorySetup } from "../memory/bootstrap.js";
import { FakeProvider } from "../provider/fake.js";
import { hasAuth, PiAiProvider } from "../provider/pi-ai.js";
import type { Provider } from "../provider/provider.js";
import { createAhPolicy } from "../safety/ah-policy.js";
import { type CliOutcome, runWithGate } from "./gate-loop.js";
import { allTasksDone, renderGoalList, taskDescription } from "./goal-list.js";
import { runTask } from "./goal-task.js";
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
	/** `--no-extensions`: run with the built-in toolbelt alone, for one command. */
	noExtensions?: boolean;
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

export async function goalCmd(opts: GoalCmdOpts): Promise<CliOutcome> {
	const out = opts.out ?? process.stdout;
	const cfg = loadConfig(opts.repo);
	const mem = await createMemory(cfg, opts.repo, loadRepoConfig(opts.repo));
	if (mem.client === null) {
		throw new Error(
			`ah goal needs a reachable abagraph memory server (memory.enabled + ${cfg.memory.baseUrl})`,
		);
	}
	if (opts.list === true) {
		out.write(await renderGoalList(mem.client, mem.ns));
		return "completed";
	}
	if (opts.goal === undefined) throw new Error("ah goal needs <text> or --list");
	const isFake = opts.fake !== undefined;
	const planModel = isFake ? fakeModel : await pickModel(cfg, "plan");
	if (!isFake && !(await hasAuth(planModel.provider))) {
		throw new Error(
			`no credentials for provider "${planModel.provider}"; set ${envKeyVar(planModel.provider)}`,
		);
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
			// A goal is only truly stuck if nothing can be retried: returning
			// failed tasks to pending unwedges the graph for the next attempt.
			const reset = await resetFailedTasks(mem.client, mem.ns, g);
			if (reset.length > 0) {
				out.write(`goal stalled: reset ${reset.length} failed task(s) — rerun to retry\n`);
			} else {
				out.write("goal stalled: no runnable tasks remain\n");
			}
			return "blocked";
		}
		// Try the whole frontier before giving up: a lost claim means another
		// session took that task, not that the goal is stuck. Bounded, because
		// an unbounded `continue` here is a hot loop against the server.
		let taskId: string | undefined;
		let runId = "";
		for (const candidate of front) {
			const id = randomUUID().slice(0, 8);
			if ((await claimTask(mem.client, mem.ns, candidate, id)) !== null) {
				taskId = candidate;
				runId = id;
				break;
			}
		}
		if (taskId === undefined) {
			out.write(`could not claim any of ${front.length} runnable task(s); stopping\n`);
			return "blocked";
		}
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
