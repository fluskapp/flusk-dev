import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createEventBus } from "../src/core/events.js";
import { zeroUsage } from "../src/core/types.js";
import { AbagraphMemoryPort } from "../src/memory/abagraph-port.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { createMemoryClient } from "../src/memory/client.js";
import { goalFact, lessonFact, repoFact } from "../src/memory/facts.js";
import { LESSONS_NS } from "../src/memory/namespaces.js";
import type { RunRecord, TurnContext } from "../src/memory/port.js";
import { memoryTools } from "../src/memory/tools.js";
import { allowAllPolicy } from "../src/safety/policy.js";
import type { Tool, ToolContext } from "../src/tools/tool.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

const NS = "repo:tools";
const budgets = { repo: 400, lessons: 400 };
let mock: MockAbagraph;
let mem: MemoryClient;
let tools: Tool[];
beforeAll(async () => {
	mock = await startMockAbagraph();
	mem = createMemoryClient({ baseUrl: mock.url });
	tools = memoryTools(mem, { repoNs: NS, runId: () => "tr1" });
});
afterAll(async () => {
	await mock.close();
});

const ctx: ToolContext = {
	repoRoot: "/r",
	cwd: "/r",
	signal: new AbortController().signal,
	policy: allowAllPolicy,
	events: createEventBus(),
};

function tool(name: string): Tool {
	const t = tools.find((t) => t.name === name);
	if (t === undefined) throw new Error(`missing tool ${name}`);
	return t;
}

describe("memory tools", () => {
	it("recall (semantic) merges repo first then lessons, capped at 15", async () => {
		for (let i = 0; i < 10; i++) {
			await mem.transact(NS, [repoFact.convention("tools", `sharedword r${i}`)]);
			await mem.transact(LESSONS_NS, [lessonFact.gotcha("tls", `sharedword l${i}`)]);
		}
		const out = await tool("memory_recall").execute({ query: "sharedword", mode: "semantic" }, ctx);
		const lines = out.output.split("\n");
		expect(lines).toHaveLength(15);
		expect(lines.slice(0, 10).every((l) => l.startsWith("Repo:tools convention"))).toBe(true);
		expect(lines.slice(10).every((l) => l.startsWith("Tool:tls gotcha"))).toBe(true);
	});

	it("recall (pattern) filters by exact subject/predicate", async () => {
		await mem.transact(NS, [goalFact.title("g1", "ship weave")]);
		const args = { query: "", mode: "pattern", subject: "Goal:g1", predicate: "title" };
		const out = await tool("memory_recall").execute(args, ctx);
		expect(out.output).toBe("Goal:g1 title ship weave (conf 1)");
	});

	it("remember rejects non-vocabulary predicates, listing the allowed rows", async () => {
		await expect(
			tool("memory_remember").execute({ subject: "Repo:tools", predicate: "banana", object: "x" }, ctx),
		).rejects.toThrow(/Repo uses, Repo verify_cmd, Repo convention/);
		expect(mock.dump(NS).some((f) => f.predicate === "banana")).toBe(false);
	});

	it("remember caps confidence at 0.7 and stamps the agent-run source", async () => {
		const args = {
			subject: "Repo:tools",
			predicate: "convention",
			object: "no semicolons",
			confidence: 0.95,
			why: "seen in diff",
		};
		const out = await tool("memory_remember").execute(args, ctx);
		expect(out.output).toContain("(conf 0.7)");
		const fact = mock.dump(NS).find((f) => f.object === "no semicolons");
		expect(fact).toMatchObject({ confidence: 0.7, source: "agent:run:tr1", status: "candidate" });
		// The namespace tag rides in properties (wire.ts NS_PROP) so isolation
		// survives servers that drop the tenant — see memory-untenanted.test.ts.
		expect(fact?.properties).toEqual({ why: "seen in diff", hit_ns: NS });
	});

	it("changes splits added vs superseded around the cutoff", async () => {
		const ns = "repo:tchanges";
		await mem.transact(ns, [goalFact.status("g", "planned")]);
		const first = (await mem.query(ns, { subject: "Goal:g" }))[0];
		const since = new Date(Date.parse(first?.validFrom ?? "")).toISOString();
		// Snapshots are timestamped: the cutoff and the change must land in
		// different milliseconds for either side of the diff to be visible.
		await new Promise((r) => setTimeout(r, 3));
		await mem.transact(ns, [goalFact.status("g", "active")]);
		const changes = memoryTools(mem, { repoNs: ns, runId: () => "x" })[2];
		const out = await changes?.execute({ since }, ctx);
		expect(out?.output).toContain("Added:");
		expect(out?.output).toContain("Goal:g status active");
		expect(out?.output).toContain("Superseded:");
		expect(out?.output).toContain("Goal:g status planned");
	});
});
