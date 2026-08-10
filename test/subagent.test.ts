import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";
import { createAgent } from "../src/agent/agent.js";
import type { Msg, ToolResultMsg } from "../src/core/types.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/provider/fake.js";
import { BudgetTracker } from "../src/safety/budget.js";
import type { HeaderEntry } from "../src/session/entries.js";
import { sessionsDir } from "../src/session/paths.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

async function readHeaders(repo: string): Promise<HeaderEntry[]> {
	const dir = sessionsDir(repo);
	const headers: HeaderEntry[] = [];
	for (const file of await readdir(dir)) {
		const first = (await readFile(join(dir, file), "utf8")).split("\n")[0] ?? "";
		headers.push(JSON.parse(first) as HeaderEntry);
	}
	return headers;
}

function firstToolResult(context: Msg[]): ToolResultMsg {
	const result = context.find((m): m is ToolResultMsg => m.role === "toolResult");
	if (!result) throw new Error("no tool result in context");
	return result;
}

test("task tool: child text becomes the result; sessions link; depth caps at 2", async () => {
	const repo = await setupTestHome("ah-subagent-");
	try {
		const grandProvider = new FakeProvider([{ message: assistantText("grand done") }]);
		const childProvider = new FakeProvider([
			{ message: assistantToolCalls([{ id: "g1", name: "task", args: { task: "grand job" } }]) },
			{ message: assistantText("child done") },
		]);
		const parentProvider = new FakeProvider([
			{
				message: assistantToolCalls([
					{ id: "t1", name: "task", args: { task: "child job", kind: "code" } },
				]),
			},
			{ message: assistantText("parent done") },
		]);
		const byTask: Record<string, FakeProvider> = {
			"child job": childProvider,
			"grand job": grandProvider,
		};
		const budget = new BudgetTracker({ maxCostUsd: 10, deadlineMs: null }, Date.now());
		const agent = createAgent({
			provider: parentProvider,
			model: fakeModel,
			tools: [],
			task: "parent task",
			repoRoot: repo,
			budget,
			subagentProvider: (task) => byTask[task] ?? new FakeProvider([]),
		});
		const { reason, stats } = await agent.run();
		expect(reason).toBe("completed");

		// Child (which itself delegated to a grandchild) answered the parent's call.
		const result = firstToolResult(agent.session.buildContext());
		expect(result.callId).toBe("t1");
		expect(result.isError).toBe(false);
		expect(result.output).toBe("child done");
		// And the grandchild's text answered the child's call.
		expect(childProvider.requests[1]?.messages.at(-1)).toMatchObject({
			role: "toolResult",
			callId: "g1",
			output: "grand done",
			isError: false,
		});

		// Session files: parent <- child <- grandchild, with taskKind threaded.
		const headers = await readHeaders(repo);
		expect(headers).toHaveLength(3);
		const child = headers.find((h) => h.parentSession === agent.session.id);
		expect(child).toBeDefined();
		expect(child?.task).toBe("child job");
		expect(child?.taskKind).toBe("code");
		const grand = headers.find((h) => h.parentSession === child?.id);
		expect(grand?.task).toBe("grand job");
		expect(grand?.taskKind).toBeUndefined();

		// Depth 0 and 1 see the task tool; the depth-2 grandchild does not.
		const names = (p: FakeProvider) => p.requests[0]?.tools.map((t) => t.name) ?? [];
		expect(names(parentProvider)).toContain("task");
		expect(names(childProvider)).toContain("task");
		expect(names(grandProvider)).not.toContain("task");

		// The shared tracker saw every level's spend: 5 fake turns at $0.001.
		expect(budget.spentUsd()).toBeCloseTo(0.005, 6);
		expect(stats.usage.costUsd).toBeCloseTo(0.002, 6); // parent's own turns only
		agent.session.close();
	} finally {
		teardownTestHome();
	}
});

test("task tool: a failing child surfaces as an isError result; parent continues", async () => {
	const repo = await setupTestHome("ah-subagent-fail-");
	try {
		const parentProvider = new FakeProvider([
			{ message: assistantToolCalls([{ id: "t1", name: "task", args: { task: "doomed" } }]) },
			{ message: assistantText("recovered") },
		]);
		const agent = createAgent({
			provider: parentProvider,
			model: fakeModel,
			tools: [],
			task: "parent task",
			repoRoot: repo,
			subagentProvider: () => new FakeProvider([]), // exhausts immediately -> child errors
		});
		const { reason } = await agent.run();
		expect(reason).toBe("completed");
		const result = firstToolResult(agent.session.buildContext());
		expect(result.isError).toBe(true);
		expect(result.output).toContain("script exhausted");
		agent.session.close();
	} finally {
		teardownTestHome();
	}
});
