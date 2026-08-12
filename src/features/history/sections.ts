/**
 * What each section of a walkthrough is ALLOWED to contain.
 *
 * Every section here answers the same objection: a block in a composed prompt
 * costs tokens and, worse, asserts something. "A previous attempt at this same
 * task" and "the house rules for this repo" are claims, and on the real corpus
 * both were false far too often — a dozen near-identical nightly journals that
 * shared one common word with the task, and four repos' CLAUDE.md files each
 * announcing that it governed the work in hand. A relative bar ("within half
 * the best score") cannot say no when nothing is close, so every gate here is
 * absolute, tied to the best WORK found for the task.
 */
import { selectDiverse } from "./diverse.js";
import type { HistoryCard, SearchHit } from "./types.js";

/** Files that change how every other block is read. */
export const HOUSE_RULE = /(^|\/)(CLAUDE|AGENTS|CONTRIBUTING)\.md$/i;
export const isHouseRule = (c: HistoryCard): boolean =>
	c.paths.some((p) => HOUSE_RULE.test(p)) || HOUSE_RULE.test(c.ref);
/**
 * What a run must clear to be called "a previous attempt at this same task":
 * a real share of the query's terms, and an absolute floor, not just proximity
 * to whatever else came back.
 */
export const ATTEMPT = { floor: 0.3, coverage: 0.4, terms: 2, close: 0.5 };
/**
 * A convention that is not about the work is a block the task pays for and
 * reads past. House rules are exempt — they govern whether or not they mention
 * the task — but everything else clears the same bar the traps do.
 */
export const CONVENTION_FLOOR = 0.25;
/** At most this many "this is how we work here" blocks, all from one repo. */
const HOUSE_CAP = 2;

/**
 * House rules first — they change how every other block is read — but only the
 * ones that govern THIS work. Unscoped, the corpus offers every repo on the
 * machine, and four blocks each claiming to be "the house rules for this repo"
 * is not context, it is contradiction: measured, they took 87% of a 4000-token
 * prompt and crowded the precedent out entirely.
 */
export function conventions(
	writing: SearchHit[],
	home: string | undefined,
	bar: number,
	limit: number,
): SearchHit[] {
	const rules: SearchHit[] = [];
	const rest: SearchHit[] = [];
	for (const hit of writing) {
		if (!isHouseRule(hit.card)) {
			if (hit.why.lexical >= bar) rest.push(hit);
		} else if (rules.length < HOUSE_CAP && (home === undefined || hit.card.project === home)) {
			rules.push(hit);
		}
	}
	// The same convention filed twice (`.claude/skills/node/SKILL.md` and
	// `.agents/skills/node/SKILL.md` are one rule in two places) costs the
	// budget twice and says nothing the second time.
	return [...rules, ...selectDiverse(rest, limit)].slice(0, limit);
}

/** Runs that are really about THIS task: enough of it matched, and not faintly. */
export function attempts(
	runs: SearchHit[],
	wanted: number,
	bar: number,
	limit: number,
): SearchHit[] {
	const need = Math.max(1, Math.min(ATTEMPT.terms, wanted));
	const close = (runs[0]?.score ?? 0) * ATTEMPT.close;
	const real = runs.filter((h) => {
		const matched = new Set(h.terms).size;
		if (matched < need || matched / Math.max(1, wanted) < ATTEMPT.coverage) return false;
		return h.score >= close && h.why.lexical >= bar;
	});
	return selectDiverse(real, limit).sort(
		(a, b) => b.card.at.localeCompare(a.card.at) || a.card.id.localeCompare(b.card.id),
	);
}
