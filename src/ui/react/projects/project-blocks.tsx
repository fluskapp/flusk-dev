/**
 * The project view's lower half (client-project.ts): the models it routes
 * to, the tools it can call, the commands it gates on, and the prompt and
 * declarative config it runs on — each collapsed to one line until asked.
 */
import type { ModelRef, ProjectDetail } from "../../../features/projects/detail.functions.js";
import { Line, Sec } from "../runs/widgets.js";
import { ConfigResolved } from "./ConfigResolved.js";
import { DotFluskTree } from "./DotFluskTree.js";

function ModelRow({ m }: { m: ModelRef }) {
	return (
		<tr>
			<td className="mono">{m.id}</td>
			<td>{m.role !== undefined ? m.role : <span className="off">—</span>}</td>
			<td className="num">
				{m.score === undefined ? "" : <span className="score">{m.score}</span>}
			</td>
		</tr>
	);
}

export function Models({ models }: { models: ModelRef[] }) {
	if (models.length === 0)
		return (
			<Line>
				No models declared — list them as <code>models[]</code> in this project's{" "}
				<code>config.json</code>.
			</Line>
		);
	return (
		<table className="tbl">
			<thead>
				<tr>
					<th>model</th>
					<th>role</th>
					<th className="num">score</th>
				</tr>
			</thead>
			<tbody>
				{models.map((m) => (
					<ModelRow key={m.id} m={m} />
				))}
			</tbody>
		</table>
	);
}

export function Tools({ tools }: { tools: string[] }) {
	if (tools.length === 0)
		return (
			<Line>
				No tools declared — list them as <code>capabilities[]</code> in <code>config.json</code>, or
				run once so the stages record themselves.
			</Line>
		);
	return (
		<div className="chips">
			{tools.map((t) => (
				<span key={t} className="chip">
					{t}
				</span>
			))}
		</div>
	);
}

export function Verify({ verify }: { verify: string[] }) {
	if (verify.length === 0) return <Line>No verify commands detected.</Line>;
	return (
		<table className="tbl">
			<tbody>
				{verify.map((c) => (
					<tr key={c}>
						<td className="mono grow">{c}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export function PromptBlock({ p }: { p: ProjectDetail["systemPrompt"] }) {
	if (p === undefined)
		return (
			<Line>
				No system prompt found — add <code>prompts/*.md</code>, <code>AGENTS.md</code> or{" "}
				<code>CLAUDE.md</code> at the project root.
			</Line>
		);
	return (
		<details className="prompt-block">
			<summary>
				System prompt <span className="dim">{p.source}</span>
			</summary>
			<pre className="prompt-text code">{p.text}</pre>
		</details>
	);
}

/** Section wrappers shared by the route so counts land in the headers. */
export function lowerHalf(d: ProjectDetail) {
	return (
		<>
			<Sec title="Models" count={d.models.length || null}>
				<Models models={d.models} />
			</Sec>
			<Sec title="Tools" count={d.tools.length || null}>
				<Tools tools={d.tools} />
			</Sec>
			<Sec title="Verify" count={d.verify.length || null}>
				<Verify verify={d.verify} />
			</Sec>
			<PromptBlock p={d.systemPrompt} />
			<ConfigResolved name={d.name} />
			<DotFluskTree name={d.name} />
		</>
	);
}
