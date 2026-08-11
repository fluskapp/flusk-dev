/**
 * LLM goal planning: one stream call producing a strict-JSON plan, parsed
 * defensively, dependency-validated (index deps, cycles dropped with a note).
 */
import type { ModelRef } from "../core/types.js";
import type { Provider } from "../provider/provider.js";
import type { FactInput, FactStore } from "../store/types.js";
import { parsePlanJson } from "./planner-parse.js";
import { goal, goalId, task, taskId } from "./schema.js";

export interface PlannedTask {
	id: string;
	description: string;
	dependsOn: string[];
}

export interface GoalPlan {
	title: string;
	tasks: PlannedTask[];
	/** Repairs made during validation (dropped cyclic/invalid edges, truncation). */
	notes: string[];
}

const SYSTEM = `You are a planner. Reply with ONLY a strict JSON object, no prose, no markdown:
{"title": string, "tasks": [{"description": string, "dependsOn": number[]}]}
At most 10 tasks. "dependsOn" lists 0-based indices of tasks in the same array
that must be done first. Order tasks so dependencies come before dependents.`;

async function collectText(provider: Provider, model: ModelRef, goalText: string): Promise<string> {
	let deltas = "";
	let final: { stopReason: string; errorMessage?: string; text: string } | undefined;
	const req = {
		model,
		system: SYSTEM,
		messages: [{ role: "user" as const, content: goalText }],
		tools: [],
	};
	for await (const ev of provider.stream(req, new AbortController().signal)) {
		if (ev.type === "text_delta") deltas += ev.text;
		else if (ev.type === "done") {
			const text = ev.message.content
				.filter((b) => b.type === "text")
				.map((b) => b.text)
				.join("");
			final = { stopReason: ev.message.stopReason, errorMessage: ev.message.errorMessage, text };
		}
	}
	if (!final || final.stopReason === "error" || final.stopReason === "aborted")
		throw new Error(`planner: model call failed: ${final?.errorMessage ?? "no done event"}`);
	return final.text || deltas;
}

/** DFS back-edge removal — mutates deps in place, returns one note per drop. */
function dropCycles(deps: number[][]): string[] {
	const notes: string[] = [];
	const state: Array<0 | 1 | 2> = deps.map(() => 0);
	const visit = (i: number): void => {
		state[i] = 1;
		const kept: number[] = [];
		for (const d of deps[i] ?? []) {
			if (state[d] === 1) {
				notes.push(`dropped cyclic dependency: task ${i} -> task ${d}`);
				continue;
			}
			if (state[d] === 0) visit(d);
			kept.push(d);
		}
		deps[i] = kept;
		state[i] = 2;
	};
	for (let i = 0; i < deps.length; i++) if (state[i] === 0) visit(i);
	return notes;
}

export async function planGoal(
	provider: Provider,
	model: ModelRef,
	goalText: string,
): Promise<GoalPlan> {
	const parsed = parsePlanJson(await collectText(provider, model, goalText));
	const notes: string[] = [];
	if (parsed.tasks.length > 10) {
		parsed.tasks = parsed.tasks.slice(0, 10);
		notes.push("plan truncated to 10 tasks");
	}
	const n = parsed.tasks.length;
	const deps = parsed.tasks.map((t, i) =>
		[...new Set(t.dependsOn)].filter((d) => {
			if (Number.isInteger(d) && d >= 0 && d < n && d !== i) return true;
			notes.push(`dropped invalid dependency: task ${i} -> ${d}`);
			return false;
		}),
	);
	notes.push(...dropCycles(deps));
	const ids = parsed.tasks.map(() => taskId());
	return {
		title: parsed.title,
		notes,
		tasks: parsed.tasks.map((t, i) => ({
			id: ids[i] ?? taskId(),
			description: t.description,
			dependsOn: (deps[i] ?? []).map((d) => ids[d] ?? ""),
		})),
	};
}

/**
 * Write the whole graph. One transact may not carry two asserts on the same
 * (subject, predicate), so multi-edge predicates (has_task, depends_on) are
 * chunked into the minimal number of waves — wave 1 carries the goal, every
 * task, and each subject's first edge; wave k the k-th edges.
 */
export async function writeGoalGraph(
	store: FactStore,
	ns: string,
	plan: GoalPlan,
): Promise<string> {
	const g = goalId();
	const waves: FactInput[][] = [];
	const put = (f: FactInput): void => {
		let i = 0;
		while ((waves[i] ?? []).some((w) => w.subject === f.subject && w.predicate === f.predicate))
			i++;
		const wave = waves[i] ?? [];
		wave.push(f);
		waves[i] = wave;
	};
	put(goal.title(g, plan.title));
	put(goal.status(g, "planned"));
	for (const t of plan.tasks) {
		put(goal.hasTask(g, t.id));
		put(task.description(t.id, t.description));
		put(task.status(t.id, "pending"));
		for (const dep of t.dependsOn) put(task.dependsOn(t.id, dep));
	}
	for (const wave of waves) await store.transact(ns, wave);
	return g;
}
