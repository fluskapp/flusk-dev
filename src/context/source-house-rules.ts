/**
 * The repository's own house rules, as the pinned payload of a run's context.
 *
 * Without this, a run starts knowing ah's workspace files and nothing the
 * humans on the project wrote down: it re-derives the conventions, gets them
 * wrong, and the review says so. Two surfaces exist today and neither subsumes
 * the other — AGENTS.md/CLAUDE.md at the root (the files the agent is addressed
 * by) and everything src/profile/docs.ts classifies kind:"rules"
 * (CONTRIBUTING.md, CONVENTIONS.md, STYLE.md, plus one level of docs/), which
 * knows the paths but returns no BODY and does not scrub. This joins them.
 *
 * The same rule can arrive twice, once per surface, and the pinned reservation
 * would pay for it twice; it is deduped by repo-relative path, keeping the
 * repo-root read. Bodies are capped at FILE_MAX: one long CONTRIBUTING.md is
 * otherwise the entire pinned reservation, and a source that stalls or starves
 * the start of a run is worse than a source that returns less.
 *
 * In THIS repo it honestly returns nothing — no AGENTS.md, no CLAUDE.md, and
 * the doc scan finds only a README — which is `skipped` with the reason, not
 * `ok` with an empty list (L7, invariant 18).
 */
import { basename } from "node:path";
import { HOUSE_FILES } from "../agent/workspace-files.js";
import { HOUSE_RULE } from "../history/sections.js";
import { HOUSE_RULES_SOURCE, type HouseRuleItem } from "./source-house-rules-read.js";
import { newScan, rulesDocs, status, take } from "./source-house-rules-scan.js";
import type { ContextRequest, ContextSource, SourceResult } from "./types.js";

/** Beyond this many rules documents the block is a library, not a constraint. */
const MAX_RULES_DOCS = 6;

const PINNED_BECAUSE =
	"it addresses the coding agent directly and governs how every other block here is read";
const DOC_BECAUSE =
	'the repo doc scan (src/profile/docs.ts) classifies it kind:"rules" — it states how work in this repo is done';

/**
 * SCORE: 0-100 on one cross-source scale, "how strongly this text constrains
 * the work in hand". Pinned items carry 0 and nothing may sort or threshold
 * them by it (invariant 11) — they are reserved, not entered in a contest.
 * Ranked rules documents start from how binding the file is by convention
 * (a root CONTRIBUTING.md outranks a STYLE.md, which outranks anything filed
 * under docs/) and gain 25 when the task itself names the path, which is the
 * only signal here that is about this task rather than about the repo.
 */
function rankScore(rel: string, req: ContextRequest): number {
	const base = rel.includes("/") ? 45 : basename(rel).toUpperCase() === "CONTRIBUTING.MD" ? 70 : 60;
	const named = req.paths?.includes(rel) === true || req.task.includes(rel);
	return named ? base + 25 : base;
}

/** True for a path this source already quotes, so the corpus need not quote it
 * again as a doc card. Deliberately the SAME regex isHouseRule() matches cards
 * with (src/history/sections.ts): two notions of "is a house rule" would drift. */
export const coversPath = (rel: string): boolean => HOUSE_RULE.test(rel);

/**
 * Total by construction: every read is inside readRule or gatherDocs, both of
 * which catch their own I/O, and the loop itself is wrapped — one unreadable
 * rules file costs items and a stated reason, never the run (L7).
 *
 * `isResume` is deliberately unused: house rules do not change between the
 * first build and the resume build, and a source that weighted them by run
 * phase would make the two builds differ for no reader-visible reason (L5).
 */
function gather(req: ContextRequest): SourceResult {
	const scan = newScan();
	const project = basename(req.repoRoot);
	const items: HouseRuleItem[] = [];
	const seen = new Set<string>();
	let docs = 0;
	try {
		for (const rel of HOUSE_FILES) {
			const item = take(scan, req.repoRoot, {
				rel,
				project,
				because: PINNED_BECAUSE,
				tier: "pinned",
				score: 0,
			});
			if (item !== undefined) {
				items.push(item);
				seen.add(rel);
			}
		}
		for (const doc of rulesDocs(req.repoRoot, scan)) {
			if (seen.has(doc.file)) {
				scan.notes.push(`${doc.file} is listed by the doc scan too; it is quoted once, from root`);
				continue;
			}
			if (docs >= MAX_RULES_DOCS) {
				scan.notes.push(`dropped ${doc.file}: past the ${MAX_RULES_DOCS}-rules-document cap`);
				scan.degraded = true;
				continue;
			}
			const item = take(scan, req.repoRoot, {
				rel: doc.file,
				project,
				because: DOC_BECAUSE,
				tier: "ranked",
				score: rankScore(doc.file, req),
				docTitle: doc.title,
			});
			if (item !== undefined) {
				items.push(item);
				docs += 1;
			}
		}
	} catch (e) {
		scan.notes.push(`the house-rules scan stopped early: ${String(e)}`);
		scan.degraded = true;
	}
	return { items, status: status(items.length, scan, project), notes: scan.notes };
}

export const houseRulesSource: ContextSource = {
	id: HOUSE_RULES_SOURCE,
	label: "House rules",
	gather,
};
