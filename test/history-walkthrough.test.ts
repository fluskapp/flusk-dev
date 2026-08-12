import { expect, it } from "vitest";
import { buildIndex } from "../src/features/history/bm25.js";
import type { HistoryCard, SearchHit } from "../src/features/history/types.js";
import { buildWalkthrough, extractPaths } from "../src/features/history/walkthrough.js";

const NOW = Date.parse("2026-08-11T00:00:00.000Z");
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

function card(p: Partial<HistoryCard> & { id: string }): HistoryCard {
	return {
		kind: "commit",
		project: "flusk",
		title: "",
		text: "",
		at: daysAgo(10),
		paths: [],
		outcome: "unknown",
		ref: p.id,
		...p,
	};
}

const TASK = "add retry backoff to the watch tick hook";
const FAILED: Partial<HistoryCard> = {
	outcome: "failed",
	at: daysAgo(3),
	paths: ["docs/site.ts"],
	text: "wire the documentation navigation into the site header, and it broke the build",
};

/** One corpus with every shape the walkthrough is supposed to separate. */
const CORPUS = [
	card({
		id: "commit:flusk:aaaaaaaa",
		ref: "aaaaaaaa1111",
		title: "add retry hook to watch tick",
		text: "add retry hook to watch tick\n\nbackoff on failure",
		paths: ["src/watch/tick.ts"],
		outcome: "shipped",
		at: daysAgo(30),
	}),
	card({
		id: "session:flusk/verified.jsonl",
		ref: "flusk/verified.jsonl",
		kind: "session",
		title: "add retry backoff to watch tick",
		text: "add retry backoff to watch tick\n\ncommands:\nnpm test",
		paths: ["src/watch/tick.ts"],
		outcome: "verified",
		at: daysAgo(5),
	}),
	card({
		id: "journal:docs/runs/2026-08-09.md",
		ref: "docs/runs/2026-08-09.md",
		kind: "journal",
		title: "retry backoff for the watch tick",
		text: "gate: done|78.7s|FAIL: verdict block",
		paths: ["src/watch/tick.ts"],
		outcome: "blocked",
		at: daysAgo(2),
	}),
	card({
		id: "commit:flusk:bbbbbbbb",
		ref: "bbbbbbbb2222",
		title: 'Revert "retry backoff in watch tick"',
		text: "reverts the retry backoff, it broke the watch loop",
		paths: ["src/watch/tick.ts"],
		outcome: "failed",
		at: daysAgo(20),
	}),
	// Shares one word with the task and nothing else: a failure, but not a trap.
	card({ id: "commit:flusk:ffffffff", ref: "ffffffff3333", title: "hook the docs nav", ...FAILED }),
	card({
		id: "doc:flusk:CLAUDE.md",
		ref: "/repo/CLAUDE.md",
		kind: "doc",
		title: "flusk house rules",
		text: "House rules: a retry hook always ships with a test; tabs, not spaces.",
		paths: ["CLAUDE.md"],
	}),
	card({
		id: "skill:flusk:retry",
		ref: "/repo/skills/retry/SKILL.md",
		kind: "skill",
		title: "retry backoff skill",
		text: "how to write a retry backoff in this repo, with the watch tick as the example",
		paths: ["skills/retry/SKILL.md"],
	}),
	card({ id: "commit:flusk:cccccccc", title: "rewrite the markdown parser", outcome: "shipped" }),
];

const index = buildIndex(CORPUS);
const ids = (hits: SearchHit[]): string[] => hits.map((h) => h.card.id);
const walk = (task = TASK): ReturnType<typeof buildWalkthrough> =>
	buildWalkthrough(index, task, { now: NOW });

it("extracts paths the task names, and bare filenames only when the corpus has them", () => {
	expect(extractPaths(index, "fix src/watch/tick.ts please")).toEqual(["src/watch/tick.ts"]);
	expect(extractPaths(index, "fix tick.ts and CLAUDE.md")).toEqual(["tick.ts", "CLAUDE.md"]);
	expect(extractPaths(index, "ship v1.2 e.g. soon")).toEqual([]); // not files in this corpus
	expect(extractPaths(index, "fix src/watch/tick.ts and tick.ts")).toEqual(["src/watch/tick.ts"]);
});

it("puts shipped and verified work in precedent, and nothing else", () => {
	const w = walk();
	expect(ids(w.precedent)).toContain("commit:flusk:aaaaaaaa");
	expect(ids(w.precedent)).toContain("session:flusk/verified.jsonl");
	for (const hit of w.precedent) expect(["shipped", "verified"]).toContain(hit.card.outcome);
});

it("lists prior attempts at THIS task newest first, whatever the outcome", () => {
	const w = walk();
	expect(ids(w.attempts)).toEqual(["journal:docs/runs/2026-08-09.md", "session:flusk/verified.jsonl"]);
	// The blocked run is the whole point: it is not demoted for having failed.
	expect(w.attempts[0]?.card.outcome).toBe("blocked");
	for (const hit of w.attempts) expect(["session", "journal"]).toContain(hit.card.kind);
});

it("returns conventions from writing only, house rules first", () => {
	const w = walk();
	expect(ids(w.conventions)).toEqual(["doc:flusk:CLAUDE.md", "skill:flusk:retry"]);
});

it("mines a plain-language trap per failure, and every trap cites its source", () => {
	const { traps } = walk();
	expect(traps.length).toBeGreaterThan(0);
	for (const trap of traps) expect(trap).toMatch(/\((commit|session|journal) [^)]+\)\.$/);
	expect(traps).toContain(
		'Tried "retry backoff for the watch tick" in flusk — the gate blocked it ' +
			"(journal flusk/2026-08-09.md).",
	);
	expect(traps.join("\n")).toContain("commit bbbbbbbb"); // the revert, cited by sha
	// Success is never a trap, and neither is a failure about something else:
	// a warning that does not apply teaches the reader to skip the warnings.
	expect(traps.join("\n")).not.toContain("commit aaaaaaaa");
	expect(traps.join("\n")).not.toContain("commit ffffffff");
});

it("has no traps when nothing in range ever failed", () => {
	const clean = buildIndex(CORPUS.filter((c) => c.outcome !== "failed" && c.outcome !== "blocked"));
	expect(buildWalkthrough(clean, TASK, { now: NOW }).traps).toEqual([]);
});

it("is deterministic and survives a task that matches nothing", () => {
	expect(walk()).toEqual(walk());
	const empty = buildWalkthrough(index, "zzzz qqqq nothing", { now: NOW });
	expect(empty).toEqual({ precedent: [], attempts: [], conventions: [], traps: [] });
});
