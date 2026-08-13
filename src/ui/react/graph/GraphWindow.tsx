/**
 * The Graph tool window (8) — "what am I about to break". Ported from
 * client-graph.ts. It FOLLOWS rather than asks: whatever the Documentation
 * window last looked up (the "flusk:symbol" CustomEvent) is what this panel
 * is about, so there is no second symbol picker to keep in step with the
 * first. The two states only the server can tell apart — an unbuilt graph
 * versus a built graph with no such node — arrive as `note` and `action`, and
 * are printed beside a button that does the thing they name.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	buildGraphIndex,
	getGraphReport,
	type GraphAnswer,
	type GraphReply,
} from "../../../features/graph/graph.functions.js";
import { base } from "./cells.js";
import { BuildBtn, GraphEmpty, GraphHead, graphFail } from "./head.js";
import { LocalSection } from "./LocalSection.js";
import { indexNodes, openGraphNode, subjectOf, type Subject } from "./nav.js";
import { BlastSection, CoChangeSection, ProvenanceSection } from "./rows.js";
import "../flows/vocab.css";
import "./graph.css";

type View =
	| { kind: "idle" }
	| { kind: "loading"; file: string }
	| { kind: "fail"; title: string; note: string }
	| { kind: "ok"; reply: GraphReply };

export function GraphWindow({ initial }: { initial: Subject | null }) {
	const [subject, setSubject] = useState<Subject | null>(initial);
	const [view, setView] = useState<View>({ kind: "idle" });
	/** The one-line report the legacy toasts carried: build progress, copies. */
	const [note, setNote] = useState("");
	const building = useRef(false);
	const seq = useRef(0);
	const navigate = useNavigate();

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
		if (mine !== seq.current) return; // the guard that keeps a slow reply from winning
		if (!a.ok) {
			const [title, said] = graphFail(a.status, a.reason, sub.file);
			setView({ kind: "fail", title, note: said });
			return;
		}
		setView({ kind: "ok", reply: a.reply });
	}, []);

	useEffect(() => void load(subject), [subject, load]);
	// Re-aim when the route's search names a subject (a shareable deep link).
	useEffect(() => {
		if (initial !== null) setSubject(initial);
	}, [initial?.file, initial?.symbol]); // eslint-disable-line react-hooks/exhaustive-deps
	// The Documentation window owns the lookup; this panel reads the same answer.
	useEffect(() => {
		const follow = (e: Event): void => {
			const sub = subjectOf((e as CustomEvent).detail);
			if (sub !== null) setSubject(sub);
		};
		document.addEventListener("flusk:symbol", follow);
		return () => document.removeEventListener("flusk:symbol", follow);
	}, []);

	/** The empty state's remedy, actually performed. One pass is bounded and
	 * resumable, so the button can be pressed again to continue — which is why
	 * the note reports what is left rather than claiming completion. */
	const build = useCallback(
		async (root: string) => {
			if (building.current) {
				setNote("Already indexing");
				return;
			}
			building.current = true;
			setNote("Indexing — this reads one bounded slice of files");
			try {
				const rep = await buildGraphIndex({ data: { root } });
				// `reason` and never `error` is a refused/incomplete pass; reading
				// only `error` reported those as a successful index of zero files.
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
			void load(subject);
		},
		[load, subject],
	);

	const reply = view.kind === "ok" ? view.reply : null;
	const byId = useMemo(() => (reply === null ? {} : indexNodes(reply)), [reply]);
	const open = useCallback(
		(id: string) =>
			openGraphNode(byId, id, {
				openFile: (file, line) =>
					void navigate({ to: "/files/$", params: { _splat: file }, search: { line } as never }),
				openRef: (ref) => void navigate({ to: "/files/$", params: { _splat: ref } }),
				copy: (text, said) => {
					void navigator.clipboard?.writeText(text);
					setNote(said);
				},
			}),
		[byId, navigate],
	);

	return (
		<>
			{note !== "" ? <div className="gg-note">{note}</div> : null}
			{view.kind === "idle" ? (
				<GraphEmpty
					title="Nothing selected"
					note="The Graph panel follows the Documentation window. Open a source file — from the project tree, ⌘⇧O, or a Find in Files hit — and click any identifier in it."
				/>
			) : null}
			{view.kind === "loading" ? (
				<div className="empty small">reading the graph for {base(view.file)} …</div>
			) : null}
			{view.kind === "fail" ? <GraphEmpty title={view.title} note={view.note} /> : null}
			{reply !== null ? (
				<>
					<GraphHead d={reply} build={build} />
					{reply.state === "ok" ? (
						<>
							<LocalSection d={reply} open={open} />
							<BlastSection d={reply} open={open} />
							<CoChangeSection d={reply} open={open} />
							<ProvenanceSection d={reply} open={open} />
						</>
					) : (
						<GraphEmpty
							title={reply.state === "unindexed" ? "This project has no graph yet" : "Not in the graph"}
							note={reply.note ?? ""}
							action={
								<>
									{reply.action ?? ""}{" "}
									<BuildBtn root={reply.root} label="Index this project" build={build} />
								</>
							}
						/>
					)}
				</>
			) : null}
		</>
	);
}
