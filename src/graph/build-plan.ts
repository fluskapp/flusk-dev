/**
 * Which files a rebuild must redo, and what it must forget before redoing them.
 *
 * A changed file is not the whole answer. Reference edges are `(referencing
 * file) → references → (symbol)` and they are computed from the SYMBOL'S side,
 * so when b.ts starts calling `greet()` the edge that has to appear hangs off
 * `greet`, which lives in the unchanged a.ts. Re-indexing only b.ts would
 * leave the call invisible. The dirty set is therefore the changed files plus
 * the files they import — one hop, taken from both the fresh parse and the
 * stored edges so a REMOVED import also invalidates its old target.
 *
 * The known limit, stated because it is a real one: a reference that crosses
 * no import — an ambient global, a triple-slash type — is only refreshed when
 * the defining file itself changes. Widening the hop to the whole reverse
 * closure would make every edit re-index the repo, which is the thing this
 * feature exists to avoid.
 *
 * FORGETTING IS NOT OPTIONAL. `put` is an upsert, so a re-index without a
 * retraction can only ever ADD: a deleted import, a renamed symbol and a
 * removed call site would all stay in the graph forever, and a graph that only
 * grows stops describing the repo it claims to describe.
 */
import type { ImportMap } from "./build-imports.js";
import { fileId, type Ids } from "./ids.js";
import type { JsonlGraph } from "./store-jsonl.js";
import type { EdgeKind } from "./types.js";

/** Everything a file's own indexing pass produces, and therefore owns. */
const OUTBOUND: EdgeKind[] = ["imports", "defines"];

/**
 * The files to re-index: `changed`, plus what they import, limited to files
 * the scan actually knows. `known` is the absolute-path file set of the
 * project — an import of something outside it is not ours to index.
 */
export async function dirtySet(
	ids: Ids,
	store: JsonlGraph,
	changed: string[],
	fresh: ImportMap,
	known: Set<string>,
): Promise<string[]> {
	const dirty = new Set<string>(changed);
	for (const file of changed) {
		for (const target of fresh.get(file) ?? []) if (known.has(target)) dirty.add(target);
		const from = fileId(ids, file);
		if (from === null) continue;
		// The far end's absolute path comes from the NODE, never from parsing the
		// id: types.ts says an id is opaque downstream — compare, never parse.
		for (const n of await store.neighbors(from, { kinds: ["imports"] })) {
			const path = n.node?.file;
			if (path !== undefined && known.has(path)) dirty.add(path);
		}
	}
	return [...dirty];
}

/**
 * Retracts everything one file's indexing pass owns: its imports and defines,
 * and the references pointing AT the symbols it defines. The symbol nodes
 * themselves stay — the port has no delete and an orphaned node is inert,
 * where a dangling edge would be a lie.
 */
export async function forgetFile(ids: Ids, store: JsonlGraph, path: string): Promise<void> {
	const id = fileId(ids, path);
	if (id === null) return;
	for (const n of await store.neighbors(id, { kinds: ["defines"] })) {
		store.forgetIn(n.edge.to, ["references"]);
	}
	store.forgetOut(id, OUTBOUND);
}

/**
 * A file the scan no longer sees. `forgetFile`'s retraction PLUS its outbound
 * `references`, which a re-index never retracts because they belong to the
 * defining file's pass — and that file's stamp did not move, so its pass will
 * not run. Without this, `use.ts -references-> greet` outlives use.ts and blast
 * radius keeps naming a deleted file as an impacted dependent.
 *
 * Its INBOUND import edges stay, because a file that still imports a deleted
 * module really does, and the store reporting `node: null` for the far end is
 * the honest answer (invariant 7). Its history edges stay for the same reason:
 * a commit really did touch it.
 */
export async function forgetRemoved(ids: Ids, store: JsonlGraph, rel: string): Promise<void> {
	await forgetFile(ids, store, rel);
	const id = fileId(ids, rel);
	// A file that is gone owns nothing: unlike a re-index, there is no later pass
	// that could re-derive these, so dropping them is the only honest option.
	if (id !== null) store.forgetOut(id, ["references"]);
}
