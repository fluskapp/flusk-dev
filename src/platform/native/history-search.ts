/**
 * History search behind the native seam: HistoryCard[] in, SearchHit[] out,
 * whoever answers. Nothing above this file knows which implementation ran —
 * the same interface is served by the Rust engine when the prebuilt exists
 * and by the TypeScript reference (features/history) otherwise, or always
 * under FLUSK_NATIVE=0.
 */
import { buildIndex } from "../../features/history/bm25.js";
import { search as tsSearch } from "../../features/history/rank.js";
import type { RankOptions } from "../../features/history/rank.js";
import type { HistoryCard, SearchHit, SearchQuery } from "../../features/history/types.js";
import { nativeModule } from "./native.repository.js";

export interface HistorySearcher {
	search(query: SearchQuery, opts?: RankOptions): SearchHit[];
	/** The corpus, for consumers that read cards rather than search them
	 * (task-paths' rarity counts). One array, shared, never copied. */
	readonly cards: HistoryCard[];
	/** Which implementation is answering — surfaced in logs and tests only. */
	readonly impl: "native" | "ts";
}

function tsSearcher(cards: HistoryCard[]): HistorySearcher {
	const index = buildIndex(cards);
	return { impl: "ts", cards, search: (query, opts = {}) => tsSearch(index, query, opts) };
}

/**
 * Build once per corpus, search many times. Synchronous build is fine for the
 * CLI; Electron prewarms during app.whenReady, off the window's path.
 */
export function createHistorySearcher(cards: HistoryCard[]): HistorySearcher {
	const native = nativeModule();
	if (native === null) return tsSearcher(cards);
	try {
		const engine = native.buildHistoryEngineSync(JSON.stringify(cards));
		return {
			impl: "native",
			cards,
			search: (query, opts = {}) =>
				JSON.parse(engine.searchJson(JSON.stringify(query), JSON.stringify(opts))) as SearchHit[],
		};
	} catch {
		// Never let a native failure take search down: the reference answers.
		return tsSearcher(cards);
	}
}
