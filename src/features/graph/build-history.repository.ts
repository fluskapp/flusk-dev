/**
 * `touched_by` and `documents` edges, from the history cards the corpus
 * already builds — commits, flusk sessions, harness journals and docs.
 *
 * The join rule from types.ts is the thing to get right: a commit node's id
 * carries the FULL sha and `HistoryCard.id` does not, so every commit id here
 * is minted from `card.ref` (invariant 4). A card whose ref is not a 40-hex
 * sha yields no node at all rather than one that will never match.
 *
 * OUTCOME IS NOT STORED. A card knows how the work ended — verified, shipped,
 * failed, blocked — and that is ranking signal the graph deliberately does not
 * copy: GraphNode has no field for it, and duplicating it here would give the
 * workbench two sources of truth that drift. The graph holds ids and relations;
 * outcome comes from joining the card back on `ref` (invariant 13's reasoning).
 *
 * A file node is emitted only when the path still EXISTS. A commit that
 * touched a since-deleted file keeps its edge — the history is true — but the
 * store must not invent a node for a file that is not there (invariant 7).
 */
import { existsSync } from "node:fs";
import { basename } from "node:path";
import type { HistoryCard } from "../history/types.js";
import { absPath, commitId, docId, fileId, type Ids, relPath, runId } from "./ids.js";
import type { GraphEdge, GraphNode } from "./types.js";

export interface HistoryPart {
	nodes: GraphNode[];
	edges: GraphEdge[];
	/** Full shas folded in by this pass — what the resume record grows by. */
	commits: string[];
}

/** In-repo paths of a card as `(relative, node id)`, dropping anything outside. */
export function cardPaths(ids: Ids, card: HistoryCard): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	for (const path of card.paths) {
		const rel = relPath(ids, path);
		const id = rel === null ? null : fileId(ids, rel);
		if (rel !== null && id !== null) out.push([rel, id]);
	}
	return out;
}

function fileNode(ids: Ids, rel: string, id: string): GraphNode | null {
	const abs = absPath(ids, rel);
	return existsSync(abs) ? { id, kind: "file", label: basename(rel), file: abs } : null;
}

/** commit | session/journal | doc → its node id, or null when it is not one. */
function actorId(ids: Ids, card: HistoryCard): string | null {
	if (card.kind === "commit") return commitId(ids, card.ref);
	if (card.kind === "session" || card.kind === "journal") return runId(card.ref);
	return docId(ids, card.ref);
}

const actorKind = (card: HistoryCard): GraphNode["kind"] =>
	card.kind === "commit" ? "commit" : card.kind === "doc" || card.kind === "skill" ? "doc" : "run";

/**
 * Cards as nodes and edges. `seen` holds shas already folded in, so a rebuild
 * costs the NEW commits only — re-emitting them would be idempotent but would
 * still walk every path of every commit on every dashboard open.
 */
export function historyGraph(
	ids: Ids,
	cards: HistoryCard[],
	seen: Set<string> = new Set(),
): HistoryPart {
	const part: HistoryPart = { nodes: [], edges: [], commits: [] };
	for (const card of cards) {
		if (card.kind === "commit" && seen.has(card.ref)) continue;
		const actor = actorId(ids, card);
		if (actor === null) continue;
		const paths = cardPaths(ids, card);
		if (paths.length === 0) continue; // another project's card, or a pathless one
		const isDoc = actorKind(card) === "doc";
		part.nodes.push({ id: actor, kind: actorKind(card), label: card.title.slice(0, 200) });
		for (const [rel, id] of paths) {
			if (id === actor) continue; // a doc card naming itself
			const node = fileNode(ids, rel, id);
			if (node !== null) part.nodes.push(node);
			// Direction is fixed by the EdgeKind table: artifact → actor for
			// touched_by, doc → file for documents. Reversed, both stay
			// type-correct and answer the opposite question.
			part.edges.push(
				isDoc
					? { from: actor, kind: "documents", to: id }
					: { from: id, kind: "touched_by", to: actor },
			);
		}
		if (card.kind === "commit") part.commits.push(card.ref);
	}
	return part;
}
