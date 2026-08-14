/**
 * The Decisions section of a run page: the DecisionLog rendered for the
 * reviewer's questions in the order they get asked. A run with no decision
 * entries says so plainly — older sessions predate the recording.
 */
import type { DecisionLog } from "../../../features/run/run.functions.js";
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
						if (d.kind === "model") {
							return (
								<Row key={`${at}-${i}`} name="model">
									<code>{d.ref}</code> — {MODEL_SOURCE[d.source] ?? d.source}{" "}
									<span className="dim">[{d.taskKind}]</span>
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

function Row({ name, children }: { name: string; children: React.ReactNode }) {
	return (
		<>
			<dt>{name}</dt>
			<dd>{children}</dd>
		</>
	);
}

function Gate({ log }: { log: DecisionLog }) {
	if (log.gate === null) {
		return <p className="dim">Gate: no facts of record (memory disabled or store unavailable).</p>;
	}
	const g = log.gate;
	return (
		<dl className="dec-list">
			{g.outcome !== undefined ? <Row name="outcome">{g.outcome} (fact of record)</Row> : null}
			<Row name="verified">
				{g.verifiedBy.length === 0 ? (
					<span className="dim">nothing — no verify command passed or gate skipped</span>
				) : (
					g.verifiedBy.map((c) => <code key={c}>{c} </code>)
				)}
			</Row>
			{g.reportCheck !== undefined ? (
				<Row name="report">{g.reportCheck} — closing report vs harness observations</Row>
			) : null}
		</dl>
	);
}
