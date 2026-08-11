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
