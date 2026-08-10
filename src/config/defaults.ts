import type { HitConfig } from "./types.js";

export const DEFAULT_CONFIG: HitConfig = {
	models: {
		plan: { provider: "anthropic", id: "claude-sonnet-5" },
		code: { provider: "anthropic", id: "claude-sonnet-5" },
		review: { provider: "anthropic", id: "claude-sonnet-5" },
		summarize: { provider: "anthropic", id: "claude-haiku-4-5" },
	},
	budgets: {
		maxTurns: 100,
		maxCostUsd: 10,
		deadlineMinutes: null,
	},
	unattended: {
		onUnknownCommand: "deny",
	},
	isolation: {
		requireGit: true,
		branchPrefix: "hit/",
	},
	compaction: {
		reserveTokens: 16384,
		keepRecentTokens: 20000,
	},
};
