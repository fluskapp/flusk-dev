/**
 * `ah search <query>` — walking everything that already happened: commits,
 * ah's own sessions, harness run journals, docs and skills, in one list.
 *
 * One line per hit, because the list is meant to be scanned with the eyes and
 * the arrow keys, not read. The columns are the four things that decide
 * whether a hit is worth opening — what it is, where it lives, when it
 * happened, what it says — and the matched terms are painted inside the title
 * so the reason it ranked is visible without a second command.
 *
 * The score BREAKDOWN is behind --json on purpose: a ranking you can argue
 * with is the point, but five numbers per row would bury the titles. What a
 * row does earn, when its title matched nothing, is one line of the body
 * around the term that did — otherwise the hit is unexplained.
 */
import { styleText } from "node:util";
import { buildIndex } from "../history/bm25.js";
import { historyCards, indexBuiltAt } from "../history/corpus.js";
import { search } from "../history/rank.js";
import type { CardKind, SearchHit } from "../history/types.js";
import { KINDS } from "../ui/api-history.js";
import { highlight, snippet } from "./search-render.js";

export { highlight, snippet } from "./search-render.js";

export interface SearchArgs {
	project?: string | undefined;
	kind?: string | undefined;
	limit?: string | undefined;
	json?: boolean | undefined;
	refresh?: boolean | undefined;
	out?: NodeJS.WritableStream;
}

const KIND_W = 8;
const PROJECT_W = 16;
/** Room the fixed columns leave the title on a normal terminal. */
const TITLE_W = 62;

export const NOTHING_INDEXED =
	"nothing indexed yet — no commits, sessions, journals or docs under the configured\n" +
	"project dirs (ui.projectDirs in ~/.ah/config.json). Run `ah ui` or a task first.\n";

function pad(text: string, width: number): string {
	const one = text.replace(/\s+/g, " ").trim();
	if (one.length > width - 1) return `${one.slice(0, width - 2)}… `;
	return one + " ".repeat(width - one.length);
}

/** When the corpus was last assembled: staleness you can see, not guess. */
export function indexAge(now = Date.now()): string {
	const at = indexBuiltAt();
	const mins = at === null ? Number.NaN : Math.max(0, Math.round((now - Date.parse(at)) / 60_000));
	if (!Number.isFinite(mins)) return "index age unknown";
	if (mins < 1) return "indexed just now";
	return mins < 60 ? `indexed ${mins}m ago` : `indexed ${Math.round(mins / 60)}h ago`;
}

function row(hit: SearchHit, paint: (style: "dim" | "cyan", s: string) => string): string {
	const card = hit.card;
	const head = paint("dim", pad(card.kind, KIND_W) + pad(card.project, PROJECT_W));
	const when = paint("dim", `${card.at.slice(0, 10)}  `);
	return (
		head + when + highlight(pad(card.title, TITLE_W).trimEnd(), hit.terms, (m) => paint("cyan", m))
	);
}

/** `ah search <query> [--project p] [--kind k] [--limit n] [--json]`. */
export function searchCmd(query: string, args: SearchArgs = {}): number {
	const out = args.out ?? process.stdout;
	// `ah search … | head` closes the pipe mid-write; that is the reader's
	// choice, not a failure worth a stack trace.
	out.on("error", () => {});
	const kind = args.kind;
	if (kind !== undefined && !KINDS.includes(kind as CardKind)) {
		out.write(`ah: --kind must be one of ${KINDS.join(", ")}\n`);
		return 1;
	}
	const limit = args.limit === undefined ? 20 : Number(args.limit);
	if (!Number.isInteger(limit) || limit <= 0) {
		out.write("ah: --limit must be a positive integer\n");
		return 1;
	}
	const cards = historyCards({ refresh: args.refresh === true });
	const hits =
		cards.length === 0
			? []
			: search(buildIndex(cards), {
					text: query,
					limit,
					...(args.project !== undefined ? { project: args.project } : {}),
					...(kind !== undefined ? { kinds: [kind as CardKind] } : {}),
				});
	if (args.json === true) {
		out.write(`${JSON.stringify(hits, null, 2)}\n`);
		return 0;
	}
	if (cards.length === 0) {
		out.write(NOTHING_INDEXED);
		return 0;
	}
	const tty = Boolean((out as { isTTY?: boolean }).isTTY);
	const paint = (style: "dim" | "cyan", s: string): string => (tty ? styleText(style, s) : s);
	if (hits.length === 0) {
		out.write(`no matches for "${query}" in ${cards.length} indexed cards\n`);
		return 0;
	}
	for (const hit of hits) {
		out.write(`${row(hit, paint)}\n`);
		const where = snippet(hit);
		if (where !== null) {
			const painted = highlight(where, hit.terms, (m) => paint("cyan", m));
			out.write(`${" ".repeat(KIND_W)}${paint("dim", painted)}\n`);
		}
	}
	// The horizon is part of the answer: every repo's log is truncated, so a
	// miss may just mean "older than this" (source-git.ts DEFAULT_LIMIT).
	const since = cards.reduce((old, c) => (c.at < old ? c.at : old), "9999").slice(0, 10);
	out.write(
		paint("dim", `${hits.length} of ${cards.length} cards since ${since} · ${indexAge()}\n`),
	);
	return 0;
}
