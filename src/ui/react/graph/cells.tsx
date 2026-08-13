/**
 * The row vocabulary every section of the Graph tool window is written in:
 * clipping, the where-cell, the why-cell, the opening promise, and the audit
 * trail that goes on a row's title. Ported from client-graph-cells.ts; both
 * the tables and the diagram render rows, and one definition of "is this
 * openable" is what keeps them from disagreeing about which rows are inert.
 *
 * TWO RULES LIVE HERE.
 *
 * IDS ARE OPAQUE (invariant 2). Nothing below splits a node id on ":" or "#"
 * to recover a name or a path. Labels and files come off the node; the
 * project root comes off the payload.
 *
 * A POINTER IS A PROMISE. A row that opens nothing must not look like a row
 * that does, so `rowProps` either emits the open handle or marks the row
 * inert — never a hover state over a click that does nothing.
 */
import type { GraphEdge, GraphNode, Truncation } from "../../../features/graph/graph.functions.js";

export function base(p: string): string {
	return p.split("/").pop() ?? p;
}

export function gClip(s: unknown, n: number): string {
	const str = String(s ?? "");
	return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

/** A full sha shortened, a path reduced to its basename; anything else as-is. */
export function gShortRef(ref: string | null): string {
	if (ref === null || ref === "") return "";
	if (/^[0-9a-f]{40}$/.test(ref)) return ref.slice(0, 8);
	return ref.includes("/") ? base(ref) : ref;
}

/** The opening promise, kept or refused. */
export function gOpenable(node: GraphNode, ref: string | null): boolean {
	if (node.file !== undefined && node.file !== "") return true;
	return ref !== null && ref !== "" && node.kind !== "commit";
}

/** The tr's attributes: the open handle, or the inert marking. */
export function rowProps(
	node: GraphNode,
	ref: string | null,
	why: string,
	open: (id: string) => void,
): Record<string, unknown> {
	const canOpen = gOpenable(node, ref);
	return {
		...(canOpen
			? { "data-open": `gnode:${node.id}`, onClick: () => open(node.id) }
			: { className: "gg-inert" }),
		...(why === "" ? {} : { title: why }),
	};
}

/** The justification cell. Elided here rather than in CSS: a td cannot be
 * told to shrink beside the one that already claims the free space. */
export function WhyCell({ text }: { text: string }) {
	return <td className="gg-why">{gClip(text, 72)}</td>;
}

/**
 * Where a node lives, REPO-RELATIVE. The basename alone repeats the label for
 * every file node; the absolute path spends the rest of the row on the
 * machine's home directory. The root comes off the payload, so nothing here
 * parses the node id for it.
 */
export function gWhere(node: GraphNode, root: string): string {
	if (node.file === undefined || node.file === "") return "";
	const rel =
		root !== "" && node.file.startsWith(`${root}/`) ? node.file.slice(root.length + 1) : node.file;
	return gClip(rel, 48) + (node.line !== undefined && node.line !== 0 ? `:${node.line}` : "");
}

/** kind glyph + label + where it lives. The label is the node's, never parsed
 * out of its id. */
export function NodeCells({ node, root }: { node: GraphNode; root: string }) {
	return (
		<>
			<td className="grow">
				<span className="glyph">{node.kind}</span>
				{gClip(node.label, 72)}
			</td>
			<td className="mono">{gWhere(node, root)}</td>
		</>
	);
}

/** The whole audit trail as one string, for the row's title. */
export function gPath(path: GraphEdge[] | undefined): string {
	return (path ?? []).map((e) => `${e.from} -${e.kind}-> ${e.to}`).join("\n");
}

/** Truncation is part of the answer: a capped list that shows a bare prefix
 * reads as "only this many". Never rendered as a row, so it cannot be opened. */
export function TruncNote({ t }: { t: Truncation | undefined }) {
	if (t === undefined || !t.truncated) return null;
	const why = (t.reasons ?? []).join(", ");
	return (
		<div className="gg-note">
			Capped ({why}) — at least {t.dropped} more qualified. This answer is a floor.
		</div>
	);
}
