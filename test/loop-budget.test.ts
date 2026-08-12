import { afterAll, beforeAll, expect, test } from "vitest";
import type { Agent } from "../src/features/run/agent.js";
import { createAgent } from "../src/features/run/agent.js";
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import type { FluskConfig } from "../src/platform/config/types.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/features/provider/fake.js";
import type { StatsEntry } from "../src/features/session/entries.js";
import {
	fakeModel as model,
	pingTool,
	setupTestHome,
	spyRunEnds,
	teardownTestHome,
} from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("flusk-loop-budget-");
});

afterAll(() => {
	teardownTestHome();
});

const WRAP_PREFIX = "Budget limit reached";

function config(mutate: (cfg: FluskConfig) => void): FluskConfig {
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

test("cost breach injects one wrap-up turn then ends with reason budget", async () => {
	// FakeProvider charges $0.001/turn, so turn 1 breaches a $0.0005 cap.
	const cfg = config((c) => {
		c.budgets.maxCostUsd = 0.0005;
	});
	const provider = new FakeProvider([toolTurn("c1"), { message: assistantText("wrapped up") }]);
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		task: "t",
		repoRoot: repo,
		config: cfg,
	});
	const ends = spyRunEnds(agent.events);
	const { reason, stats } = await agent.run();
	expect(reason).toBe("budget");
	expect(stats.turns).toBe(2);
	// exactly one wrap-up message, visible only to the final turn
	const wrapCount = (provider.requests[1]?.messages ?? []).filter(
		(m) => m.role === "user" && m.content.startsWith(WRAP_PREFIX),
	).length;
	expect(wrapCount).toBe(1);
	expect(
		provider.requests[0]?.messages.some(
			(m) => m.role === "user" && m.content.startsWith(WRAP_PREFIX),
		),
	).toBe(false);
	expect(statsReason(agent)).toBe("budget");
	expect(ends[0]).toBe("budget");
	agent.session.close();
});

test("the wrap-up turn ends the run even if the model still calls tools", async () => {
	const cfg = config((c) => {
		c.budgets.maxCostUsd = 0.0005;
	});
	const provider = new FakeProvider([toolTurn("c1"), toolTurn("c2"), toolTurn("c3")]);
	const agent = createAgent({
		provider,
		model,
		tools: [pingTool],
		task: "t",
		repoRoot: repo,
		config: cfg,
	});
	const ends = spyRunEnds(agent.events);
	const { reason, stats } = await agent.run();
	expect(reason).toBe("budget");
	expect(ends).toEqual(["budget"]);
	expect(stats.turns).toBe(2);
	expect(provider.requests).toHaveLength(2); // turn 3 never runs
	agent.session.close();
});

test("a run inside budget completes with no wrap-up and reason persisted", async () => {
	const provider = new FakeProvider([toolTurn("c1"), { message: assistantText("done") }]);
	const agent = createAgent({ provider, model, tools: [pingTool], task: "t", repoRoot: repo });
	const { reason } = await agent.run();
	expect(reason).toBe("completed");
	expect(
		agent.session
			.buildContext()
			.some((m) => m.role === "user" && m.content.startsWith(WRAP_PREFIX)),
	).toBe(false);
	expect(statsReason(agent)).toBe("completed");
	agent.session.close();
});
