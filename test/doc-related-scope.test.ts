/**
 * The one claim the RELATED section makes: every row is ABOUT THIS SYMBOL.
 *
 * It was not. The BM25 query was `symbol + ABSOLUTE path`, so tokens like
 * users/ashb/projects carried the whole score and three different symbols —
 * plus one that did not exist — returned a byte-identical row set. And `whyOf`
 * printed "names <symbol>" for any failed or blocked card WITHOUT checking
 * that the card contained the symbol, so the single field that justifies a row
 * was a fabrication. Both are asserted here against the same seeded index.
 *
 * Split from doc-related.test.ts, which owns the join, the order and the caps.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { FluskConfig } from "../src/config/types.js";
import { type RelatedItem, relatedFor } from "../src/doc/related.js";
import type { FindMatch, FindResult } from "../src/find/types.js";
import { buildIndex } from "../src/history/bm25.js";
import type { CardKind, HistoryCard, Outcome } from "../src/history/types.js";

const NOW = Date.parse("2026-08-10T00:00:00.000Z");
const ago = (days: number): string => new Date(NOW - days * 86_400_000).toISOString();
const SYMBOL = "relatedFor";

let work: string;
let file: string;
let skill: string;
let doc: string;
let cfg: FluskConfig;

function put(path: string, body: string): string {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
	return path;
}

/** id, kind, title, outcome, days old, paths — the whole seeded index. */
type Seed = [string, CardKind, string, Outcome, number, string[]];
const REL = "src/doc/related.ts";
const SEEDS: Seed[] = [
	["commit:flusk:aaa1", "commit", `fix ${SYMBOL} cap`, "shipped", 30, []],
	["commit:flusk:bbb2", "commit", "tidy the panel wiring", "shipped", 2, [REL]],
	["journal:flusk:run7", "journal", "nightly run 7", "failed", 9, [REL]],
	["session:flusk:s1", "session", `session touching ${SYMBOL}`, "shipped", 1, []],
];

/** The seeds, plus the same skill file the grep stub also returns. */
const cards = (): HistoryCard[] => [
	...SEEDS.map(([id, kind, title, outcome, days, paths]): HistoryCard => {
		return { id, kind, project: "flusk", title, text: "", at: ago(days), paths, outcome, ref: id };
	}),
	{
		id: "skill:flusk:retry",
		kind: "skill",
		project: "flusk",
		title: "Retry",
		text: SYMBOL,
		at: ago(5),
		paths: [],
		outcome: "unknown",
		ref: skill,
	},
];

const match = (line: number, text: string): FindMatch => {
	return { path: "", project: "proj", line, text, ranges: [] };
};

/**
 * Two markdown files and one Python call site the language service cannot see.
 * LITERAL, like the real ripgrep: a symbol that appears nowhere finds nothing,
 * which is what lets the empty state be asserted instead of assumed.
 */
const empty: FindResult = { files: [], total: 0, truncated: false, tookMs: 1 };
const hits = (): FindResult => ({
	files: [
		{ path: doc, project: "proj", matches: [match(3, `the panel calls ${SYMBOL} once`)] },
		{ path: skill, project: "proj", matches: [match(1, `# ${SYMBOL}`)] },
		{ path: join(work, "proj/tools/call.py"), project: "proj", matches: [match(9, "related_for")] },
	],
	total: 7,
	truncated: false,
	tookMs: 1,
});
const grep = async (_cfg: FluskConfig, symbol: string): Promise<FindResult> =>
	symbol === SYMBOL ? hits() : empty;

const ask = (over: { cap?: number } = {}, symbol = SYMBOL) =>
	relatedFor(symbol, file, cfg, { index: buildIndex(cards()), grep, now: NOW, ...over });

const why = (items: RelatedItem[], ref: string): string | undefined =>
	items.find((i) => i.ref === ref)?.why;

beforeAll(() => {
	work = mkdtempSync(join(tmpdir(), "flusk-doc-related-"));
	const root = join(work, "proj");
	file = put(join(root, "src/doc/related.ts"), `export function ${SYMBOL}() {}\n`);
	skill = put(join(root, ".claude/skills/retry/SKILL.md"), `# ${SYMBOL}\n\nnever loop it.\n`);
	doc = put(join(root, "docs/panel.md"), `# Panel\n\nthe panel calls ${SYMBOL} once\n`);
	cfg = {
		...structuredClone(DEFAULT_CONFIG),
		ui: { harnessDirs: [], projectDirs: [join(work, "*")] },
	};
});

afterAll(() => rmSync(work, { recursive: true, force: true }));

it("is ABOUT THE SYMBOL: a name nothing mentions returns nothing", async () => {
	// The bug: the BM25 query was `symbol + ABSOLUTE path`, so tokens like
	// users/ashb/projects carried the whole score and three different symbols —
	// plus one that did not exist — produced a byte-identical row set. Only the
	// grep half, which matches the symbol literally, may answer here.
	const none = await ask({}, "zzqqxxnotasymbol");
	const real = await ask();
	// The row sets DIFFER — they used to be byte-identical for any input.
	expect(none.commits.map((c) => c.ref)).not.toEqual(real.commits.map((c) => c.ref));
	expect(none.runs.map((r) => r.ref)).not.toEqual(real.runs.map((r) => r.ref));
	expect(none.docs).toEqual([]); // nothing literal to grep, nothing to rank
	// What survives is only what touched the FILE, and it says exactly that:
	// no row claims a name for a symbol that appears nowhere.
	expect(none.commits.map((c) => c.why)).toEqual(["changed this file"]);
	expect(none.runs.map((r) => r.why)).toEqual(["run failed while editing this file"]);
	for (const item of [...none.commits, ...none.runs, ...none.docs]) {
		expect(item.why).not.toContain("names");
		expect(item.why).not.toContain("mentions");
	}
	// ...and the cap note no longer counts ranking noise as history it trimmed.
	expect(none.note).toBeUndefined();
});

it("never claims a card names a symbol it does not contain", async () => {
	// `whyOf` asserted "names <symbol>" for ANY failed or blocked card, before
	// testing whether the card contained the symbol at all — so the one field
	// that justifies a row printed a fabricated claim, and the only covered
	// branch was the `touched` one.
	const r = await ask();
	for (const item of [...r.commits, ...r.runs, ...r.docs]) {
		if (!item.why.includes(`names ${SYMBOL}`)) continue;
		const card = cards().find((c) => c.ref === item.ref);
		const text = card === undefined ? item.title : `${card.title}\n${card.text}`;
		expect(text.toLowerCase()).toContain(SYMBOL.toLowerCase());
	}
	// The failed run touched the file, so it says so and does not claim a name.
	expect(why(r.runs, "journal:flusk:run7")).toBe("run failed while editing this file");
});
