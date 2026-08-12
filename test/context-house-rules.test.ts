import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { houseRulesSource } from "../src/context/source-house-rules.js";
import { renderedText } from "../src/context/source-house-rules-read.js";
import type { ContextRequest } from "../src/context/types.js";
import { estimateTokens } from "../src/history/budget.js";

let repo: string;

beforeEach(async () => {
	repo = await mkdtemp(join(tmpdir(), "ah-house-rules-"));
});

const req = (task = "tighten the verify chain"): ContextRequest => ({
	task,
	repoRoot: repo,
	budgetTokens: 4000,
	isResume: false,
});

const put = async (rel: string, body: string): Promise<void> => {
	const path = join(repo, rel);
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, body);
};

test("a repo with only a README has no house rules, and says so", async () => {
	await put("README.md", "# The product\n\nWhat this thing is.");

	const got = houseRulesSource.gather(req());
	expect(got.items).toEqual([]);
	expect(got.status).toBe("skipped");
	// Distinguishable from a source that failed: the note states the reason.
	expect(got.notes.join(" ")).toContain("no AGENTS.md or CLAUDE.md");
});

test("AGENTS.md and CLAUDE.md are pinned, in that order, scored 0", async () => {
	await put("CLAUDE.md", "Never push to main.");
	await put("AGENTS.md", "Run the gate before reporting done.");

	const { items, status } = houseRulesSource.gather(req());
	expect(status).toBe("ok");
	expect(items.map((i) => i.path)).toEqual(["AGENTS.md", "CLAUDE.md"]);
	expect(items.map((i) => i.tier)).toEqual(["pinned", "pinned"]);
	expect(items.map((i) => i.score)).toEqual([0, 0]);
	expect(items.map((i) => i.id)).toEqual(["house-rules:AGENTS.md", "house-rules:CLAUDE.md"]);
	expect(items[0]?.body).toBe("Run the gate before reporting done.");
});

test("rules documents rank below the pinned files and above docs/ copies", async () => {
	await put("AGENTS.md", "agent rules");
	await put("CONTRIBUTING.md", "# How to contribute\n\nOne concern per file.");
	await put("STYLE.md", "Tabs, always.");
	await put("docs/CONVENTIONS.md", "Deeper conventions.");

	const items = houseRulesSource.gather(req()).items;
	expect(items.map((i) => i.path)).toEqual([
		"AGENTS.md",
		"CONTRIBUTING.md",
		"STYLE.md",
		"docs/CONVENTIONS.md",
	]);
	const ranked = items.filter((i) => i.tier === "ranked");
	expect(ranked.map((i) => i.score)).toEqual([70, 60, 45]);
	// The doc scan's heading becomes the block heading when it adds anything.
	expect(ranked[0]?.title).toBe("CONTRIBUTING.md — How to contribute");
});

test("a task that names a rules document lifts that document's score", async () => {
	await put("STYLE.md", "Tabs, always.");

	const plain = houseRulesSource.gather(req()).items[0];
	const named = houseRulesSource.gather(req("bring STYLE.md up to date")).items[0];
	expect(plain?.score).toBe(60);
	expect(named?.score).toBe(85);
});

test("AGENTS.md is quoted once even though the doc scan lists it as a rules doc", async () => {
	await put("AGENTS.md", "agent rules");

	const got = houseRulesSource.gather(req());
	expect(got.items.filter((i) => i.path === "AGENTS.md")).toHaveLength(1);
	expect(got.notes.join(" ")).toContain("quoted once");
});

test("every item's why names its own file and its own reason", async () => {
	await put("AGENTS.md", "agent rules");
	await put("CONTRIBUTING.md", "contributor rules");

	for (const item of houseRulesSource.gather(req()).items) {
		expect(item.why.length).toBeGreaterThan(20);
		expect(item.why).toContain(item.path ?? "");
		expect(item.why).toContain("House rule for");
		expect(item.why).not.toContain("relevant to the task");
	}
});

test("tokens count the heading and the why line, not the body alone", async () => {
	await put("AGENTS.md", "Run the gate before reporting done.");

	const item = houseRulesSource.gather(req()).items[0];
	expect(item?.tokens).toBe(
		estimateTokens(renderedText(item?.title ?? "", item?.why ?? "", item?.body ?? "")),
	);
	expect(item?.tokens).toBeGreaterThan(estimateTokens(item?.body ?? ""));
});

test("the same repo gathers byte-identically, on a resume too", async () => {
	await put("AGENTS.md", "agent rules");
	await put("docs/STYLE.md", "docs style");

	const first = JSON.stringify(houseRulesSource.gather(req()));
	const second = JSON.stringify(houseRulesSource.gather(req()));
	const resumed = JSON.stringify(houseRulesSource.gather({ ...req(), isResume: true }));
	expect(second).toBe(first);
	expect(resumed).toBe(first);
});
