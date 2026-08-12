/**
 * Which declarations of a file get a node, and under WHAT NAME.
 *
 * It is its own file because the naming decision is a correctness one, not a
 * formatting one. `symbol:<project>/<rel>#<name>` (ids.ts) is keyed by name
 * alone, so two declarations that share a name in one file share an id — and
 * sharing an id is not a collision the store reports, it is a silent merge:
 * the second one's node is dropped, its references are never recorded, and a
 * query about it confidently answers about the FIRST one's line and callers.
 *
 * `class A { run() }` beside `class B { run() }` is ordinary code, and methods
 * are deliberately kept (build-symbols.ts's MEMBER_KINDS excludes fields, not
 * methods) because "what calls this method" is a question the graph exists for.
 * So a name that appears more than once is QUALIFIED by its container —
 * `A.run`, `B.run` — and only then. Qualifying unconditionally would rename
 * every method in the repo and break the panel's aim for all of them; this way
 * the only ids that change are the ones that were previously a lie.
 *
 * The container comes from the outline's own `depth`, which is a tree flattened
 * in order (doc/ts-outline.ts), so no second parse is needed and every builder
 * reading the same file derives the same name (invariant 3).
 *
 * The residual limit, stated because it is real: a click on `B.run` still asks
 * for `#run`, so an ambiguous method now reports "not in the graph" instead of
 * answering about `A.run`. Being told nothing is known is recoverable; being
 * told about the wrong symbol is not.
 */
import type { OutlineItem } from "../doc/types.js";

/** One declaration that earns a node, and the name its id is minted from. */
export interface NamedSymbol {
	item: OutlineItem;
	/** `item.name`, or `<container>.<name>` when the bare name is ambiguous. */
	name: string;
}

/** Each row's enclosing declaration name, by walking `depth` as a stack. */
function containers(outline: OutlineItem[]): Array<string | undefined> {
	const stack: string[] = [];
	return outline.map((item) => {
		const depth = Math.max(0, item.depth);
		stack.length = depth;
		const owner = depth === 0 ? undefined : stack[depth - 1];
		stack[depth] = item.name;
		return owner;
	});
}

/**
 * The declarations to mint nodes for, in outline order. `skip` decides which
 * kinds are reached only through their owner and never get a node of their own.
 * Overloads still collapse into one node by design: they share a name AND a
 * container, so qualification cannot separate them and the first one wins.
 */
export function namedSymbols(
	outline: OutlineItem[],
	skip: ReadonlySet<string>,
	max: number,
): NamedSymbol[] {
	const owners = containers(outline);
	const kept = outline
		.map((item, i) => ({ item, owner: owners[i] }))
		.filter((row) => !skip.has(row.item.kind));
	const times = new Map<string, number>();
	for (const row of kept) times.set(row.item.name, (times.get(row.item.name) ?? 0) + 1);
	const seen = new Set<string>();
	const out: NamedSymbol[] = [];
	for (const row of kept) {
		const ambiguous = (times.get(row.item.name) ?? 0) > 1;
		const name =
			ambiguous && row.owner !== undefined ? `${row.owner}.${row.item.name}` : row.item.name;
		if (seen.has(name)) continue;
		seen.add(name);
		out.push({ item: row.item, name });
		if (out.length >= max) break;
	}
	return out;
}
