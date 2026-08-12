import type { TaskKind } from "../../platform/config/types.js";

/**
 * Heuristic task classification (linof-harness intent parity). Cheap and
 * deterministic; an LLM-based classifier can replace it later behind the
 * same signature.
 */
const REVIEW = /\b(review|reviews|reviewing|pull request|pr|prs|audit|auditing|critique)\b/i;
const PLAN = /\b(plan|planning|design|designing|architect|architecture|spec|specification|roadmap)\b/i;
const SUMMARIZE = /\b(summarize|summarise|summary|explain|explaining|describe|describing|overview)\b/i;

export function classifyTask(task: string): TaskKind {
	if (REVIEW.test(task)) return "review";
	if (PLAN.test(task)) return "plan";
	if (SUMMARIZE.test(task)) return "summarize";
	return "code";
}
