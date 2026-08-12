/**
 * Finds the session a resume continues, and reads the two things the history
 * index cannot give back: the run's own header and the handoff it last wrote
 * for itself (the final CompactionEntry.summary).
 *
 * Not resolveSessionPath() from src/cli/resume-cmd.ts: that helper readdirs
 * EVERY repo slug, throws when nothing matches, and lives in a module that
 * drags the agent and provider graph in behind it. A resume already knows its
 * repoRoot, so one readdir of that repo's session directory is both cheaper
 * and total — and gather() may not throw (L7). Nothing here throws; every
 * failure is `null` and becomes a stated reason upstream.
 *
 * REDACTION IS THE POINT OF THIS FILE (L4). The session JSONL is the one
 * corpus nothing else scrubs: SessionStore.read and loadSessionDetail both
 * redact zero, and only src/history/source-sessions.ts applies redact() on the
 * way into a card. So every string that leaves here has been through redact()
 * already, and no later stage re-scrubs.
 */
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { RunEndReason } from "../core/types.js";
import { redact } from "../history/scrub.js";
import { repoSlug, sessionsDir } from "../session/paths.js";
import { SessionStore } from "../session/store.js";

export interface PriorRun {
	/** "<repo-slug>/<file>.jsonl" — the same key the history index uses as `ref`. */
	key: string;
	/** Absolute, and never rendered: it carries $HOME. */
	path: string;
}

/** Header facts plus the last handoff, redacted at construction. */
export interface RunFile {
	task: string;
	taskKind: string | null;
	gitBranch: string | null;
	/** Last CompactionEntry.summary: the note the run wrote for its own successor. */
	handoff: string | null;
	/** Verbatim RunEndReason; older files omit it, and a live run has none. */
	reason: RunEndReason | null;
	/** No stats entry at all — the run was still going when the file stopped. */
	unfinished: boolean;
}

/** Codepoint order, not localeCompare: a locale-dependent sort is not L5. */
const byName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Session filenames open with a compact ISO stamp, so name order is time order. */
function sessionFiles(dir: string): string[] {
	try {
		return readdirSync(dir)
			.filter((f) => f.endsWith(".jsonl"))
			.sort(byName);
	} catch {
		return []; // no sessions dir for this repo: nothing ran here yet
	}
}

/**
 * `ref` is whatever the resume was given — a path, a file name or a bare id.
 * Without one, the newest transcript for this repo is the run being resumed.
 */
export function findPriorRun(repoRoot: string, ref?: string): PriorRun | null {
	const dir = sessionsDir(repoRoot);
	const files = sessionFiles(dir);
	const name = basename(ref ?? "");
	const pick =
		ref === undefined
			? files[files.length - 1]
			: name.endsWith(".jsonl")
				? files.find((f) => f === name)
				: files.find((f) => f.endsWith(`-${ref}.jsonl`));
	if (pick === undefined) return null;
	return { key: `${repoSlug(repoRoot)}/${pick}`, path: join(dir, pick) };
}

/**
 * Header, ending and last handoff — three typed field reads, deliberately NOT
 * a second transcript parser: commands, files touched and the verify verdict
 * come from the history card, which already earned them.
 *
 * SessionStore.read throws on a malformed interior line (only a torn final
 * append is forgiven) and a foreign file has no header, so both are caught
 * here and reported as a missing file rather than a dead run.
 */
export function readRunFile(path: string): RunFile | null {
	let entries: ReturnType<typeof SessionStore.read>;
	try {
		entries = SessionStore.read(path);
	} catch {
		return null;
	}
	const header = entries[0];
	if (header === undefined || header.type !== "header") return null;
	let handoff: string | null = null;
	let reason: RunEndReason | null = null;
	let hasStats = false;
	for (const e of entries) {
		if (e.type === "compaction")
			handoff = e.summary; // last one is the live one
		else if (e.type === "stats") {
			hasStats = true;
			reason = e.reason ?? null;
		}
	}
	return {
		task: redact(header.task),
		taskKind: header.taskKind ?? null,
		gitBranch: header.gitBranch,
		handoff: handoff === null ? null : redact(handoff),
		reason,
		unfinished: !hasStats,
	};
}
