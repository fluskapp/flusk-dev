/**
 * Crossing reduction, kept separate from placement because they are different
 * problems: ranking says WHICH column a node belongs in, this says which ROW
 * within that column, and only the second one is a heuristic that could
 * reasonably be swapped for a better one.
 */
import type { MermaidGraph, MermaidNode } from "./mermaid-parse.js";

/**
 * Barycentre ordering: put each node next to the average position of the nodes
 * it connects back to, sweeping forward a few times.
 *
 * Without it, ranks keep declaration order and a twelve-stage pipeline draws
 * as a hairball — every edge crossing every other, which is a picture of
 * nothing. This is the cheap classic heuristic, not optimal crossing
 * minimisation (that is NP-hard and this is a diagram in a side panel).
 */
export function order(byRank: Map<number, MermaidNode[]>, g: MermaidGraph, keys: number[]): void {
	const preds = new Map<string, string[]>();
	for (const e of g.edges) preds.set(e.to, [...(preds.get(e.to) ?? []), e.from]);

	for (let sweep = 0; sweep < 4; sweep++) {
		const pos = new Map<string, number>();
		for (const k of keys) (byRank.get(k) ?? []).forEach((n, i) => pos.set(n.id, i));
		for (const k of keys.slice(1)) {
			const list = byRank.get(k);
			if (list === undefined) continue;
			const bary = new Map<string, number>();
			list.forEach((n, i) => {
				const up = (preds.get(n.id) ?? []).map((p) => pos.get(p)).filter((v) => v !== undefined);
				// No predecessor in an earlier rank: keep where it is, rather than
				// sorting it to the top and dragging its whole subtree with it.
				bary.set(n.id, up.length === 0 ? i : up.reduce((a, b) => a + b, 0) / up.length);
			});
			list.sort((a, b) => (bary.get(a.id) ?? 0) - (bary.get(b.id) ?? 0));
		}
	}
}
