/**
 * The Ask panel's state: one module-level object, like the legacy `A`.
 *
 * MODULE-LEVEL ON PURPOSE: the context is a snapshot taken when the panel is
 * opened or when "Use what is on screen" is pressed, and returning to the tab
 * must NOT re-capture — coming back to read an answer would otherwise replace
 * the context that answer was about. A React state tree dies with the route;
 * this object survives it, which is the snapshot semantics.
 */
import type { Answerer, AskContext } from "../../../features/orchestra/ask.functions.js";
import type { ProjectSummary } from "../../../features/projects/projects.functions.js";

export const ASK_WHO_KEY = "flusk-ask-answerer";

export interface AskState {
	ctx: AskContext | null;
	notes: string[];
	/** Blocks switched OFF — dimmed on screen, dropped from the request. */
	off: Record<string, boolean>;
	answerers: Answerer[];
	who: string;
	whoErr: string;
	q: string;
	answer: string;
	html: string;
	prompt: string;
	err: string;
	fail: string;
	busy: boolean;
	abort: AbortController | null;
	loading: boolean;
	recapture: boolean;
	/** The file and caret last announced on screen — the whole of "on screen". */
	screen: { file: string; line: number; col: number };
	projects: ProjectSummary[] | null;
}

export const A: AskState = {
	ctx: null, notes: [], off: {}, answerers: [], who: "", whoErr: "", q: "",
	answer: "", html: "", prompt: "", err: "", fail: "",
	busy: false, abort: null, loading: false, recapture: true,
	screen: { file: "", line: 0, col: 0 }, projects: null,
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
		A.screen = {
			file: d.file,
			line: typeof d.line === "number" ? d.line : 0,
			col: typeof d.col === "number" ? d.col : 0,
		};
	});
}
