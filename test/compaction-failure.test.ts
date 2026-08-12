import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/features/run/agent.js";
import { zeroUsage } from "../src/features/run/run.types.js";
import { assistantText, FakeProvider } from "../src/features/provider/fake.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { compactingConfig, smallModel, transcript60 } from "./compaction-helpers.js";
import { pingTool, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("flusk-compaction-fail-");
});

afterAll(() => {
	teardownTestHome();
});

test("a failed summarizer skips compaction and the run continues", async () => {
	const seed = Session.create({ task: "no compact", repoRoot: repo, model: smallModel });
	for (const m of transcript60("err")) seed.appendMessage(m);
	seed.close();
	const provider = new FakeProvider([
		{
			message: {
				role: "assistant",
				content: [],
				stopReason: "error",
				errorMessage: "summarizer down",
				usage: zeroUsage(),
			},
		},
		{ message: assistantText("recovered") },
	]);
	const agent = createAgent({
		provider,
		model: smallModel,
		tools: [pingTool],
		task: "no compact",
		repoRoot: repo,
		sessionPath: seed.path,
		config: compactingConfig(),
	});
	let compactionEvents = 0;
	agent.events.on("compaction", () => {
		compactionEvents += 1;
	});
	const { reason } = await agent.run();
	expect(reason).toBe("completed");
	expect(compactionEvents).toBe(0);
	expect(agent.session.entries.some((e) => e.type === "compaction")).toBe(false);
	// the real turn still saw the full, uncompacted transcript
	expect(provider.requests[1]?.messages.length).toBe(60);
	agent.session.close();
});
