/**
 * The orchestrator is REACHABLE from a run.
 *
 * Everything under src/orchestra was built, tested, and imported by nothing
 * outside its own directory — the registry, the three workers and the router
 * all passed their unit tests while a running agent still had exactly one way
 * to delegate, into another ah loop. A capability no run can invoke is a
 * capability the product does not have, and no unit test of the capability
 * itself can notice that.
 *
 * So these assert what the MODEL WAS ACTUALLY OFFERED, read off the request
 * the provider received. That is the only version of "reachable" that cannot
 * be satisfied by code which merely exists.
 */
import { rm } from "node:fs/promises";
import { afterEach, expect, it } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import { loadConfig } from "../src/config/config.js";
import { assistantText, FakeProvider } from "../src/provider/fake.js";
import { fakeModel, setupTestHome } from "./helpers.js";

let home: string;

afterEach(async () => {
	await rm(home, { recursive: true, force: true });
	delete process.env.AH_HOME;
});

/** Runs one turn and returns the tool names the provider was sent. */
async function offeredTools(depth?: number): Promise<string[]> {
	home = await setupTestHome("ah-reachable-");
	const provider = new FakeProvider([{ message: assistantText("done") }]);
	const agent = createAgent({
		provider,
		model: fakeModel,
		task: "anything",
		tools: [],
		repoRoot: home,
		config: loadConfig(home),
		...(depth === undefined ? {} : { depth }),
	});
	await agent.run();
	return (provider.requests[0]?.tools ?? []).map((t) => t.name);
}

it("offers `delegate` to the model alongside `task`", async () => {
	const names = await offeredTools();
	expect(names).toContain("task");
	// The regression: absent from every request while all 29 orchestra files
	// and their tests passed.
	expect(names).toContain("delegate");
});

it("withholds BOTH delegation tools at the depth cap", async () => {
	const names = await offeredTools(9);
	// Registering delegate on its own branch is exactly how an agent ends up at
	// the cap still holding a tool that spawns another one.
	expect(names).not.toContain("task");
	expect(names).not.toContain("delegate");
});

it("tells the model how delegate differs from task", async () => {
	home = await setupTestHome("ah-reachable-");
	const provider = new FakeProvider([{ message: assistantText("done") }]);
	const agent = createAgent({
		provider,
		model: fakeModel,
		task: "anything",
		tools: [],
		repoRoot: home,
		config: loadConfig(home),
	});
	await agent.run();
	const spec = provider.requests[0]?.tools?.find((t) => t.name === "delegate");
	expect(spec).toBeDefined();
	// A model chooses between the two from these words alone, so the difference
	// has to be stated where it can be read.
	expect(spec?.description).toMatch(/CLI|another model/);
});
