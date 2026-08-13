/**
 * The Neighbourhood section: the star when it is legible, and always the list
 * under it. Ported from client-graph-draw.ts (gLocal, ggWhyNoDraw). Degrading
 * is the honest move: a picture nobody can read is worse than a list
 * everybody can — and the omissions (edges between neighbours, an undrawable
 * diagram) are stated underneath rather than silent.
 */
import type { GraphReply } from "../../../features/graph/graph.functions.js";
import { gPath, NodeCells, rowProps, TruncNote, WhyCell } from "./cells.js";
import { drawable, ggSide, Star } from "./GraphStar.js";
import { Sec } from "../flows/vocab.js";

export function LocalSection({ d, open }: { d: GraphReply; open: (id: string) => void }) {
	const local = d.local;
	if (local === null) return null;
	if (!local.nodes.length) {
		return (
			<Sec title="Neighbourhood" count={0}>
				<div className="gg-none">
					This node has no edges at all in the graph — it was indexed, but nothing imports it,
					defines into it, or has touched it.
				</div>
			</Sec>
		);
	}
	const drawn = drawable(local);
	// Counted from the triples, not from (edges - nodes): a neighbour joined to
	// the centre by two kinds at once would make that arithmetic go negative.
	const touching = local.edges.filter((e) => e.from === local.root || e.to === local.root).length;
	const between = local.edges.length - touching;
	return (
		<Sec title="Neighbourhood" count={local.nodes.length}>
			{drawn ? (
				<Star local={local} open={open} />
			) : local.nodes.length ? (
				<div className="gg-note">
					{local.nodes.length} neighbours is past what stays readable as a diagram at this width,
					so the ranked list below is the picture.
				</div>
			) : null}
			{between > 0 ? (
				<div className="gg-note">
					{between} further edge(s) between these neighbours are counted and not drawn — they are
					what turns a star into a hairball.
				</div>
			) : null}
			<table className="tbl">
				<thead>
					<tr>
						<th>dir</th>
						<th>neighbour</th>
						<th>at</th>
						<th>evidence</th>
					</tr>
				</thead>
				<tbody>
					{local.nodes.map((n) => {
						const s = ggSide(n, local.root) ?? { inbound: false, kind: n.via };
						const why = `${s.inbound ? "→ this" : "this →"} via ${s.kind}`;
						return (
							<tr key={n.node.id} {...rowProps(n.node, null, gPath(n.path), open)}>
								<td className="mono">{s.inbound ? "in" : "out"}</td>
								<NodeCells node={n.node} root={d.root} />
								<WhyCell text={`${why} · degree ${n.degree}`} />
							</tr>
						);
					})}
				</tbody>
			</table>
			<TruncNote t={local.truncation} />
		</Sec>
	);
}
