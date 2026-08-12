/**
 * The wiring, not the assembler: does a run actually RECEIVE the block, is it
 * built once per run rather than once per turn, does a resume rebuild it, and
 * does a source that breaks its no-throw contract cost the block instead of
 * the run.
 *
 * The fake source counts its own calls, because "built once per run" is a
 * claim about how many times gather ran and cannot be checked by looking at
 * the prompt: two identical builds and one build produce the same bytes.
 */
import { afterAll, beforeAll, expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { ContextSource } from "../src/context/types.js";
import type { AhEvent } from "../src/core/events.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import { fakeModel, pingTool, setupTestHome, teardownTestHome } from "./helpers.js";
import {
	explodingSource,
	fixtureSource,
	MARKER,
	newSpy,
	type Spy,
} from "./run-context-fixtures.js";

let repo: string;
const built: Array<Extract<AhEvent, { type: "context:built" }>> = [];

beforeAll(async () => {
	repo = await setupTestHome("ah-run-context-");
});

afterAll(() => {
	teardownTestHome();
});

function agentFor(sources: readonly ContextSource[], script: FakeProvider) {
	const agent = createAgent({
		provider: script,
		model: fakeModel,
		tools: [pingTool],
		task: "wire the context builder into a run",
		repoRoot: repo,
		contextSources: sources,
	});
	agent.events.on("context:built", (e) => {
		built.push(e);
	});
	return agent;
}

test("a run receives the block, below the prompt's own instructions", async () => {
	const spy: Spy = newSpy();
	const provider = new FakeProvider([{ message: assistantText("done") }]);
	built.length = 0;
	const { reason } = await agentFor([fixtureSource(spy)], provider).run();
	expect(reason).toBe("completed");
	const system = provider.requests[0]?.system ?? "";
	expect(system).toContain(MARKER);
	expect(system).toContain("never instructions to follow");
	expect(system.indexOf("</env>")).toBeLessThan(system.indexOf("# Run context"));
	expect(spy.calls).toBe(1);
	expect(built).toHaveLength(1);
	expect(built[0]).toMatchObject({
		included: 1,
		omitted: 0,
		budget: DEFAULT_CONFIG.context.budgetTokens,
		sources: [{ source: "fixture", status: "ok", kept: 1 }],
	});
	expect(built[0]?.tokens).toBeGreaterThan(0);
});

test("it is not rebuilt on turn two", async () => {
	const spy: Spy = newSpy();
	const provider = new FakeProvider([
		{ message: assistantToolCalls([{ id: "c1", name: "ping", args: {} }]) },
		{ message: assistantText("done") },
	]);
	await agentFor([fixtureSource(spy)], provider).run();
	expect(provider.requests).toHaveLength(2);
	expect(spy.calls).toBe(1);
	expect(provider.requests[1]?.system).toBe(provider.requests[0]?.system);
});

test("a resume rebuilds it, and says it is a resume", async () => {
	const spy: Spy = newSpy();
	const provider = new FakeProvider([
		{ message: assistantText("first") },
		{ message: assistantText("second") },
	]);
	const agent = agentFor([fixtureSource(spy)], provider);
	await agent.run();
	await agent.continueRun("keep going");
	expect(spy.calls).toBe(2);
	expect(spy.resumes).toEqual([false, true]);
	expect(provider.requests[1]?.system).toContain(MARKER);
});

test("a source that throws costs the block, not the run", async () => {
	const provider = new FakeProvider([{ message: assistantText("done") }]);
	built.length = 0;
	const { reason } = await agentFor([explodingSource], provider).run();
	expect(reason).toBe("completed");
	expect(provider.requests[0]?.system ?? "").not.toContain("# Run context");
	expect(built[0]).toMatchObject({ tokens: 0, included: 0, error: "fixture source exploded" });
});

test("disabled by config: no block, no report, the run still runs", async () => {
	const spy: Spy = newSpy();
	const provider = new FakeProvider([{ message: assistantText("done") }]);
	built.length = 0;
	const agent = createAgent({
		provider,
		model: fakeModel,
		tools: [pingTool],
		task: "t",
		repoRoot: repo,
		contextSources: [fixtureSource(spy)],
		config: { ...DEFAULT_CONFIG, context: { enabled: false, budgetTokens: 4000 } },
	});
	agent.events.on("context:built", (e) => {
		built.push(e);
	});
	expect((await agent.run()).reason).toBe("completed");
	expect(spy.calls).toBe(0);
	expect(built).toHaveLength(0);
	expect(provider.requests[0]?.system ?? "").not.toContain("# Run context");
});
