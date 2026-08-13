/**
 * The stage pipeline, as chips — the same vocabulary every harness run already
 * uses (client-stages.ts, stageHtml). A flow step draws as the stage chip it
 * is: name from the node id, done/failed from `ok`, the note or node kind as
 * the hover detail.
 */
import type { FlowRunStep } from "../../../features/flows/flows.functions.js";
import { stageClass, stageIcon } from "./vocab.js";

export interface StageView {
	name: string;
	status: string;
	duration: string;
	detail: string;
}

export function Stage({ s }: { s: StageView }) {
	const cls = stageClass(s.status);
	const title =
		s.status + (s.duration ? ` · ${s.duration}` : "") + (s.detail ? ` · ${s.detail}` : "");
	// A failed stage is a handle onto the place in the journal that explains it,
	// so it keeps the focusable-control shape the run view gives it.
	const jump = cls === "error" ? { "data-stage": s.name, tabIndex: 0, role: "button" } : {};
	return (
		<span className={`stage ${cls}`} title={title} {...jump}>
			<span className="stg-i">{stageIcon(s.status)}</span>
			{s.name}
		</span>
	);
}

const stageOf = (s: FlowRunStep): StageView => ({
	name: s.nodeId,
	status: s.ok ? "done" : "failed",
	duration: "",
	detail: s.note ?? s.kind,
});

export function Pipeline({ steps }: { steps: FlowRunStep[] }) {
	return (
		<div className="stages">
			{steps.map((s, i) => (
				<Stage key={`${s.nodeId}:${i}`} s={stageOf(s)} />
			))}
		</div>
	);
}
