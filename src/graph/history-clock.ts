/**
 * The graph holds no timestamps (invariant 13), which is deliberate: a time
 * copied into a triple goes stale and then two sources disagree. So "newest
 * first" has to be borrowed, and this is the join that borrows it — from the
 * HistoryCard corpus, which already dates every commit, session and journal.
 *
 * THE JOIN GOES THE SAFE WAY. It DERIVES a candidate node id from each card
 * (`commit:<project>:<ref>`) and matches by string equality; it never parses a
 * node id apart, because ids are opaque downstream and the derivation rules are
 * the builders' alone (invariant 3). It joins on `card.ref`, never `card.id`:
 * source-git mints its card id from an 8-char sha prefix while graph ids carry
 * the full 40 (invariant 4), so an id-to-id join would match nothing on a good
 * day and the wrong commit on a bad one.
 *
 * A miss yields `at: null` — the row still appears, ordered after everything
 * dated, and the report says its order is not chronological. Inventing a
 * plausible date would put a fabricated ordering in front of a reader.
 */
import { basename, extname } from "node:path";
import type { HistoryCard } from "../history/types.js";
import type { GraphNode } from "./types.js";

export interface Stamp {
	/** ISO time from the joined card, or null when nothing matched. */
	at: string | null;
	/** The card ref that supplied it — the auditable half of the join. */
	ref: string | null;
}

export type GraphClock = (node: GraphNode) => Stamp;

const UNKNOWN: Stamp = { at: null, ref: null };
/** Graph commit ids carry the FULL sha; a card ref that is not one cannot be
 * one, so it is skipped rather than padded into a guess. */
const FULL_SHA = /^[0-9a-f]{40}$/;

export function historyClock(cards: readonly HistoryCard[]): GraphClock {
	const stamps = new Map<string, Stamp>();
	for (const card of cards) {
		for (const key of candidateIds(card)) keep(stamps, key, card);
	}
	return (node) => stamps.get(node.id) ?? UNKNOWN;
}

/** Node ids this card could be the history of, derived exactly as a builder
 * would derive them. A card that cannot produce one contributes nothing. */
function candidateIds(card: HistoryCard): string[] {
	if (card.kind === "commit") {
		return FULL_SHA.test(card.ref) ? [`commit:${card.project}:${card.ref}`] : [];
	}
	if (card.kind === "session" || card.kind === "journal") {
		// A run id is unqualified by project, and a journal card refs its file:
		// the run id is that file's stem. Both spellings are offered; whichever
		// the harness actually used is the one that matches.
		const stem = basename(card.ref, extname(card.ref));
		return [`run:${card.ref}`, `run:${stem}`];
	}
	// A doc card's `ref` is the ABSOLUTE path it lives at (src/history/sources.ts
	// mints it from Artifact.path), while `docId` mints `doc:<project>/<rel>`.
	// Relativising here would need the project ROOT, which a clock does not have;
	// the card already carries it, because `docCard` sets `paths` to the doc's own
	// repo-relative path. Refusing an absolute ref outright — the old rule — left
	// the doc branch dead, so every documents row came back undated while the
	// report still claimed "history" order.
	const rel = card.ref.startsWith("/") ? card.paths[0] : card.ref;
	return rel === undefined || rel === "" || rel.startsWith("/")
		? []
		: [`doc:${card.project}/${rel}`];
}

/** Newest wins, so a re-indexed doc does not date itself to its first version.
 * Ties keep the incumbent, which makes the map order-independent. */
function keep(stamps: Map<string, Stamp>, key: string, card: HistoryCard): void {
	const held = stamps.get(key);
	if (held && !newer(card.at, held.at)) return;
	stamps.set(key, { at: card.at, ref: card.ref });
}

function newer(a: string, b: string | null): boolean {
	const at = Date.parse(a);
	if (Number.isNaN(at)) return false;
	const held = b === null ? Number.NaN : Date.parse(b);
	return Number.isNaN(held) || at > held;
}
