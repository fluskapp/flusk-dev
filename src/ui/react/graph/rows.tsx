/**
 * The ranked lists of the Graph tool window: BLAST RADIUS and CO-CHANGE
 * (PROVENANCE, the third, is provenance.tsx). Ported from
 * client-graph-rows.ts.
 *
 * THE RULE THESE FILES ARE WRITTEN AROUND: no row states a relationship
 * without the triples that produced it. Every row carries a why-cell derived
 * from the payload's own evidence; the `title` attribute carries the raw
 * triples, because the full chain does not fit in a cell and eliding it away
 * would elide the audit trail. Each empty section prints a SENTENCE rather
 * than an empty table: "no importers" and "history was never folded in" are
 * different facts with different remedies, and a blank box states neither.
 */
import type { ReactNode } from "react";
import type { GraphReply } from "../../../features/graph/graph.functions.js";
import { gClip, gPath, NodeCells, rowProps, TruncNote, WhyCell } from "./cells.js";
import { Sec } from "../flows/vocab.js";

type Open = (id: string) => void;

export function Tbl({ head, children }: { head: string[]; children: ReactNode }) {
	return (
		<table className="tbl">
			<thead>
				<tr>
					{head.map((h) => (
						<th key={h || "hops"} className={h === "hops" || h === "commits" ? "num" : ""}>
							{h}
						</th>
					))}
				</tr>
			</thead>
			<tbody>{children}</tbody>
		</table>
	);
}

/** BLAST RADIUS: inbound imports/references/defines, nearest first. */
export function BlastSection({ d, open }: { d: GraphReply; open: Open }) {
	const b = d.blast;
	if (b === null) return null;
	if (!b.impacted.length) {
		return (
			<Sec title="Blast radius" count={0}>
				<div className="gg-none">
					Nothing imports, references or defines this — no other indexed file is implicated by
					changing it.
					{b.unresolved ? ` ${b.unresolved} edge(s) point at nodes nothing has indexed yet.` : ""}
				</div>
			</Sec>
		);
	}
	return (
		<Sec title="Blast radius" count={b.impacted.length}>
			<Tbl head={["hops", "implicated", "at", "via"]}>
				{b.impacted.map((r) => {
					// The hop kinds, not the hop ids: an intermediate node has an id and
					// no label, and ids are opaque (invariant 2) — splitting one to
					// invent a prettier label is exactly the guess this panel must not
					// make. The full triple chain is on the row's title.
					const chain = r.path.map((e) => e.kind).join(" ← ");
					return (
						<tr key={r.node.id} {...rowProps(r.node, null, gPath(r.path), open)}>
							<td className="num">{r.depth}</td>
							<NodeCells node={r.node} root={d.root} />
							<WhyCell text={`${chain} · strength ${Math.round(r.score * 100) / 100}`} />
						</tr>
					);
				})}
			</Tbl>
			<TruncNote t={b.truncation} />
		</Sec>
	);
}

/** CO-CHANGE: what historically moves with this, and the commits proving it. */
export function CoChangeSection({ d, open }: { d: GraphReply; open: Open }) {
	const c = d.cochange;
	if (c === null) return null;
	if (!c.peers.length) {
		return (
			<Sec title="Co-change" count={0}>
				<div className="gg-none">
					Nothing has moved with this file in the indexed history. Either no commit touched it
					alongside another file, or history has not been folded in yet — sweeping commits (over
					25 paths) are skipped deliberately.
				</div>
			</Sec>
		);
	}
	return (
		<Sec title="Co-change" count={c.peers.length}>
			<Tbl head={["commits", "moves with", "at", "evidence"]}>
				{c.peers.map((p) => {
					const proof = p.evidence.map((n) => gClip(n.label, 40)).join(" · ");
					const why =
						`${p.confirmed} of ${p.commits} re-confirmed from touched_by on both ends` +
						(proof ? `\n${proof}` : "");
					return (
						<tr key={p.node.id} {...rowProps(p.node, null, why, open)}>
							<td className="num">{p.commits}</td>
							<NodeCells node={p.node} root={d.root} />
							<WhyCell
								text={`${p.confirmed} confirmed · ${Math.round(p.score * 100)}% of the ${c.commitsTouchingRoot} commits touching this${proof ? ` · ${proof}` : ""}`}
							/>
						</tr>
					);
				})}
			</Tbl>
			<TruncNote t={c.truncation} />
		</Sec>
	);
}
