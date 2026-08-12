/**
 * The blast-radius half of an attachment: "if I change this, what else is
 * implicated" — the one question a chat box cannot answer from a pasted
 * snippet, and the reason this panel is worth more than copy-paste.
 *
 * It READS the graph, it never builds it. A build walks a language service and
 * git (src/graph/build.ts) and belongs to whatever already schedules it; doing
 * it here would make opening a panel cost seconds on the UI thread. So an
 * unbuilt project is a NOTE, not a spinner and not an empty block: "no graph
 * has been built for X yet" is a sentence the reader can act on, and it is a
 * different sentence from "nothing depends on this".
 *
 * Nothing throws: a corrupt or missing store reads as an empty graph
 * (store-io.ts guarantees that), and any other failure becomes a note.
 *
 * THE COUNT MUST CARRY THE CAP. `blastRadius` defaults to 100 rows and 3 hops,
 * so on a hub the list is a FLOOR and `impacted.length` is exactly the cap.
 * Printing that number bare tells a model "100 nodes depend on this" when the
 * truth is "at least 100" — the lie query-types.ts says truncation exists to
 * prevent, and one the Graph panel already refuses to tell (client-graph-cells).
 */
import { blastRadius } from "../graph/blast-radius.js";
import { fileId, idsFor, relPath, symbolId } from "../graph/ids.js";
import type { Truncation } from "../graph/query-types.js";
import { openGraphStore } from "../graph/store-jsonl.js";

/** Enough to see the shape of the damage; the count states the rest. */
const ROWS = 20;

export interface BlastBlock {
	text: string | null;
	note?: string;
}

export interface BlastRequest {
	/** The project root the file belongs to. */
	root: string;
	file: string;
	/** Present only when the lookup found a symbol with a definition. */
	symbol?: { name: string; definedFile: string };
}

export async function blastBlock(req: BlastRequest): Promise<BlastBlock> {
	try {
		const ids = idsFor(req.root);
		const root =
			(req.symbol !== undefined ? symbolId(ids, req.symbol.definedFile, req.symbol.name) : null) ??
			fileId(ids, req.file);
		if (root === null) return { text: null, note: "this file is outside the project root" };
		const store = openGraphStore(ids.root);
		if (store.stats().nodes === 0) {
			return { text: null, note: `no code graph has been built for ${ids.project} yet` };
		}
		const report = await blastRadius(store, root);
		if (report.impacted.length === 0) {
			return { text: null, note: `the graph records nothing that depends on ${label(root)}` };
		}
		return {
			text: render(ids.root, report.impacted.slice(0, ROWS), {
				total: report.impacted.length,
				truncation: report.truncation,
			}),
		};
	} catch (e) {
		return { text: null, note: `blast radius unavailable: ${e instanceof Error ? e.message : e}` };
	}
}

/** The tail of a node id: what a reader recognises, without parsing the id. */
function label(id: string): string {
	return id.slice(id.indexOf(":") + 1);
}

type Row = Awaited<ReturnType<typeof blastRadius>>["impacted"][number];

/**
 * One row per implicated node, nearest first, each carrying the hop that put
 * it there — an impact list nobody can audit is an impact list nobody trusts.
 */
function render(
	root: string,
	rows: Row[],
	report: { total: number; truncation: Truncation },
): string {
	const ids = idsFor(root);
	const lines = rows.map((r) => {
		const where = r.node.file === undefined ? r.node.id : (relPath(ids, r.node.file) ?? r.node.id);
		const at = r.node.line === undefined ? "" : `:${r.node.line}`;
		return `- ${r.node.label} (${r.node.kind}) ${where}${at} — depth ${r.depth}, via ${r.via}`;
	});
	const t = report.truncation;
	// "At least", never a bare count, the moment a cap bit — and the reason with
	// it, because "the depth bound stopped" and "the row cap filled" are different
	// facts about how much is missing.
	const count = t.truncated
		? `At least ${report.total} nodes depend on this, inbound (the walk was capped: ` +
			`${t.reasons.join(", ")}; at least ${t.dropped} more qualified, so this is a floor)`
		: `${report.total} node${report.total === 1 ? "" : "s"} depend on this, inbound`;
	const head = report.total > rows.length ? `${count}; the nearest ${rows.length}:` : `${count}:`;
	return `${head}\n${lines.join("\n")}`;
}
