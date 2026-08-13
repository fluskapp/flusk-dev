/**
 * The Flows tool window's list view: the flow library as one arrow chain each,
 * and the recent flow runs as the same stage chips every harness run already
 * uses. Ported from client-flow.ts (loadFlowsView).
 */
import type { FlowLibrary, FlowRunRow, FlowView } from "../../../features/flows/flows.functions.js";
import { Pipeline } from "./Pipeline.js";
import { fmtCost, fmtTime, Pill, Sec } from "./vocab.js";
import "./vocab.css";
import "./flows.css";

function LibTable({ list }: { list: FlowView[] }) {
	return (
		<table className="tbl">
			<thead>
				<tr>
					<th>flow</th>
					<th>shape</th>
					<th>what it is for</th>
				</tr>
			</thead>
			<tbody>
				{list.map((f) => (
					<tr key={f.name}>
						<td>{f.name}</td>
						<td className="mono grow">{f.shape}</td>
						<td>{f.description}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function RunRow({ r, onOpen }: { r: FlowRunRow; onOpen: (runId: string) => void }) {
	return (
		<tr data-flow-run={r.runId} title={r.runId} onClick={() => onOpen(r.runId)}>
			<td>
				<Pill status={r.status} />
			</td>
			<td className="grow">{r.task}</td>
			<td className="mono">{r.flow}</td>
			<td>
				<Pipeline steps={r.steps} />
			</td>
			<td className="num">{fmtCost(r.costUsd)}</td>
			<td className="num">{fmtTime(r.at)}</td>
		</tr>
	);
}

export function FlowsView(props: {
	lib: FlowLibrary;
	runs: FlowRunRow[];
	onOpen: (runId: string) => void;
}) {
	const { lib, runs, onOpen } = props;
	return (
		<>
			<div className="head-row">
				<h2>Flows</h2>
				<span className="dim">composed prompts · no prompt is written by hand</span>
			</div>
			<Sec title="Recent runs" count={runs.length}>
				{runs.length ? (
					<table className="tbl">
						<thead>
							<tr>
								<th>status</th>
								<th>task</th>
								<th>flow</th>
								<th>pipeline</th>
								<th className="num">cost</th>
								<th className="num">when</th>
							</tr>
						</thead>
						<tbody>
							{runs.map((r) => (
								<RunRow key={r.runId} r={r} onOpen={onOpen} />
							))}
						</tbody>
					</table>
				) : (
					<div className="empty small">
						No flow runs yet.
						<br />
						Run <code>flusk flow run "task"</code> — the prompts are composed for you.
					</div>
				)}
			</Sec>
			<Sec title="Built-in" count={lib.library.length}>
				<LibTable list={lib.library} />
			</Sec>
			<Sec title="User flows" count={lib.user.length}>
				{lib.user.length ? (
					<LibTable list={lib.user} />
				) : (
					<div className="empty small">
						Drop a flow JSON in <code>.flusk/flows/</code>.
					</div>
				)}
			</Sec>
			{(lib.errors ?? []).map((e) => (
				<div className="line" key={e}>
					skipped: {e}
				</div>
			))}
		</>
	);
}
