/**
 * One graph build: incremental, resumable, and bounded on both sources.
 *
 * The rule the whole feature hangs on is that a dashboard open must not pay
 * for a full index. So: files whose stamp has not moved are not re-read, and
 * history is skipped outright when HEAD has not moved. When there IS work, at
 * most `maxFiles` of it happens per call and only the files that finished are
 * recorded — the rest stay dirty and the next call continues (state.ts).
 *
 * History is INJECTABLE. `cards` defaults to this repo's commits, but the
 * dashboard already maintains a card index (src/history/corpus.ts) and should
 * hand those in rather than make git walk 800 commits a second time; the tests
 * hand in a synthetic history for the same reason.
 *
 * Nothing here throws. A repo with no git, no typescript, or more files than
 * the language service will accept still produces whatever half of the graph
 * is derivable, and says in `reason` which half is missing.
 *
 * THE RESUME RECORD IS SAVED ONLY WHEN THE LOG ACCEPTED THE WRITE. It is the
 * whole-pass form of the per-file rule below: a record written after a failed
 * `put` says "indexed" about edges nothing persisted, and stamps and HEAD then
 * keep every later build from re-deriving them.
 */
import { DEFAULT_FILE_CAP, scanProject } from "../doc/ts-project.js";
import type { ServiceOptions } from "../doc/ts-service.js";
import { headOid } from "../history/corpus-sources.js";
import type { HistoryCard } from "../history/types.js";
import { sliceStructure } from "./build-slice.js";
import { foldHistory } from "./fold-history.js";
import { idsFor } from "./ids.js";
import { loadResume, saveResume } from "./state.js";
import { statePath } from "./store-io.js";
import { type JsonlGraph, openGraphStore } from "./store-jsonl.js";

export { DEFAULT_MAX_FILES } from "./build-slice.js";

export interface BuildOptions {
	root: string;
	/** This repo's history cards; defaults to its commits. */
	cards?: HistoryCard[];
	/** Overrides the HEAD read from `.git` — the "has history moved" stamp. */
	head?: string;
	maxFiles?: number;
	service?: ServiceOptions;
	store?: JsonlGraph;
	now?: Date;
}

export interface BuildReport {
	project: string;
	filesIndexed: number;
	filesSkipped: number;
	/** Dirty files this call did not get to; call again to continue. */
	filesRemaining: number;
	commitsIndexed: number;
	commitsSkipped: number;
	nodes: number;
	edges: number;
	/** What could not be derived, when something could not be. */
	reason?: string;
}

const tryHead = (root: string): string | null => {
	try {
		return headOid(root);
	} catch {
		return null; // not a git repo, or a checkout mid-clone
	}
};

export async function buildGraph(opts: BuildOptions): Promise<BuildReport> {
	const ids = idsFor(opts.root);
	const store = opts.store ?? openGraphStore(ids.root);
	const resume = loadResume(statePath(ids.root), ids);
	const report: BuildReport = {
		project: ids.project,
		filesIndexed: 0,
		filesSkipped: 0,
		filesRemaining: 0,
		commitsIndexed: 0,
		commitsSkipped: 0,
		nodes: 0,
		edges: 0,
	};
	const scan = scanProject(ids.root, opts.service?.fileCap ?? DEFAULT_FILE_CAP);
	// An over-cap scan is a PREFIX, not the file set: diffing against it would
	// report every unseen file as removed and retract a correct graph.
	const structure = scan.overCap
		? { nodes: [], edges: [], indexed: [], reason: "project is over the file cap" }
		: await sliceStructure(ids, store, resume, scan.files, opts, report);
	const head = opts.head ?? tryHead(ids.root);
	const history = await foldHistory(ids, store, resume, head, opts.cards);
	report.commitsIndexed = history.commitsIndexed;
	report.commitsSkipped = history.commitsSkipped;
	const nodes = [...structure.nodes, ...history.nodes];
	const edges = [...structure.edges, ...history.edges];
	const written = await store.put(nodes, edges);
	if (structure.reason !== undefined) report.reason = structure.reason;
	if (!written.ok) report.reason = written.reason;
	report.nodes = nodes.length;
	report.edges = edges.length;
	// RECORDED ONLY WHEN PERSISTED. `sliceStructure` and `foldHistory` have both
	// already grown the in-memory record, so saving it after a failed write would
	// claim files and commits the log never received — and the next build, seeing
	// unchanged stamps and an unchanged HEAD, would never index them again.
	if (written.ok) {
		resume.head = head;
		resume.builtAt = (opts.now ?? new Date()).toISOString();
		// Guarded because this file promises not to throw and `saveResume` writes.
		try {
			saveResume(statePath(ids.root), resume);
		} catch (err) {
			report.reason = err instanceof Error ? err.message : String(err);
		}
	}
	return report;
}
