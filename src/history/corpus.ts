/**
 * The corpus every caller reads: whichever cards the sources currently offer.
 *
 * Freshness is a property of the SOURCES — a repo's HEAD oid, a directory's
 * newest mtime — not of the clock. It used to be a ten-minute wall-clock
 * bucket, which is wrong in both directions at once: a commit made a second
 * ago stayed invisible for up to ten minutes, and every bucket boundary
 * re-walked every repo whether anything had moved or not.
 */
import { loadConfig } from "../config/config.js";
import { corpusSources } from "./corpus-sources.js";
import { type IndexSource, loadIndex, refreshIndex } from "./index-store.js";
import type { HistoryCard, HistoryIndex } from "./types.js";

/**
 * The corpus, rebuilt from whichever sources actually moved. `refresh` forces
 * the rebuild — the answer to "I just committed and it is not in the index".
 *
 * An EMPTY result is never trusted: a scan that came back empty (an unreadable
 * checkout, a repo mid-clone, a machine not configured yet) must not cost this
 * process the cards it already had.
 */
export function historyCards(opts: { refresh?: boolean } = {}): HistoryCard[] {
	const cached = loadIndex();
	const sources = corpusSources(loadConfig(process.cwd()));
	if (opts.refresh !== true && cached !== null && unmoved(cached, sources)) return cached.cards;
	const built = refreshIndex(sources);
	return built.cards.length > 0 ? built.cards : (cached?.cards ?? []);
}

/**
 * True when every source still stamps the way the saved index says it did.
 * An index that declares NO sources cannot be checked — it was written by
 * hand rather than by a scan — so it is taken at face value.
 */
function unmoved(cached: HistoryIndex, sources: IndexSource[]): boolean {
	if (cached.cards.length === 0) return false;
	const ids = Object.keys(cached.stamps);
	if (ids.length === 0) return true;
	if (ids.length !== sources.length) return false;
	return sources.every((s) => {
		try {
			return cached.stamps[s.id] === s.stamp();
		} catch {
			return false;
		}
	});
}

/** When the served corpus was last assembled — the CLI prints it. */
export function indexBuiltAt(): string | null {
	return loadIndex()?.builtAt ?? null;
}
