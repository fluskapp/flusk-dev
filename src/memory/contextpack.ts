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
	// /api/context serves settled facts only. Everything the agent remembered
	// and every extracted lesson is written at <= 0.7, which lands as a
	// Candidate — invisible there — so those are fetched separately and
	// appended, or the whole learning path would be write-only.
	const candidates = await candidateFacts(client, opts);
	const facts = dedupe([
		...(repo.status === "fulfilled" ? repo.value : []),
		...(lessons.status === "fulfilled" ? lessons.value : []),
		...candidates,
	]);
	if (facts.length === 0) return null;
	return `<memory>\n${facts.map(factLine).join("\n")}\n</memory>`;
}

function dedupe(facts: MemFact[]): MemFact[] {
	const seen = new Set<string>();
	return facts.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

/** Best-effort: a candidate read failing must not cost us the settled block. */
async function candidateFacts(
	client: MemoryClient,
	opts: MemoryBlockOpts,
): Promise<MemFact[]> {
	const budget = Math.max(1, Math.round((opts.budgets.repo + opts.budgets.lessons) / 200));
	const pull = async (ns: string): Promise<MemFact[]> => {
		try {
			const rows = await client.query(ns, { status: "candidate", limit: 500 });
			return rows.slice(-budget); // newest candidates first-class
		} catch {
			return [];
		}
	};
	const [a, b] = await Promise.all([pull(opts.repoNs), pull(LESSONS_NS)]);
	return [...a, ...b];
}
