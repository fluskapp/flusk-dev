/**
 * Layered layout for a flowchart DAG: the classic "rank by longest path from
 * a root, then spread within the rank" arrangement.
 *
 * Geometry is computed here and NOT in the renderer, so the arrow router and
 * the box drawer agree on where a node is by construction rather than by two
 * copies of the same arithmetic drifting apart.
 *
 * Cycles are the trap. A journal graph is a pipeline and should be acyclic,
 * but a malformed one must not hang the dashboard: ranking is bounded by the
 * node count, so a cycle degrades to a stable-but-arbitrary layering instead
 * of looping forever.
 */
import type { MermaidGraph, MermaidNode } from "./mermaid-parse.js";
import { order } from "./mermaid-order.js";

export interface Placed extends MermaidNode {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Routed {
	/** Start and end points, already on the box edges the arrow leaves/enters. */
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface Layout {
	nodes: Placed[];
	edges: Routed[];
	width: number;
	height: number;
}

const CHAR_W = 7.2;
const PAD_X = 14;
const NODE_H = 30;
const GAP_MAIN = 56;
const GAP_CROSS = 16;
const MARGIN = 10;
const MIN_W = 54;

/** Emoji are wide and the label carries one; measuring in chars alone clips. */
function widthOf(label: string): number {
	const emoji = (label.match(/\p{Extended_Pictographic}/gu) ?? []).length;
	const plain = [...label].length - emoji;
	return Math.max(MIN_W, Math.round(plain * CHAR_W + emoji * 16 + PAD_X * 2));
}

/**
 * Rank by longest path so an edge always points forward a rank or more.
 * Bounded by node count: with a cycle the ranks stop changing and we stop.
 */
function rank(g: MermaidGraph): Map<string, number> {
	const r = new Map(g.nodes.map((n) => [n.id, 0]));
	for (let pass = 0; pass < g.nodes.length; pass++) {
		let moved = false;
		for (const e of g.edges) {
			const from = r.get(e.from);
			const to = r.get(e.to);
			if (from === undefined || to === undefined) continue;
			if (to < from + 1) {
				r.set(e.to, from + 1);
				moved = true;
			}
		}
		if (!moved) break;
	}
	return r;
}

export function layout(g: MermaidGraph): Layout {
	const ranks = rank(g);
	const byRank = new Map<number, MermaidNode[]>();
	for (const n of g.nodes) {
		const k = ranks.get(n.id) ?? 0;
		const list = byRank.get(k);
		if (list === undefined) byRank.set(k, [n]);
		else list.push(n);
	}
	order(byRank, g, [...byRank.keys()].sort((a, b) => a - b));

	const horizontal = g.dir === "LR" || g.dir === "RL";
	const keys = [...byRank.keys()].sort((a, b) => a - b);

	// Main axis: one offset per rank, sized by the widest box in that rank.
	const mainAt = new Map<number, number>();
	let main = MARGIN;
	for (const k of keys) {
		mainAt.set(k, main);
		const span = horizontal
			? Math.max(...(byRank.get(k) ?? []).map((n) => widthOf(n.label)))
			: NODE_H;
		main += span + GAP_MAIN;
	}
	const mainEnd = main - GAP_MAIN + MARGIN;

	// Cross axis: stack within the rank, then centre every rank against the
	// tallest one, so a 2-node rank sits beside the middle of a 4-node rank
	// instead of hugging the top edge.
	const placed: Placed[] = [];
	let crossMax = 0;
	const crossOf = (list: MermaidNode[]): number =>
		list.reduce((sum, n) => sum + (horizontal ? NODE_H : widthOf(n.label)) + GAP_CROSS, -GAP_CROSS);
	for (const k of keys) crossMax = Math.max(crossMax, crossOf(byRank.get(k) ?? []));

	for (const k of keys) {
		const list = byRank.get(k) ?? [];
		let cross = MARGIN + (crossMax - crossOf(list)) / 2;
		for (const n of list) {
			const w = widthOf(n.label);
			const size = horizontal ? NODE_H : w;
			placed.push({
				...n,
				x: horizontal ? (mainAt.get(k) ?? 0) : cross,
				y: horizontal ? cross : (mainAt.get(k) ?? 0),
				w,
				h: NODE_H,
			});
			cross += size + GAP_CROSS;
		}
	}

	const at = new Map(placed.map((p) => [p.id, p]));
	const edges: Routed[] = [];
	for (const e of g.edges) {
		const a = at.get(e.from);
		const b = at.get(e.to);
		if (a === undefined || b === undefined) continue;
		edges.push(
			horizontal
				? { x1: a.x + a.w, y1: a.y + a.h / 2, x2: b.x, y2: b.y + b.h / 2 }
				: { x1: a.x + a.w / 2, y1: a.y + a.h, x2: b.x + b.w / 2, y2: b.y },
		);
	}

	const crossEnd = crossMax + MARGIN * 2;
	return {
		nodes: placed,
		edges,
		width: horizontal ? mainEnd : crossEnd,
		height: horizontal ? crossEnd : mainEnd,
	};
}
