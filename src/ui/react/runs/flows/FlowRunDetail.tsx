/**
 * One flow run: its header, the pipeline, and each step with its output and
 * the SOURCES its prompt was composed from. Moved from ui/react/flows when
 * the Flows window folded into Runs; it now speaks the runs vocabulary
 * (widgets, format, stages) instead of carrying its own.
 */
import type { FlowRunRow, FlowRunStep } from "../../../../features/flows/flows.functions.js";
import { flowStages } from "../feed-row.js";
import { fmtCost } from "../format.js";
import { StagePipeline } from "../stages.js";
import { Pill, Sec } from "../widgets.js";
import "./flow-detail.css";

function FlowStep({ s }: { s: FlowRunStep }) {
	const sources = s.sources ?? [];
	return (
		<div className="flow-step">
			<div className="flow-step-head">
				<Pill status={s.ok ? "done" : "failed"} />
				<b>{s.nodeId}</b>
				<span className="dim">
					{s.kind} · {s.promptTokens} prompt tokens · {fmtCost(s.costUsd)}
				</span>
			</div>
			<div className="flow-sources">
				<span className="dim">prompt composed from</span>
				{s.widened === true ? (
					<span className="dim"> — this project has no indexed history; all projects were searched</span>
				) : null}
				<div className="chips">
					{sources.length ? (
						sources.map((src) => (
							<span className="chip" key={src}>
								{src}
							</span>
						))
					) : (
						<span className="chip">nothing indexed yet</span>
					)}
				</div>
			</div>
			<pre className="code out">{s.output || s.note || ""}</pre>
		</div>
	);
}

export function FlowRunDetail({ run, onBack }: { run: FlowRunRow; onBack: () => void }) {
	return (
		<>
			<div className="head-row">
				<h2>{run.task}</h2>
				<Pill status={run.status} />
				<span className="dim">
					{run.flow} · {run.runId}
				</span>
				<span className="ev" data-flow-back="1" onClick={onBack}>
					back to runs
				</span>
			</div>
			<StagePipeline rows={flowStages(run.steps)} />
			<Sec title="Steps" count={run.steps.length}>
				{run.steps.map((s, i) => (
					<FlowStep key={`${s.nodeId}:${i}`} s={s} />
				))}
			</Sec>
		</>
	);
}
