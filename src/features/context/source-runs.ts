/**
 * ContextSource "runs": the session a resume continues, and only what a
 * resume cannot already see.
 *
 * A fresh run has no prior run, so this source is `skipped` outside a resume —
 * a stated skip, not silence, because a source missing from the report is
 * indistinguishable from one that was never wired up.
 *
 * The two blockers that shape it are in source-runs-items.ts (duplication with
 * the transcript the agent already replays, and the fact that nothing on the
 * session path redacts). The route taken here is: the redacted, capped,
 * outcome-labelled CARD from sessionCards() for the work, and the raw file for
 * the header and the last compaction handoff only — both through redact() in
 * source-runs-locate.ts.
 *
 * Degradation is normal (L7): the sessions index is capped at 500 files while
 * the disk is not, so a card can be missing for a transcript that reads fine,
 * and a torn transcript can accompany a card that reads fine. Either way the
 * block is thinner and says which half is missing; only losing both is
 * "failed", and even that is a value, never a throw.
 */
import { sessionCards } from "../history/source-sessions.js";
import type { HistoryCard } from "../history/types.js";
import { buildRunItems } from "./source-runs-items.js";
import { findPriorRun, readRunFile } from "./source-runs-locate.repository.js";
import type { ContextRequest, ContextSource, SourceResult } from "./types.js";

export interface RunsSourceOpts {
	/**
	 * The session id, file name or path the resume already resolved. Without
	 * one the newest transcript for this repo is taken as the run being
	 * resumed, which is what `flusk resume` with no ref means.
	 */
	sessionRef?: string;
}

const skip = (note: string): SourceResult => ({ items: [], status: "skipped", notes: [note] });
const fail = (note: string): SourceResult => ({ items: [], status: "failed", notes: [note] });

/**
 * sessionCards() routes through the scan-cache (path+mtime+size) and is
 * bounded by SESSION_LIMIT=500, which is why the card is preferred over a
 * second read of a transcript that may be megabytes.
 */
function cardFor(key: string): HistoryCard | undefined {
	try {
		return sessionCards().find((c) => c.ref === key);
	} catch {
		return undefined; // a broken index costs the digest, not the run
	}
}

function gather(req: ContextRequest, ref?: string): SourceResult {
	if (!req.isResume) {
		return skip("This run is not a resume, so there is no prior session to carry forward.");
	}
	try {
		const prior = findPriorRun(req.repoRoot, ref);
		if (prior === null) {
			return skip(
				ref === undefined
					? "No session transcript exists for this repo yet, so a resume has nothing prior to read."
					: `No session transcript matching "${ref}" exists under this repo's sessions directory.`,
			);
		}
		const file = readRunFile(prior.path);
		const card = cardFor(prior.key);
		if (file === null && card === undefined) {
			return fail(
				`Session ${prior.key} is unreadable (no header, or a malformed entry) and the history index has no card for it, so this resume starts without the prior run's handoff.`,
			);
		}
		const items = buildRunItems({ key: prior.key, file, card, taskPaths: req.paths ?? [] });
		const notes: string[] = [];
		if (card === undefined) {
			notes.push(
				`The history index has no card for session ${prior.key}, so the files that run wrote and whether a verify command passed after its last edit are not stated here.`,
			);
		}
		if (file === null) {
			notes.push(
				`Session ${prior.key} could not be parsed, so the run's header and its last compaction handoff are missing from this block.`,
			);
		}
		if (items.length === 0) {
			notes.push(`Session ${prior.key} yielded no text once redacted, so it contributes nothing.`);
		}
		return { items, status: notes.length === 0 ? "ok" : "partial", notes };
	} catch (err) {
		// gather is total (L7). The error's NAME only: its message would carry
		// the absolute session path, and $HOME must not reach a report.
		const kind = err instanceof Error ? err.name : "unknown error";
		return fail(
			`Reading flusk's session store failed with ${kind}, so no prior-run context was gathered.`,
		);
	}
}

/** `sessionRef` lets a resume name the exact session it reopened. */
export function createRunsSource(opts: RunsSourceOpts = {}): ContextSource {
	return {
		id: "runs",
		label: "Prior run",
		gather: (req) => gather(req, opts.sessionRef),
	};
}

/** The default registration: newest session for the repo being resumed. */
export const runsSource: ContextSource = createRunsSource();
