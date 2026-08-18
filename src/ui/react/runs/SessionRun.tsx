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

/** getSessionRun's reply: the additive external-harness verdict rides along. */
type SessionRunReply = SessionRun & { harnessVerified?: boolean };

/** The loader's explicit substitute when reading the session failed: header
 * null is the discriminant, `error` the thrown reason, `path` the resolved
 * file — enough for an honest banner, never enough to crash Meta. */
export interface SessionLoadFail {
	header: null;
	error: string;
	path: string;
}

/**
 * D8's honesty contract, worn on the run: a foreign adapter produced this
 * session. "flusk-verified" means the gate's verify commands passed;
 * otherwise the run is external and unverified. Native sessions (no header
 * harness) render NO chip — absence of doubt is the default, not a badge.
 */
function TrustChip({ d }: { d: SessionRunReply }) {
	if (d.header.harness === undefined) return null;
	return (
		<span className="sys-chip" title={`external harness: ${d.header.harness}`}>
			{d.harnessVerified === true ? "external harness — flusk-verified" : "external — unverified"}
		</span>
	);
}

export function SessionBody({
	d,
	keyRef,
}: {
	d: SessionRunReply | SessionLoadFail;
	keyRef: string;
}) {
	const [toastNode, toast] = useToast();
	// The editor-banner idiom: an unreadable file names itself and the reason.
	if (d.header === null) {
		return (
			<div className="sys-empty">
				<span>
					Couldn't read this session — {d.error}. The file may have been moved or renamed.
				</span>
				<span className="sys-chip mono">{d.path}</span>
				<span className="meta-actions">
					<PathActions path={d.path} revealKey={keyRef} toast={toast} />
				</span>
				{toastNode}
			</div>
		);
	}
	return (
		<>
			<Meta
				d={d}
				actions={
					<>
						<TrustChip d={d} />
						<PathActions path={d.path} revealKey={keyRef} toast={toast} />
					</>
				}
			/>
			<SummaryBar keyRef={keyRef} />
			<Transcript d={d} />
			{toastNode}
		</>
	);
}
