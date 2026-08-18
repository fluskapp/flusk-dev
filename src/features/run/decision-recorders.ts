/**
 * Where decisions get written down at the moment they are made. Split from
 * agent.ts/run-cmd.ts so the record stays one vocabulary in one place: the
 * context report via the same event the renderer shows, the model choice and
 * isolation plan from the values the caller just acted on.
 */
import type { EventBus } from "../../platform/events/events.js";
import type { Session } from "../session/session-file.repository.js";
import type { ModelRef } from "./run.types.js";

/** Ties the session to the gate's ledger: facts land under Run:<runId>, and
 * without this entry an explain could never find them again (it happened). */
export function recordRunIds(events: EventBus, session: Session): () => void {
	return events.on("run:start", (e) => {
		session.appendDecision({ kind: "run", runId: e.runId });
	});
}

/** The context report becomes a decision entry the moment it is announced. */
export function recordContextDecisions(events: EventBus, session: Session): () => void {
	return events.on("context:built", (e) => {
		session.appendDecision({
			kind: "context",
			tokens: e.tokens,
			budget: e.budget,
			included: e.included,
			omitted: e.omitted,
			sources: e.sources.map((s) => ({ source: s.source, status: s.status, kept: s.kept })),
			...(e.error !== undefined ? { error: e.error } : {}),
		});
	});
}

/** Every turn becomes an entry at turn:end: which tools ran, what it cost,
 * how the model stopped — and whether the mutation checkpoint committed,
 * which only the earlier-subscribed checkpoint listener can know. */
export function recordTurnDecisions(
	events: EventBus,
	session: Session,
	committed: ReadonlySet<number>,
): () => void {
	return events.on("turn:end", (e) => {
		session.appendDecision({
			kind: "turn",
			turn: e.turn,
			tools: e.toolResults.map((r) => r.name),
			costUsd: e.message.usage.costUsd,
			stop: e.message.stopReason,
			...(committed.has(e.turn) ? { checkpointed: true } : {}),
		});
	});
}

/** Written before the first turn: "which model, chosen how, isolated where"
 * are the first questions a reviewer asks, so they are the first entries. */
export function recordStartDecisions(
	session: Session,
	opts: {
		model: ModelRef;
		taskKind: string;
		modelSource: "scores" | "config" | "override" | "fake";
		isolation?: { branch: string };
		noIsolation: boolean;
	},
): void {
	session.appendDecision({
		kind: "model",
		ref: `${opts.model.provider}/${opts.model.id}`,
		taskKind: opts.taskKind,
		source: opts.modelSource,
	});
	session.appendDecision(
		opts.isolation !== undefined
			? {
					kind: "isolation",
					branch: opts.isolation.branch,
					why: "clean tree on a git repo; every turn checkpoints",
				}
			: {
					kind: "isolation",
					branch: null,
					why: opts.noIsolation ? "--no-isolation was passed" : "not a git repository",
				},
	);
}
