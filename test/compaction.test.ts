import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import { assistantText, FakeProvider } from "../src/provider/fake.js";
import type { CompactionEntry } from "../src/session/entries.js";
import { Session } from "../src/session/session.js";
import {
	compactingConfig,
	smallModel,
	transcript60,
	user,
	userContent,
} from "./compaction-helpers.js";
import { pingTool, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("flusk-compaction-");
});

afterAll(() => {
	teardownTestHome();
});

test("overflow triggers compaction; reload matches the in-memory context", async () => {
	const seed = Session.create({ task: "compact me", repoRoot: repo, model: smallModel });
	for (const m of transcript60("one")) seed.appendMessage(m);
	seed.close();

	const provider = new FakeProvider([
		{ message: assistantText("SUMMARY-ONE content") },
		{ message: assistantText("all done") },
	]);
	const agent = createAgent({
		provider,
		model: smallModel,
		tools: [pingTool],
		task: "compact me",
		repoRoot: repo,
		sessionPath: seed.path,
		config: compactingConfig(),
	});
	const compactions: Array<{ tokensBefore: number; tokensAfter: number }> = [];
	agent.events.on("compaction", (e) => {
		compactions.push(e);
	});
	const { reason } = await agent.run();
	expect(reason).toBe("completed");

	expect(compactions).toHaveLength(1);
	expect(compactions[0]?.tokensBefore).toBeGreaterThan(compactions[0]?.tokensAfter ?? 0);
	// request 0 is the summarizer call: no tools, structured prompt
	expect(provider.requests[0]?.tools).toEqual([]);
	expect(provider.requests[0]?.system).toContain("## Next steps");
	expect(userContent(provider.requests[0]?.messages[0])).toContain("Transcript to summarize");
	// request 1 is the real turn over the compacted context
	const compacted = provider.requests[1]?.messages ?? [];
	expect(compacted[0]).toEqual(user("Summary of earlier work:\nSUMMARY-ONE content"));
	expect(compacted.length).toBeLessThan(10);
	expect(compacted[1]?.role).not.toBe("toolResult");

	const entry = agent.session.entries.find((e): e is CompactionEntry => e.type === "compaction");
	expect(entry?.summary).toBe("SUMMARY-ONE content");
	// reload equivalence: buildContext = the compacted request + messages after it
	const reloaded = Session.load(agent.session.path);
	const rebuilt = reloaded.buildContext();
	expect(rebuilt.slice(0, compacted.length)).toEqual(compacted);
	expect(rebuilt.at(-1)).toEqual(assistantText("all done"));
	agent.session.close();
	reloaded.close();

	// second compaction merges the first summary into the summarizer prompt
	const grow = Session.load(agent.session.path);
	for (const m of transcript60("two")) grow.appendMessage(m);
	grow.close();
	const provider2 = new FakeProvider([
		{ message: assistantText("SUMMARY-TWO merged") },
		{ message: assistantText("done again") },
	]);
	const agent2 = createAgent({
		provider: provider2,
		model: smallModel,
		tools: [pingTool],
		task: "compact me",
		repoRoot: repo,
		sessionPath: agent.session.path,
		config: compactingConfig(),
	});
	const { reason: reason2 } = await agent2.run();
	expect(reason2).toBe("completed");
	const prompt2 = userContent(provider2.requests[0]?.messages[0]);
	expect(prompt2).toContain("Previous summary to merge:");
	expect(prompt2).toContain("SUMMARY-ONE content");
	const latest = agent2.session.entries.filter(
		(e): e is CompactionEntry => e.type === "compaction",
	);
	expect(latest).toHaveLength(2);
	expect(latest.at(-1)?.summary).toBe("SUMMARY-TWO merged");
	const reloaded2 = Session.load(agent2.session.path);
	expect(reloaded2.buildContext()[0]).toEqual(user("Summary of earlier work:\nSUMMARY-TWO merged"));
	agent2.session.close();
	reloaded2.close();
});
