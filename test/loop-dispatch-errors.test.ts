import { Type } from "typebox";
import { afterAll, beforeAll, expect, test } from "vitest";
import type { Tool } from "../src/tools/tool.js";
import { makeTool, runToolBatch, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("flusk-loop-dispatch-errors-");
});

afterAll(() => {
	teardownTestHome();
});

test("a throwing tool becomes an isError result; siblings are unaffected", async () => {
	const boom = makeTool("boom", "parallel", async () => {
		throw new Error("kaboom: disk on fire");
	});
	const fine = makeTool("fine", "parallel", async () => "all good");
	const { agent, batches } = runToolBatch(
		repo,
		[boom, fine],
		[
			{ id: "c1", name: "boom" },
			{ id: "c2", name: "fine" },
		],
	);
	const endEvents: Array<{ callId: string; isError: boolean }> = [];
	agent.events.on("tool:end", (e) => {
		endEvents.push({ callId: e.callId, isError: e.isError });
	});
	const { reason } = await agent.run();
	expect(reason).toBe("completed"); // the loop survives a throwing tool
	expect(batches).toHaveLength(1);
	expect(batches[0]?.map((r) => [r.callId, r.isError, r.output])).toEqual([
		["c1", true, "kaboom: disk on fire"],
		["c2", false, "all good"],
	]);
	expect(endEvents).toContainEqual({ callId: "c1", isError: true });
	expect(endEvents).toContainEqual({ callId: "c2", isError: false });
	agent.session.close();
});

test("args failing schema validation become an isError result", async () => {
	const strict: Tool = {
		name: "strict",
		description: "requires a numeric n",
		parameters: Type.Object({ n: Type.Number() }),
		mode: "parallel",
		execute: async () => ({ output: "ran anyway?!" }),
	};
	const fine = makeTool("fine", "parallel", async () => "all good");
	const { agent, batches } = runToolBatch(
		repo,
		[strict, fine],
		[
			{ id: "c1", name: "strict", args: { n: "not-a-number" } },
			{ id: "c2", name: "fine" },
		],
	);
	const { reason } = await agent.run();
	expect(reason).toBe("completed");
	const result = batches[0]?.[0];
	expect(result?.isError).toBe(true);
	expect(result?.output).toContain('Invalid arguments for tool "strict"');
	expect(batches[0]?.[1]).toMatchObject({ callId: "c2", isError: false, output: "all good" });
	agent.session.close();
});

test("abort mid-batch skips remaining sequential calls with synthetic results", async () => {
	const ran: string[] = [];
	let abortNow = () => {};
	const first = makeTool("first", "sequential", async () => {
		ran.push("first");
		abortNow();
		return "first done";
	});
	const second = makeTool("second", "sequential", async () => {
		ran.push("second");
		return "second done";
	});
	const { agent, batches } = runToolBatch(
		repo,
		[first, second],
		[
			{ id: "c1", name: "first" },
			{ id: "c2", name: "second" },
		],
	);
	abortNow = () => agent.abort();
	const { reason } = await agent.run();
	expect(reason).toBe("aborted");
	expect(ran).toEqual(["first"]); // the second tool never executed
	expect(batches[0]?.map((r) => [r.callId, r.isError, r.output])).toEqual([
		["c1", false, "first done"],
		["c2", true, "aborted before execution"],
	]);
	agent.session.close();
});
