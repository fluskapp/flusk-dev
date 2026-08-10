import { afterAll, beforeAll, expect, test } from "vitest";
import type { Agent } from "../src/agent/agent.js";
import { createAgent } from "../src/agent/agent.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { AhConfig } from "../src/config/types.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import type { StatsEntry } from "../src/session/entries.js";
import {
	fakeModel as model,
	pingTool,
	setupTestHome,
	spyMemory,
	teardownTestHome,
} from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("ah-loop-deadline-");
});

afterAll(() => {
	teardownTestHome();
});

const WRAP_PREFIX = "Budget limit reached";

function config(mutate: (cfg: AhConfig) => void): AhConfig {
	const cfg = structuredClone(DEFAULT_CONFIG);
	mutate(cfg);
	return cfg;
}

function toolTurn(id: string) {
	return { message: assistantToolCalls([{ id, name: "ping", args: {} }]) };
}

function statsReason(agent: Agent): string | undefined {
	return agent.session.entries.find((e): e is StatsEntry => e.type === "stats")?.reason;
}

test("deadline breach uses the injected clock and ends with reason deadline", async () => {
	const cfg = config((c) => {
		c.budgets.deadlineMinutes = 1;
	});
	let t = 0;
	const provider = new FakeProvider([toolTurn("c1"), { message: assistantText("stopping") }]);
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		task: "t",
		repoRoot: repo,
		config: cfg,
		now: () => t,
	});
	agent.events.on("turn:end", (e) => {
		if (e.turn === 1) t = 61_000; // clock jumps past the 60s deadline after turn 1
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("deadline");
	expect(stats.turns).toBe(2);
	expect(
		provider.requests[1]?.messages.some(
			(m) => m.role === "user" && m.content.startsWith(WRAP_PREFIX),
		),
	).toBe(true);
	expect(statsReason(agent)).toBe("deadline");
	agent.session.close();
});

test("the last allowed turn becomes a wrap-up turn ending with maxTurns", async () => {
	const provider = new FakeProvider([toolTurn("c1"), toolTurn("c2")]);
	const { memory, postRuns } = spyMemory();
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		memory,
		task: "t",
		repoRoot: repo,
		limits: { maxTurns: 2 },
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("maxTurns");
	expect(stats.turns).toBe(2);
	expect(
		provider.requests[1]?.messages.some(
			(m) => m.role === "user" && m.content.startsWith(WRAP_PREFIX),
		),
	).toBe(true);
	expect(statsReason(agent)).toBe("maxTurns");
	expect(postRuns[0]?.outcome).toBe("maxTurns");
	agent.session.close();
});
