/**
 * One flusk session as a transcript (client-run.ts's loadSessionRun). The
 * route renders the header immediately; this body arrives with the DEFERRED
 * transcript payload — the biggest in the app.
 */
import type { SessionRun } from "../../../features/projects/runs.functions.js";
import { PathActions } from "./run-actions.js";
import { SummaryBar } from "./Summary.js";
import { Meta, Transcript } from "./Transcript.js";
import { useToast } from "./widgets.js";
import "./table.css";

export function SessionBody({ d, keyRef }: { d: SessionRun; keyRef: string }) {
	const [toastNode, toast] = useToast();
	return (
		<>
			<Meta d={d} actions={<PathActions path={d.path} revealKey={keyRef} toast={toast} />} />
			<SummaryBar keyRef={keyRef} />
			<Transcript d={d} />
			{toastNode}
		</>
	);
}
