/**
 * Per-turn checkpoints on the isolation branch.
 *
 * Split out of createAgent so the agent file stays a wiring list: this is the
 * one subscriber the agent installs on its own bus, and it has its own failure
 * rule (a transient git error is survivable, so it is swallowed here rather
 * than at the loop, which cannot tell a stale index.lock from a real fault).
 */
import type { EventBus } from "../../platform/events/events.js";
import { checkpoint } from "../safety/git-isolation.repository.js";

/**
 * Tools whose success marks a turn as mutating. "task" counts because a
 * subagent may write/edit/run bash on its own event bus; checkpoint() no-ops
 * on a clean tree, so a false positive costs one git status.
 */
const MUTATING_TOOLS = new Set(["write", "edit", "bash", "task"]);

export function checkpointMutatingTurns(
	events: EventBus,
	repoRoot: string,
	onCommit?: (turn: number) => void,
): void {
	events.on("turn:end", (e) => {
		const mutated = e.toolResults.some((r) => !r.isError && MUTATING_TOOLS.has(r.name));
		if (!mutated) return;
		try {
			if (checkpoint(repoRoot, e.turn)) onCommit?.(e.turn);
		} catch {
			// Non-fatal: a transient git failure (stale index.lock) must not abort
			// the run; the next mutating turn or run end re-commits.
		}
	});
}
