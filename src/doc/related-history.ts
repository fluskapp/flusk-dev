/**
 * The indexed half of RELATED: history cards ranked against one symbol.
 *
 * EVERY ROW MUST BE ABOUT THE SYMBOL. BM25 ranks, it does not filter, so a
 * query of `symbol + absolute path` let the path tokens (`users`, `ashb`,
 * `projects`, `src`, `ts`) carry the whole score: three different symbols and
 * one that did not exist returned a byte-identical row set, and the `why`
 * clause claimed each one "names" a symbol it had never heard of. Two fixes,
 * both here: the query carries the REPO-RELATIVE path, and a card is kept only
 * when it TOUCHED the file or actually NAMES the symbol. That is also what
 * makes the "nothing in the history index mentions this symbol yet" empty
 * state reachable, and what stops the cap note counting noise as history.
 *
 * Split from related.ts, which owns the ripgrep half and the assembly.
 */
import { basename, relative } from "node:path";
import type { AhConfig } from "../config/types.js";
import { searchRoots } from "../find/files.js";
import { buildIndex } from "../history/bm25.js";
import { historyCards } from "../history/corpus.js";
import { search } from "../history/rank.js";
import type { CardKind, HistoryCard } from "../history/types.js";
import type { RelatedDeps } from "./related.js";
import type { Group, Groups } from "./related-rank.js";
import { touchesFile } from "./related-rank.js";

/** Candidates the ranker sees before the per-group cap applies. */
const HISTORY_LIMIT = 40;
/** Failures are what the reader came for, so the ranker's demotion is undone. */
const SURFACE_FAILURES = { failed: 1.04, blocked: 1.03 };

/** Per card kind: the group it lands in, what to call it, how it "touched". */
const KINDS: Record<CardKind, [Group, string, string]> = {
	commit: ["commits", "commit", "changed this file"],
	session: ["runs", "session", "session edited this file"],
	journal: ["runs", "run", "run edited this file"],
	doc: ["docs", "doc", "documents this file"],
	skill: ["docs", "skill", "documents this file"],
};

/** Does the card's own prose contain the symbol? The only basis for "names". */
function names(card: HistoryCard, symbol: string): boolean {
	return `${card.title}\n${card.text}`.toLowerCase().includes(symbol.toLowerCase());
}

/** One short phrase: why this card earned its row. Never a claim it cannot back. */
function whyOf(card: HistoryCard, symbol: string, touched: boolean, named: boolean): string {
	const [, noun, edited] = KINDS[card.kind];
	const bad = card.outcome === "failed" || card.outcome === "blocked";
	if (touched) return bad ? `${noun} ${card.outcome} while editing this file` : edited;
	if (bad) return named ? `${noun} ${card.outcome}, names ${symbol}` : `${noun} ${card.outcome}`;
	return named ? `${noun} names ${symbol}` : `${noun} touches this area`;
}

/** Repo-relative: the query is about the file, not about /Users/you. */
function repoPath(file: string, cfg: AhConfig): string {
	const root = searchRoots(cfg).find((r) => file.startsWith(`${r.path}/`));
	return root === undefined ? basename(file) : relative(root.path, file);
}

/**
 * The symbol AND its repo-relative file go into the query: a commit whose
 * message never says `relatedFor` still ranks if it changed the file it lives
 * in. What ranks is not what is SHOWN, though — only a card that touched the
 * file or names the symbol survives, because the panel's whole claim is that
 * these rows are about this symbol.
 */
export function fromHistory(
	symbol: string,
	file: string,
	cfg: AhConfig,
	deps: RelatedDeps,
	into: Groups,
): void {
	const index = deps.index ?? buildIndex(historyCards());
	const now = deps.now === undefined ? {} : { now: deps.now };
	const rel = repoPath(file, cfg);
	const query = { text: `${symbol} ${rel}`, paths: [rel], limit: HISTORY_LIMIT };
	const hits = search(index, query, { outcomeWeights: SURFACE_FAILURES, ...now });
	for (const { card, score } of hits) {
		const [group] = KINDS[card.kind];
		// A doc "touching" its own path is not evidence about the symbol.
		const touched = group !== "docs" && touchesFile(card.paths, file);
		const named = names(card, symbol);
		if (!touched && !named) continue; // ranked, but not about this symbol
		const why = whyOf(card, symbol, touched, named);
		const item = { title: card.title, ref: card.ref, kind: card.kind, at: card.at, why };
		const signals = { base: score, outcome: card.outcome, touched, heading: false };
		into[group].push({ item, signals });
	}
}
