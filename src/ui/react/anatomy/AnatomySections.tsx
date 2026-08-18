/**
 * The report's first four sections: which tools the loop has, which files
 * shape its prompt and from which layer, which model serves each task kind
 * (with its measured score), and which commands gate a run — each with the
 * honest empty sentence instead of a blank ("unavailable is data").
 */
import type { AnatomyReport } from "../../../features/anatomy/anatomy.types.js";
import { Line, Sec } from "../runs/widgets.js";

export function ToolsSec({ tools }: { tools: AnatomyReport["tools"] }) {
	return (
		<Sec title="Tools" count={tools.length}>
			<table className="tbl">
				<tbody>
					{tools.map((t) => (
						<tr key={t.name}>
							<td className="mono">{t.name}</td>
							<td>
								<span className="chip">{t.source}</span>
							</td>
							<td className="grow dim" title={t.description}>
								{t.description}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Sec>
	);
}

export function WorkspaceSec({ files }: { files: AnatomyReport["workspace"] }) {
	return (
		<Sec title="Workspace" count={files.length || null}>
			{files.length === 0 ? (
				<Line>No workspace files — nothing beyond the system prompt shapes a run here.</Line>
			) : (
				<table className="tbl">
					<tbody>
						{files.map((f) => (
							<tr key={f.path}>
								<td>
									<span className="chip">{f.kind}</span>
								</td>
								<td className="dim">{f.scope}</td>
								<td className="grow mono">
									<a className="ev" href={`/files${f.path}`} title={f.path}>
										{f.path}
									</a>
								</td>
								<td className="num">{f.bytes} B</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</Sec>
	);
}

export function RoutingSec({ routing }: { routing: AnatomyReport["routing"] }) {
	return (
		<Sec title="Routing" count={routing.models.length}>
			<table className="tbl">
				<thead>
					<tr>
						<th>kind</th>
						<th>model</th>
						<th className="num">score</th>
					</tr>
				</thead>
				<tbody>
					{routing.models.map((m) => (
						<tr key={m.taskKind}>
							<td>{m.taskKind}</td>
							<td className="mono">{m.ref}</td>
							<td className="num">
								{m.score === null ? <span className="off">unmeasured</span> : <span className="score">{m.score}</span>}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<Line>
				<span className="dim">scores live in </span>
				<span className="mono">{routing.scoresPath}</span>
			</Line>
		</Sec>
	);
}

export function VerifySec({ verify }: { verify: AnatomyReport["verify"] }) {
	return (
		<Sec title="Verify" count={verify.commands.length || null}>
			<Line>
				<span className="chip">{verify.source}</span>
				<span className="dim">
					{verify.source === "config"
						? " .flusk/config.json verify[] wins over detection"
						: verify.source === "detected"
							? " re-derived from the repo's own files on every run"
							: " nothing gates a run in this repo"}
				</span>
			</Line>
			{verify.commands.map((c) => (
				<Line key={c}>
					<span className="mono">{c}</span>
				</Line>
			))}
		</Sec>
	);
}

export function AnatomySections({ report }: { report: AnatomyReport }) {
	return (
		<>
			<ToolsSec tools={report.tools} />
			<WorkspaceSec files={report.workspace} />
			<RoutingSec routing={report.routing} />
			<VerifySec verify={report.verify} />
		</>
	);
}
