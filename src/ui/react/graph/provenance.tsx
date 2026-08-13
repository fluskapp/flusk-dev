/**
 * PROVENANCE: the commits, runs and docs that touched this, newest first.
 * Ported from client-graph-rows.ts (gProvenance); the why-cell rule it keeps
 * is stated in rows.tsx. The `ref` comes from the HistoryCard join — the one
 * section whose rows can open a document rather than a file — and a row with
 * no matched card says so instead of pretending to a date it does not have.
 */
import type { GraphReply } from "../../../features/graph/graph.functions.js";
import { gPath, gShortRef, NodeCells, rowProps, TruncNote, WhyCell } from "./cells.js";
import { Tbl } from "./rows.js";
import { fmtTime, Sec } from "../flows/vocab.js";

export function ProvenanceSection({ d, open }: { d: GraphReply; open: (id: string) => void }) {
	const p = d.provenance;
	if (p === null) return null;
	if (!p.rows.length) {
		return (
			<Sec title="Provenance" count={0}>
				<div className="gg-none">
					No commit, run or document is attached to this yet. The history fold attaches them; a
					file added since the last index has none.
				</div>
			</Sec>
		);
	}
	return (
		<Sec title="Provenance" count={p.rows.length}>
			<Tbl head={["when", "touched by", "at", "evidence"]}>
				{p.rows.map((r) => {
					const why = `${r.relation} · ${r.edge.from} -${r.edge.kind}-> ${r.edge.to}`;
					return (
						<tr key={`${r.node.id}:${r.edge.kind}`} {...rowProps(r.node, r.ref, why, open)}>
							<td className="mono">{r.at !== null ? fmtTime(r.at) : "—"}</td>
							<NodeCells node={r.node} root={d.root} />
							<WhyCell
								text={`${r.relation}${r.ref !== null ? ` · ${gShortRef(r.ref)}` : " · no card matched"}`}
							/>
						</tr>
					);
				})}
			</Tbl>
			{p.ordered !== "history" ? (
				<div className="gg-note">
					Ordered by id, not by time: no history corpus was available to date these.
				</div>
			) : null}
			<TruncNote t={p.truncation} />
		</Sec>
	);
}
