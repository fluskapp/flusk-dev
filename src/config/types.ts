/** Frozen config contract. Loading/merging lives in config.ts. */

export type TaskKind = "plan" | "code" | "review" | "summarize";

export interface ModelChoice {
	provider: string;
	id: string;
}

export interface HitConfig {
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
		/** When true and the server is unreachable, hit warns once and degrades to noopMemory. */
		enabled: boolean;
		baseUrl: string;
		apiKey: string | null;
		/** Spawn serverBin --data dataDir when health-check fails. */
		autoSpawn: boolean;
		serverBin: string | null;
		dataDir: string | null;
		/** Context token budgets for the <memory> block. */
		budgets: { repo: number; lessons: number };
	};
	verify: {
		retries: number;
		evidenceLines: number;
	};
}

/** Per-repo <repo>/.hit.json — sections deep-merge over the global config. */
export interface RepoConfig {
	models?: Partial<Record<TaskKind, ModelChoice>>;
	budgets?: Partial<HitConfig["budgets"]>;
	unattended?: Partial<HitConfig["unattended"]>;
	isolation?: Partial<HitConfig["isolation"]>;
	/** Verify commands; when set they win over auto-detection outright. */
	verify?: string[];
	/** Override the derived repo:<slug> memory namespace. */
	namespace?: string;
}
