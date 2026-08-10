/**
 * Builds the <memory> system block injected on the first turn / resume:
 * one contextPack call against the repo namespace (goal-directed, seeded
 * with the Repo — and Goal, when set — subjects) and one against the
 * cross-repo lessons namespace, each under its own token budget.
 */
import type { MemFact, MemoryClient } from "./client-types.js";
import { LESSONS_NS } from "./namespaces.js";

export interface MemoryBlockOpts {
	repoNs: string;
	task: string;
	goalId?: string;
	budgets: { repo: number; lessons: number };
}

/** Compact one-line rendering shared by the block and the memory tools. */
export function factLine(f: MemFact): string {
	return `${f.subject} ${f.predicate} ${f.object} (conf ${f.confidence})`;
}

/**
 * Returns the rendered <memory> block (repo facts first, then lessons),
 * or null when both namespaces come back empty. One failing contextPack
 * degrades to the other; both failing rejects — the caller (bootstrap)
 * owns degrading memory off entirely.
 */
export async function buildMemoryBlock(
	client: MemoryClient,
	opts: MemoryBlockOpts,
): Promise<string | null> {
	const seeds = [`Repo:${opts.repoNs.replace(/^repo:/, "")}`];
	if (opts.goalId !== undefined) seeds.push(`Goal:${opts.goalId}`);
	const [repo, lessons] = await Promise.allSettled([
		client.contextPack(opts.repoNs, {
			goal: opts.task,
			seeds,
			tokenBudget: opts.budgets.repo,
		}),
		client.contextPack(LESSONS_NS, { goal: opts.task, tokenBudget: opts.budgets.lessons }),
	]);
	if (repo.status === "rejected" && lessons.status === "rejected") throw repo.reason;
	const facts = [
		...(repo.status === "fulfilled" ? repo.value : []),
		...(lessons.status === "fulfilled" ? lessons.value : []),
	];
	if (facts.length === 0) return null;
	return `<memory>\n${facts.map(factLine).join("\n")}\n</memory>`;
}
