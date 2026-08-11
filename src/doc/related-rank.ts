/**
 * Ordering, dedup and caps for the documentation panel's history side.
 *
 * Recency is the wrong sort here. The reader is looking at one symbol and
 * asking "what should I know before I touch it" — and the answer is almost
 * never the newest card. It is the run that FAILED while editing this very
 * file, and the skill whose HEADING is this symbol's name. So the two facts
 * that carry the most warning are TIERS rather than weights: a multiplier can
 * always be out-earned by a lexically stronger neighbour (the lesson
 * src/history/rank.ts already paid for), a tier cannot. Inside a tier the
 * multipliers decide.
 *
 * The sources overlap on purpose — a skill can be both an indexed card and a
 * ripgrep hit — so dedup happens HERE, once, keyed on the ref the panel would
 * open. And every group states its cap: a list silently cut to six is a lie
 * about how much history this symbol has.
 */
import type { Outcome } from "../history/types.js";
import type { RelatedItem } from "./related.js";

export const DEFAULT_CAP = 6;

export type Group = "commits" | "runs" | "docs";
export type Groups = Record<Group, Candidate[]>;

/** What is known about a candidate before it is worth anything. */
export interface Signals {
	/** Source score: BM25 for indexed cards, a low fixed base for grep hits. */
	base: number;
	outcome: Outcome;
	/** The card touched the file the symbol lives in. */
	touched: boolean;
	/** A markdown heading names the symbol, rather than prose mentioning it. */
	heading: boolean;
}

export interface Candidate {
	item: RelatedItem;
	signals: Signals;
}

/**
 * Suffix match at a SEGMENT boundary — the caller holds an absolute path while
 * a commit card holds a repo-relative one. Unlike the history ranker it does
 * NOT fall back to equal basenames: a different `types.ts` is a different file,
 * and pretending otherwise puts a stranger's failure at the top of the panel.
 */
export function touchesFile(paths: string[], file: string): boolean {
	const wanted = file.toLowerCase();
	return paths.some((p) => {
		const path = p.toLowerCase();
		return path === wanted || path.endsWith(`/${wanted}`) || wanted.endsWith(`/${path}`);
	});
}

/** Asymmetric on purpose: a bad ending is the thing you came here to find. */
const OUTCOME_LIFT: Record<Outcome, number> = {
	failed: 1.6,
	blocked: 1.4,
	verified: 1.15,
	shipped: 1,
	unknown: 0.9,
};

const TOUCH_LIFT = 1.5;
const HEADING_LIFT = 1.6;
const ALARMING = new Set<Outcome>(["failed", "blocked"]);

/** 2: it went wrong on this file. 1: a heading names it. 0: everything else. */
export function tierOf(s: Signals): number {
	if (ALARMING.has(s.outcome) && s.touched) return 2;
	return s.heading ? 1 : 0;
}

export function usefulness(s: Signals): number {
	const lift = (s.touched ? TOUCH_LIFT : 1) * (s.heading ? HEADING_LIFT : 1);
	return s.base * OUTCOME_LIFT[s.outcome] * lift;
}

/** The handle the panel would open — the identity two sources agree on. */
const keyOf = (item: RelatedItem): string =>
	(item.ref === "" ? item.title : item.ref).toLowerCase();

function better(a: Candidate, b: Candidate): number {
	return (
		tierOf(b.signals) - tierOf(a.signals) ||
		usefulness(b.signals) - usefulness(a.signals) ||
		b.item.at.localeCompare(a.item.at) ||
		a.item.title.localeCompare(b.item.title)
	);
}

/** Sorted, de-duplicated, capped; `trimmed` is how many lost to the cap. */
export function rankGroup(
	candidates: Candidate[],
	cap = DEFAULT_CAP,
): { items: RelatedItem[]; trimmed: number } {
	const best = new Map<string, Candidate>();
	for (const candidate of candidates) {
		const seen = best.get(keyOf(candidate.item));
		if (seen === undefined || better(candidate, seen) < 0)
			best.set(keyOf(candidate.item), candidate);
	}
	const ordered = [...best.values()].sort(better);
	const limit = Math.max(0, cap);
	const items = ordered.slice(0, limit).map((c) => c.item);
	return { items, trimmed: Math.max(0, ordered.length - limit) };
}

/** One sentence naming every bound that shortened the answer, or nothing. */
export function capNote(
	trimmed: Record<string, number>,
	cap: number,
	extra?: string,
): string | undefined {
	const parts = Object.entries(trimmed)
		.filter(([, n]) => n > 0)
		.map(([group, n]) => `${n} more ${group} beyond the cap of ${cap}`);
	if (extra !== undefined && extra !== "") parts.push(extra);
	return parts.length === 0 ? undefined : parts.join("; ");
}

/** All three groups ranked and capped, plus the one note that owns every cut. */
export function rankGroups(
	groups: Groups,
	cap = DEFAULT_CAP,
	extra?: string,
): { commits: RelatedItem[]; runs: RelatedItem[]; docs: RelatedItem[]; note?: string } {
	const done = {
		commits: rankGroup(groups.commits, cap),
		runs: rankGroup(groups.runs, cap),
		docs: rankGroup(groups.docs, cap),
	};
	const trimmed = {
		commits: done.commits.trimmed,
		runs: done.runs.trimmed,
		docs: done.docs.trimmed,
	};
	const note = capNote(trimmed, cap, extra);
	return {
		commits: done.commits.items,
		runs: done.runs.items,
		docs: done.docs.items,
		...(note === undefined ? {} : { note }),
	};
}
