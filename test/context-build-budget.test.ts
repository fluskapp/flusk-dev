/**
 * The ceiling, the floors and the restatements — the three ways an assembler
 * quietly stops being auditable: it overflows, it lets one source have the
 * whole block, or it drops what did not fit without saying so.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { buildContext } from "../src/features/context/build.js";
import { PER_SOURCE_KEEP } from "../src/features/context/diversify.js";
import { DEFAULT_FLOOR_SHARE, FLOOR_SHARE } from "../src/features/context/floors.js";
import { estimateTokens } from "../src/features/history/budget.js";
import {
	fakeSource,
	flood,
	makeItem,
	paragraph,
	request,
	tinyProfile,
} from "./context-build-fixtures.js";

let repo: string;
beforeEach(async () => {
	repo = await mkdtemp(join(tmpdir(), "flusk-ctx-budget-"));
});

test("the budget is never exceeded, at any size", () => {
	for (const budgetTokens of [0, 40, 120, 300, 900, 2500, 9000]) {
		const got = buildContext(request({ repoRoot: repo, budgetTokens }), {
			sources: [flood(30), tinyProfile],
		});
		expect(got.tokens).toBe(estimateTokens(got.text));
		expect(got.tokens).toBeLessThanOrEqual(budgetTokens);
		expect(got.included.reduce((n, i) => n + i.tokens, 0)).toBeLessThanOrEqual(budgetTokens);
		expect(got.budget).toBe(budgetTokens);
		// Invariant 3: no third fate, whatever the budget.
		expect(got.included.length + got.omitted.length).toBe(31);
	}
});

test("a source that would flood the block is floored back to its share", () => {
	const got = buildContext(request({ repoRoot: repo, budgetTokens: 2000 }), {
		sources: [flood(30), tinyProfile],
	});

	const kept = (s: string): number => got.outcomes.find((o) => o.source === s)?.kept ?? 0;
	// The profile item scores 0.22 against history's 0.9 and would never win a
	// slot on rank; the floor is what buys it one.
	expect(kept("profile")).toBe(1);
	expect(kept("history")).toBeGreaterThan(0);
	expect(kept("history")).toBeLessThanOrEqual(PER_SOURCE_KEEP);
	expect(got.text).toContain("## Stack");
});

test("the floors leave room for an open contest rather than fixing the shares", () => {
	const declared = Object.values(FLOOR_SHARE).reduce((a, b) => a + b, 0);
	expect(declared).toBeCloseTo(0.8);
	expect(declared + DEFAULT_FLOOR_SHARE).toBeLessThan(1);
});

test("restatements are reported as duplicates, not repeated into the budget", () => {
	const got = buildContext(request({ repoRoot: repo, budgetTokens: 40_000 }), {
		sources: [flood(20)],
	});

	const dupes = got.omitted.filter((o) => o.reason === "duplicate");
	expect(dupes).toHaveLength(20 - PER_SOURCE_KEEP);
	expect(got.included).toHaveLength(PER_SOURCE_KEEP);
	expect(dupes[0]?.note).toContain("src/history/diverse.ts");
	// Even with budget to spare, the restatements are not bought.
	expect(got.tokens).toBeLessThan(40_000);
});

test("a pinned set larger than the budget is trimmed at a boundary and confessed", () => {
	const huge = fakeSource({
		id: "house-rules",
		label: "House rules",
		items: [
			{
				id: "house-rules:AGENTS.md",
				source: "house-rules",
				title: "House rules (AGENTS.md)",
				body: paragraph("Rule", 40),
				why: "House rule for this repo, from AGENTS.md — it governs how the rest of this block is read.",
				tier: "pinned",
				path: "AGENTS.md",
			},
		],
	});
	const got = buildContext(request({ repoRoot: repo, budgetTokens: 400 }), {
		sources: [huge, flood(5)],
	});

	// It ships, cut back to a sentence end, and says in the text that it was cut.
	expect(got.included.map((i) => i.id)).toEqual(["house-rules:AGENTS.md"]);
	expect(got.included[0]?.body).toContain("[trimmed here to fit the context budget]");
	expect(got.included[0]?.body).toContain("guards.\n[trimmed");
	expect(got.tokens).toBeLessThanOrEqual(400);
	// Reported as a note on its own source, not as a phantom omission.
	expect(got.outcomes.find((o) => o.source === "house-rules")?.notes.join(" ")).toContain(
		"was trimmed at a line boundary",
	);
	expect(got.omitted.map((o) => o.id)).not.toContain("house-rules:AGENTS.md");
});

test("an empty block and a fully-cut one are told apart by the report alone", () => {
	const nothing = buildContext(request({ repoRoot: repo }), { sources: [fakeSource({ id: "x" })] });
	expect(nothing.text).toBe("");
	expect(nothing.included).toEqual([]);
	expect(nothing.omitted).toEqual([]);
	expect(nothing.outcomes[0]?.status).toBe("skipped");

	const cut = buildContext(request({ repoRoot: repo, budgetTokens: 90 }), { sources: [flood(12)] });
	expect(cut.text).toBe("");
	expect(cut.omitted).toHaveLength(12);
	expect(new Set(cut.omitted.map((o) => o.reason))).toEqual(new Set(["budget", "duplicate"]));
});

test("an unregistered source is normalised against itself and cannot flood", () => {
	const odd = fakeSource({
		id: "custom",
		label: "Custom",
		items: [{ id: "custom:1", source: "custom", body: paragraph("Custom", 4), score: 5000 }],
	});
	const got = buildContext(request({ repoRoot: repo, budgetTokens: 3000 }), {
		sources: [odd, flood(6)],
	});

	expect(got.included.map((i) => i.id)).toContain("custom:1");
	// A score of 5000 on an undeclared scale buys rank 0.40, not the block.
	expect(got.text).toContain("| ranked | rank 0.40");
	expect(makeItem({ id: "custom:1", source: "custom", body: "x" }).tier).toBe("ranked");
});
