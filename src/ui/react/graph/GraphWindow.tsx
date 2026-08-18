/**
 * The Graph tool window (8) — "what am I about to break". Ported from
 * client-graph.ts. It FOLLOWS rather than asks: whatever the Documentation
 * window last looked up (the "flusk:symbol" CustomEvent) is what this panel
 * is about, so there is no second symbol picker to keep in step with the
 * first. The two states only the server can tell apart — an unbuilt graph
 * versus a built graph with no such node — arrive as `note` and `action`, and
 * are printed beside a button that does the thing they name. A panel that
 * renders an empty box for any state is indistinguishable from a broken one.
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { base } from "./cells.js";
import { BuildBtn, GraphEmpty, GraphHead } from "./head.js";
import { LocalSection } from "./LocalSection.js";
import { indexNodes, openGraphNode, subjectOf, type Subject } from "./nav.js";
import { ProvenanceSection } from "./provenance.js";
import { BlastSection, CoChangeSection } from "./rows.js";
import { useGraphBuild, useGraphView } from "./use-graph.js";
import "../flows/vocab.css";
import "./graph.css";

export function GraphWindow({ initial }: { initial: Subject | null }) {
	const [subject, setSubject] = useState<Subject | null>(initial);
	const { view, reload } = useGraphView(subject);
	const { note, setNote, build } = useGraphBuild(reload);
	const navigate = useNavigate();

	// Re-aim when the route's search names a subject (a shareable deep link).
	useEffect(() => {
		if (initial !== null) setSubject(initial);
	}, [initial?.file, initial?.symbol]); // eslint-disable-line react-hooks/exhaustive-deps
	// The Documentation window owns the lookup; this panel reads the same
	// answer — one lookup, two windows.
	useEffect(() => {
		const follow = (e: Event): void => {
			const sub = subjectOf((e as CustomEvent).detail);
			if (sub !== null) setSubject(sub);
		};
		document.addEventListener("flusk:symbol", follow);
		return () => document.removeEventListener("flusk:symbol", follow);
	}, []);

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
		[byId, navigate, setNote],
	);

	return (
		<>
			{note !== "" ? <div className="gg-note">{note}</div> : null}
			{view.kind === "idle" ? (
				<GraphEmpty
					title="Nothing selected"
					note="The Graph panel follows the Documentation window. Open a source file — from the project tree, ⌘⇧O, or a Find in Files hit — and click any identifier in it."
					action={
						<>
							<button
								type="button"
								className="sys-btn"
								onClick={() =>
									document.dispatchEvent(
										new KeyboardEvent("keydown", { key: "o", metaKey: true, shiftKey: true }),
									)
								}
							>
								Go to file (⌘⇧O)
							</button>{" "}
							<button
								type="button"
								className="sys-btn"
								onClick={() =>
									void navigate({
										to: ".",
										search: (prev: Record<string, unknown>) => ({ ...prev, find: true }),
									})
								}
							>
								Find in Files (⌘4)
							</button>
						</>
					}
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
