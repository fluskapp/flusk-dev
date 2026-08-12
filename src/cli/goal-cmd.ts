/**
 * `flusk goal <text>`: plan a task graph with the plan-kind model, write it to
 * the fact store, then execute frontier tasks one by one — each as a full
 * agent session behind the same verification gate as `flusk run`. The graph IS
 * the store: task status, claims and dependencies are facts, which is what
 * lets a second session join a goal already in flight. `--dry` plans and
 * prints only.
 */
import { randomUUID } from "node:crypto";
import { loadConfig, loadRepoConfig } from "../platform/config/config.js";
import { type GoalPlan, planGoal, writeGoalGraph } from "../features/goals/planner.js";
import { claimTask, completeTask, failTask, frontier } from "../features/goals/scheduler.js";
import { resetFailedTasks, writeGoalStatus } from "../features/goals/schema.js";
import { resolveNamespace } from "../features/facts/namespaces.js";
import { FakeProvider } from "../features/provider/fake.js";
import { hasAuth, PiAiProvider } from "../features/provider/pi-ai.js";
import type { Provider } from "../features/provider/provider.js";
import { createFactStore } from "../features/facts/facts.repository.js";
import type { CliOutcome } from "./gate-loop.js";
import { allTasksDone, renderGoalList } from "./goal-list.js";
import { runTask } from "./goal-task.js";
import { envKeyVar, fakeModel, loadFakeScript, pickModel } from "./run-support.js";

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
	const ns = resolveNamespace(opts.repo, loadRepoConfig(opts.repo));
	// The graph IS the store: task status, claims and dependencies are facts,
	// so there is no version of this command that records nothing.
	if (!cfg.memory.enabled) {
		out.write("flusk goal needs the fact store: the goal graph has nowhere else to live.\n");
		return "blocked";
	}
	const store = createFactStore();
	if (opts.list === true) {
		out.write(await renderGoalList(store, ns));
		return "completed";
	}
	if (opts.goal === undefined) throw new Error("flusk goal needs <text> or --list");
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
	const g = await writeGoalGraph(store, ns, plan);
	await writeGoalStatus(store, ns, g, "active");
	out.write(`goal ${g} written (${plan.tasks.length} tasks)\n`);
	for (;;) {
		const front = await frontier(store, ns, g);
		if (front.length === 0) {
			if (await allTasksDone(store, ns, g)) {
				await writeGoalStatus(store, ns, g, "done");
				out.write("goal done\n");
				return "completed";
			}
			// A goal is only truly stuck if nothing can be retried: returning
			// failed tasks to pending unwedges the graph for the next attempt.
			const reset = await resetFailedTasks(store, ns, g);
			if (reset.length > 0) {
				out.write(`goal stalled: reset ${reset.length} failed task(s) — rerun to retry\n`);
			} else {
				out.write("goal stalled: no runnable tasks remain\n");
			}
			return "blocked";
		}
		// Try the whole frontier before giving up: a lost claim means another
		// session took that task, not that the goal is stuck. Bounded, because
		// an unbounded `continue` here is a hot loop over the log.
		let taskId: string | undefined;
		let runId = "";
		for (const candidate of front) {
			const id = randomUUID().slice(0, 8);
			if ((await claimTask(store, ns, candidate, id)) !== null) {
				taskId = candidate;
				runId = id;
				break;
			}
		}
		if (taskId === undefined) {
			out.write(`could not claim any of ${front.length} runnable task(s); stopping\n`);
			return "blocked";
		}
		const outcome = await runTask(opts, { store, ns, provider, g, taskId, runId });
		if (outcome !== "completed") {
			await failTask(store, ns, taskId);
			out.write(`task ${taskId} failed (${outcome}); stopping\n`);
			return outcome;
		}
		await completeTask(store, ns, taskId);
		out.write(`task ${taskId} done\n`);
	}
}
