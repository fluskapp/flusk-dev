/**
 * Shapes the dashboard's API serves. Frozen contract: the server modules
 * produce these and the webview consumes them.
 *
 * The organising idea is that a *project* is the unit of attention — a
 * harness or a repo — not a session. Everything else hangs off it.
 */

export type ProjectKind = "harness" | "repo";

export interface ProjectSummary {
	name: string;
	path: string;
	kind: ProjectKind;
	/** Harness runs (journals) plus ah sessions, and how many are in flight. */
	runs: number;
	liveRuns: number;
	sessions: number;
	docs: number;
	costUsd: number;
	lastActivity?: string;
	/**
	 * Set when this root is a git WORKTREE: the name of the repo it belongs to.
	 * The tree groups by it, so three worktrees stop reading as three projects.
	 */
	worktreeOf?: string;
	/** Anything that wants a human: failed runs, blocked gates, stalled goals. */
	attention: Attention[];
}

export interface Attention {
	severity: "high" | "medium";
	label: string;
	/** Where to look: a journal path, a session key, or a doc path. */
	ref?: string;
}

export interface ModelRef {
	/** "anthropic/claude-sonnet-5", "claude" (a CLI), "kimi". */
	id: string;
	/** Which task kind it is routed for, when the harness routes by kind. */
	role?: string;
	/** Learned score, when the harness keeps benchmarks. */
	score?: number;
}

export interface ProjectDetail extends ProjectSummary {
	models: ModelRef[];
	tools: string[];
	/** The prompt this harness gives its model, and where it came from. */
	systemPrompt?: { source: string; text: string };
	/** Verify commands the project gates on. */
	verify: string[];
	/** Declarative config worth showing (harness config.json, .ah.json). */
	config: Record<string, unknown>;
}

/** One row in the unified run feed: an ah session or a harness journal. */
export interface RunRow {
	id: string;
	kind: "session" | "journal";
	project: string;
	title: string;
	status: string;
	at: string;
	/** Session key or journal path — the handle for fetching detail. */
	ref: string;
	costUsd?: number;
	/** Journals only: stage progress, e.g. "8/13 · gate". */
	progress?: string;
}
