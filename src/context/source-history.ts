/**
 * The history ContextSource: what already happened here, before the first turn.
 *
 * It is the only source that can answer "has this been tried before, and how
 * did it end" — and the answer is already computed. `buildWalkthrough` returns
 * four differently-ranked sections in ONE call over ONE index, and each maps
 * onto the contract directly: traps and house rules are reserved (pinned),
 * precedent, attempts and the remaining conventions compete (ranked).
 *
 * Three costs are load-bearing here, all of them measured:
 *
 * 1. The corpus is the SERVED index (`loadIndex()`), never `historyCards()`.
 *    That reader scopes itself with `loadConfig(process.cwd())`, so the corpus
 *    would follow the directory `flusk` was started from (L5), and on a stamp
 *    miss it calls `refreshIndex`, which WRITES shards and spawns git per
 *    moved repo. A gather reads, never writes, and must not stall run start:
 *    a machine that has never indexed gets a stated reason rather than a
 *    multi-second build nobody asked for.
 * 2. Scope goes on the ANSWER instead, via `buildWalkthrough`'s `project` —
 *    the repo's basename, as `src/cli/prompt-cmd.ts` derives it.
 * 3. `buildIndex` rebuilds the BM25 postings in process and is cached nowhere,
 *    so it is built ONCE and passed by identity — the four searches share one
 *    trigram index only while the object is the same object (`fuzzy.ts`).
 *
 * `composePrompt` is deliberately not called: it packs a whole standalone
 * prompt against its own budget, and a second packer beside the context
 * builder's is exactly the disagreement this design forbids.
 *
 * Everything this source emits is repo-authored text — commit messages, docs,
 * transcripts. It is UNTRUSTED: the assembler delimits and labels it, and each
 * item's `why` says so, so no delimiter is applied twice (L3).
 */
import { basename, resolve } from "node:path";
import { buildIndex } from "../history/bm25.js";
import { loadIndex } from "../history/index-store.js";
import type { HistoryCard } from "../history/types.js";
import { buildWalkthrough } from "../history/walkthrough.js";
import { corpusNow, usableCards } from "./source-history-cards.js";
import { sectionItems } from "./source-history-order.js";
import type { ContextRequest, ContextSource, SourceResult } from "./types.js";

export const HISTORY_SOURCE_ID = "history";
/** Section caps. A resume is the same task again, so its own earlier runs are
 * the point of rebuilding at all: it asks for more of them, and nothing else
 * changes — the weighting difference lives in the score bands. */
const LIMITS = { precedent: 3, attempts: 4, conventions: 4, traps: 6 };
const RESUME_ATTEMPTS = 6;

const fail = (notes: string[]): SourceResult => ({ items: [], status: "failed", notes });

/** The corpus as served: a pure read of `~/.flusk/index/history.json`. `null` —
 * missing, corrupt or written by an older version — is an empty corpus, which
 * this source reports as a reason rather than as a failure. */
const servedCards = (): HistoryCard[] => loadIndex()?.cards ?? [];

/**
 * `gather` is total (L7): the corpus is a 3.9 MB JSON file on a shared home
 * that another version may have written, so every failure mode here — missing,
 * corrupt, unreadable, malformed — has to cost items and a sentence, never the
 * run. Nothing below throws, and nothing below writes.
 */
export function gather(req: ContextRequest, load: CardLoader = servedCards): SourceResult {
	let raw: readonly HistoryCard[];
	try {
		raw = load();
	} catch (err) {
		return fail([`The history index could not be read (${message(err)}); no history was used.`]);
	}
	try {
		return collect(req, raw);
	} catch (err) {
		// A contract violation rather than an expected outcome, but a thrown
		// ranker must still not be the reason a run has no context at all.
		return fail([`History ranking failed (${message(err)}); no history was used.`]);
	}
}

/** Injected only so a test can point at a fixture corpus; production reads the
 * served index, and nothing else may narrow it — see note 1 above. */
export type CardLoader = () => HistoryCard[];

const message = (err: unknown): string =>
	err instanceof Error ? err.message.split("\n")[0] || err.name : String(err);

function collect(req: ContextRequest, raw: readonly HistoryCard[]): SourceResult {
	const notes: string[] = [];
	const cards = usableCards(raw);
	const skipped = raw.length - cards.length;
	if (skipped > 0) {
		notes.push(
			`${skipped} of ${raw.length} indexed cards were malformed (missing or mistyped fields) and were not ranked.`,
		);
	}
	if (cards.length === 0) {
		notes.push(
			"The history index holds no usable cards; nothing has been indexed on this machine yet.",
		);
		return { items: [], status: "skipped", notes };
	}
	const project = basename(resolve(req.repoRoot));
	const mine = cards.filter((c) => c.project === project).length;
	if (mine === 0) {
		notes.push(
			`The index holds ${cards.length} cards but none from "${project}", so nothing here has history yet.`,
		);
		return { items: [], status: "skipped", notes };
	}
	return ranked(req, cards, project, notes, skipped > 0);
}

function ranked(
	req: ContextRequest,
	cards: HistoryCard[],
	project: string,
	notes: string[],
	partial: boolean,
): SourceResult {
	const limits = { ...LIMITS, ...(req.isResume ? { attempts: RESUME_ATTEMPTS } : {}) };
	const walkthrough = buildWalkthrough(buildIndex(cards), req.task, {
		project,
		now: corpusNow(cards),
		...limits,
	});
	const { items, dropped } = sectionItems(walkthrough, project, req.isResume);
	for (const [name, limit] of Object.entries(limits)) {
		const found = walkthrough[name as keyof typeof limits].length;
		if (found >= limit)
			notes.push(
				`The ${name} section came back at its cap of ${limit}; older matches were not gathered.`,
			);
	}
	if (dropped > 0) {
		notes.push(
			`${dropped} ranked cards were empty after redaction and trimming, so they carry nothing to quote.`,
		);
	}
	if (items.length === 0) {
		notes.push(`Nothing among ${project}'s indexed cards ranked against this task.`);
	}
	return { items, status: partial || dropped > 0 ? "partial" : "ok", notes };
}

/** The registered source. `load` stays injectable for fixtures only. */
export function historySource(load?: CardLoader): ContextSource {
	return {
		id: HISTORY_SOURCE_ID,
		label: "History",
		gather: (req) => gather(req, load),
	};
}
