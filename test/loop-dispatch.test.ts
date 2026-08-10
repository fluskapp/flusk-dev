import { afterAll, beforeAll, expect, test } from "vitest";
import { deferred, makeTool, runToolBatch, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeAll(async () => {
	repo = await setupTestHome("ah-loop-dispatch-");
});

afterAll(() => {
	teardownTestHome();
});

test("parallel tools genuinely overlap; results stay in call order", async () => {
	const order: string[] = [];
	const aGate = deferred();
	const bStarted = deferred();
	// A cannot finish until B has started: overlap is required, not timing-lucky.
	const toolA = makeTool("slowA", "parallel", async () => {
		order.push("A:start");
		await aGate.promise;
		order.push("A:end");
		return "A result";
	});
	const toolB = makeTool("fastB", "parallel", async () => {
		order.push("B:start");
		bStarted.resolve();
		order.push("B:end");
		return "B result";
	});
	const release = (async () => {
		await bStarted.promise;
		aGate.resolve();
	})();

	const { agent, batches } = runToolBatch(
		repo,
		[toolA, toolB],
		[
			{ id: "c1", name: "slowA" },
			{ id: "c2", name: "fastB" },
		],
	);
	// Under a sequential-dispatch regression this test would deadlock on aGate;
	// fail fast with a diagnostic instead of hitting the suite timeout.
	let raceTimer: NodeJS.Timeout | undefined;
	const noOverlap = new Promise<never>((_, rej) => {
		raceTimer = setTimeout(
			() => rej(new Error("tools did not overlap: dispatch is sequential")),
			5_000,
		);
	});
	const { reason } = await Promise.race([agent.run(), noOverlap]).finally(() =>
		clearTimeout(raceTimer),
	);
	await release;
	expect(reason).toBe("completed");
	// B started before A resolved, and finished first...
	expect(order).toEqual(["A:start", "B:start", "B:end", "A:end"]);
	// ...yet results come back in call order.
	expect(batches).toHaveLength(1);
	expect(batches[0]?.map((r) => [r.callId, r.name, r.output])).toEqual([
		["c1", "slowA", "A result"],
		["c2", "fastB", "B result"],
	]);
	agent.session.close();
});

test("one sequential tool in the batch forces strictly no overlap", async () => {
	let active = 0;
	let maxActive = 0;
	const tracked = async (name: string): Promise<string> => {
		active += 1;
		maxActive = Math.max(maxActive, active);
		// Yield so any concurrently-dispatched sibling would be observed in-flight.
		await new Promise((r) => setImmediate(r));
		active -= 1;
		return `${name} ok`;
	};
	const seq = makeTool("seqWrite", "sequential", () => tracked("seqWrite"));
	const par = makeTool("parRead", "parallel", () => tracked("parRead"));

	const { agent, batches } = runToolBatch(
		repo,
		[seq, par],
		[
			{ id: "c1", name: "parRead" },
			{ id: "c2", name: "seqWrite" },
			{ id: "c3", name: "parRead" },
		],
	);
	const { reason } = await agent.run();
	expect(reason).toBe("completed");
	expect(maxActive).toBe(1);
	expect(batches[0]?.map((r) => r.callId)).toEqual(["c1", "c2", "c3"]);
	agent.session.close();
});

test("unknown tool yields isError result, emits tool events, loop continues", async () => {
	const known = makeTool("known", "parallel", async () => "fine");
	const { agent, provider, batches } = runToolBatch(repo, [known], [{ id: "c1", name: "nope" }]);
	const toolEvents: Array<{ type: string; name: string; isError?: boolean }> = [];
	agent.events.on("tool:start", (e) => {
		toolEvents.push({ type: "start", name: e.name });
	});
	agent.events.on("tool:end", (e) => {
		toolEvents.push({ type: "end", name: e.name, isError: e.isError });
	});
	const { reason, stats } = await agent.run();
	expect(reason).toBe("completed");
	expect(stats.turns).toBe(2);
	expect(provider.requests).toHaveLength(2);
	const result = batches[0]?.[0];
	expect(result?.isError).toBe(true);
	expect(result?.output).toContain("Unknown tool nope");
	expect(result?.output).toContain("Available: known");
	// The failed call is observable on the event bus, mirroring known tools.
	expect(toolEvents).toEqual([
		{ type: "start", name: "nope" },
		{ type: "end", name: "nope", isError: true },
	]);
	agent.session.close();
});
