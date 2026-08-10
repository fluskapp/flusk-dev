/**
 * AbagraphMemoryPort: frozen-snapshot injection and outage tolerance
 * (split from memory-tools.test.ts to stay under the size cap).
 */
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

beforeAll(async () => {
	mock = await startMockAbagraph();
	mem = createMemoryClient({ baseUrl: mock.url });
	await mem.transact(NS, [repoFact.convention("tools", "seed convention")]);
});
afterAll(async () => {
	await mock.close();
});

describe("AbagraphMemoryPort", () => {
	const turn = (over: Partial<TurnContext>): TurnContext => ({
		runId: "pr1",
		repoPath: "/r",
		task: "t",
		isFirstTurn: false,
		isResume: false,
		...over,
	});
	const makeRun = (): RunRecord => ({
		runId: "pr1",
		sessionId: "ps1",
		repoPath: "/r",
		task: "t",
		outcome: "completed",
		filesTouched: [],
		commandsRun: [],
		transcriptTail: [],
		stats: { turns: 1, usage: zeroUsage(), startedAt: "2026-08-10T00:00:00.000Z" },
	});

	it("preTurn returns the frozen block on first turn and resume only", async () => {
		const port = new AbagraphMemoryPort({ client: mem, repoNs: NS, budgets });
		const first = await port.preTurn(turn({ isFirstTurn: true }));
		expect(first).toContain("<memory>");
		expect(first).toContain("Repo:tools");
		expect(await port.preTurn(turn({}))).toBeNull();
		expect(await port.preTurn(turn({ isResume: true }))).toBe(first);
	});

	it("exposes the three memory tools", () => {
		const port = new AbagraphMemoryPort({ client: mem, repoNs: NS, budgets });
		const names = port.tools().map((t) => t.name);
		expect(names).toEqual(["memory_recall", "memory_remember", "memory_changes"]);
	});

	it("postRun swallows a memory outage with one console.error line", async () => {
		const dead = await startMockAbagraph();
		await dead.close();
		const client = createMemoryClient({ baseUrl: dead.url });
		const port = new AbagraphMemoryPort({ client, repoNs: NS, budgets });
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(port.postRun(makeRun())).resolves.toBeUndefined();
		expect(spy).toHaveBeenCalledOnce();
		spy.mockRestore();
	});
});
