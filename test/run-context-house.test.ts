/**
 * The doubling trap, end to end with the REAL sources.
 *
 * buildSystemPrompt renders AGENTS.md verbatim and the house-rules source pins
 * the same file. Wired naively, a run is handed the repo's rules twice — twice
 * the tokens, and two framings of one rule (an instruction in the prompt, and
 * quoted material in the block) for the model to reconcile. Whichever carries
 * it, the other must not; and when there is no block, the prompt keeps it, so
 * the rules never go missing altogether.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/features/run/agent.js";
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import { assistantText, FakeProvider } from "../src/features/provider/fake.js";
import { fakeModel, pingTool, setupTestHome, teardownTestHome } from "./helpers.js";

const RULE = "Tabs, never spaces, and no file over 150 lines.";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("flusk-run-context-house-");
	await writeFile(join(repo, "AGENTS.md"), `# House rules\n\n${RULE}\n`);
});

afterAll(() => {
	teardownTestHome();
});

/** The whole system prompt of a one-turn run, with the six real sources. */
async function systemOf(enabled: boolean): Promise<string> {
	const provider = new FakeProvider([{ message: assistantText("done") }]);
	const agent = createAgent({
		provider,
		model: fakeModel,
		tools: [pingTool],
		task: "follow the house rules",
		repoRoot: repo,
		config: { ...DEFAULT_CONFIG, context: { enabled, budgetTokens: 4000 } },
	});
	await agent.run();
	return provider.requests[0]?.system ?? "";
}

const occurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

test("the block quotes AGENTS.md and the prompt stops repeating it", async () => {
	const system = await systemOf(true);
	expect(system).toContain("# Run context");
	expect(occurrences(system, RULE)).toBe(1);
	// It is in the block, as quoted material with its provenance — not under
	// the prompt's own "## House rules for this repository" heading.
	expect(system).toContain("From: House rules [source house-rules | pinned | AGENTS.md]");
	expect(system).not.toContain("## House rules for this repository");
});

test("with the block off, the prompt still carries the rules", async () => {
	const system = await systemOf(false);
	expect(system).not.toContain("# Run context");
	expect(occurrences(system, RULE)).toBe(1);
	expect(system).toContain("## House rules for this repository");
});
