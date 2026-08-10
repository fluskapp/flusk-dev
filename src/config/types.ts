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
}

/** Per-repo <repo>/.hit.json — sections deep-merge over the global config. */
export interface RepoConfig {
	models?: Partial<Record<TaskKind, ModelChoice>>;
	budgets?: Partial<HitConfig["budgets"]>;
	unattended?: Partial<HitConfig["unattended"]>;
	isolation?: Partial<HitConfig["isolation"]>;
	/** Verify commands (consumed by the Phase 3 verification gate). */
	verify?: string[];
}
