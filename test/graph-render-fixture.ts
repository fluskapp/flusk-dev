/**
 * The Graph panel's render modules, COMPILED and callable.
 *
 * The client is plain JS in a template string, so the only way to assert what
 * it draws is to run it: `new Function` over the same source the browser gets,
 * with stubs for the shared vocabulary (client-core.ts) that neither module
 * needs a DOM for. The payloads below are hand-written and hand-derivable, so
 * an expectation is never computed by the code under test.
 */
import { CLIENT_GRAPH_CELLS_JS } from "../src/ui/client-graph-cells.js";
import { CLIENT_GRAPH_DRAW_JS } from "../src/ui/client-graph-draw.js";
import { CLIENT_GRAPH_ROWS_JS } from "../src/ui/client-graph-rows.js";

/** The client-core vocabulary these modules are written in, minimally. */
const CORE = `
var esc = function (s) { return String(s == null ? "" : s)
	.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
var base = function (p) { var a = String(p == null ? "" : p).split("/"); return a[a.length - 1] || String(p); };
var fmtTime = function (s) { return String(s); };
var sec = function (t, b, c) { return "<section data-sec=\\"" + t + "\\" data-count=\\"" + c + "\\">" + b + "</section>"; };
var tbl = function (h, r) { return '<table class="tbl"><thead>' + h + "</thead><tbody>" + r + "</tbody></table>"; };
`;

export interface Api {
	gBlast(d: unknown): string;
	gCoChange(d: unknown): string;
	gProvenance(d: unknown): string;
	gLocal(d: unknown): string;
}

export const api = new Function(
	`${CORE}${CLIENT_GRAPH_CELLS_JS}${CLIENT_GRAPH_ROWS_JS}${CLIENT_GRAPH_DRAW_JS}
	return { gBlast: gBlast, gCoChange: gCoChange, gProvenance: gProvenance, gLocal: gLocal };`,
)() as Api;

const CLEAN = { truncated: false, reasons: [], dropped: 0 };
const node = (id: string, label: string, file?: string) => ({
	id,
	kind: file === undefined ? "commit" : "file",
	label,
	...(file === undefined ? {} : { file, line: 3 }),
});
const edge = (from: string, kind: string, to: string) => ({ from, kind, to });

export const known = {
	blast: {
		root: "file:p/b.ts",
		impacted: [
			{
				node: node("file:p/a.ts", "a.ts", "/p/src/a.ts"),
				depth: 1,
				via: "imports",
				path: [edge("file:p/a.ts", "imports", "file:p/b.ts")],
				score: 1,
			},
		],
		truncated: false,
		truncation: CLEAN,
		unresolved: 2,
	},
	cochange: {
		root: "file:p/b.ts",
		commitsTouchingRoot: 4,
		peers: [
			{
				node: node("file:p/c.ts", "c.ts", "/p/src/c.ts"),
				commits: 3,
				confirmed: 1,
				score: 0.75,
				evidence: [node("commit:p:ab", "fix the greeting")],
				edge: edge("file:p/b.ts", "changed_with", "file:p/c.ts"),
			},
		],
		truncation: CLEAN,
	},
	provenance: {
		target: "file:p/b.ts",
		commits: [],
		runs: [],
		docs: [],
		ordered: "history",
		rows: [
			{
				node: node("commit:p:ab", "fix the greeting"),
				relation: "touched_by",
				edge: edge("file:p/b.ts", "touched_by", "commit:p:ab"),
				at: "2026-01-02T03:04:05Z",
				ref: "1f".repeat(20),
			},
		],
		truncation: CLEAN,
		unresolved: 0,
	},
};

/** `n` neighbours, all arriving at the centre — the column that fills first. */
export const localOf = (n: number) => ({
	root: "file:p/b.ts",
	center: node("file:p/b.ts", "b.ts", "/p/src/b.ts"),
	nodes: Array.from({ length: n }, (_, i) => ({
		node: node(`file:p/n${i}.ts`, `neighbour-${i}.ts`, `/p/src/n${i}.ts`),
		depth: 1,
		via: "imports",
		path: [edge(`file:p/n${i}.ts`, "imports", "file:p/b.ts")],
		degree: 1,
		score: 1,
	})),
	edges: Array.from({ length: n }, (_, i) => edge(`file:p/n${i}.ts`, "imports", "file:p/b.ts")),
	edgesDropped: 0,
	truncation: CLEAN,
	unresolved: 0,
});

/** The BODY rows only: a thead row is a heading, never something to open. */
export const bodiesOf = (html: string): string[] =>
	[...html.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].map((m) => m[1] as string);
export const rowsOf = (html: string): string[] =>
	bodiesOf(html).flatMap((b) => b.match(/<tr/g) ?? []);
