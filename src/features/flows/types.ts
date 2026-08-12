/**
 * The flow contract. A flow is DATA — a list of small named steps and how they
 * connect — never code, and never a prompt. `about` is a short phrase naming a
 * step's job ("make the tests pass"); the history composer turns that phrase
 * into the actual prompt, so nobody writes prompt text to use this.
 *
 * Everything under src/lang/ builds against these types, and nothing here
 * mentions LangChain: the substrate is swappable, the contract is not.
 */
import type { TaskKind } from "../../platform/config/types.js";

/** What a step does. "flow" runs another flow — that is how flows compose. */
export type NodeKind = "plan" | "code" | "review" | "verify" | "summarize" | "flow";

export interface FlowNode {
	id: string;
	kind: NodeKind;
	/** Short phrase naming the job, NOT a prompt. "make the tests pass". */
	about?: string;
	/** "provider/id" override; omitted means routed by learned scores. */
	model?: string;
	/** Successors; empty or absent means this node ends the flow. */
	next?: string[];
	/** For kind "flow": the name of the flow to run here. */
	flow?: string;
}

export interface FlowSpec {
	name: string;
	description?: string;
	nodes: FlowNode[];
	entry: string;
}

export interface FlowStep {
	nodeId: string;
	kind: NodeKind;
	startedAt: string;
	endedAt?: string;
	ok: boolean;
	output: string;
	promptTokens: number;
	note?: string;
}

export interface FlowState {
	task: string;
	project: string;
	/** Step output keyed by node id — what later nodes read. */
	artifacts: Record<string, string>;
	costUsd: number;
	steps: FlowStep[];
}

export interface FlowResult {
	/** The flow's name, so a result names the spec that produced it. */
	spec: string;
	state: FlowState;
	ok: boolean;
	outcome: "completed" | "blocked" | "failed";
}

/**
 * What one step produced. The runtime owns the clock and the bookkeeping; a
 * caller's runNode only has to do the work and report how it went.
 */
export interface NodeOutcome {
	ok: boolean;
	output: string;
	/** Size of the prompt the composer built — the self-improvement signal. */
	promptTokens: number;
	costUsd?: number;
	note?: string;
}

/** Runs one node. THE seam the prompt-composer slice fills. */
export type RunNode = (node: FlowNode, state: FlowState) => Promise<NodeOutcome>;

export interface FlowContext {
	runNode: RunNode;
	/** Resolves a "flow" node's target by name; null when there is no such flow. */
	resolveFlow?: (name: string) => FlowSpec | null;
}

/**
 * What a node kind reads and writes, as data. Keeping this declarative is what
 * stops the runtime from branching on kind strings in five different places.
 */
export interface NodeBehaviour {
	kind: NodeKind;
	/** Kinds whose latest artifact this one reads, in reading order. */
	reads: NodeKind[];
	/** How flusk routes and scores this step; null for "flow" (it runs no model). */
	taskKind: TaskKind | null;
	/** Fallback `about` when a spec omits one — still a phrase, not a prompt. */
	about: string;
	/** When true, `ok: false` stops the flow instead of carrying on. */
	blocking: boolean;
}
