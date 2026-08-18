/**
 * The merged feed's row model: a flusk session, a harness journal, or a flow
 * run — one shape the table sorts, speed-searches and paints without asking
 * which loader a row came from (docs/experience.md: a flow run IS a run).
 * Flow rows carry their steps, so the progress cell draws the same stage
 * chips a harness run gets, and the arrow shape the flow library prints.
 */
import type { FlowRunRow, FlowRunStep } from "../../../features/flows/flows.functions.js";
import type { RunRow } from "../../../features/projects/runs.functions.js";
import { statusToVerdict, type Verdict } from "../../../features/run/verdict.types.js";
import type { StageView } from "./stages.js";

/** The segment control's positions. "all" is what an absent ?kind= means. */
export const FEED_KINDS = ["all", "session", "journal", "flow"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];
export const FEED_LABEL: Record<FeedKind, string> = {
	all: "All",
	session: "Sessions",
	journal: "Journals",
	flow: "Flows",
};

/** A URL is typed by hand too: anything unrecognized falls back to "all". */
export const feedKind = (s: string | undefined): FeedKind =>
	(FEED_KINDS as readonly string[]).includes(s ?? "") ? (s as FeedKind) : "all";

/** One row: RunRow's fields, widened by what only a flow run has. */
export interface FeedRow {
	id: string;
	kind: "session" | "journal" | "flow";
	project: string;
	title: string;
	status: string;
	at: string;
	/** Session key or journal path. A flow run without a journal has none. */
	ref: string;
	costUsd?: number;
	/** Unified verdict (D1); sort and speed-search index it. */
	verdict?: Verdict;
	filesTouched?: number;
	/** Journals only: stage progress, e.g. "8/13 · gate". */
	progress?: string;
	/** Flow rows only: which flow ran, its arrow chain, and the steps. */
	flow?: string;
	shape?: string;
	steps?: FlowRunStep[];
}

/** The flow's one-line arrow chain, from the nodes that actually ran —
 * a retried node appears once, as the shape names it once. */
export function shapeLine(steps: FlowRunStep[]): string {
	const seen: string[] = [];
	for (const s of steps) if (!seen.includes(s.nodeId)) seen.push(s.nodeId);
	return seen.join(" → ");
}

export const flowToRow = (r: FlowRunRow): FeedRow => ({
	id: r.runId,
	kind: "flow",
	project: r.project,
	title: r.task,
	status: r.status,
	at: r.at,
	ref: r.ref ?? "",
	costUsd: r.costUsd,
	verdict: statusToVerdict(r.status),
	flow: r.flow,
	shape: shapeLine(r.steps),
	steps: r.steps,
});

/** One feed, newest first — flow rows take their place by date. */
export function mergeRows(feed: RunRow[], flows: FlowRunRow[]): FeedRow[] {
	const rows: FeedRow[] = [...feed, ...flows.map(flowToRow)];
	return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/** A flow step as the stage chip it is (the old Pipeline's mapping). */
export const flowStages = (steps: FlowRunStep[]): StageView[] =>
	steps.map((s) => ({
		name: s.nodeId,
		status: s.ok ? "done" : "failed",
		duration: "",
		detail: s.note ?? s.kind,
	}));

export const rowVal = (r: FeedRow, col: string): string | number | undefined =>
	col === "verdict" ? r.verdict
	: col === "cost" ? r.costUsd
	: col === "when" ? r.at
	: col === "run" ? r.title.toLowerCase()
	: col === "project" ? r.project
	: r.status;

export const rowText = (r: FeedRow): string =>
	`${r.title} ${r.project} ${r.status} ${r.progress ?? ""} ${r.kind} ${r.flow ?? ""} ${r.shape ?? ""} ${r.verdict ?? ""}`.toLowerCase();
