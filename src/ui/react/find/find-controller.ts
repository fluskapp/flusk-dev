/**
 * Find in Files behavior, as a hook: debounced queries (the "searching…" note
 * held back 150ms so a fast ripgrep never flickers a spinner), a seq guard so
 * a slow first search cannot overwrite a fast second, and the flattened row
 * cursor Enter addresses. The legacy AbortController is not portable — the
 * server-function transport owns the socket — so staleness is seq-only here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findInFiles, type FindResult } from "../../../features/search/search.functions.js";
import { buildRows, fxOpen, type FindRow } from "./find-rows.js";
import { keepResult, loadControls, saveControls, type FindControls } from "./find-store.js";

export interface FindInit extends Partial<FindControls> {
	q?: string;
}

function summary(r: FindResult, scope: string): string {
	const files = r.files.length;
	let text = `${r.total} match${r.total === 1 ? "" : "es"} in ${files} file${files === 1 ? "" : "s"}`;
	text += ` · ${scope || "all projects"} · ${r.tookMs}ms`;
	if (r.truncated) text += " · truncated";
	if (r.note !== undefined) text += ` · ${r.note}`;
	return text;
}

export function useFindController(
	project: string,
	openFile: (path: string, line: number, project: string) => void,
	initial?: FindInit,
) {
	const [q, setQState] = useState(initial?.q ?? "");
	const [controls, setControlsState] = useState<FindControls>(() => ({
		...loadControls(),
		...(initial?.scope !== undefined ? { scope: initial.scope } : {}),
		...(initial?.mask !== undefined ? { mask: initial.mask } : {}),
		...(initial?.cs !== undefined ? { cs: initial.cs } : {}),
		...(initial?.re !== undefined ? { re: initial.re } : {}),
	}));
	const [result, setResult] = useState<FindResult | null>(null);
	const [note, setNote] = useState<{ text: string; warn: boolean }>({ text: "", warn: false });
	const [cursor, setCursor] = useState(-1);
	const [open, setOpen] = useState<Record<string, boolean>>({});
	const seq = useRef(0);
	const timers = useRef<{ type?: ReturnType<typeof setTimeout>; slow?: ReturnType<typeof setTimeout> }>({});

	/** "" means every configured project — the scope select decides. */
	const scopeName = controls.scope === "all" || project === "" ? "" : project;

	const run = useCallback(
		async (query: string, c: FindControls) => {
			clearTimeout(timers.current.slow);
			if (query.trim() === "") {
				setResult(null);
				keepResult("", null);
				setCursor(-1);
				setNote({ text: "", warn: false });
				return;
			}
			// seq, not a boolean: a slow first search must not overwrite a fast second.
			const mine = ++seq.current;
			timers.current.slow = setTimeout(() => {
				if (seq.current === mine) setNote({ text: "searching…", warn: false });
			}, 150);
			const scope = c.scope === "all" || project === "" ? "" : project;
			let r: FindResult | null = null;
			try {
				r = await findInFiles({
					data: {
						q: query,
						...(scope !== "" ? { project: scope } : {}),
						...(c.mask !== "" ? { glob: c.mask } : {}),
						regex: c.re,
						caseSensitive: c.cs,
						limit: 200,
					},
				});
			} catch {
				r = null;
			}
			if (seq.current !== mine) return;
			clearTimeout(timers.current.slow);
			if (r === null) {
				setNote({ text: "search failed", warn: true });
				return;
			}
			setResult(r);
			keepResult(query, r);
			setOpen({});
			setCursor(-1);
			setNote({ text: summary(r, scope), warn: r.truncated });
		},
		[project],
	);

	const setQ = useCallback(
		(next: string) => {
			setQState(next);
			clearTimeout(timers.current.type);
			timers.current.type = setTimeout(() => void run(next, controls), 200);
		},
		[run, controls],
	);

	/** Mask keeps typing's debounce; scope/case/regex re-run at once (legacy). */
	const setControl = useCallback(
		(patch: Partial<FindControls>) => {
			const next = { ...controls, ...patch };
			setControlsState(next);
			saveControls(next);
			clearTimeout(timers.current.type);
			if (patch.mask !== undefined) timers.current.type = setTimeout(() => void run(q, next), 200);
			else void run(q, next);
		},
		[controls, q, run],
	);

	const rows = useMemo(() => buildRows(result, open), [result, open]);

	const pick = useCallback(
		(i: number) => {
			const r: FindRow | undefined = rows[i];
			if (r === undefined) return;
			setCursor(i);
			if (r.kind === "file") setOpen((o) => ({ ...o, [r.file.path]: !fxOpen(o, r.file.path) }));
			else openFile(r.file.path, r.m.line, r.file.project);
		},
		[rows, openFile],
	);

	const move = useCallback(
		(delta: number) => {
			if (rows.length === 0) return;
			setCursor((c) => Math.max(0, Math.min(rows.length - 1, c + delta)));
		},
		[rows.length],
	);

	const enter = useCallback(() => {
		if (cursor < 0) move(1);
		else pick(cursor);
	}, [cursor, move, pick]);

	useEffect(() => () => {
		clearTimeout(timers.current.type);
		clearTimeout(timers.current.slow);
	}, []);

	return { q, controls, result, note, cursor, rows, open, scopeName, setQ, setControl, move, enter, pick };
}
