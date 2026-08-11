/**
 * A GraphStore double for the query tests. The queries are specified against
 * the PORT, so testing them through a file-backed adapter would test the
 * adapter too and let a store bug pass as a query bug.
 *
 * It is deliberately ADVERSARIAL in two ways the port permits and real stores
 * do: it returns each edge batch in reverse order, so any query that depends on
 * the store's ordering ranks differently here than in production; and `failOn`
 * makes reads throw, because the port promising not to throw is not the same as
 * an adapter keeping the promise.
 */
import type {
	GraphEdge,
	GraphNode,
	GraphStore,
	GraphWriteResult,
	Neighbor,
	NeighborOptions,
} from "../src/graph/types.js";

export const P = "syn";
export const file = (rel: string) => `file:${P}/${rel}`;
export const sym = (rel: string, name: string) => `symbol:${P}/${rel}#${name}`;
/** Full 40-char lowercase hex, as invariant 4 requires. */
export const sha = (n: number) => String(n).padStart(40, "0");
export const commit = (n: number) => `commit:${P}:${sha(n)}`;
export const run = (id: string) => `run:${id}`;
export const doc = (rel: string) => `doc:${P}/${rel}`;

export const node = (id: string, kind: GraphNode["kind"], label = id): GraphNode => ({
	id,
	kind,
	label,
});

export const edge = (
	from: string,
	kind: GraphEdge["kind"],
	to: string,
	weight?: number,
): GraphEdge => (weight === undefined ? { from, kind, to } : { from, kind, to, weight });

/** Both directions of one co-change fact (invariant 8). */
export const coEdges = (a: string, b: string, weight: number): GraphEdge[] => [
	edge(a, "changed_with", b, weight),
	edge(b, "changed_with", a, weight),
];

export function fakeStore(
	nodes: GraphNode[],
	edges: GraphEdge[],
	failOn: string[] = [],
): GraphStore {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const all = [...edges];
	const bad = new Set(failOn);
	const key = (e: GraphEdge) => `${e.from} ${e.kind} ${e.to}`;
	return {
		async put(ns: GraphNode[], es: GraphEdge[]): Promise<GraphWriteResult> {
			for (const n of ns) byId.set(n.id, n);
			for (const e of es) {
				const at = all.findIndex((x) => key(x) === key(e));
				if (at === -1) all.push(e);
				else all[at] = e;
			}
			return { ok: true, nodes: ns.length, edges: es.length };
		},
		async node(id: string): Promise<GraphNode | null> {
			if (bad.has(id)) throw new Error("store is down");
			return byId.get(id) ?? null;
		},
		async neighbors(id: string, opts: NeighborOptions = {}): Promise<Neighbor[]> {
			if (bad.has(id)) throw new Error("store is down");
			const dir = opts.direction ?? "out";
			const kinds = opts.kinds?.length ? new Set(opts.kinds) : null;
			const out: Neighbor[] = [];
			for (const e of all) {
				const wanted =
					dir === "both"
						? e.from === id || e.to === id
						: dir === "out"
							? e.from === id
							: e.to === id;
				if (!wanted || (kinds && !kinds.has(e.kind))) continue;
				const other = e.from === id ? e.to : e.from;
				out.push({ edge: e, node: byId.get(other) ?? null });
			}
			// Reverse order on purpose: see the header.
			out.sort((a, b) => (key(a.edge) < key(b.edge) ? 1 : key(a.edge) > key(b.edge) ? -1 : 0));
			return opts.limit === undefined ? out : out.slice(0, opts.limit);
		},
	};
}
