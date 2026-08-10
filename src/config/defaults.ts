import type { AhConfig } from "./types.js";

export const DEFAULT_CONFIG: AhConfig = {
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
		branchPrefix: "ah/",
	},
	compaction: {
		reserveTokens: 16384,
		keepRecentTokens: 20000,
	},
	memory: {
		enabled: true,
		baseUrl: "http://127.0.0.1:7777",
		apiKey: null,
		autoSpawn: false,
		serverBin: null,
		dataDir: null,
		budgets: { repo: 2000, lessons: 1000 },
	},
	verify: {
		retries: 3,
		evidenceLines: 40,
	},
	ui: {
		harnessDirs: ["~/projects/*/docs/runs", "~/projects/playground/*/docs/runs"],
		projectDirs: ["~/projects/*", "~/projects/playground/*"],
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
