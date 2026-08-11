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

/**
 * Ingested OTHER-harness journals — thousands of Run/Harness facts per sweep.
 * They get their own namespace so they cannot crowd out `ah`: the unattended
 * ledger reads `ah` with a row cap and no subject filter, and one ingest into
 * that namespace was enough to make the Brain panel report "ah watch has not
 * run." on a machine where it had.
 */
export const HARNESS_NS = "harness";

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
