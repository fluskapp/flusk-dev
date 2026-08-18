/**
 * The Graph window's header line, empty states and failure vocabulary.
 * Ported from client-graph.ts. NO STATE HERE IS A BLANK BOX: nothing
 * selected, nothing built, nothing known about this node, and a request that
 * was refused are four different sentences with four different remedies, each
 * printed beside a button that does the thing it names.
 */
import type { ReactNode } from "react";
import type { GraphReply } from "../../../features/graph/graph.functions.js";
import { base } from "./cells.js";

export function GraphEmpty(props: { title: string; note: string; action?: ReactNode }) {
	return (
		<div className="sys-empty">
			<span className="gg-empty-title">{props.title}</span>
			<span className="dim gg-empty-note">{props.note}</span>
			{props.action !== undefined ? <span>{props.action}</span> : null}
		</div>
	);
}

/** The remedy as a button, not as a sentence about a button. */
export function BuildBtn(props: { root: string; label: string; build: (root: string) => void }) {
	return (
		<span className="ev gg-act" data-open={`gbuild:${props.root}`} onClick={() => props.build(props.root)}>
			{props.label}
		</span>
	);
}

/** What this is about, where it lives, and how big the graph answering is —
 * the denominator that makes "nothing found" mean something. */
export function GraphHead({ d, build }: { d: GraphReply; build: (root: string) => void }) {
	const t = d.target;
	const name = t !== null ? t.label : base(d.asked.file);
	const where =
		t !== null && t.file !== undefined
			? t.file + (t.line !== undefined && t.line !== 0 ? `:${t.line}` : "")
			: d.asked.file;
	return (
		<div className="gg-head">
			<span className="gg-name">{name}</span>
			<span className="gg-kind">{t !== null ? t.kind : d.asked.symbol !== null ? "symbol" : "file"}</span>
			<span className="gg-path">{where}</span>
			<span className="spacer" />
			<span className="gg-stat">
				{d.project}: {d.stats.nodes} nodes · {d.stats.edges} edges
			</span>
			<BuildBtn root={d.root} label="Re-index" build={build} />
		</div>
	);
}

/**
 * Which failure this was, as [title, sentence]. A refusal, a server-side
 * crash and an unreachable server have three different remedies, and the
 * panel used to assert the first one for all three — telling a reader their
 * path is outside their projects when their .flusk/config.json has a
 * trailing comma.
 */
export function graphFail(status: number, reason: string, file: string): [string, string] {
	if (status >= 400 && status < 500) {
		return [
			"No graph for this file",
			reason !== ""
				? reason
				: `The server would not answer about ${file}. It answers only about files the scanners ` +
					"have already listed, so a path outside your configured projects has none.",
		];
	}
	if (status !== 0) {
		return [
			"The graph request failed",
			`The server answered HTTP ${status}${reason !== "" ? `: ${reason}` : ""}. That is a failure ` +
				`inside the dashboard, not a refusal about ${file}.`,
		];
	}
	return [
		"The dashboard could not be reached",
		`The request for ${file} never completed — ${reason || "the call itself failed"}. Check that ` +
			"`flusk ui` is still running.",
	];
}
