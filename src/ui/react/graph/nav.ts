/**
 * The Graph window's gestures: the payload's node index, what a row opens,
 * and how the panel is aimed. Ported from client-graph-nav.ts.
 *
 * Opening is a promise the panel must be able to keep: a commit node names no
 * file this server can serve, so its row copies rather than pretending to
 * navigate (cells.tsx renders it inert to match).
 */
import type { GraphNode, GraphReply } from "../../../features/graph/graph.functions.js";

export interface Subject {
	file: string;
	symbol: string | null;
}

export interface NodeRef {
	node: GraphNode;
	/** From provenance alone — the HistoryCard join; no other section has one. */
	ref: string | null;
}

/** Every node the payload mentions, so a click can open what a row names
 * without every row carrying a copy of it. */
export function indexNodes(d: GraphReply): Record<string, NodeRef> {
	const byId: Record<string, NodeRef> = {};
	const keep = (node: GraphNode | null | undefined, ref: string | null): void => {
		if (node != null && node.id !== "" && byId[node.id] === undefined) byId[node.id] = { node, ref };
	};
	keep(d.target, null);
	for (const r of d.blast?.impacted ?? []) keep(r.node, null);
	for (const p of d.cochange?.peers ?? []) {
		keep(p.node, null);
		for (const n of p.evidence ?? []) keep(n, null);
	}
	for (const r of d.provenance?.rows ?? []) keep(r.node, r.ref);
	for (const n of d.local?.nodes ?? []) keep(n.node, null);
	return byId;
}

export interface OpenActions {
	/** A row opens the file it names, at its line. */
	openFile: (file: string, line: number) => void;
	/** A journal-path ref is a document this workbench can show. */
	openRef: (ref: string, label: string) => void;
	/** The refusal that stays honest: a commit hash is copied, not navigated. */
	copy: (text: string, said: string) => void;
}

export function openGraphNode(byId: Record<string, NodeRef>, id: string, act: OpenActions): void {
	const hit = byId[id];
	if (hit === undefined) return;
	const n = hit.node;
	if (n.file !== undefined && n.file !== "") {
		act.openFile(n.file, n.line ?? 0);
		return;
	}
	if (hit.ref !== null && hit.ref !== "" && n.kind !== "commit") {
		act.openRef(hit.ref, n.label);
		return;
	}
	act.copy(n.label, `Copied ${n.kind}`);
}

/**
 * THE SYMBOL TRAP (client-graph-nav.ts): a symbol node's id names the file
 * the symbol is DEFINED in. Sending the file you happened to be READING when
 * you clicked mints an id nothing has ever put — with no definition known,
 * aim at the file instead, which is always true. Accepts both the
 * Documentation window's payload shape ({ doc, file }) and the plain
 * { file, symbol } detail.
 */
export function subjectOf(detail: unknown): Subject | null {
	const p = (detail ?? {}) as {
		file?: string;
		symbol?: string | null;
		doc?: { name?: string; defined?: { file?: string } | null } | null;
	};
	const defined = p.doc?.defined;
	const file = defined?.file ?? p.file ?? "";
	if (file === "") return null;
	const symbol = defined?.file !== undefined ? (p.doc?.name ?? null) : (p.symbol ?? null);
	return { file, symbol };
}
