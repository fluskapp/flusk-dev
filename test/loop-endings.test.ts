import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import type { AssistantMsg } from "../src/core/types.js";
import { zeroUsage } from "../src/core/types.js";
import { assistantText, FakeProvider } from "../src/provider/fake.js";
import {
	fakeModel as model,
	pingTool,
	setupTestHome,
	spyMemory,
	teardownTestHome,
} from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("ah-loop-endings-");
});

afterAll(() => {
	teardownTestHome();
});

test("abort mid-stream ends turn 1 with reason aborted and one postRun", async () => {
	const provider = new FakeProvider([
		{
			deltas: [
				{ channel: "text", text: "thinking about it" },
				{ channel: "text", text: "more" },
			],
			message: assistantText("never delivered"),
		},
	]);
	const { memory, postRuns } = spyMemory();
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		memory,
		task: "t",
		repoRoot: repo,
	});
	agent.events.on("assistant:delta", () => agent.abort());
	const { reason, stats } = await agent.run();
	expect(reason).toBe("aborted");
	expect(stats.turns).toBe(1);
	expect(provider.requests).toHaveLength(1);
	expect(postRuns).toHaveLength(1);
	expect(postRuns[0]?.outcome).toBe("aborted");
	agent.session.close();
});

test("stopReason maxTokens ends the run as error, not completed", async () => {
	const truncated: AssistantMsg = {
		role: "assistant",
		content: [{ type: "text", text: "half a thou" }],
		stopReason: "maxTokens",
		usage: zeroUsage(),
	};
	const provider = new FakeProvider([{ message: truncated }]);
	const { memory, postRuns } = spyMemory();
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		memory,
		task: "t",
		repoRoot: repo,
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("error");
	expect(reason).not.toBe("completed");
	expect(stats.turns).toBe(1);
	expect(postRuns).toHaveLength(1);
	expect(postRuns[0]?.outcome).toBe("error");
	agent.session.close();
});

test("steering during a final no-tool turn keeps the loop going", async () => {
	const provider = new FakeProvider([
		{ deltas: [{ channel: "text", text: "wrapping up" }], message: assistantText("first answer") },
		{ message: assistantText("addressed the steering") },
	]);
	const agent = createAgent({ provider, model, tools: [pingTool], task: "t", repoRoot: repo });
	let steered = false;
	agent.events.on("assistant:delta", () => {
		if (!steered) {
			steered = true;
			agent.steer("wait, also do X");
		}
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("completed");
	expect(stats.turns).toBe(2);
	const steerMsg = { role: "user", content: "wait, also do X" };
	expect(provider.requests).toHaveLength(2);
	expect(provider.requests[1]?.messages).toContainEqual(steerMsg);
	// The steering is persisted in the session, after the first assistant reply.
	const ctx = agent.session.buildContext();
	expect(ctx).toContainEqual(steerMsg);
	agent.session.close();
});
