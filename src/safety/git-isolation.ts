import { spawnSync } from "node:child_process";

/**
 * Git isolation: every run happens on its own branch, checkpointed per turn,
 * so an autonomous session can always be reviewed or discarded as one diff.
 * All operations are local (never push) and pass identity/config via -c flags
 * (never touch user or global git config).
 */

const DIRTY_PATHS_SHOWN = 5;

interface GitResult {
	status: number;
	stdout: string;
	stderr: string;
}

function git(repoRoot: string, args: string[]): GitResult {
	const res = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
	if (res.error) throw new Error(`failed to run git in ${repoRoot}: ${res.error.message}`);
	return { status: res.status ?? 1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

function gitOrThrow(repoRoot: string, args: string[]): string {
	const res = git(repoRoot, args);
	if (res.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed (exit ${res.status}): ${res.stderr.trim()}`);
	}
	return res.stdout;
}

export function isGitRepo(repoRoot: string): boolean {
	try {
		const res = git(repoRoot, ["rev-parse", "--is-inside-work-tree"]);
		return res.status === 0 && res.stdout.trim() === "true";
	} catch {
		return false;
	}
}

/** Throws when the working tree has uncommitted changes, listing the first few. */
export function ensureCleanTree(repoRoot: string): void {
	const porcelain = gitOrThrow(repoRoot, ["status", "--porcelain"]).trimEnd();
	if (porcelain === "") return;
	const lines = porcelain.split("\n");
	const shown = lines.slice(0, DIRTY_PATHS_SHOWN).join("\n");
	const more = lines.length > DIRTY_PATHS_SHOWN ? `\n… and ${lines.length - DIRTY_PATHS_SHOWN} more` : "";
	throw new Error(
		`working tree is dirty:\n${shown}${more}\ncommit/stash or pass --allow-dirty`,
	);
}

/**
 * Records where HEAD was (branch name, or SHA when detached) and creates the
 * run branch from it.
 */
export function startRunBranch(
	repoRoot: string,
	runId: string,
	prefix: string,
): { branch: string; originalRef: string } {
	const symbolic = git(repoRoot, ["symbolic-ref", "--short", "-q", "HEAD"]);
	const originalRef =
		symbolic.status === 0
			? symbolic.stdout.trim()
			: gitOrThrow(repoRoot, ["rev-parse", "HEAD"]).trim();
	const branch = `${prefix}${runId}`;
	// core.hooksPath=/dev/null: the target repo's hooks must never run under hit.
	gitOrThrow(repoRoot, ["-c", "core.hooksPath=/dev/null", "checkout", "-q", "-b", branch]);
	return { branch, originalRef };
}

/** Commits everything as "hit: turn <turn>". Returns false when there is nothing to commit. */
export function checkpoint(repoRoot: string, turn: number): boolean {
	if (gitOrThrow(repoRoot, ["status", "--porcelain"]).trim() === "") return false;
	gitOrThrow(repoRoot, ["add", "-A"]);
	// Hooks disabled twice over (hooksPath + --no-verify): a repo's pre-commit
	// hook is arbitrary code that would bypass command classification, and a
	// merely failing hook would crash the run.
	gitOrThrow(repoRoot, [
		"-c",
		"user.name=hit",
		"-c",
		"user.email=hit@localhost",
		"-c",
		"commit.gpgsign=false",
		"-c",
		"core.hooksPath=/dev/null",
		"commit",
		"-q",
		"--no-verify",
		"-m",
		`hit: turn ${turn}`,
	]);
	return true;
}

/** One-line run summary: how many commits the run made and how to review them. */
export function summarizeRun(repoRoot: string, branch: string, originalRef: string): string {
	const count = gitOrThrow(repoRoot, ["rev-list", "--count", `${originalRef}..${branch}`]).trim();
	const noun = count === "1" ? "commit" : "commits";
	return `${count} ${noun} on ${branch} since ${originalRef}; review with: git diff ${originalRef}...${branch}`;
}
