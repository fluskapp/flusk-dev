import type { FluskConfig } from "./types.js";

export const DEFAULT_CONFIG: FluskConfig = {
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
		branchPrefix: "flusk/",
	},
	compaction: {
		reserveTokens: 16384,
		keepRecentTokens: 20000,
	},
	memory: {
		enabled: true,
	},
	context: {
		enabled: true,
		// ~2% of a 200k window: enough for the house rules, the verify chain and a
		// handful of history blocks, small enough that the task still dominates.
		budgetTokens: 4000,
	},
	verify: {
		retries: 3,
		evidenceLines: 40,
	},
	containers: {
		// Debian keeps git and a shell in-box; runs needing more declare a
		// devcontainer.json, which wins over this.
		image: "node:22-bookworm",
	},
	ui: {
		harnessDirs: ["~/projects/*/docs/runs", "~/projects/playground/*/docs/runs"],
		projectDirs: ["~/projects/*", "~/projects/playground/*"],
	},
	chat: {
		backends: [],
	},
	doc: {
		enabled: true,
		// Ships EMPTY on purpose: TypeScript and JavaScript are answered by the
		// bundled compiler-API engine with nothing installed, and no language
		// server is ever spawned unless you name it here AND it is on PATH.
		// The obvious additions, once you have the binaries:
		//   { id: "rust-analyzer", command: "rust-analyzer", extensions: [".rs"] }
		//   { id: "pyright", command: "pyright-langserver", args: ["--stdio"],
		//     extensions: [".py"] }
		//   { id: "gopls", command: "gopls", extensions: [".go"] }
		servers: [],
		maxFiles: 50,
	},
	watch: {
		queues: ["gh-prs", "gh-failing-ci"],
		maxRunsPerNight: 10,
		maxCostUsdPerRun: 2,
		maxRunMinutes: 30,
		pollIntervalMinutes: 10,
		cooldownHours: 4,
		failCooldownHours: 8,
		push: false,
	},
};
