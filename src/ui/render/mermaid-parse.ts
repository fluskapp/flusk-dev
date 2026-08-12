/**
 * The slice of mermaid that harness journals actually contain.
 *
 * Measured over 320 real journals: 318 mermaid blocks, ALL of them
 * `flowchart LR`, using exactly two constructs — `id["label"]` nodes and
 * `a --> b` edges, with an optional `style id fill:#rrggbb,stroke:#rrggbb`.
 * No labelled edges, no diamonds, no subgraphs, no alternate shapes.
 *
 * So this parses that, and says so. Shipping the real mermaid library would
 * add roughly a megabyte to a page whose CSP forbids loading it from anywhere
 * and which currently has no runtime dependency at all — to render a diagram
 * shape we can describe in one paragraph. Anything outside the subset is
 * REFUSED rather than half-drawn: the caller falls back to showing the source,
 * which is honest, where a diagram missing half its edges is not.
 */

/** done/failed/running/pending, recovered from the label or the fill. */
export type NodeStatus = "done" | "failed" | "running" | "pending";

export interface MermaidNode {
	id: string;
	label: string;
	status: NodeStatus;
}

export interface MermaidEdge {
	from: string;
	to: string;
}

export interface MermaidGraph {
	/** LR and RL lay out in columns; TD and TB in rows. */
	dir: "LR" | "RL" | "TD" | "TB";
	nodes: MermaidNode[];
	edges: MermaidEdge[];
}

const HEADER = /^\s*(?:flowchart|graph)\s+(LR|RL|TD|TB)\s*$/i;
const NODE = /^([A-Za-z_][\w-]*)\s*\[\s*"?(.*?)"?\s*\]$/;
const EDGE = /^(.+?)\s*-->\s*(.+)$/;
const STYLE = /^style\s+([A-Za-z_][\w-]*)\s+(.*)$/;
const BARE = /^[A-Za-z_][\w-]*$/;

/**
 * The harness encodes state twice — an emoji in the label and a pastel fill.
 * The emoji is authoritative because it survives a theme; the fill is the
 * fallback. Those pastels are light-mode hexes that vanish on a dark
 * background, which is exactly why status becomes a token downstream instead
 * of being drawn with the colour the document asked for.
 */
const BY_EMOJI: [RegExp, NodeStatus][] = [
	[/[✅✓]/u, "done"],
	[/[❌✗✖⛔]/u, "failed"],
	[/[⏳▶🏃]/u, "running"],
	[/[⏸⌛⏹]/u, "pending"],
];

const BY_FILL: [RegExp, NodeStatus][] = [
	[/#d4edda|#c3e6cb|#d1e7dd/i, "done"],
	[/#f8d7da|#f5c6cb/i, "failed"],
	[/#fff3cd|#ffeeba/i, "running"],
];

function statusOf(label: string, fill: string): NodeStatus {
	for (const [re, s] of BY_EMOJI) if (re.test(label)) return s;
	for (const [re, s] of BY_FILL) if (re.test(fill)) return s;
	return "pending";
}

/** `a[X] --> b[Y]` is legal mermaid, so an endpoint may declare its own node. */
function endpoint(text: string, into: Map<string, string>): string | null {
	const t = text.trim();
	const node = NODE.exec(t);
	if (node !== null) {
		const [, id, label] = node;
		if (id === undefined) return null;
		if (!into.has(id)) into.set(id, label ?? id);
		return id;
	}
	return BARE.test(t) ? t : null;
}

/** null when the source uses anything outside the subset above. */
export function parseMermaid(src: string): MermaidGraph | null {
	const stmts = src
		.split("\n")
		.flatMap((l) => l.split(";"))
		.map((l) => l.trim())
		.filter((l) => l !== "" && !l.startsWith("%%"));
	if (stmts.length === 0) return null;

	const head = HEADER.exec(stmts[0] ?? "");
	if (head === null) return null;
	const dir = (head[1] ?? "LR").toUpperCase() as MermaidGraph["dir"];

	const labels = new Map<string, string>();
	const fills = new Map<string, string>();
	const edges: MermaidEdge[] = [];
	const order: string[] = [];
	const see = (id: string): void => {
		if (!order.includes(id)) order.push(id);
	};

	for (const stmt of stmts.slice(1)) {
		const style = STYLE.exec(stmt);
		if (style !== null) {
			const [, id, decl] = style;
			if (id !== undefined) fills.set(id, decl ?? "");
			continue;
		}
		const edge = EDGE.exec(stmt);
		if (edge !== null) {
			const from = endpoint(edge[1] ?? "", labels);
			const to = endpoint(edge[2] ?? "", labels);
			if (from === null || to === null) return null; // outside the subset
			see(from);
			see(to);
			edges.push({ from, to });
			continue;
		}
		const node = NODE.exec(stmt);
		if (node === null) return null; // an unsupported statement
		const [, id, label] = node;
		if (id === undefined) return null;
		labels.set(id, label ?? id);
		see(id);
	}

	if (order.length === 0) return null;
	const nodes = order.map((id) => ({
		id,
		label: labels.get(id) ?? id,
		status: statusOf(labels.get(id) ?? "", fills.get(id) ?? ""),
	}));
	return { dir, nodes, edges };
}
