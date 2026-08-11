/**
 * The walkthrough under the conditions the real corpus actually has: a dozen
 * near-identical run journals, several failures that share one common word
 * with the task, and house rules from three different repos.
 *
 * The other walkthrough test uses eight on-topic cards, so every section it
 * checks is decided by the kind/outcome FILTERS — invert the ranker and it
 * still passes. Ordering, cardinality and dedup only become visible once the
 * pool is bigger than the section, which is why this corpus is mostly noise.
 */
import { expect, it } from "vitest";
import { buildIndex } from "../src/history/bm25.js";
import type { HistoryCard, SearchHit } from "../src/history/types.js";
import { buildWalkthrough, isHouseRule } from "../src/history/walkthrough.js";

const NOW = Date.parse("2026-08-11T00:00:00.000Z");
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

function card(p: Partial<HistoryCard> & { id: string }): HistoryCard {
	return {
		kind: "commit",
		project: "ah",
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
/** Shares one word with the nightlies ("add") and nothing else with anything. */
const ALIEN = "add the billing invoice exporter";

/** Twelve runs of the same nightly, one word away from the task ("add"). */
const NIGHTLIES = Array.from({ length: 12 }, (_, i) =>
	card({
		id: `journal:ah:nightly-${i}`,
		ref: `docs/runs/2026-07-${10 + i}-nightly.md`,
		kind: "journal",
		title: "release run for ah",
		text: `release run for ah · status: failed\n\nrouting: done|2${i}.0s|-> claude\nadd: done|1${i}.1s|2 steps\ngate: done|4${i}.2s|FAIL: verdict block`,
		outcome: "failed",
		at: daysAgo(20 + i),
	}),
);

const CORPUS: HistoryCard[] = [
	card({
		id: "commit:ah:best",
		title: "add retry backoff to the watch tick hook",
		text: "add retry backoff to the watch tick hook\n\nexponential backoff on the tick",
		paths: ["src/watch/tick.ts"],
		outcome: "verified",
		at: daysAgo(30),
	}),
	card({
		id: "commit:ah:second",
		title: "retry the watch tick once before giving up",
		text: "retry the watch tick once before giving up",
		paths: ["src/watch/tick.ts"],
		outcome: "shipped",
		at: daysAgo(60),
	}),
	card({
		id: "session:ah/real-attempt.jsonl",
		ref: "ah/real-attempt.jsonl",
		kind: "session",
		title: "add retry backoff to the watch tick",
		text: "add retry backoff to the watch tick hook\n\ncommands:\nnpm test",
		paths: ["src/watch/tick.ts"],
		outcome: "failed",
		at: daysAgo(4),
	}),
	...NIGHTLIES,
	card({ id: "commit:ah:noise1", title: "add a changelog entry", outcome: "failed" }),
	card({ id: "commit:ah:noise2", title: "add the vendored fonts", outcome: "failed" }),
	card({ id: "doc:ah:CLAUDE.md", kind: "doc", title: "ah house rules", paths: ["CLAUDE.md"] }),
	card({
		id: "doc:ah:CONTRIBUTING.md",
		kind: "doc",
		title: "ah contributing",
		text: "how to add a retry hook here: always with a test",
		paths: ["CONTRIBUTING.md"],
	}),
	card({
		id: "doc:other:CLAUDE.md",
		kind: "doc",
		project: "other",
		title: "other house rules",
		text: "in this repo a retry hook must never be added by hand",
		paths: ["CLAUDE.md"],
	}),
	card({
		id: "doc:third:AGENTS.md",
		kind: "doc",
		project: "third",
		title: "third house rules",
		text: "retry and backoff conventions for the tick loop",
		paths: ["AGENTS.md"],
	}),
];

const index = buildIndex(CORPUS);
const ids = (hits: SearchHit[]): string[] => hits.map((h) => h.card.id);
const walk = (task: string): ReturnType<typeof buildWalkthrough> =>
	buildWalkthrough(index, task, { now: NOW });

it("puts the best-ranked landed card first in precedent, not merely somewhere", () => {
	const w = walk(TASK);
	expect(ids(w.precedent)[0]).toBe("commit:ah:best");
	expect(new Set(ids(w.precedent)).size).toBe(w.precedent.length);
});

it("admits only runs that are really about this task, deduplicated", () => {
	const w = walk(TASK);
	expect(ids(w.attempts)).toContain("session:ah/real-attempt.jsonl");
	expect(new Set(ids(w.attempts)).size).toBe(w.attempts.length);
	// The nightlies share one word ("add") and a template with each other; a
	// list of them labelled "a previous attempt at this same task" is a lie.
	expect(ids(w.attempts).filter((id) => id.includes("nightly")).length).toBeLessThanOrEqual(1);
});

it("returns no attempts at all when nothing was ever attempted", () => {
	const w = walk(ALIEN);
	// A relative bar alone ("within half the best run's score") cannot say this:
	// with nothing close, half of nothing still admits the nightlies.
	expect(w.attempts).toEqual([]);
	expect(ids(buildWalkthrough(index, ALIEN, { now: NOW }).precedent)).not.toContain(
		"session:ah/real-attempt.jsonl",
	);
});

it("keeps at most two house rules, all from the repo the work is in", () => {
	const w = walk(TASK);
	const rules = w.conventions.filter((h) => isHouseRule(h.card));
	expect(rules.length).toBeLessThanOrEqual(2);
	expect(new Set(rules.map((h) => h.card.project))).toEqual(new Set(["ah"]));
	expect(ids(w.conventions)[0]).toMatch(/^doc:ah:/); // a rule still leads
});

it("warns about failures that are about this task, and not about the rest", () => {
	const { traps } = walk(TASK);
	expect(traps.join("\n")).toContain("add retry backoff to the watch tick");
	expect(traps.join("\n")).not.toContain("changelog entry");
	expect(traps.join("\n")).not.toContain("vendored fonts");
	for (const trap of traps) expect(trap).toMatch(/\((commit|session|journal) [^)]+\)\.$/);
});
