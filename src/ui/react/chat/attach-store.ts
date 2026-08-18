/**
 * Chat's attachment state: the old ask-store, migrated whole when Ask folded
 * into Chat (docs/experience.md — the context card became the attachment
 * strip).
 *
 * MODULE-LEVEL ON PURPOSE: the code context is a snapshot taken when "Code" is
 * pressed, and closing or re-opening the chat rail must NOT re-capture —
 * coming back to read a reply would otherwise replace the context that reply
 * was about. A React state tree dies with the rail; this object survives it,
 * which is the snapshot semantics.
 */
import type { Answerer, AskBlock, AskContext } from "../../../features/orchestra/ask.functions.js";
import type { ProjectSummary } from "../../../features/projects/projects.functions.js";

/** The old Ask key, kept verbatim so a remembered answerer survives the merge. */
export const WHO_KEY = "flusk-ask-answerer";

export interface AttachState {
	/** The code capture — file, symbol, span, blast radius — or none yet. */
	ctx: AskContext | null;
	/** Blocks attached by hand: specs and run heads, in attach order. */
	extras: AskBlock[];
	notes: string[];
	/** Blocks switched OFF — dimmed on screen, dropped from the request. */
	off: Record<string, boolean>;
	answerers: Answerer[];
	who: string;
	whoErr: string;
	/** True once a roster fetch has RESOLVED — an empty list before that is
	 * "still loading", not "no backend" (a failed request is not an empty list). */
	whoLoaded: boolean;
	loading: boolean;
	/** The file and caret last announced on screen — the whole of "on screen". */
	screen: { file: string; line: number; col: number };
	projects: ProjectSummary[] | null;
}

export const AT: AttachState = {
	ctx: null, extras: [], notes: [], off: {}, answerers: [], who: "", whoErr: "",
	whoLoaded: false, loading: false, screen: { file: "", line: 0, col: 0 }, projects: null,
};

const subs = new Set<() => void>();
export function repaint(): void {
	for (const s of subs) s();
}
export function subscribe(fn: () => void): () => void {
	subs.add(fn);
	return () => subs.delete(fn);
}

// The code viewer announces every identifier click; the snapshot reads the
// LAST one, not the live caret — capturing is an explicit act.
if (typeof document !== "undefined") {
	document.addEventListener("flusk:symbol", (e) => {
		const d = (e as CustomEvent<{ file?: string; line?: number; col?: number } | null>).detail;
		if (d === null || d === undefined || typeof d.file !== "string") return;
		AT.screen = {
			file: d.file,
			line: typeof d.line === "number" ? d.line : 0,
			col: typeof d.col === "number" ? d.col : 0,
		};
	});
}
