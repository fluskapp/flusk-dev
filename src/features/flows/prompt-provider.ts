/**
 * The prompt a flow step runs on — which nobody wrote.
 *
 * The whole point of the runtime is that a step declares WHAT it is for (a kind
 * and, at most, a phrase) and never HOW to say it. So there is exactly one line
 * of generated instruction here — an imperative built from kind plus `about` —
 * and every other byte is retrieved evidence carrying its own provenance: house
 * rules, precedent that shipped, attempts that did not, and the DON'Ts mined
 * from them.
 *
 * The retrieval query is assembled the same way: the flow task, the step's
 * phrase, its kind, and the terms its inherited artifacts talk about. That last
 * part is what makes a code step search for what its OWN plan decided, so later
 * steps inherit earlier context without anyone wiring step to step by hand.
 *
 * Composition is `src/history/` — buildWalkthrough then composePrompt, the path
 * `flusk prompt` already takes. A second composer would be a second set of ranking
 * bugs, and the whole feature rests on this one being good.
 */
import { buildIndex } from "../history/bm25.js";
import { estimateTokens } from "../history/budget.js";
import { composePrompt } from "../history/compose.js";
import { historyCards } from "../history/corpus.js";
import { renderBlocks } from "../history/render-blocks.js";
import type { ComposedPrompt, HistoryCard, PromptBlock, Walkthrough } from "../history/types.js";
import { buildWalkthrough, type Searchable } from "../history/walkthrough.js";
import { type Carried, type Extra, nodeContext } from "./context.js";
import { BUDGETS, jobLine, retrievalQuery } from "./prompt-kinds.js";
import type { FlowNode, FlowState, NodeKind } from "./types.js";

export interface NodePromptConfig {
	/** A corpus built once by the runner and reused for every step. */
	index?: Searchable;
	/** Raw cards instead of an index; `[]` means "nothing indexed yet". */
	cards?: HistoryCard[];
	/** Scope; defaults to the flow's own project. */
	project?: string;
	budgets?: Partial<Record<NodeKind, number>>;
	contextTokens?: number;
	/** Evidence the caller already holds — the failed gate a retry must read. */
	carry?: Extra[];
	now?: number;
}

export interface NodePrompt {
	text: string;
	tokens: number;
	/** Every section's origin, in order — the audit trail `flusk prompt` prints. */
	sources: string[];
	/** The history scope this was actually built from. */
	scope: string;
	/** True when `scope` knew nothing and every project was searched instead. */
	widened: boolean;
}

/**
 * Reading order: the job, the task, what this flow already produced, then the
 * retrieved evidence, then the constraints. Inherited artifacts sit directly
 * under the task because they are the most specific thing in the prompt — the
 * plan for THIS work outranks the best precedent from somebody else's.
 *
 * The carried entries are SPLICED IN as blocks and the whole thing goes through
 * `renderBlocks`, so what a node is sent and what `flusk prompt` prints cannot
 * drift; `why: true` is the difference, and it is what tells a retrying step
 * that the artifact above it is the one that failed.
 */
function render(
	job: string,
	composed: ComposedPrompt,
	carried: Carried[],
): Omit<NodePrompt, "scope" | "widened"> {
	const carriedBlocks: PromptBlock[] = carried.map((c) => ({
		source: c.source,
		why: c.why,
		text: c.text,
		tokens: c.tokens,
	}));
	const isTask = (b: PromptBlock): boolean => b.source === "task";
	const blocks = [
		...composed.blocks.filter(isTask),
		...carriedBlocks,
		...composed.blocks.filter((b) => !isTask(b)),
	];
	const text = `${job}\n\n${renderBlocks({ ...composed, blocks }, { why: true })}`;
	const sources = ["job", ...blocks.map((b) => b.source)];
	if (composed.constraints.length > 0) sources.push("Constraints");
	return { text, tokens: estimateTokens(text), sources };
}

const empty = (w: Walkthrough): boolean =>
	w.precedent.length + w.attempts.length + w.conventions.length + w.traps.length === 0;

/**
 * Scoped to the flow's project, widened when that scope knows nothing — the
 * same trade `flusk prompt` makes. A flow run in an unindexed checkout should
 * still get the machine's precedent rather than a prompt of nothing but task.
 * The widening is REPORTED, because a prompt quietly built from four other
 * projects' history is exactly the thing a reader needs to be told about.
 */
function evidence(
	index: Searchable,
	query: string,
	project: string | undefined,
	now?: number,
): { walkthrough: Walkthrough; widened: boolean } {
	const when = now === undefined ? {} : { now };
	const all = (): Walkthrough => buildWalkthrough(index, query, when);
	if (project === undefined) return { walkthrough: all(), widened: false };
	const scoped = buildWalkthrough(index, query, { ...when, project });
	if (!empty(scoped)) return { walkthrough: scoped, widened: false };
	const wide = all();
	return { walkthrough: wide, widened: !empty(wide) };
}

/** The prompt for one step, assembled from what already happened here. */
export function nodePrompt(
	node: FlowNode,
	state: FlowState,
	cfg: NodePromptConfig = {},
): NodePrompt {
	const carried = nodeContext(node, state, cfg.contextTokens, cfg.carry ?? []);
	const index: Searchable = cfg.index ?? buildIndex(cfg.cards ?? historyCards());
	const asked = cfg.project ?? state.project;
	const scope = asked?.trim() === "" ? undefined : asked;
	const query = retrievalQuery(node, state, carried);
	const found = evidence(index, query, scope, cfg.now);
	const budget = cfg.budgets?.[node.kind] ?? BUDGETS[node.kind];
	const composed = composePrompt(found.walkthrough, state.task, { budget });
	return {
		...render(jobLine(node), composed, carried),
		scope: scope ?? "all projects",
		widened: found.widened,
	};
}
