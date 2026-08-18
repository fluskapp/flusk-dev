/**
 * The Decisions section of a run page: the DecisionLog rendered for the
 * reviewer's questions in the order they get asked. A run with no decision
 * entries says so plainly — older sessions predate the recording.
 */
import type { DecisionLog } from "../../../features/run/run.functions.js";
import { fmtCost } from "./format.js";
import { Gate, GateDecision, Row } from "./GateSection.js";
import "./decisions.css";

const MODEL_SOURCE: Record<string, string> = {
	scores: "chosen by measured benchmark scores",
	config: "the configured model for this task kind",
	override: "forced by --model",
	fake: "the scripted offline provider",
};

export function Decisions({ log }: { log: DecisionLog | null }) {
	if (log === null) return null;
	return (
		<details className="decisions" open>
			<summary>Decisions — why this run did what it did</summary>
			{log.decisions.length === 0 ? (
				<p className="dim">No decision entries — this session predates decision recording.</p>
			) : (
				<dl className="dec-list">
					{log.decisions.map(({ at, decision: d }, i) => {
						if (d.kind === "run") {
							return (
								<Row key={`${at}-${i}`} name="loop">
									<code>{d.runId}</code>{" "}
									<span className="dim">— the gate's facts are keyed by this id</span>
								</Row>
							);
						}
						if (d.kind === "model") {
							return (
								<Row key={`${at}-${i}`} name="model">
									<code>{d.ref}</code> — {MODEL_SOURCE[d.source] ?? d.source}{" "}
									<span className="dim">[{d.taskKind}]</span>
								</Row>
							);
						}
						if (d.kind === "spec") {
							return (
								<Row key={`${at}-${i}`} name="spec">
									<code>{d.name}</code> <span className="dim">({d.mode})</span>{" "}
									<span className="dim">— {d.path}</span>
								</Row>
							);
						}
						if (d.kind === "isolation") {
							return (
								<Row key={`${at}-${i}`} name="isolation">
									{d.branch !== null ? <code>{d.branch}</code> : "none"}{" "}
									<span className="dim">— {d.why}</span>
								</Row>
							);
						}
						if (d.kind === "turn") {
							return (
								<Row key={`${at}-${i}`} name={`turn ${d.turn}`}>
									{d.tools.length > 0 ? (
										d.tools.map((t, j) => <code key={`${t}-${j}`}>{t} </code>)
									) : (
										<span className="dim">no tools</span>
									)}{" "}
									<span className="dim">
										· {fmtCost(d.costUsd)} · {d.stop}
										{d.checkpointed === true ? " · checkpointed" : ""}
									</span>
								</Row>
							);
						}
						if (d.kind === "gate") {
							return <GateDecision key={`${at}-${i}`} d={d} />;
						}
						return (
							<Row key={`${at}-${i}`} name="context">
								{d.error !== undefined ? (
									<span className="dec-err">failed: {d.error} — ran with the base prompt alone</span>
								) : (
									<>
										{d.tokens}/{d.budget} tokens · {d.included} kept · {d.omitted} dropped
										<ul className="dec-sources">
											{d.sources.map((s) => (
												<li key={s.source}>
													<code>{s.source}</code> {s.status} <span className="dim">kept {s.kept}</span>
												</li>
											))}
										</ul>
									</>
								)}
							</Row>
						);
					})}
				</dl>
			)}
			<Gate log={log} />
		</details>
	);
}
