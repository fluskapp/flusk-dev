/**
 * The Harness window (0) as rendered markup: the loop diagram is present
 * with the report's values interpolated, every section states its title,
 * and the two goal empty states print their sentences — no state renders
 * an empty box. Plus the toolbar IA: 0 finally bound, to /harness.
 */
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { AnatomyReport } from "../src/features/anatomy/anatomy.types.js";
import { GoalsSection } from "../src/ui/react/anatomy/GoalsSection.js";
import { HarnessWindow } from "../src/ui/react/anatomy/HarnessWindow.js";
import { LoopDiagram } from "../src/ui/react/anatomy/LoopDiagram.js";
import { PANELS } from "../src/ui/react/workbench/Toolbar.js";

const report: AnatomyReport = {
	repoRoot: "/tmp/repo",
	loop: {
		maxSubagentDepth: 2,
		compaction: { reserveTokens: 16384, keepRecentTokens: 20000 },
		budgets: { maxTurns: 100, maxCostUsd: 10, deadlineMinutes: null },
		contextBudgetTokens: 4000,
		memoryEnabled: true,
	},
	tools: [{ name: "read", description: "Reads a file", source: "builtin" }],
	workspace: [{ kind: "identity", scope: "repo", path: "/tmp/repo/.flusk/workspace/IDENTITY.md", bytes: 24 }],
	routing: {
		models: [{ taskKind: "code", ref: "anthropic/claude-sonnet-5", score: null }],
		scoresPath: "/tmp/home/benchmarks.json",
	},
	verify: { commands: ["npm test"], source: "config" },
	backends: [{ id: "claude", label: "Claude Code", available: false, note: "claude not found on PATH" }],
	extensions: null,
	mcp: { configured: false },
};

const goals = (over: object) => ({ enabled: true, ns: "repo:demo-1a2b3c4d", goals: [], ...over });

it("renders the loop diagram and every section title", () => {
	const pending = new Promise<never>(() => {});
	const html = renderToStaticMarkup(h(HarnessWindow, { report, goals: pending }));
	expect(html).toContain("<svg");
	for (const title of ["Tools", "Workspace", "Routing", "Verify", "Backends detected", "Extensions", "Goals", "MCP"]) {
		expect(html).toContain(`<h3>${title}`);
	}
	expect(html).toContain("No MCP runtime");
	expect(html).toContain("does not speak MCP yet");
	// Unavailable is data: the row is there, dimmed, with its reason.
	expect(html).toContain("claude not found on PATH");
});

it("interpolates the report's values into the diagram", () => {
	const html = renderToStaticMarkup(h(LoopDiagram, { report }));
	for (const label of ["task", "context", "turn", "tools", "compaction", "verify gate", "facts"]) {
		expect(html).toContain(`>${label}</text>`);
	}
	for (const value of ["budget 4000 tokens", "≤ 100 turns", "@ 16384 reserve", "1 commands", "memory on"]) {
		expect(html).toContain(value);
	}
});

it("prints the goals empty state and the memory-disabled sentence", () => {
	expect(renderToStaticMarkup(h(GoalsSection, { data: goals({}) }))).toContain("no goals recorded");
	expect(renderToStaticMarkup(h(GoalsSection, { data: goals({ enabled: false }) }))).toContain(
		"memory disabled — no goal graph is kept",
	);
});

it("nests tasks with their dependencies and attempts", () => {
	const data = goals({
		goals: [
			{
				id: "Goal:g-11111111",
				title: "Ship it",
				status: "active",
				tasks: [
					{
						id: "Task:t-bbbbbbbb",
						description: "task B",
						status: "pending",
						dependsOn: ["Task:t-aaaaaaaa"],
						attemptedBy: ["Run:r-12345678"],
					},
				],
			},
		],
	});
	const html = renderToStaticMarkup(h(GoalsSection, { data }));
	expect(html).toContain("Ship it");
	expect(html).toContain("after t-aaaaaaaa");
	expect(html).toContain("r-12345678");
	expect(html).toContain("pending");
});

it("binds 0 in the toolbar to /harness with the one sentence", () => {
	const slot = PANELS.find((p) => p.n === "0");
	expect(slot?.label).toBe("Harness");
	expect(slot?.to).toBe("/harness");
	expect(slot?.title).toContain("What runs your code");
});
