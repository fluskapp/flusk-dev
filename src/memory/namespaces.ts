import type { RepoConfig } from "../config/types.js";
import { repoSlug } from "../session/paths.js";

/**
 * Namespace (= abagraph tenant) discipline lives here and in client.ts only.
 * The agent never chooses a namespace; the harness derives it.
 */

/** Cross-repo durable lessons (docs/vocabulary.md). */
export const LESSONS_NS = "lessons";

/** Harness ops, mostly transient (docs/vocabulary.md). */
export const AH_NS = "ah";

/** Per-repo namespace: "repo:" + the session-store repo slug. */
export function repoNs(repoRoot: string): string {
	return `repo:${repoSlug(repoRoot)}`;
}

/** The repo namespace, honoring a .ah.json "namespace" override. */
export function resolveNamespace(
	repoRoot: string,
	repoConfig?: Pick<RepoConfig, "namespace">,
): string {
	return repoConfig?.namespace ?? repoNs(repoRoot);
}
