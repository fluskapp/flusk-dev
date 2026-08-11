/**
 * The half of a documentation panel an IDE cannot show you.
 *
 * A language service answers "what is this symbol": signature, docs,
 * definition, usages. It has no idea that a run FAILED the last time someone
 * edited this function, or that the skill next door forbids the pattern it
 * uses. ah does — the history index is already built from commits, sessions,
 * harness journals, skills and docs — so a lookup can also answer "what
 * happened to this symbol". That fusion is the feature; the language-service
 * half alone is a worse IDE.
 *
 * Three overlapping sources, each covering the others' blind spot: the index
 * (ranked and outcome-aware, but only as fresh as the last scan), ripgrep
 * (literal and current — it sees the Python caller and the journal line no
 * TypeScript service can), and the markdown corpus (a path becomes a titled
 * skill or doc). Ordering, dedup and caps are related-rank.ts's; this file
 * gathers and says per item WHY it is on screen. Joins `SymbolDoc` by `name`.
 *
 * EVERY ROW MUST BE ABOUT THE SYMBOL — related-history.ts holds that rule and
 * the evidence for why it had to be written down.
 */
import { basename, resolve } from "node:path";
import type { AhConfig } from "../config/types.js";
import { find } from "../find/ripgrep.js";
import type { FindResult } from "../find/types.js";
import type { Bm25Index } from "../history/bm25.js";
import { type Artifact, scanArtifacts } from "../ui/artifact-scan.js";
import { fromHistory } from "./related-history.js";
import { DEFAULT_CAP, type Groups, rankGroups } from "./related-rank.js";

/** One row. `why` is not decoration: an unexplained list is noise. */
export interface RelatedItem {
	title: string;
	/** How to open it: a sha, a session key, a journal or file path. */
	ref: string;
	kind: string;
	at: string;
	why: string;
}

export interface Related {
	commits: RelatedItem[];
	runs: RelatedItem[];
	docs: RelatedItem[];
	/** Literal occurrences of the name across the configured projects. */
	mentions: number;
	/** Every bound that shortened this answer, in one readable sentence. */
	note?: string;
}

/** Everything expensive is injectable, so a test needs no repo and no rg. */
export interface RelatedDeps {
	/** Pre-built BM25 index; the server already caches one per process. */
	index?: Bm25Index;
	grep?: (cfg: AhConfig, symbol: string) => Promise<FindResult>;
	artifacts?: (cfg: AhConfig) => Artifact[];
	/** Per-group cap; `note` says so whenever it trimmed. */
	cap?: number;
	now?: number;
}

/** rg is bounded twice (here, and by the cap) and scores below every card. */
const GREP_LIMIT = 80;
const GREP_BASE = 0.2;
const HEADING = /^\s{0,3}#{1,6}\s/;

/** Literal hits: the markdown ones become doc rows, all of them are counted. */
async function fromGrep(
	symbol: string,
	cfg: AhConfig,
	deps: RelatedDeps,
	into: Groups,
): Promise<{ mentions: number; note?: string }> {
	const grep = deps.grep ?? ((c, q) => find(c, { q, caseSensitive: true, limit: GREP_LIMIT }));
	const res = await grep(cfg, symbol).catch((): null => null);
	if (res === null) return { mentions: 0, note: "search across projects failed" };
	const scan = deps.artifacts ?? ((c: AhConfig) => scanArtifacts(c.ui.projectDirs));
	const byPath = new Map(scan(cfg).map((a) => [resolve(a.path), a]));
	for (const hit of res.files.filter((f) => f.path.endsWith(".md"))) {
		const doc = byPath.get(resolve(hit.path));
		const kind = doc?.kind ?? "doc";
		const heading = hit.matches.some((m) => HEADING.test(m.text));
		const why = heading ? `${kind} heading names ${symbol}` : `${kind} mentions ${symbol}`;
		const at = doc === undefined ? "" : new Date(doc.mtimeMs).toISOString();
		const item = { title: doc?.title ?? basename(hit.path), ref: hit.path, kind, at, why };
		const signals = { base: GREP_BASE, outcome: "unknown", touched: false, heading } as const;
		into.docs.push({ item, signals });
	}
	return { mentions: res.total, ...(res.note === undefined ? {} : { note: res.note }) };
}

/** A symbol, fused with everything that already happened to it. */
export async function relatedFor(
	symbol: string,
	file: string,
	cfg: AhConfig,
	deps: RelatedDeps = {},
): Promise<Related> {
	if (symbol.trim() === "")
		return { commits: [], runs: [], docs: [], mentions: 0, note: "no symbol selected" };
	const into: Groups = { commits: [], runs: [], docs: [] };
	fromHistory(symbol, file, cfg, deps, into);
	const grepped = await fromGrep(symbol, cfg, deps, into);
	const ranked = rankGroups(into, deps.cap ?? DEFAULT_CAP, grepped.note);
	return { ...ranked, mentions: grepped.mentions };
}
