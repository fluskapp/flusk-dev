/**
 * The Harness window's wire contract (H0 D2): everything slot 0 states about
 * the loop, assembled by anatomy.repository.ts from data that exists today.
 * `mcp` is pinned to the honest stub — no MCP runtime exists (H0 D5), and a
 * speculative schema here would let the window pretend one does.
 */
export interface AnatomyReport {
	repoRoot: string;
	loop: {
		maxSubagentDepth: number;
		compaction: { reserveTokens: number; keepRecentTokens: number };
		budgets: { maxTurns: number; maxCostUsd: number; deadlineMinutes: number | null };
		contextBudgetTokens: number;
		memoryEnabled: boolean;
	};
	tools: Array<{ name: string; description: string; source: "builtin" | "extension" }>;
	workspace: Array<{ kind: string; scope: "global" | "repo"; path: string; bytes: number }>;
	routing: {
		models: Array<{ taskKind: string; ref: string; score: number | null }>;
		scoresPath: string;
	};
	verify: { commands: string[]; source: "config" | "harness" | "detected" | "none" };
	backends: Array<{ id: string; label: string; available: boolean; note?: string }>;
	extensions: { count: number; toolNames: string[]; flows: number; events: number } | null;
	/** D5: honest stub, no data source exists. */
	mcp: { configured: false };
}
