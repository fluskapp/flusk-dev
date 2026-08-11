/**
 * A parsed flowchart, drawn as inline SVG.
 *
 * Inline because the page's CSP forbids fetching a script from anywhere, and
 * SVG because it stays sharp at any zoom and needs no canvas measurement pass.
 *
 * The journal asks for specific colours (`style intent fill:#d4edda`). We
 * ignore them and paint from the status tokens instead. Those hexes are
 * light-mode pastels chosen by a harness that never considered a dark
 * workbench: honouring them renders pale green boxes with near-invisible text
 * on a #1E1F22 background. Status is the SIGNAL; the specific hex was never
 * the point, and mapping it to a token is what makes the same diagram legible
 * in both themes.
 *
 * Marker ids carry a per-diagram suffix. SVG defs share one document-wide id
 * namespace, so two journals rendered on one page would otherwise both bind to
 * whichever arrowhead was defined last.
 */
import { layout } from "./mermaid-layout.js";
import type { MermaidGraph, NodeStatus } from "./mermaid-parse.js";

const FILL: Record<NodeStatus, string> = {
	done: "var(--ok)",
	failed: "var(--err)",
	running: "var(--run)",
	pending: "var(--dim)",
};

function esc(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Stable, collision-free within a page: the caller passes an index. */
function markerId(seq: number): string {
	return `mmd-a${seq}`;
}

export function renderMermaid(graph: MermaidGraph, seq = 0): string {
	const l = layout(graph);
	const arrow = markerId(seq);

	const defs =
		`<defs><marker id="${arrow}" viewBox="0 0 8 8" refX="7" refY="4" ` +
		`markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
		`<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>`;

	const edges = l.edges
		.map(
			(e) =>
				`<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" ` +
				`stroke="var(--dim)" stroke-width="1.5" marker-end="url(#${arrow})"/>`,
		)
		.join("");

	const nodes = l.nodes
		.map((n) => {
			const cx = n.x + n.w / 2;
			const cy = n.y + n.h / 2;
			return (
				`<g class="mmd-n" data-status="${n.status}">` +
				`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="4" ` +
				`fill="var(--panel)" stroke="${FILL[n.status]}" stroke-width="1.5"/>` +
				`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
				`fill="var(--text)" font-size="12">${esc(n.label)}</text>` +
				`</g>`
			);
		})
		.join("");

	return (
		`<div class="mmd"><svg viewBox="0 0 ${l.width} ${l.height}" ` +
		`width="${l.width}" height="${l.height}" role="img" ` +
		`aria-label="flowchart with ${l.nodes.length} steps">` +
		`${defs}${edges}${nodes}</svg></div>`
	);
}
