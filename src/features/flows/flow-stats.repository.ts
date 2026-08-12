/**
 * The per-flow tally a planner can later read to prefer shapes that work: how
 * often a flow ran, how often it finished, and what it usually costs. One JSON
 * file under `<fluskHome>/flows/stats.json`, keyed by flow name.
 *
 * Read-modify-write like src/provider/scores.ts, and equally tolerant: a
 * missing file, a truncated file, or one corrupt entry reads as "nothing
 * recorded yet" instead of throwing away every other flow's numbers.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fluskHome } from "../../platform/paths/paths.js";
import type { FlowResult } from "./types.js";

export interface FlowStat {
	attempts: number;
	completions: number;
	medianCostUsd: number;
	/** Recent run costs, newest last — the median's sample. */
	costs: number[];
	/** Node ids of the most recent run: the shape these numbers describe. */
	shape: string[];
	updatedAt: string;
}

export type FlowStats = Record<string, FlowStat>;

const COST_SAMPLE = 50;
const EMPTY: FlowStat = {
	attempts: 0,
	completions: 0,
	medianCostUsd: 0,
	costs: [],
	shape: [],
	updatedAt: "",
};

export const statsPath = (): string => join(fluskHome(), "flows", "stats.json");

export function median(xs: number[]): number {
	if (xs.length === 0) return 0;
	const s = [...xs].sort((a, b) => a - b);
	const mid = s.length >> 1;
	return s.length % 2 === 1 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

/** One entry, or null when it is not a statistic. */
function sane(v: unknown): FlowStat | null {
	if (typeof v !== "object" || v === null || !Number.isFinite((v as FlowStat).attempts))
		return null;
	const r = v as Partial<FlowStat>;
	const costs = Array.isArray(r.costs) ? r.costs.filter((c) => Number.isFinite(c)) : [];
	return {
		attempts: Number(r.attempts),
		completions: Number.isFinite(r.completions) ? Number(r.completions) : 0,
		medianCostUsd: median(costs),
		costs,
		shape: Array.isArray(r.shape) ? r.shape.filter((s) => typeof s === "string") : [],
		updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
	};
}

export async function loadFlowStats(): Promise<FlowStats> {
	try {
		const parsed: unknown = JSON.parse(await readFile(statsPath(), "utf8"));
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
		const out: FlowStats = {};
		for (const [flow, v] of Object.entries(parsed as Record<string, unknown>)) {
			const stat = sane(v);
			if (stat) out[flow] = stat;
		}
		return out;
	} catch {
		return {};
	}
}

/** Folds one run into its flow's tally and returns the new entry. */
export async function bumpFlowStats(r: FlowResult, at: string): Promise<FlowStat> {
	const stats = await loadFlowStats();
	const prev = stats[r.spec] ?? EMPTY;
	const costs = [...prev.costs, r.state.costUsd].slice(-COST_SAMPLE);
	const next: FlowStat = {
		attempts: prev.attempts + 1,
		completions: prev.completions + (r.outcome === "completed" ? 1 : 0),
		medianCostUsd: median(costs),
		costs,
		shape: r.state.steps.map((s) => s.nodeId),
		updatedAt: at,
	};
	stats[r.spec] = next;
	await mkdir(dirname(statsPath()), { recursive: true });
	await writeFile(statsPath(), `${JSON.stringify(stats, null, "\t")}\n`, "utf8");
	return next;
}
