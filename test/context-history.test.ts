/**
 * What the history source promises the assembler: an item nobody has to take
 * on trust. Every assertion here is one of the laws — provenance on every
 * block (L1), nothing dropped in silence (L2), redaction that removes the
 * secret and keeps the paths (L4), and a byte-identical answer for the same
 * task over the same corpus (L5).
 */
import { expect, it } from "vitest";
import { gather } from "../src/context/source-history.js";
import type { ContextItem, ContextRequest } from "../src/context/types.js";
import { estimateTokens } from "../src/history/budget.js";
import { CORPUS, card, PROJECT, SECRET, SECRET_PATH, TASK } from "./context-history-fixtures.js";

const req = (over: Partial<ContextRequest> = {}): ContextRequest => ({
	task: TASK,
	repoRoot: `/tmp/work/${PROJECT}`,
	budgetTokens: 4000,
	isResume: false,
	...over,
});

const run = (cards = CORPUS, over: Partial<ContextRequest> = {}) =>
	gather(req(over), () => [...cards]);

/**
 * A `why` a reader can check: it names the card it belongs to (the citation is
 * the item's own title) or, for the traps block, the repo whose failures it
 * collected. "Relevant to the task" would pass a length check and tell nobody
 * anything, so the phrase itself is barred.
 */
function expectSpecificWhy(items: ContextItem[]): void {
	expect(items.length).toBeGreaterThan(0);
	for (const item of items) {
		expect(item.why.trim()).not.toBe("");
		expect(item.why).not.toMatch(/relevant to the task/i);
		expect(item.why.length).toBeGreaterThan(40);
		expect(item.why).toContain(item.id === "history:traps" ? PROJECT : item.title);
	}
}

it("reports an empty corpus as skipped, with a reason rather than silence", () => {
	const res = gather(req(), () => []);
	expect(res.items).toEqual([]);
	expect(res.status).toBe("skipped");
	expect(res.notes.join(" ")).toMatch(/no usable cards/);
});

it("says so when the corpus has cards but none for this repo", () => {
	const res = run([card({ id: "commit:other:1", project: "other", text: TASK })]);
	expect(res.items).toEqual([]);
	expect(res.status).toBe("skipped");
	expect(res.notes.join(" ")).toContain(PROJECT);
});

it("pins the house rule and the traps, and ranks the rest below them", () => {
	const { items, status } = run();
	expect(status).toBe("ok");
	const pinned = items.filter((i) => i.tier === "pinned");
	expect(pinned.map((i) => i.id)).toEqual(["history:doc:myrepo:AGENTS.md", "history:traps"]);
	expect(items.slice(0, pinned.length)).toEqual(pinned);
	for (const item of pinned) expect(item.score).toBe(0);
	const ranked = items.filter((i) => i.tier === "ranked").map((i) => i.score);
	expect([...ranked].sort((a, b) => b - a)).toEqual(ranked);
	// A run at this same task outranks the best precedent, whatever its score.
	expect(ranked[0]).toBeGreaterThan(0.8);
});

it("gives every item a checkable why, a stable id and a token count", () => {
	const { items } = run();
	expectSpecificWhy(items);
	expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
	for (const item of items) {
		expect(item.id.startsWith("history:")).toBe(true);
		expect(item.source).toBe("history");
		expect(item.tokens).toBeGreaterThanOrEqual(
			estimateTokens(`${item.title}\n${item.why}\n${item.body}`),
		);
	}
});

it("keeps every absolute path out of what the model will read", () => {
	const rendered = JSON.stringify(run().items);
	expect(rendered).not.toMatch(/"[^"]*\/(Users|home)\//);
	expect(rendered).not.toContain("/tmp/work");
});

it("redacts the secret in a real commit body and keeps its paths", () => {
	const commit = run().items.find((i) => i.id === "history:commit:myrepo:aaaaaaaa");
	expect(commit).toBeDefined();
	expect(commit?.body).not.toContain(SECRET.split("=")[1]);
	expect(commit?.body).toContain("[redacted:");
	// The recorded trap: an over-eager scrubber ate file PATHS as high entropy.
	expect(commit?.body).toContain(SECRET_PATH);
	expect(commit?.path).toBe("src/watch/tick.ts");
});

it("mines the traps from the runs that did not land, with a citation each", () => {
	const traps = run().items.find((i) => i.id === "history:traps");
	expect(traps?.body).toMatch(/\(journal myrepo\/2026-07-30\.md\)/);
	expect(traps?.body).toMatch(/\(commit bbbbbbbb\)/);
	for (const line of (traps?.body ?? "").split("\n")) expect(line).toMatch(/^Tried "/);
});

it("is byte-identical for the same task over the same corpus", () => {
	expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
	const resume = { isResume: true };
	expect(JSON.stringify(run(CORPUS, resume))).toBe(JSON.stringify(run(CORPUS, resume)));
});

it("weights previous attempts up on a resume without reordering anything else", () => {
	const before = run().items;
	const after = run(CORPUS, { isResume: true }).items;
	expect(after.map((i) => i.id)).toEqual(before.map((i) => i.id));
	const attempt = (items: ContextItem[]): number =>
		items.find((i) => i.why.startsWith("A previous run"))?.score ?? 0;
	expect(attempt(after)).toBeGreaterThan(attempt(before));
});
