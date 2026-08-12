/**
 * The index on disk, under `fluskHome()/index/`.
 *
 * Sources are injected rather than imported: a source is an id, a cheap
 * STAMP (a repo's git HEAD oid, the newest mtime in a directory) and a `load`
 * that produces its cards. That keeps this file free of every scanner, and it
 * is what makes rebuilds incremental — a source whose stamp is unchanged is
 * never re-read, so adding one commit to one repo does not re-walk 1500
 * commits and 287 journals.
 *
 *   { id: "commits:flusk", stamp: () => headOid(root), load: () => gitCards(root) }
 *
 * Each source's cards live in their own shard file; `history.json` is the
 * assembled HistoryIndex. Anything unreadable, corrupt or written by an older
 * version is treated as absent and rebuilt — a cache that can fail the caller
 * is worse than no cache.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fluskHome } from "../session/paths.js";
import type { HistoryCard, HistoryIndex } from "./types.js";

/** Bump when the card or shard shape changes; old caches then rebuild. */
export const INDEX_VERSION = 1;

export interface IndexSource {
	/** Stable identity, e.g. "commits:<repo>" or "journals:<dir>". */
	id: string;
	/** Cheap fingerprint; a changed value is the only trigger for a reload. */
	stamp(): string;
	load(): HistoryCard[];
}

interface Shard {
	version: number;
	id: string;
	stamp: string;
	cards: HistoryCard[];
}

export function indexDir(): string {
	return join(fluskHome(), "index");
}

export function indexPath(): string {
	return join(indexDir(), "history.json");
}

function shardPath(id: string): string {
	return join(
		indexDir(),
		"sources",
		`${createHash("sha256").update(id).digest("hex").slice(0, 16)}.json`,
	);
}

function readJson<T>(path: string): T | null {
	try {
		return JSON.parse(readFileSync(path, "utf8")) as T;
	} catch {
		return null; // missing or corrupt — the caller rebuilds
	}
}

/** Atomic enough for a cache: a torn write leaves the old file in place. */
function writeJson(path: string, value: unknown): void {
	mkdirSync(dirname(path), { recursive: true });
	const tmp = `${path}.tmp`;
	writeFileSync(tmp, JSON.stringify(value));
	renameSync(tmp, path);
}

/** null when there is no usable cache: missing, corrupt, or a stale version. */
export function loadIndex(): HistoryIndex | null {
	const file = readJson<HistoryIndex & { version?: number }>(indexPath());
	if (file === null || file.version !== INDEX_VERSION) return null;
	if (!Array.isArray(file.cards) || typeof file.builtAt !== "string") return null;
	return { cards: file.cards, builtAt: file.builtAt, stamps: file.stamps ?? {} };
}

export function saveIndex(index: HistoryIndex): void {
	writeJson(indexPath(), { version: INDEX_VERSION, ...index });
}

/**
 * Cards for one source, from its shard when the stamp still matches. A source
 * that throws falls back to its cached cards: one broken repo must not empty
 * the whole index.
 */
function sourceCards(source: IndexSource, stamp: string): HistoryCard[] {
	const path = shardPath(source.id);
	const shard = readJson<Shard>(path);
	if (shard !== null && shard.version === INDEX_VERSION && shard.stamp === stamp) {
		if (Array.isArray(shard.cards)) return shard.cards;
	}
	let cards: HistoryCard[];
	try {
		cards = source.load();
	} catch {
		return shard?.cards ?? [];
	}
	writeJson(path, { version: INDEX_VERSION, id: source.id, stamp, cards } satisfies Shard);
	return cards;
}

/**
 * Rebuild only what moved, then save. Cards are keyed by id, so a source that
 * re-emits a card replaces it rather than duplicating it, and a source that
 * disappears from `sources` takes its cards with it.
 */
export function refreshIndex(sources: IndexSource[], now = new Date()): HistoryIndex {
	const stamps: Record<string, string> = {};
	const byId = new Map<string, HistoryCard>();
	for (const source of sources) {
		let stamp: string;
		try {
			stamp = source.stamp();
		} catch {
			// Unstampable source: a value no shard can carry, so it reloads
			// every time. Reloading too often beats serving stale cards.
			stamp = `unstamped:${now.toISOString()}`;
		}
		stamps[source.id] = stamp;
		for (const card of sourceCards(source, stamp)) byId.set(card.id, card);
	}
	const index: HistoryIndex = {
		cards: [...byId.values()],
		builtAt: now.toISOString(),
		stamps,
	};
	saveIndex(index);
	return index;
}
