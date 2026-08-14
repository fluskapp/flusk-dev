/**
 * Where decisions get written down at the moment they are made. Split from
 * agent.ts/run-cmd.ts so the record stays one vocabulary in one place: the
 * context report via the same event the renderer shows, the model choice and
 * isolation plan from the values the caller just acted on.
 */
import type { EventBus } from "../../platform/events/events.js";
import type { Session } from "../session/session-file.repository.js";
import type { ModelRef } from "./run.types.js";

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
