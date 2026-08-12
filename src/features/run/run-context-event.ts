/**
 * The one report of what a run was given, on the event bus every other
 * subscriber already listens to.
 *
 * It exists separately from the assembly because the two fail differently:
 * assembly degrades to fewer blocks, reporting degrades to a listener that
 * throws. Neither may cost the run a turn, so both swallow — but only after
 * the numbers have been produced, never instead of producing them.
 *
 * Counts only, never bodies: the block itself is in the prompt and in the
 * session transcript, and a second copy on the bus would be a second place to
 * leak the same gathered text from.
 */
import type { BuiltContext } from "../context/types.js";
import type { EventBus } from "../../platform/events/events.js";

/** What the run got: the spend, the ceiling, and every registered source. */
export async function announceContext(events: EventBus, built: BuiltContext): Promise<void> {
	await events.emit({
		type: "context:built",
		tokens: built.tokens,
		budget: built.budget,
		included: built.included.length,
		// Reported even when it is large: an empty block and a block whose items
		// were all cut for budget are different failures with different fixes.
		omitted: built.omitted.length,
		sources: built.outcomes.map((o) => ({ source: o.source, status: o.status, kept: o.kept })),
	});
}

/**
 * The assembler itself failed, so the run has no block. Still reported, and
 * with the reason: a run that silently starts with no context looks exactly
 * like a run whose sources all found nothing.
 */
export async function announceFailure(
	events: EventBus,
	budget: number,
	error: string,
): Promise<void> {
	await events.emit({
		type: "context:built",
		tokens: 0,
		budget,
		included: 0,
		omitted: 0,
		sources: [],
		error,
	});
}
