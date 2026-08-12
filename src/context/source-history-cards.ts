/**
 * What the history source is willing to treat as a card, and what a card's
 * text is allowed to become on its way into the block.
 *
 * The corpus is JSON on disk (`~/.flusk/index/history.json`), written by earlier
 * versions of this tool and, through a shared home, potentially by another
 * machine. Nothing revalidates it on load: `loadIndex` checks the version and
 * that `cards` is an array, and stops there. A single card missing `paths`
 * therefore throws inside `isHouseRule` or `tokenize` — deep under
 * `buildWalkthrough`, where a `catch` in the caller can only turn the whole
 * run's context into nothing. Structure is checked HERE, once, before anything
 * is indexed, so one bad row costs one card and a stated reason (L7, L2).
 *
 * The clock is the corpus, never the wall. `search` multiplies in a recency
 * term that reads `now`, so `Date.now()` would rank the same task against the
 * same corpus differently on every call and the block would stop being
 * byte-identical (L5). The newest card in the corpus is the only "now" that
 * moves when — and only when — the corpus does.
 */
import { capText } from "../history/cap.js";
import { redact } from "../history/scrub.js";
import type { CardKind, HistoryCard, Outcome } from "../history/types.js";

const KINDS = new Set<CardKind>(["commit", "session", "journal", "doc", "skill"]);
const OUTCOMES = new Set<Outcome>(["verified", "shipped", "failed", "blocked", "unknown"]);

/**
 * Body cap for ONE card. Sources already cap card text at 4000 chars, which is
 * a sane index-time limit and a poor prompt-time one: a single 1000-token doc
 * would take the whole ranked remainder and leave no room for the commit that
 * shows how the work was actually done. Cut at a word boundary via `capText`,
 * the same rule the rest of the pipeline cuts on.
 */
const BODY_CHARS = 2000;
/** Says the cut happened, in the body, where the reader of the body will be. */
const TRIMMED = "[trimmed here by the context builder; the card continues]";

const isStr = (v: unknown): v is string => typeof v === "string";

/**
 * Structurally sound cards, in input order. Deliberately not a schema library
 * and deliberately not lenient: a card that reaches the ranker must satisfy
 * every field the ranker touches unconditionally, because there is no second
 * chance to notice further down.
 */
export function usableCards(cards: readonly unknown[]): HistoryCard[] {
	const out: HistoryCard[] = [];
	for (const raw of cards) {
		if (raw === null || typeof raw !== "object") continue;
		const c = raw as Partial<HistoryCard>;
		if (!isStr(c.id) || c.id === "" || !isStr(c.ref)) continue;
		if (!isStr(c.project) || !isStr(c.title) || !isStr(c.text) || !isStr(c.at)) continue;
		if (!KINDS.has(c.kind as CardKind) || !OUTCOMES.has(c.outcome as Outcome)) continue;
		if (!Array.isArray(c.paths) || !c.paths.every(isStr)) continue;
		out.push(c as HistoryCard);
	}
	return out;
}

/**
 * The corpus's own newest instant, for the ranker's `now`. Cards whose `at` is
 * unparseable contribute nothing rather than NaN; an empty corpus yields 0,
 * which ages every card equally instead of crashing the recency term.
 */
export function corpusNow(cards: readonly HistoryCard[]): number {
	let newest = 0;
	for (const card of cards) {
		const at = Date.parse(card.at);
		if (!Number.isNaN(at) && at > newest) newest = at;
	}
	return newest;
}

/**
 * Title plus body, without repeating the title when the body opens with it —
 * the shape `compose.ts` renders, kept identical so the same card reads the
 * same way in a prompt and in a context block.
 *
 * `redact` runs BEFORE the cap and unconditionally, even though sources scrub
 * at index time: it is the one redactor (L4), it is idempotent by design, and
 * a shard written by an older version is exactly the case where the index-time
 * pass cannot be assumed. Redacting first also means the cap can never split a
 * secret into an unrecognisable half.
 */
export function cardBody(card: HistoryCard): string {
	const title = card.title.trim();
	const text = card.text.trim();
	const joined = text === "" ? title : text.startsWith(title) ? text : `${title}\n${text}`;
	const safe = redact(joined).trim();
	const capped = capText(safe, BODY_CHARS);
	return capped.length < safe.length ? `${capped}\n${TRIMMED}` : capped;
}

/**
 * A repo-relative path for the item, or none. Absolute paths carry $HOME and
 * the on-disk layout of unrelated projects into something a model will read,
 * so anything that is not clearly relative is dropped rather than cleaned up:
 * a wrong path is worse than no path.
 */
export function cardPath(card: HistoryCard): string | undefined {
	return card.paths.find((p) => p !== "" && !p.startsWith("/") && !/^[a-zA-Z]:[\\/]/.test(p));
}
