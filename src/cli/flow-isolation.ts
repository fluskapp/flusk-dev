/**
 * What a flow run is allowed to do to the working tree, decided before it does
 * any of it — the same rule `flusk run` applies (run-cmd.ts).
 *
 * A flow's verify nodes shell out to the detected gate commands (`npm test`,
 * `cargo test`, `make test`) in the user's checkout, up to `verify.retries` + 1
 * times. `flusk run` refuses a non-git repo by default for exactly that reason;
 * `flusk flow run` used to do neither the refusal nor the branch.
 *
 * The clean-tree demand is also what makes the gate's `filesTouched` mean
 * something (src/lang/gate.ts): on a dirty tree the diff is somebody else's
 * work, so a report claiming edits could not be checked against anything.
 */
import { randomUUID } from "node:crypto";
import type { FluskConfig, RepoConfig } from "../platform/config/types.js";
import { ensureCleanTree, isGitRepo, startRunBranch } from "../features/safety/git-isolation.repository.js";
import { detectVerifyCommands } from "../features/verify/detect.repository.js";

export interface IsolationOpts {
	/** `--no-isolation`: run in place, on the user's own branch. */
	off?: boolean;
	/** `--allow-dirty`: keep going with uncommitted changes. */
	allowDirty?: boolean;
}

/**
 * Sets the run up on its own branch and says what it did. Throws — with the
 * line the user has to act on — when the repo is not one flusk is willing to run
 * unattended in.
 */
export function startFlowIsolation(repo: string, cfg: FluskConfig, opts: IsolationOpts): string {
	if (opts.off === true) return "isolation: off (--no-isolation)";
	if (!isGitRepo(repo)) {
		if (cfg.isolation.requireGit) {
			throw new Error(
				`${repo} is not a git repository; flusk isolates flow runs on a branch (pass --no-isolation to override)`,
			);
		}
		return "isolation: off (not a git repository)";
	}
	if (opts.allowDirty !== true) ensureCleanTree(repo);
	const { branch } = startRunBranch(repo, randomUUID().slice(0, 8), cfg.isolation.branchPrefix);
	return `isolation: branch ${branch}`;
}

/** Isolation and gate commands as the lines to print, or the reason to stop. */
export function prepareRun(
	repo: string,
	cfg: FluskConfig,
	repoConfig: RepoConfig | undefined,
	opts: IsolationOpts,
): { lines: string[] } | { error: string } {
	try {
		return { lines: [startFlowIsolation(repo, cfg, opts), verifyNotice(repo, repoConfig)] };
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}
}

/** The commands each verify node will execute, named BEFORE the first one runs. */
export function verifyNotice(repo: string, repoConfig?: RepoConfig): string {
	const cmds = detectVerifyCommands(repo, repoConfig);
	return cmds.length === 0
		? "verify: no command detected — set verify in .flusk/config.json"
		: `verify: ${cmds.join(" && ")}`;
}
