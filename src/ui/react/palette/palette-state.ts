/**
 * The command palette's state and verbs — one key away from everything that
 * already happened, and from every file. History search is live and scoped
 * to the selected project (⌘P for every project); Files is Go to File over
 * the server's fuzzy ranking, whose order is the ranker's answer and is
 * never re-sorted here. Grouping in the history list is presentation: the
 * CURSOR goes to the globally best-scoring hit, so Enter opens the ranker's
 * answer rather than the best commit that happens to sort first.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { gotoFiles, type GotoHit } from "../../../features/search/goto.functions.js";
import { useOpenFile, useProjectName } from "../files/open-file.js";
import { getJson } from "./palette-net.js";

export const DOT = " · ";
const PAL_KINDS = ["commit", "session", "journal", "doc", "skill"];

export interface HistoryHit {
	card: { kind: string; project: string; title: string; at: string; ref: string; text: string };
	score: number;
	terms: string[];
}
export interface PromptBlock { source: string; why: string; tokens: number; text: string }
export interface ComposedPrompt { blocks: PromptBlock[]; constraints: string[]; omitted: number }
export type PalMode = "history" | "files";

/** The text the ticked blocks produce, and what it costs. */
export function palText(p: ComposedPrompt, off: Record<number, boolean>) {
	let text = "";
	let tokens = 0;
	p.blocks.forEach((b, i) => {
		if (off[i] === true) return;
		text += `## ${b.source}\n${b.text.trim()}\n\n`;
		tokens += b.tokens;
	});
	if (p.constraints.length > 0) text += "## Constraints\n";
	p.constraints.forEach((c) => {
		text += `- ${c}\n`;
		tokens += Math.ceil(c.length / 4);
	});
	return { text, tokens };
}

export const promptNote = (p: ComposedPrompt, off: Record<number, boolean>): string =>
	`${palText(p, off).tokens} tokens${DOT}${p.omitted} omitted${DOT}Enter copies`;

interface Pal {
	open: boolean; mode: PalMode; q: string; note: string; all: boolean; cur: number;
	hits: HistoryHit[]; files: GotoHit[]; prompt: ComposedPrompt | null; card: HistoryHit | null;
	off: Record<number, boolean>;
}

const START: Pal = {
	open: false, mode: "history", q: "", note: "", all: false, cur: 0,
	hits: [], files: [], prompt: null, card: null, off: {},
};

export function usePalette() {
	const navigate = useNavigate();
	const project = useProjectName();
	const openFile = useOpenFile();
	const [s, set] = useState<Pal>(START);
	const ref = useRef(s);
	ref.current = s;
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const patch = (p: Partial<Pal>) => set((prev) => ({ ...prev, ...p }));

	const scopeQS = (all: boolean) =>
		all || project === "" ? "" : `&project=${encodeURIComponent(project)}`;
	const scopeNote = (all: boolean) => (all || project === "" ? "all projects" : `${project} only`);
	const tail = (all: boolean) => DOT + scopeNote(all) + DOT + "⌘P scope" + DOT + "Enter opens";

	const goSearch = useCallback(async (q0: string, all: boolean) => {
		const q = q0.replace(/^\//, "").trim();
		try {
			const hits = await gotoFiles({
				data: { q, ...(all || project === "" ? {} : { project }), limit: 40 },
			});
			// Guard on the query this request was issued for: a slow answer for
			// "ab" arriving after a fast one for "abc" otherwise overwrites the
			// list, and the marks then mark it against the wrong query.
			if (ref.current.mode !== "files" || ref.current.q.replace(/^\//, "").trim() !== q) return;
			patch({ files: hits, cur: 0, note: `${hits.length} file${hits.length === 1 ? "" : "s"}${tail(all)}` });
		} catch {
			patch({ note: "file search failed" });
		}
	}, [project]);

	const histSearch = useCallback(async (q: string, all: boolean) => {
		if (q === "") return patch({ hits: [], cur: 0, note: "" });
		try {
			const hits = await getJson<HistoryHit[]>(
				`/api/history/search?limit=30${scopeQS(all)}&q=${encodeURIComponent(q)}`,
			);
			const st = ref.current;
			if (st.q.trim() !== q || st.prompt !== null || st.mode === "files") return;
			const best = hits[0];
			const sorted = hits
				.slice()
				.sort((a, b) =>
					PAL_KINDS.indexOf(a.card.kind) - PAL_KINDS.indexOf(b.card.kind) || b.score - a.score);
			const cur = best === undefined ? 0 : Math.max(0, sorted.indexOf(best));
			patch({ hits: sorted, cur, note: `${hits.length} hits${tail(all)}` });
		} catch {
			patch({ note: "search failed" });
		}
	}, [project]);

	/** A path is the thing that starts with a slash: that prefix means Files. */
	const runSearch = useCallback((q: string, mode: PalMode, all: boolean) => {
		if (mode !== "files" && q.charAt(0) === "/") return setModeRef.current("files");
		if (mode === "files") return void goSearch(q, all);
		void histSearch(q.trim(), all);
	}, [goSearch, histSearch]);

	const setMode = useCallback((mode: PalMode) => {
		patch({ mode, prompt: null, card: null, hits: [], files: [], cur: 0 });
		runSearch(ref.current.q, mode, ref.current.all);
	}, [runSearch]);
	const setModeRef = useRef(setMode);
	setModeRef.current = setMode;

	const type = (q: string) => {
		patch({ q });
		clearTimeout(timer.current);
		timer.current = setTimeout(() => runSearch(q, ref.current.mode, ref.current.all), 120);
	};

	const openPal = (mode?: PalMode) => {
		patch({ open: true, prompt: null, card: null });
		if (mode !== undefined && mode !== ref.current.mode) setMode(mode);
		else runSearch(ref.current.q, mode ?? ref.current.mode, ref.current.all);
	};

	return { s, patch, project, navigate, openFile, setMode, type, openPal, runSearch, ref };
}
