/** Frozen config contract. Loading/merging lives in config.ts. */

export interface ChatBackendConfig {
	id: string;
	label?: string;
	kind: "cli" | "openai-compatible" | "pi-ai";
	/** cli: binary name; the conversation is passed as one prompt argument. */
	command?: string;
	args?: string[];
	/** openai-compatible: endpoint base, model id, and the env var holding
	 * its key (omitted for keyless local servers like Ollama). */
	baseUrl?: string;
	model?: string;
	apiKeyEnv?: string;
}

/**
 * One language server the doc view may spawn. Only the user's own
 * ~/.ah/config.json may set these (see config.ts): a cloned repo must not
 * choose what opening a file in the workbench executes.
 */
export interface DocServerConfig {
	id: string;
	/** Binary name or path; it must also be on PATH to be used. */
	command: string;
	args?: string[];
	/** Lower-case, dot-led: [".rs"]. */
	extensions: string[];
}

export type TaskKind = "plan" | "code" | "review" | "summarize";

export interface ModelChoice {
	provider: string;
	id: string;
}

export interface AhConfig {
	models: Record<TaskKind, ModelChoice>;
	budgets: {
		maxTurns: number;
		maxCostUsd: number;
		deadlineMinutes: number | null;
	};
	unattended: {
		/** What the bash policy does with commands it cannot classify. */
		onUnknownCommand: "deny" | "allow";
	};
	isolation: {
		/** Refuse to run in non-git directories (override with --no-isolation). */
		requireGit: boolean;
		branchPrefix: string;
	};
	compaction: {
		reserveTokens: number;
		keepRecentTokens: number;
	};
	memory: {
		/**
		 * Whether a run keeps a record of itself in the local fact store
		 * (`~/.ah/store`). False is a request to leave no trace: `ah run` and
		 * `ah resume` proceed and write nothing, while the commands whose whole
		 * subject matter is stored state (`ah goal`, `ah watch`) refuse rather
		 * than pretend.
		 */
		enabled: boolean;
	};
	verify: {
		retries: number;
		evidenceLines: number;
	};
	ui: {
		/** Globs (one `*` level) of harness journal directories to display. */
		harnessDirs: string[];
		/** Globs (one `*` level) of project roots whose markdown is indexed. */
		projectDirs: string[];
	};
	chat: {
		/** Backends offered in the dashboard's chat. Empty = auto-detect CLIs. */
		backends: ChatBackendConfig[];
	};
	doc: {
		/** Documentation lookup in the workbench. */
		enabled: boolean;
		/** Language servers to spawn. Empty = the bundled TypeScript engine only. */
		servers: DocServerConfig[];
		/** Documents held open per language server before the oldest is closed. */
		maxFiles: number;
	};
	watch: {
		/** Queues to poll: "gh-prs" (open PRs) and/or "gh-failing-ci". */
		queues: string[];
		maxRunsPerNight: number;
		maxCostUsdPerRun: number;
		maxRunMinutes: number;
		pollIntervalMinutes: number;
		/** Hours an item rests after a successful attempt. */
		cooldownHours: number;
		/** Base hours after a failure; backs off as failures^2. */
		failCooldownHours: number;
		/**
		 * Push branches and open PRs. Off by default: unattended runs stay
		 * local until you explicitly opt in to publishing.
		 */
		push: boolean;
	};
}

/** Per-repo <repo>/.ah.json — sections deep-merge over the global config. */
export interface RepoConfig {
	models?: Partial<Record<TaskKind, ModelChoice>>;
	budgets?: Partial<AhConfig["budgets"]>;
	unattended?: Partial<AhConfig["unattended"]>;
	isolation?: Partial<AhConfig["isolation"]>;
	/** Verify commands; when set they win over auto-detection outright. */
	verify?: string[];
	/** Override the derived repo:<slug> memory namespace. */
	namespace?: string;
}
