/**
 * History endpoints: search, walkthrough, composed prompt.
 *
 * The corpus loader lives here rather than beside the CLI because every
 * caller needs it and `src/ui/` is already where the scanners live
 * (`src/history/sources.ts` imports artifact-scan from here) — so the CLI
 * imports downward into ui, the direction `cli/ui-cmd.ts` already takes.
 *
 * Two caches, because the two costs are different: the CARD index is on disk
 * and rebuilt per source (src/history/corpus.ts), and the BM25 index is in
 * this process (~0.2s over 2600 cards). The palette searches on every
 * keystroke, so neither may be paid per request.
 *
 * Retrieval is pure: no model, no network, no embedding service.
 */
import type { ServerResponse } from "node:http";
import { loadConfig } from "../config/config.js";
import { type Bm25Index, buildIndex } from "../history/bm25.js";
import { composePrompt } from "../history/compose.js";
import { historyCards, indexBuiltAt } from "../history/corpus.js";
import { search } from "../history/rank.js";
import type { CardKind } from "../history/types.js";
import { buildWalkthrough } from "../history/walkthrough.js";

export const KINDS: CardKind[] = ["commit", "session", "journal", "doc", "skill"];
/**
 * How long this process reuses its BM25 index before re-checking the source
 * stamps. Short, because the check is cheap (~120ms of stat calls) and only
 * ONE request in each window pays it — and the BM25 index itself is rebuilt
 * only when the corpus actually moved, not merely because the window rolled.
 */
export const STALE_MS = 30_000;
export const DEFAULT_BUDGET = 4000;
/** A query long enough to be a denial of service rather than a question. */
const MAX_QUERY = 512;

let served: { at: number; key: string; index: Bm25Index } | null = null;

/**
 * Process-lifetime BM25 index; the stamps decide what is re-read under it.
 *
 * Exported because the documentation panel folds history into every lookup and
 * must share THIS index: a second one on its own 30s timer rebuilt the corpus
 * on whichever click happened to land after the window rolled, which is how a
 * warm 0.2s lookup turned into 2s at random.
 */
export function servedIndex(): Bm25Index {
	const now = Date.now();
	if (served !== null && now - served.at < STALE_MS) return served.index;
	const cards = historyCards();
	const key = `${cards.length}:${indexBuiltAt() ?? ""}`;
	if (served !== null && served.key === key) {
		served.at = now;
		return served.index;
	}
	served = { at: now, key, index: buildIndex(cards) };
	return served.index;
}

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** A positive integer query param, clamped; `fallback` when absent or junk. */
function count(raw: string | null, fallback: number, max: number): number {
	const n = Number(raw ?? "");
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return Math.min(Math.floor(n), max);
}

function scope(query: URLSearchParams): string | undefined {
	const project = query.get("project");
	return project === null || project === "" ? undefined : project;
}

/** The one shape a query param may take: short. Fuzzy expansion is per term. */
const text = (query: URLSearchParams, name: string): string =>
	(query.get(name) ?? "").slice(0, MAX_QUERY).trim();

function hits(query: URLSearchParams): unknown {
	const q = text(query, "q");
	if (q === "") return [];
	const kind = query.get("kind");
	const kinds = kind === null || kind === "" ? undefined : [kind as CardKind];
	return search(servedIndex(), {
		text: q,
		limit: count(query.get("limit"), 20, 100),
		...(scope(query) !== undefined ? { project: scope(query) } : {}),
		...(kinds !== undefined ? { kinds } : {}),
	});
}

/** Returns true when it handled the route. */
export function handleHistory(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method !== "GET" || !pathname.startsWith("/api/history/")) return false;
	if (pathname === "/api/history/search") {
		const kind = query.get("kind");
		// The CLI exits 1 on an unknown --kind; a silent "all kinds" here would
		// have the two front ends disagree about the same input.
		if (kind !== null && kind !== "" && !KINDS.includes(kind as CardKind)) {
			json(res, 400, { error: `kind must be one of ${KINDS.join(", ")}` });
			return true;
		}
		json(res, 200, hits(query));
		return true;
	}
	if (pathname === "/api/history/card") {
		// BY REF, not by search. A commit row in the doc panel carries a 40-char
		// sha, and the sha is not in the card's text — so BM25 returned zero hits
		// and every commit row in RELATED was a dead click that copied a string.
		// An opaque identifier is looked up, never ranked.
		const ref = text(query, "ref");
		if (ref === "") {
			json(res, 400, { error: "ref is required" });
			return true;
		}
		const card = historyCards().find((c) => c.ref === ref);
		if (card === undefined) json(res, 404, { error: "no card with that ref" });
		else json(res, 200, { card, score: 0, why: null, terms: [] });
		return true;
	}
	const task = text(query, "task");
	if (pathname === "/api/history/walkthrough" || pathname === "/api/history/prompt") {
		if (task === "") {
			json(res, 400, { error: "task is required" });
			return true;
		}
		const opts = scope(query) !== undefined ? { project: scope(query) } : {};
		const walkthrough = buildWalkthrough(servedIndex(), task, opts);
		if (pathname === "/api/history/walkthrough") json(res, 200, walkthrough);
		else {
			const budget = count(query.get("budget"), DEFAULT_BUDGET, 100_000);
			json(res, 200, composePrompt(walkthrough, task, { budget }));
		}
		return true;
	}
	return false;
}
