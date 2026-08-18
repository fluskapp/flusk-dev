/**
 * The goal frontier as a typed server function for the Harness window (0).
 * Read-only: the same store, the same namespace derivation and the same
 * graph shape `flusk goal --list` renders — plus the depends_on/attempted_by
 * edges the CLI never prints.
 *
 * Disabled memory is an ANSWER, not an error: the reply says the store is
 * off and carries no goals, so the window can print the honest sentence
 * instead of a crash. A store that cannot be read degrades the same way.
 */
import { createServerFn } from "@tanstack/react-start";
import { loadConfig, loadRepoConfig } from "../../platform/config/config.js";
import { createFactStore } from "../facts/facts.repository.js";
import { resolveNamespace } from "../facts/namespaces.js";
import { type GoalNode, loadGoalGraph } from "./read.repository.js";

export type { GoalNode, TaskNode } from "./read.repository.js";

export interface GoalGraphReply {
	enabled: boolean;
	ns: string;
	goals: GoalNode[];
}

export const getGoalGraph = createServerFn()
	.inputValidator((data: { repoRoot?: string }) => data ?? {})
	.handler(async ({ data }): Promise<GoalGraphReply> => {
		const repoRoot = data.repoRoot ?? process.cwd();
		const ns = resolveNamespace(repoRoot, loadRepoConfig(repoRoot));
		if (!loadConfig(repoRoot).memory.enabled) return { enabled: false, ns, goals: [] };
		try {
			return { enabled: true, ns, goals: await loadGoalGraph(createFactStore(), ns) };
		} catch {
			return { enabled: true, ns, goals: [] };
		}
	});
