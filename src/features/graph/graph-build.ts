/**
 * `POST /api/graph/build` — the remedy the empty state names, made reachable.
 *
 * An empty state that says "index this project" and gives you no way to do it
 * is a dead end with better prose, so the panel's button lands here. The work
 * itself is src/graph/build.ts: bounded (one slice of files per call),
 * resumable (what finished is recorded, the rest stays dirty) and incapable of
 * throwing — so this file is only a guard and a cap.
 *
 * Three things it is careful about:
 *
 *  - ONE BUILD PER ROOT. A double click, or a poll firing while the first pass
 *    runs, would have two builders appending to one log and accumulating
 *    `changed_with` weights twice, which is corruption rather than waste. A
 *    second caller joins the first build's promise and gets its report.
 *  - CARDS ARE FILTERED BY PROJECT. The corpus spans every project, and a
 *    commit card carries REPO-RELATIVE paths — so another repo's `src/index.ts`
 *    resolves happily inside this root and would attribute its commits here.
 *  - THE REPO MUST BE A CONFIGURED ROOT, compared by exact membership against
 *    `projectRoots`, never by prefix (the rule api-sessions.ts already keeps).
 */
import { resolve } from "node:path";
import type { FluskConfig } from "../../platform/config/types.js";
import { type BuildReport, buildGraph } from "./build.js";
import { historyCards } from "../history/corpus.js";
import { forgetGraphStores, storeFor } from "./graph-target.repository.js";
import { expandHome } from "../projects/journal-scan.repository.js";
import { projectRoots } from "../projects/project-scan.repository.js";

const running = new Map<string, Promise<BuildReport>>();

/** The configured root this request names, or null — never a prefix test. */
export function buildRoot(cfg: FluskConfig, raw: string | null): string | null {
	if (raw === null || raw === "") return null;
	const path = resolve(expandHome(raw));
	return projectRoots(cfg).includes(path) ? path : null;
}

/** This project's own cards. See the header: an unfiltered corpus mis-attributes. */
function cardsFor(project: string): ReturnType<typeof historyCards> {
	try {
		return historyCards().filter((c) => c.project === project);
	} catch {
		return [];
	}
}

/**
 * One build, or the one already in flight. The store handed in is the cached
 * instance the read path uses, and the cache is dropped afterwards so the next
 * read replays the log this pass actually wrote.
 */
export function buildOnce(root: string, project: string): Promise<BuildReport> {
	const held = running.get(root);
	if (held !== undefined) return held;
	const work = buildGraph({ root, store: storeFor(root), cards: cardsFor(project) }).finally(() => {
		running.delete(root);
		forgetGraphStores();
	});
	running.set(root, work);
	return work;
}

/** True while a build for this root is in flight — the panel says "indexing". */
export const isBuilding = (root: string): boolean => running.has(root);
