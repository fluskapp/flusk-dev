/**
 * The goal graph as a READ shape: goals with their tasks, each task carrying
 * its dependencies and the runs that attempted it. Extracted from the CLI's
 * goal-list so the UI and the CLI read one graph — same store access, same
 * namespace discipline, no goal ever read across namespaces.
 *
 * Every query is uncapped on purpose: a truncated page renders a real task as
 * missing, which reads as a graph the harness has lost track of rather than
 * as a short answer.
 */
import type { FactStore } from "../facts/types.js";
import { NO_LIMIT } from "../facts/visibility.js";

export interface GoalNode {
	id: string;
	title: string;
	status: string;
	tasks: TaskNode[];
}

export interface TaskNode {
	id: string;
	description: string;
	status: string;
	dependsOn: string[];
	attemptedBy: string[];
}

/** Multi-valued edges grouped by subject, in stored (oldest-first) order. */
function bySubject(rows: ReadonlyArray<{ subject: string; object: string }>): Map<string, string[]> {
	const out = new Map<string, string[]>();
	for (const r of rows) out.set(r.subject, [...(out.get(r.subject) ?? []), r.object]);
	return out;
}

/**
 * Goals in title order (title order IS store order, oldest first), tasks in
 * edge order. A missing status reads "unknown" and a missing description ""
 * — the exact defaults the CLI has always printed, so rendering from this
 * shape stays byte-identical with the pre-extraction output.
 */
export async function loadGoalGraph(store: FactStore, ns: string): Promise<GoalNode[]> {
	const [titles, statuses, edges, descs, deps, attempts] = await Promise.all([
		store.query(ns, { predicate: "title", limit: NO_LIMIT }),
		store.query(ns, { predicate: "status", limit: NO_LIMIT }),
		store.query(ns, { predicate: "has_task", limit: NO_LIMIT }),
		store.query(ns, { predicate: "description", limit: NO_LIMIT }),
		store.query(ns, { predicate: "depends_on", limit: NO_LIMIT }),
		store.query(ns, { predicate: "attempted_by", limit: NO_LIMIT }),
	]);
	const statusOf = new Map(statuses.map((f) => [f.subject, f.object]));
	const descOf = new Map(descs.map((f) => [f.subject, f.object]));
	const tasksOf = bySubject(edges);
	const depsOf = bySubject(deps);
	const attemptsOf = bySubject(attempts);
	return titles.map((t) => ({
		id: t.subject,
		title: t.object,
		status: statusOf.get(t.subject) ?? "unknown",
		tasks: (tasksOf.get(t.subject) ?? []).map((task) => ({
			id: task,
			description: descOf.get(task) ?? "",
			status: statusOf.get(task) ?? "unknown",
			dependsOn: depsOf.get(task) ?? [],
			attemptedBy: attemptsOf.get(task) ?? [],
		})),
	}));
}
