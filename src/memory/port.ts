import type { Msg, RunEndReason, RunStats } from "../core/types.js";
import type { Tool } from "../tools/tool.js";

export interface TurnContext {
	runId: string;
	repoPath: string;
	task: string;
	goalId?: string;
	isFirstTurn: boolean;
	isResume: boolean;
}

export interface RunRecord {
	runId: string;
	sessionId: string;
	repoPath: string;
	task: string;
	outcome: RunEndReason;
	filesTouched: string[];
	commandsRun: Array<{ cmd: string; exit: number }>;
	transcriptTail: Msg[];
	stats: RunStats;
}

/**
 * THE seam between the core engine and the abagraph memory layer.
 * Core ships noopMemory; the abagraph-backed implementation is injected.
 * Core never imports the abagraph SDK.
 */
export interface MemoryPort {
	/** Returns a system block ("<memory>…") on the first turn and on resume; null otherwise. */
	preTurn(ctx: TurnContext): Promise<string | null>;
	/** Called exactly once after run:end, regardless of outcome. */
	postRun(run: RunRecord): Promise<void>;
	/** Memory tools (memory_recall/remember/changes), registered like any tool. */
	tools(): Tool[];
}

export const noopMemory: MemoryPort = {
	preTurn: async () => null,
	postRun: async () => {},
	tools: () => [],
};
