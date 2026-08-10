import type { HitConfig, ModelChoice, TaskKind } from "../config/types.js";
import type { ModelRef } from "../core/types.js";
import { resolveModelRef } from "./pi-ai.js";
import { bestFor, type Scores } from "./scores.js";

/**
 * Picks the model for a task kind: the benchmarks winner when one is recorded
 * and resolvable against the catalog, otherwise the configured model.
 * Resolution happens here (at use), never at config load.
 */
export function chooseModel(
	cfg: HitConfig,
	kind: TaskKind,
	scores?: Scores,
): { ref: ModelRef; choice: ModelChoice } {
	if (scores) {
		const winner = bestFor(kind, scores);
		if (winner) {
			const slash = winner.indexOf("/");
			if (slash > 0 && slash < winner.length - 1) {
				const choice: ModelChoice = {
					provider: winner.slice(0, slash),
					id: winner.slice(slash + 1),
				};
				try {
					return { ref: resolveModelRef(choice), choice };
				} catch {
					// Unresolvable benchmark entry: fall back to the configured model.
				}
			}
		}
	}
	const choice = cfg.models[kind];
	return { ref: resolveModelRef(choice), choice };
}
