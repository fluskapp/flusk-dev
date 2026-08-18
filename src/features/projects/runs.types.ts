/**
 * The runs feature's wire shapes, extracted from runs.functions.ts (which
 * sits at the 150-line cap). detail.ts types tool args as `unknown`; a
 * session file holds JSON by construction, so the narrowing is a statement
 * of fact, not a coercion.
 */
import type { Usage } from "../run/run.types.js";
import type { SessionDetail, ToolView as DetailToolView } from "./detail.js";
import type { SessionSummary } from "./scan.repository.js";

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type ToolView = Omit<DetailToolView, "args"> & { args: Json };
export type TranscriptItem =
	| { kind: "user"; text: string }
	| {
			kind: "assistant";
			text: string;
			thinking: string;
			stopReason: string;
			errorMessage?: string;
			/** The turn's own token usage; absent in files that predate recording. */
			usage?: Usage;
			tools: ToolView[];
	  }
	| { kind: "compaction"; summary: string };

/** The light half of a session run: enough for the header, no transcript. */
export interface RunHead {
	summary: SessionSummary | null;
	path: string | null;
}

export type SessionRun = Omit<SessionDetail, "items"> & { items: TranscriptItem[]; path: string };

export interface JournalBody {
	text: string;
	html: string;
	/** Why text/html are empty — the loader's catch preserves the thrown
	 * message so the view can say what failed instead of shrugging. */
	error?: string;
}
