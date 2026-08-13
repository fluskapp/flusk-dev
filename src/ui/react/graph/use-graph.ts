/**
 * The Graph window's two async gestures: the read (with the guard that keeps
 * a slow reply from winning) and the one write it can make. Ported from
 * client-graph.ts (loadGraph) and client-graph-nav.ts (graphBuild).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
	buildGraphIndex,
	getGraphReport,
	type GraphAnswer,
	type GraphReply,
} from "../../../features/graph/graph.functions.js";
import { graphFail } from "./head.js";
import type { Subject } from "./nav.js";

export type View =
	| { kind: "idle" }
	| { kind: "loading"; file: string }
	| { kind: "fail"; title: string; note: string }
	| { kind: "ok"; reply: GraphReply };

export function useGraphView(subject: Subject | null): { view: View; reload: () => void } {
	const [view, setView] = useState<View>({ kind: "idle" });
	const seq = useRef(0);
	const load = useCallback(async (sub: Subject | null) => {
		if (sub === null) {
			setView({ kind: "idle" });
			return;
		}
		const mine = ++seq.current;
		setView({ kind: "loading", file: sub.file });
		let a: GraphAnswer;
		try {
			a = await getGraphReport({ data: { file: sub.file, symbol: sub.symbol } });
		} catch (e) {
			// The call itself never completed — the third failure, the one the
			// server cannot report about itself.
			a = { ok: false, status: 0, reason: e instanceof Error ? e.message : String(e) };
		}
		if (mine !== seq.current) return; // the guard on a slow reply
		if (!a.ok) {
			const [title, said] = graphFail(a.status, a.reason, sub.file);
			setView({ kind: "fail", title, note: said });
			return;
		}
		setView({ kind: "ok", reply: a.reply });
	}, []);
	useEffect(() => void load(subject), [subject, load]);
	return { view, reload: () => void load(subject) };
}

/**
 * The empty state's remedy, actually performed. One pass is bounded and
 * resumable, so the button can be pressed again to continue rather than
 * having to finish a large repo in one go — which is why the note reports
 * what is left rather than claiming completion. `note` is the one-line
 * report the legacy toasts carried.
 */
export function useGraphBuild(reload: () => void): {
	note: string;
	setNote: (s: string) => void;
	build: (root: string) => void;
} {
	const building = useRef(false);
	const [note, setNote] = useState("");
	const build = useCallback(
		(root: string) => {
			void (async () => {
				if (building.current) {
					setNote("Already indexing");
					return;
				}
				building.current = true;
				setNote("Indexing — this reads one bounded slice of files");
				try {
					const rep = await buildGraphIndex({ data: { root } });
					// A refused or incomplete pass answers with `reason` and never
					// `error` (graph.functions.ts); reading only `error` reported those
					// as a successful index of zero files, so the button could be
					// pressed forever while the one sentence saying why was thrown away.
					const why = rep.error ?? rep.reason;
					setNote(
						why !== undefined
							? `Index incomplete: ${why} (${rep.filesIndexed} file(s) read, ${rep.filesRemaining} remaining)`
							: `Indexed ${rep.filesIndexed} file(s), ${rep.filesRemaining} remaining`,
					);
				} catch {
					setNote("Index failed");
				}
				building.current = false;
				reload();
			})();
		},
		[reload],
	);
	return { note, setNote, build };
}
