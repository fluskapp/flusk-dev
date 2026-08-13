/**
 * The local neighbourhood, drawn — inline SVG, no library, no network. Ported
 * from client-graph-draw.ts.
 *
 * LEGIBLE BEATS PRETTY, and that is a layout decision, not a stylesheet one:
 * a STAR in two columns (inbound neighbours left, outbound right), rows a
 * fixed pitch apart, every label at a fixed x — two labels cannot overlap by
 * construction. Edges BETWEEN neighbours are counted and not drawn; past
 * DRAW_MAX rows the diagram is dropped for the ranked list.
 *
 * The coordinate system is 880 user units wide and the element is 100% wide,
 * so a user unit is about a CSS pixel in the editor area — which is why the
 * font sizes are in user units and read at their nominal size. Every COLOUR
 * is a class, defined against theme tokens in graph.css; the SVG carries
 * geometry only (the two-hue vocabulary comment there explains why).
 */
import type { GraphEdge, Neighbourhood, NeighbourNode } from "../../../features/graph/graph.functions.js";
import { base, gClip } from "./cells.js";

/** Layout, in user units. DRAW_MAX is a legibility bound, not a data bound. */
export const GG = {
	W: 880, ROW: 26, TOP: 30, FOOT: 14,
	LX: 296, LD: 320, CX: 440, RD: 560, RX: 584,
	LABEL: 30, DRAW_MAX: 12,
} as const;

export interface Side {
	inbound: boolean;
	kind: string;
	edge: GraphEdge;
}

/**
 * Which side a neighbour belongs on, from the FIRST hop of its own path —
 * the edge that touches the centre whatever the radius is. Reading it off
 * local.edges instead would break the moment the radius grows past 1.
 */
export function ggSide(n: NeighbourNode, root: string): Side | null {
	const e = (n.path ?? [])[0];
	if (e === undefined) return null;
	return { inbound: e.to === root, kind: e.kind, edge: e };
}

function Txt(p: { x: number; y: number; cls: string; anchor: "start" | "middle" | "end"; size: number; s: string }) {
	return (
		<text x={p.x} y={p.y} className={p.cls} textAnchor={p.anchor} fontSize={p.size}>
			{p.s}
		</text>
	);
}

/** One neighbour: the dot, its two text runs, and the curve back to the centre. */
function Row(p: { n: NeighbourNode; side: Side; y: number; cy: number; open: (id: string) => void }) {
	const { n, side, y, cy } = p;
	const dot = side.inbound ? GG.LD : GG.RD;
	const c1 = side.inbound ? dot + 44 : dot - 44;
	const c2 = side.inbound ? GG.CX - 44 : GG.CX + 44;
	const cls = n.node.kind === "commit" || n.node.kind === "run" ? "gg-hist" : "gg-struct";
	return (
		<g className="gg-n" data-open={`gnode:${n.node.id}`} onClick={() => p.open(n.node.id)}>
			<path className="gg-edge" d={`M${dot} ${y} C${c1} ${y},${c2} ${cy},${GG.CX} ${cy}`} />
			<circle className={`gg-dot ${cls}`} cx={dot} cy={y} r={4} />
			<Txt x={side.inbound ? GG.LX : GG.RX} y={y + 4} cls="gg-label" anchor={side.inbound ? "end" : "start"} size={12.5} s={gClip(n.node.label, GG.LABEL)} />
			<Txt x={side.inbound ? 18 : GG.W - 18} y={y + 4} cls="gg-ek" anchor={side.inbound ? "start" : "end"} size={11} s={side.kind} />
		</g>
	);
}

/** The star. Returns null when there is nothing worth drawing. */
export function Star({ local, open }: { local: Neighbourhood; open: (id: string) => void }) {
	const left: Array<{ n: NeighbourNode; s: Side }> = [];
	const right: Array<{ n: NeighbourNode; s: Side }> = [];
	for (const n of local.nodes ?? []) {
		const s = ggSide(n, local.root);
		if (s === null) continue;
		(s.inbound ? left : right).push({ n, s });
	}
	if (!left.length && !right.length) return null;
	const rows = Math.max(left.length, right.length);
	if (rows > GG.DRAW_MAX) return null;
	const h = GG.TOP + rows * GG.ROW + GG.FOOT;
	const cy = GG.TOP + (rows * GG.ROW) / 2;
	const name = local.center !== null ? local.center.label : base(local.root);
	return (
		<svg className="gg-svg" viewBox={`0 0 ${GG.W} ${h}`} role="img" aria-label={`Local graph around ${name}`}>
			<Txt x={GG.LX} y={16} cls="gg-cap" anchor="end" size={11} s="arrives here" />
			<Txt x={GG.RX} y={16} cls="gg-cap" anchor="start" size={11} s="leaves here" />
			{[left, right].map((col, ci) =>
				col.map((item, i) => (
					<Row key={`${ci}:${item.n.node.id}`} n={item.n} side={item.s} y={GG.TOP + i * GG.ROW + 13} cy={cy} open={open} />
				)),
			)}
			<circle className="gg-dot gg-center" cx={GG.CX} cy={cy} r={7} />
			<Txt x={GG.CX} y={cy - 14} cls="gg-center-label" anchor="middle" size={12.5} s={gClip(name, 28)} />
		</svg>
	);
}

/** Whether the star would draw — the list section states why when it will not. */
export function drawable(local: Neighbourhood): boolean {
	let left = 0;
	let right = 0;
	for (const n of local.nodes ?? []) {
		const s = ggSide(n, local.root);
		if (s === null) continue;
		if (s.inbound) left += 1;
		else right += 1;
	}
	return (left > 0 || right > 0) && Math.max(left, right) <= GG.DRAW_MAX;
}
