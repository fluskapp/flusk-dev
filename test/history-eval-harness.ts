/**
 * The golden set, loaded once, plus the two things every eval assertion needs:
 * a metric over it and a report that names what missed.
 *
 * It lives beside the test rather than inside it so the test file can be what
 * it should be — the ASKS — and so the ablation table is computed by the same
 * code path as the headline number.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/features/history/bm25.js";
import { type RankOptions, search } from "../src/features/history/rank.js";
import type { HistoryCard, SearchHit } from "../src/features/history/types.js";

export interface GoldenCase {
	id: string;
	query: string;
	expected: string;
	facet: string;
	why: string;
	paths?: string[];
}
export interface Fixture {
	now: string;
	facets: string[];
	twins: { verified: string; failed: string };
	cards: HistoryCard[];
	golden: GoldenCase[];
}
export interface Metrics {
	top1: number;
	top3: number;
	mrr: number;
	ranks: number[];
}

const FILE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "history-golden.json");
export const FX = JSON.parse(readFileSync(FILE, "utf8")) as Fixture;
export const NOW = Date.parse(FX.now);
export const INDEX = buildIndex(FX.cards);
/** Deep enough that a miss is measured, shallow enough to stay a real ask. */
export const DEPTH = 10;
/** Outcome-blind weights: the seam walkthrough.ts uses to mine traps. */
export const FLAT = { verified: 1, shipped: 1, unknown: 1, blocked: 1, failed: 1 };
export const ids = (hits: SearchHit[]): string[] => hits.map((h) => h.card.id);

/**
 * Turning one factor off is the only way to tell a signal from a decoration.
 * The full ranker is asserted to be at least as good as every row here.
 */
export const ABLATIONS: Record<string, RankOptions> = {
	"recency off": { recencyWeight: 0 },
	"outcome off": { outcomeWeights: FLAT },
	"path off": { pathWeight: 0 },
	"lexical only": { recencyWeight: 0, outcomeWeights: FLAT, pathWeight: 0 },
};

export function run(
	c: Pick<GoldenCase, "query" | "paths">,
	opts: RankOptions,
	n = DEPTH,
): SearchHit[] {
	return search(INDEX, { text: c.query, paths: c.paths, limit: n }, { now: NOW, ...opts });
}

/** Rank is 1-based; 0 means the expected card never surfaced at all. */
export function measure(opts: RankOptions = {}): Metrics {
	const ranks = FX.golden.map((c) => ids(run(c, opts)).indexOf(c.expected) + 1);
	const share = (p: (r: number) => boolean): number => ranks.filter(p).length / ranks.length;
	const mrr = ranks.reduce((s, r) => s + (r === 0 ? 0 : 1 / r), 0) / ranks.length;
	return { top1: share((r) => r === 1), top3: share((r) => r >= 1 && r <= 3), mrr, ranks };
}

/** The report IS the deliverable: it tells the fixer what to fix. */
export function report(m: Metrics): string {
	const pct = (x: number): string => (x * 100).toFixed(1);
	const row = (name: string, s: Metrics): string =>
		`  ${name.padEnd(13)} top1=${pct(s.top1)}% top3=${pct(s.top3)}% mrr=${s.mrr.toFixed(3)}`;
	const out = [`queries=${FX.golden.length} cards=${FX.cards.length}`, row("full ranker", m)];
	FX.golden.forEach((c, i) => {
		const rank = m.ranks[i] ?? 0;
		if (rank === 1) return;
		out.push(
			`  ${rank > 3 || rank === 0 ? "MISS" : "soft"} [${c.facet}] ${c.id}: "${c.query}"`,
			`      want ${c.expected} (rank ${rank || `>${DEPTH}`}); top3 ${ids(run(c, {}, 3)).join(", ")}`,
			`      label: ${c.why}`,
		);
	});
	out.push("ablation:");
	for (const [name, opts] of Object.entries(ABLATIONS)) out.push(row(name, measure(opts)));
	return out.join("\n");
}
