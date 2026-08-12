/**
 * The verify chain this run will be judged by, pinned into the context block.
 *
 * It is the single fact a run most needs and least has: today the agent is
 * scored by commands nobody told it about, so it optimises for "looks done"
 * instead of "passes the gate". Nothing is remembered here — detect.ts states
 * outright that the repo files are the authority, so the chain is re-derived
 * on every call and a cached copy could only ever be a staler one.
 *
 * TRAP, and the reason this source exists as its own thing: buildProfile()
 * calls detectVerifyCommands(root) with NO repoConfig, so profile.verify
 * silently ignores a .ah.json verify[] override. Taking profile.verify would
 * pin a chain that differs from the one src/cli/gate-loop.ts executes - worse
 * than pinning none, because it reads as authoritative. This source therefore
 * makes gate-loop's call itself: detectVerifyCommands(repoRoot, loadRepoConfig).
 *
 * gather() is total (L7). loadRepoConfig THROWS on a malformed .ah.json - it
 * refuses the file rather than half-reading it - and that must cost the
 * override plus a stated note, never the run.
 */
import { loadRepoConfig } from "../config/config.js";
import type { RepoConfig } from "../config/types.js";
import { detectVerifyCommands } from "../verify/detect.js";
import { buildVerifyItem, VERIFY_SOURCE_ID } from "./source-verify-item.js";
import type { ContextRequest, ContextSource, SourceResult } from "./types.js";

interface Loaded {
	config?: RepoConfig;
	/** Set only when the override was lost; drives status "partial". */
	note?: string;
}

/**
 * loadRepoConfig names the offending file by ABSOLUTE path in its message, and
 * an absolute path carries $HOME and the on-disk layout of unrelated projects
 * into whatever reads this note. Only the repo-relative part says anything.
 */
function relativise(message: string, repoRoot: string): string {
	return message.split(`${repoRoot}/`).join("").split(repoRoot).join(".");
}

function detail(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function loadTotal(repoRoot: string): Loaded {
	try {
		const config = loadRepoConfig(repoRoot);
		return config === undefined ? {} : { config };
	} catch (err) {
		const why = relativise(detail(err), repoRoot);
		return {
			note: `Could not read .ah.json, so any verify[] override in it was ignored: ${why}. The chain below is what detectVerifyCommands derives from the repo files instead, which is also what the gate will run while the file stays unreadable.`,
		};
	}
}

/**
 * The chain does not depend on `task`, `paths` or `isResume`: it is pinned, not
 * selected against the task, so weighting it by relevance would only make it
 * possible for a loud corpus to lose it. Same repo, same bytes (L5).
 */
function gather(req: ContextRequest): SourceResult {
	const loaded = loadTotal(req.repoRoot);
	const notes = loaded.note === undefined ? [] : [loaded.note];
	let commands: string[];
	try {
		commands = detectVerifyCommands(req.repoRoot, loaded.config);
	} catch (err) {
		const why = relativise(detail(err), req.repoRoot);
		notes.push(`No verify chain could be derived for this repo: ${why}.`);
		return { items: [], status: "failed", notes };
	}
	const caveat =
		loaded.note === undefined ? "" : ", with the unreadable .ah.json override left out";
	// An empty chain is a finding, not a skip: "nothing gates this run" is
	// something the agent must know, and it is not the same as "not asked".
	const item = buildVerifyItem(commands, loaded.config?.verify !== undefined, caveat);
	return { items: [item], status: notes.length === 0 ? "ok" : "partial", notes };
}

export const verifySource: ContextSource = {
	id: VERIFY_SOURCE_ID,
	label: "Verify chain",
	gather,
};
