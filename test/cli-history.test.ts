/**
 * How a developer reaches history from the terminal: `flusk search` and
 * `flusk prompt`, against a SEEDED index in a temp FLUSK_HOME — no network, no
 * model, no walk of the real machine's repos. (The HTTP half is in
 * api-history.test.ts.)
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { promptCmd } from "../src/cli/prompt-cmd.js";
import { highlight, searchCmd } from "../src/cli/search-cmd.js";
import { saveIndex } from "../src/features/history/index-store.repository.js";
import type { CardKind, ComposedPrompt, HistoryCard, SearchHit } from "../src/features/history/types.js";
import { capture } from "./cli2-helpers.js";

let home: string;
function card(id: string, kind: CardKind, over: Partial<HistoryCard> = {}): HistoryCard {
	return {
		id,
		kind,
		project: "linof-base",
		at: "2026-08-01T00:00:00.000Z",
		outcome: "shipped",
		ref: id,
		title: "add a retry hook with backoff to the queue worker",
		text: "the queue worker retries with exponential backoff",
		paths: ["src/queue/worker.ts"],
		...over,
	};
}

/** Precedent, a failure to warn about, a house rule, and an off-topic repo. */
const CORPUS = [
	card("commit:linof-base:aaaa1111", "commit", { ref: "aaaa1111bbbb2222" }),
	card("journal:linof-base:run-9", "journal", {
		title: "retry hook rollout",
		outcome: "failed",
		ref: "/tmp/docs/runs/run-9.md",
	}),
	card("doc:linof-base:CONTRIBUTING.md", "doc", {
		title: "Contributing",
		outcome: "unknown",
		ref: "/tmp/CONTRIBUTING.md",
		paths: ["CONTRIBUTING.md"],
		text: "Tabs. Relative imports end in .js. Retry logic lives in the worker.",
	}),
	card("commit:abagraph:cccc3333", "commit", {
		project: "abagraph",
		title: "unrelated parser fix",
	}),
];
beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-history-cli-"));
	process.env.FLUSK_HOME = home;
	saveIndex({ cards: CORPUS, builtAt: new Date().toISOString(), stamps: {} });
});

afterAll(() => {
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("lists one line per hit — kind, project, date, title — filtered by kind and project", () => {
	const all = capture();
	expect(searchCmd("retry hook", { out: all.out })).toBe(0);
	// The row FORMAT is the contract here, not which row wins: ordering is the
	// ranker's business and is measured against the golden set in history-eval.
	expect(all.text()).toMatch(/^commit\s+linof-base\s+2026-08-01\s+add a retry hook/m);
	expect(all.text()).toMatch(/^journal\s+linof-base\s+2026-08-01\s+retry hook rollout/m);
	expect(all.text()).toContain("of 4 cards");

	const journals = capture();
	searchCmd("retry hook", { kind: "journal", out: journals.out });
	expect(journals.text()).toContain("retry hook rollout");
	expect(journals.text()).not.toContain("commit ");

	const scoped = capture();
	searchCmd("parser fix", { project: "abagraph", out: scoped.out });
	expect(scoped.text()).toContain("unrelated parser fix");

	const bad = capture();
	expect(searchCmd("x", { kind: "nonsense", out: bad.out })).toBe(1);
	expect(bad.text()).toContain("--kind must be one of");
});

it("puts the score breakdown behind --json, and paints matched terms", () => {
	const out = capture();
	searchCmd("retry hook", { json: true, limit: "2", out: out.out });
	const hits = JSON.parse(out.text()) as SearchHit[];
	expect(hits.length).toBe(2);
	expect(Object.keys(hits[0]?.why ?? {}).sort()).toEqual([
		"fuzzy",
		"lexical",
		"outcome",
		"path",
		"recency",
	]);
	expect(highlight("a retry hook", ["retry"], (m) => `[${m}]`)).toBe("a [retry] hook");
});

it("prompts with a header naming what was included and why, plus the constraints", () => {
	const out = capture();
	expect(promptCmd("add a retry hook with backoff", { out: out.out })).toBe(0);
	const text = out.text();
	expect(text).toContain('prompt for "add a retry hook with backoff"');
	expect(text).toMatch(/\d+ tokens · \d+ blocks/);
	expect(text).toContain("The work to do"); // the task block's own "why"
	expect(text).toContain("## task");
	expect(text).toContain("## Constraints"); // mined from the failed journal
	expect(text).toContain("Do not retry");

	const json = capture();
	promptCmd("add a retry hook", {
		json: true,
		budget: "600",
		repo: "/tmp/linof-base",
		out: json.out,
	});
	const composed = JSON.parse(json.text()) as ComposedPrompt;
	expect(composed.task).toBe("add a retry hook");
	expect(composed.blocks[0]?.source).toBe("task");
	expect(composed.blocks.every((b) => !b.source.includes("abagraph"))).toBe(true);

	// A typo'd flag is an error a script must be able to see, as in `flusk search`.
	const bad = capture();
	expect(promptCmd("x", { budget: "lots", out: bad.out })).toBe(1);
	expect(bad.text()).toContain("--budget must be a positive integer");
});

it("says nothing is indexed rather than printing an empty prompt", () => {
	const empty = mkdtempSync(join(tmpdir(), "flusk-history-empty-"));
	process.env.FLUSK_HOME = empty;
	// No seeded index: the scan really runs, over a config that names no project.
	writeFileSync(
		join(empty, "config.json"),
		JSON.stringify({ ui: { projectDirs: [], harnessDirs: [] } }),
	);
	const search = capture();
	const prompt = capture();
	expect(searchCmd("anything", { out: search.out })).toBe(0);
	expect(promptCmd("anything", { out: prompt.out })).toBe(0);
	for (const text of [search.text(), prompt.text()]) expect(text).toContain("nothing indexed yet");
	expect(prompt.text()).not.toContain("## task");
	process.env.FLUSK_HOME = home;
	rmSync(empty, { recursive: true, force: true });
});
