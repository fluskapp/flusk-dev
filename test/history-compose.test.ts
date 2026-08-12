import { expect, it } from "vitest";
import { buildIndex } from "../src/features/history/bm25.js";
import { estimateTokens, packToBudget, trimToSentence } from "../src/features/history/budget.js";
import { composePrompt } from "../src/features/history/compose.js";
import type { HistoryCard, SearchHit, Walkthrough } from "../src/features/history/types.js";
import { buildWalkthrough } from "../src/features/history/walkthrough.js";

const NOW = Date.parse("2026-08-11T00:00:00.000Z");
const TASK = "add retry backoff to the watch tick hook";
const RULES = "Tabs, not spaces. Every retry ships with a test.";

function card(p: Partial<HistoryCard> & { id: string }): HistoryCard {
	return {
		kind: "commit",
		project: "flusk",
		title: "",
		text: "",
		at: "2026-08-01T00:00:00.000Z",
		paths: [],
		outcome: "shipped",
		ref: p.id,
		...p,
	};
}

/** A hit whose score is irrelevant: composing must not re-rank. */
const H = (p: Partial<HistoryCard> & { id: string }): SearchHit => ({
	card: card(p),
	score: 1,
	why: { lexical: 1, recency: 1, outcome: 1, path: 1, fuzzy: 0 },
	terms: ["retry"],
});

/** Long enough that a small budget has to make choices. */
const big = (word: string): string =>
	Array.from({ length: 12 }, (_, i) => `The ${word} case ${i} is described here at length.`)
		.join(" ")
		.concat("\n");

const walkthrough: Walkthrough = {
	precedent: [
		H({ id: "c:a", ref: "aaaaaaaa1111", title: "add retry hook", text: big("precedent") }),
		H({ id: "c:d", ref: "dddddddd4444", title: "retry ceiling", text: big("second") }),
		H({ id: "c:e", ref: "eeeeeeee5555", title: "retry logging", text: big("extra") }),
	],
	attempts: [
		H({ id: "s:a", ref: "flusk/a.jsonl", kind: "session", outcome: "failed", text: big("attempt") }),
	],
	conventions: [
		H({ id: "d:c", ref: "/repo/CLAUDE.md", kind: "doc", text: RULES, paths: ["CLAUDE.md"] }),
	],
	traps: [
		'Tried "retry backoff for the watch tick" in flusk — the gate blocked it (journal docs/runs/x.md).',
	],
};

it("estimates tokens as ceil(chars/4) and never cuts a block mid-sentence", () => {
	expect(estimateTokens("abcd")).toBe(1);
	expect(estimateTokens("abcde")).toBe(2);
	const text = "One sentence here. A second sentence follows. And a third one closes it out.";
	const trimmed = trimToSentence(text, 8);
	expect(text.startsWith(trimmed)).toBe(true);
	expect(trimmed).toBe("One sentence here.");
	expect(estimateTokens(trimmed)).toBeLessThanOrEqual(8);
	expect(trimToSentence("nowhere to cut this at all", 2)).toBe("");
});

it("packs by value per token, keeps required items, and counts what it dropped", () => {
	const items = [
		{ text: "task", value: 1, required: true },
		{ text: "x".repeat(40), value: 10 }, // 10 tokens, density 1.0
		{ text: "y".repeat(20), value: 10 }, // 5 tokens, density 2.0 — wins
	];
	const packed = packToBudget(items, 6);
	expect(packed.kept.map((k) => k.text)).toEqual(["task", "y".repeat(20)]);
	expect(packed.omitted).toBe(1);
	expect(packed.tokens).toBe(6);
});

it("orders blocks by usefulness: task, conventions, precedent, attempts", () => {
	const p = composePrompt(walkthrough, TASK, { budget: 4000 });
	expect(p.blocks.map((b) => b.source)).toEqual([
		"task",
		"doc flusk/CLAUDE.md", // project-relative: no absolute path reaches the model
		"commit aaaaaaaa",
		"commit dddddddd",
		"session flusk/a.jsonl",
		"commit eeeeeeee",
	]);
	expect(p.blocks[0]?.text).toBe(TASK);
	expect(p.omitted).toBe(0);
	for (const b of p.blocks) expect(b.why.length).toBeGreaterThan(10);
	expect(p.blocks[1]?.why).toMatch(/House rule/);
	const body = p.blocks.reduce((n, b) => n + b.tokens, 0);
	expect(p.tokens).toBe(body + estimateTokens(p.constraints[0] ?? ""));
});

it("respects the budget exactly and reports the omissions", () => {
	const p = composePrompt(walkthrough, TASK, { budget: 300 });
	expect(p.tokens).toBeLessThanOrEqual(300);
	expect(p.omitted).toBeGreaterThan(0);
	expect(p.blocks.length + p.omitted).toBe(6);
	expect(p.blocks[0]?.source).toBe("task"); // the task is never the thing dropped
	// Whatever survived was cut at a sentence boundary, not mid-word.
	for (const b of p.blocks.slice(1)) expect(b.text.trimEnd()).toMatch(/[.!?]$/);
	const tiny = composePrompt(walkthrough, TASK, { budget: 1 });
	expect(tiny.blocks.map((b) => b.source)).toEqual(["task"]);
	expect(tiny.omitted).toBe(5);
});

it("turns each trap into a DON'T that keeps the citation", () => {
	const p = composePrompt(walkthrough, TASK, { budget: 4000 });
	expect(p.constraints).toEqual([
		'Do not retry "retry backoff for the watch tick" in flusk the same way — a previous run did ' +
			"and the gate blocked it (journal docs/runs/x.md).",
	]);
});

it("raises constraints for failures and none at all for a clean history", () => {
	const shared = { title: "retry backoff in watch tick", paths: ["src/watch/tick.ts"] };
	const j = card({ ...shared, id: "j", ref: "runs/x.md", kind: "journal", outcome: "blocked" });
	const c = card({ ...shared, id: "c", ref: "0123456789ab" });
	const failing = buildWalkthrough(buildIndex([j, c]), TASK, { now: NOW });
	expect(composePrompt(failing, TASK, { budget: 2000 }).constraints).toHaveLength(1);
	const clean = buildWalkthrough(buildIndex([c]), TASK, { now: NOW });
	expect(composePrompt(clean, TASK, { budget: 2000 }).constraints).toEqual([]);
});

it("composes the same prompt twice", () => {
	const opts = { budget: 350 };
	expect(composePrompt(walkthrough, TASK, opts)).toEqual(composePrompt(walkthrough, TASK, opts));
});
