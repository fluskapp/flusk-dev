import type { RepoConfig } from "../config/types.js";
import { repoSlug } from "../session/paths.js";

/**
 * Namespace discipline: the `ns` argument every FactStore call takes. A query
 * never crosses a namespace and an assert never supersedes across one, so the
 * namespace is the whole of the isolation between one repo's facts and
 * another's. The agent never chooses it; the harness derives it here.
 */

/** Harness ops: the unattended attempt ledger and its cooldowns. */
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
