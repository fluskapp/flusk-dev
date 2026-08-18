/**
 * The gate's two accounts, side by side: the facts of record (cross-session
 * ledger, when a store exists) and the run's own gate decision entry — the
 * narrative the gate wrote down when it judged.
 */
import type { DecisionLog } from "../../../features/run/run.functions.js";
import type { Decision } from "../../../features/session/entries.js";
import "./decisions.css";

type GateD = Extract<Decision, { kind: "gate" }>;

export function Row({ name, children }: { name: string; children: React.ReactNode }) {
	return (
		<>
			<dt>{name}</dt>
			<dd>{children}</dd>
		</>
	);
}

/** Gate verdicts as filled status pills: ALLOW/success are --ok, WARN is
 * --warn, BLOCK/failure are --err — the attention rules' own mapping. The
 * run-level verdicts live/none take D1's running/dim treatments. */
const VERDICT: Record<string, string> = {
	allow: "ok", success: "ok", ok: "ok", pass: "ok", passed: "ok", completed: "ok",
	warn: "warn", blocked: "warn",
	block: "err", failure: "err", failed: "err", error: "err", err: "err",
	live: "run", none: "dim",
};

export function Verdict({ v }: { v: string }) {
	return <span className={`verdict ${VERDICT[v.toLowerCase()] ?? ""}`}>{v}</span>;
}

export function Gate({ log }: { log: DecisionLog }) {
	if (log.gate === null) {
		return <p className="dim">Gate: no facts of record (memory disabled or store unavailable).</p>;
	}
	const g = log.gate;
	return (
		<dl className="dec-list">
			{g.outcome !== undefined ? (
				<Row name="outcome">
					<Verdict v={g.outcome} /> <span className="dim">fact of record</span>
				</Row>
			) : null}
			<Row name="verified">
				{g.verifiedBy.length === 0 ? (
					<span className="dim">nothing — no verify command passed or gate skipped</span>
				) : (
					g.verifiedBy.map((c) => <code key={c}>{c} </code>)
				)}
			</Row>
			{g.reportCheck !== undefined ? (
				<Row name="report">
					<Verdict v={g.reportCheck} />{" "}
					<span className="dim">closing report vs harness observations</span>
				</Row>
			) : null}
			{g.reasons.length > 0 ? (
				<Row name="why">
					<ul className="dec-sources">
						{g.reasons.map((r) => <li key={r}>{r}</li>)}
					</ul>
				</Row>
			) : null}
		</dl>
	);
}

/** The gate's own decision entry: the run-local narrative D2 writes. */
export function GateDecision({ d }: { d: GateD }) {
	return (
		<>
			<Row name="gate">
				<Verdict v={d.outcome} />{" "}
				<span className="dim">
					{d.retries === 0 ? "clean first pass" : `${d.retries} ${d.retries === 1 ? "retry" : "retries"}`}
				</span>
			</Row>
			{d.verified.length > 0 ? (
				<Row name="verified">{d.verified.map((c) => <code key={c}>{c} </code>)}</Row>
			) : null}
			{d.reportCheck !== undefined ? (
				<Row name="report">
					<Verdict v={d.reportCheck} />
				</Row>
			) : null}
			{(d.reasons ?? []).length > 0 ? (
				<Row name="because">
					<ul className="dec-sources">{(d.reasons ?? []).map((r) => <li key={r}>{r}</li>)}</ul>
				</Row>
			) : null}
			{(d.attempts ?? []).length > 0 ? (
				<Row name="evidence">
					{(d.attempts ?? []).map((a) => (
						<details key={`${a.retry}-${a.cmd}`} className="dec-attempt">
							<summary>
								retry {a.retry}: <code>{a.cmd}</code> exited {a.exitCode}
								{a.skipped ? " (skipped)" : ""}
							</summary>
							<pre className="dec-evidence">{a.tail}</pre>
						</details>
					))}
				</Row>
			) : null}
		</>
	);
}
