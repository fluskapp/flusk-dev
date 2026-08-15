/**
 * The flow library — each flow as one arrow chain — shown under the feed
 * when the Flows segment is chosen. Moved from ui/react/flows/FlowsView.tsx
 * when the Flows window folded into Runs; the runs table that view also
 * drew is the merged feed now, so only the library half survives here.
 */
import type { FlowLibrary, FlowView } from "../../../../features/flows/flows.functions.js";
import { Sec } from "../widgets.js";

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

export function FlowLibrarySections({ lib }: { lib: FlowLibrary }) {
	return (
		<>
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
