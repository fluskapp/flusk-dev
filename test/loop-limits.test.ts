import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import { checkStop } from "../src/core/stop.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import {
	fakeModel as model,
	pingTool,
	setupTestHome,
	spyMemory,
	teardownTestHome,
} from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("ah-loop-limits-");
});

afterAll(() => {
	teardownTestHome();
});

test("checkStop covers maxTurns and deadline", () => {
	expect(checkStop(0, 0, { maxTurns: 2 }, 0)).toBeNull();
	expect(checkStop(2, 0, { maxTurns: 2 }, 0)).toBe("maxTurns");
	expect(checkStop(0, 1000, { maxTurns: 9, deadlineMs: 100 }, 1099)).toBeNull();
	expect(checkStop(0, 1000, { maxTurns: 9, deadlineMs: 100 }, 1100)).toBe("deadline");
});

test("provider error stopReason ends the run; postRun still fires once", async () => {
	const provider = new FakeProvider([]); // exhausted immediately -> stopReason "error"
	const { memory, postRuns } = spyMemory();
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		memory,
		task: "t",
		repoRoot: repo,
	});
	let toolStarts = 0;
	agent.events.on("tool:start", () => {
		toolStarts += 1;
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("error");
	expect(stats.turns).toBe(1);
	expect(toolStarts).toBe(0); // no dispatch on an error turn
	expect(postRuns).toHaveLength(1);
	expect(postRuns[0]?.outcome).toBe("error");
	agent.session.close();
});

test("maxTurns 1 stops a tool-using script with reason maxTurns", async () => {
	const provider = new FakeProvider([
		{ message: assistantToolCalls([{ id: "c1", name: "ping", args: {} }]) },
		{ message: assistantText("never reached") },
	]);
	const { memory, postRuns } = spyMemory();
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		memory,
		task: "t",
		repoRoot: repo,
		limits: { maxTurns: 1 },
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("maxTurns");
	expect(stats.turns).toBe(1);
	expect(provider.requests).toHaveLength(1);
	expect(postRuns).toHaveLength(1);
	expect(postRuns[0]?.outcome).toBe("maxTurns");
	agent.session.close();
});

test("steering after turn 1 is injected into the next request", async () => {
	const provider = new FakeProvider([
		{ message: assistantToolCalls([{ id: "c1", name: "ping", args: {} }]) },
		{ message: assistantText("done") },
	]);
	const agent = createAgent({ provider, model, tools: [pingTool], task: "t", repoRoot: repo });
	agent.events.on("turn:end", (e) => {
		if (e.turn === 1) agent.steer("also do X");
	});
	const { reason } = await agent.run();
	expect(reason).toBe("completed");
	const steerMsg = { role: "user", content: "also do X" };
	expect(provider.requests[0]?.messages).not.toContainEqual(steerMsg);
	expect(provider.requests[1]?.messages).toContainEqual(steerMsg);
	agent.session.close();
});

test("abort before run ends with reason aborted and one postRun", async () => {
	const provider = new FakeProvider([{ message: assistantText("never") }]);
	const { memory, postRuns } = spyMemory();
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		memory,
		task: "t",
		repoRoot: repo,
	});
	agent.abort();
	const { reason, stats } = await agent.run();
	expect(reason).toBe("aborted");
	expect(stats.turns).toBe(0);
	expect(provider.requests).toHaveLength(0);
	expect(postRuns).toHaveLength(1);
	expect(postRuns[0]?.outcome).toBe("aborted");
	agent.session.close();
});
