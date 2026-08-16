/**
 * What Enter, Escape, ⌘P and ⌘⏎ DO — split from palette-state.ts for the
 * size standard. A commit has no workbench view, and 75% of the corpus is
 * commits — silently copying a sha left three quarters of every result list
 * with no path from symptom to evidence. So a commit SHOWS its card (subject,
 * body, paths: the evidence itself) and copies the sha on the way.
 */
import { copyText, getJson, refKind } from "./palette-net.js";
import {
	DOT,
	palText,
	promptNote,
	type ComposedPrompt,
	type HistoryHit,
	type usePalette,
} from "./palette-state.js";

export function usePaletteActions(p: ReturnType<typeof usePalette>) {
	const { patch, ref, openFile, navigate, project } = p;

	const close = () => patch({ open: false });

	const move = (delta: number) => {
		const st = ref.current;
		const len = st.mode === "files" ? st.files.length : st.hits.length;
		if (len === 0) return;
		patch({ cur: Math.max(0, Math.min(len - 1, st.cur + delta)) });
	};

	const copyNote = (text: string, label: string) => {
		void copyText(text).then((ok) => patch({ note: ok ? label : "copy failed" }));
	};

	/** Session key, journal or doc — routed by ref shape, as openRef did. */
	const openHistory = (h: HistoryHit) => {
		close();
		const to = refKind(h.card.ref) === "doc" ? "/read/$" : "/runs/$runId";
		void navigate(
			to === "/read/$"
				? ({ to, params: { _splat: h.card.ref } } as never)
				: ({ to, params: { runId: h.card.ref } } as never),
		);
	};

	const enterAt = (i: number, mod: boolean) => {
		const st = ref.current;
		if (st.card !== null) {
			close();
			copyNote(st.card.card.ref, "Commit sha copied");
			patch({ card: null });
			return;
		}
		if (st.prompt !== null) return copyNote(palText(st.prompt, st.off).text, "Prompt copied");
		if (mod) return compose();
		if (st.mode === "files") {
			const h = st.files[i];
			if (h === undefined) return;
			close();
			openFile(h.path, 0);
			return;
		}
		const h = st.hits[i];
		if (h === undefined) return;
		if (h.card.kind === "commit") {
			patch({
				card: h,
				prompt: null,
				note: `commit ${h.card.ref.slice(0, 8)}${DOT}Enter copies the sha${DOT}Esc goes back`,
			});
			return;
		}
		openHistory(h);
	};

	const enter = (mod: boolean) => enterAt(ref.current.cur, mod);
	/** A click: the row picked is the row opened, as the legacy list did. */
	const pick = (i: number) => {
		patch({ cur: i });
		enterAt(i, false);
	};

	const compose = () => {
		const st = ref.current;
		const q = st.q.trim();
		if (q === "") return;
		patch({ note: "composing…" });
		const scope = st.all || project === "" ? "" : `&project=${encodeURIComponent(project)}`;
		getJson<ComposedPrompt>(`/api/history/prompt?budget=4000${scope}&task=${encodeURIComponent(q)}`)
			.then((pr) => patch({ prompt: pr, off: {}, note: promptNote(pr, {}) }))
			.catch(() => patch({ note: "compose failed" }));
	};

	const toggleBlock = (i: number) => {
		const st = ref.current;
		if (st.prompt === null) return;
		const off = { ...st.off, [i]: st.off[i] !== true };
		patch({ off, note: promptNote(st.prompt, off) });
	};

	/** Esc steps back out of a card or prompt before it closes the palette. */
	const escape = () => {
		const st = ref.current;
		if (st.prompt !== null || st.card !== null) {
			patch({ prompt: null, card: null });
			p.runSearch(st.q, st.mode, st.all);
		} else close();
	};

	const toggleAll = () => {
		const st = ref.current;
		patch({ all: !st.all });
		p.runSearch(st.q, st.mode, !st.all);
	};

	return { close, move, enter, pick, compose, toggleBlock, escape, toggleAll };
}
