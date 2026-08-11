/**
 * The fusion half of the doc panel: a symbol joined to its own history.
 *
 * The BM25 index is seeded by hand and ripgrep is a stub, so the assertions
 * are about the JOIN and the ORDER, not about whether a scan happened to find
 * anything. The markdown corpus is real: `scanArtifacts` reads a temp project,
 * which is what turns a bare path into a titled skill.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { AhConfig } from "../src/config/types.js";
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
let cfg: AhConfig;

function put(path: string, body: string): string {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
	return path;
}

/** id, kind, title, outcome, days old, paths — the whole seeded index. */
type Seed = [string, CardKind, string, Outcome, number, string[]];
const REL = "src/doc/related.ts";
const SEEDS: Seed[] = [
	["commit:ah:aaa1", "commit", `fix ${SYMBOL} cap`, "shipped", 30, []],
	["commit:ah:bbb2", "commit", "tidy the panel wiring", "shipped", 2, [REL]],
	["journal:ah:run7", "journal", "nightly run 7", "failed", 9, [REL]],
	["session:ah:s1", "session", `session touching ${SYMBOL}`, "shipped", 1, []],
];

/** The seeds, plus the same skill file the grep stub also returns. */
const cards = (): HistoryCard[] => [
	...SEEDS.map(([id, kind, title, outcome, days, paths]): HistoryCard => {
		return { id, kind, project: "ah", title, text: "", at: ago(days), paths, outcome, ref: id };
	}),
	{
		id: "skill:ah:retry",
		kind: "skill",
		project: "ah",
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
const grep = async (_cfg: AhConfig, symbol: string): Promise<FindResult> =>
	symbol === SYMBOL ? hits() : empty;

const ask = (over: { cap?: number } = {}, symbol = SYMBOL) =>
	relatedFor(symbol, file, cfg, { index: buildIndex(cards()), grep, now: NOW, ...over });

const why = (items: RelatedItem[], ref: string): string | undefined =>
	items.find((i) => i.ref === ref)?.why;

beforeAll(() => {
	work = mkdtempSync(join(tmpdir(), "ah-doc-related-"));
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

it("groups commits, runs and docs, and says why each row is there", async () => {
	const r = await ask();
	expect(r.commits.map((c) => c.ref)).toEqual(["commit:ah:bbb2", "commit:ah:aaa1"]);
	expect(why(r.commits, "commit:ah:bbb2")).toBe("changed this file");
	expect(why(r.commits, "commit:ah:aaa1")).toBe(`commit names ${SYMBOL}`);
	expect(why(r.runs, "session:ah:s1")).toBe(`session names ${SYMBOL}`);
	expect(r.docs.map((d) => d.ref)).toContain(doc);
	expect(why(r.docs, doc)).toBe(`doc mentions ${SYMBOL}`);
	expect(r.mentions).toBe(7); // every literal hit counts, including the .py one
	expect(r.note).toBeUndefined();
});

it("puts the failed run above the routine session and names the failure", async () => {
	const r = await ask();
	expect(r.runs.map((x) => x.ref)).toEqual(["journal:ah:run7", "session:ah:s1"]);
	expect(r.runs[0]?.why).toBe("run failed while editing this file");
});

it("de-duplicates the skill the index and ripgrep both return, heading first", async () => {
	const r = await ask();
	expect(r.docs.filter((d) => d.ref === skill)).toHaveLength(1);
	expect(r.docs[0]?.ref).toBe(skill); // a heading beats a passing mention
	expect(r.docs[0]?.kind).toBe("skill");
	expect(r.docs[0]?.title).toBe(SYMBOL); // titled by the markdown corpus, not the path
	expect(why(r.docs, skill)).toBe(`skill heading names ${SYMBOL}`);
});

it("caps each group and states the trim; an empty symbol asks nothing", async () => {
	const capped = await ask({ cap: 1 });
	expect(capped.commits).toHaveLength(1);
	expect(capped.runs).toHaveLength(1);
	expect(capped.docs).toHaveLength(1);
	expect(capped.note).toBe(
		"1 more commits beyond the cap of 1; 1 more runs beyond the cap of 1; " +
			"1 more docs beyond the cap of 1",
	);
	const none = await ask({}, "  ");
	const empty = { commits: [], runs: [], docs: [], mentions: 0, note: "no symbol selected" };
	expect(none).toEqual(empty);
});
