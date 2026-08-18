/**
 * The DecisionLog as prose a senior engineer reads top to bottom. Sections in
 * the order the questions get asked: what ran, on which model and why, what
 * it was told, where it was isolated, what the gate proved.
 */
import type { Decision } from "../features/session/entries.js";
import type { DecisionLog } from "../features/run/decisions.js";

const MODEL_SOURCE: Record<string, string> = {
	scores: "chosen by measured benchmark scores (flusk feedback adjusts them)",
	config: "the configured model for this task kind",
	override: "forced by --model on the command line",
	fake: "the scripted offline provider (--fake or the demo)",
};

function line(d: Decision): string[] {
	if (d.kind === "run") {
		return [`loop       run ${d.runId} — the gate's facts are keyed by this id`];
	}
	if (d.kind === "model") {
		return [`model      ${d.ref} — ${MODEL_SOURCE[d.source] ?? d.source} [${d.taskKind}]`];
	}
	if (d.kind === "spec") {
		return [`spec       ${d.name} (${d.mode}) — ${d.path}`];
	}
	if (d.kind === "isolation") {
		return [
			d.branch !== null
				? `isolation  branch ${d.branch} — ${d.why}`
				: `isolation  none — ${d.why}`,
		];
	}
	if (d.kind === "turn") {
		const tools = d.tools.length > 0 ? d.tools.join(", ") : "no tools";
		const mark = d.checkpointed === true ? " · checkpointed" : "";
		return [`turn       ${d.turn} · ${tools} · $${d.costUsd.toFixed(4)} · ${d.stop}${mark}`];
	}
	if (d.kind === "gate") {
		const retries =
			d.retries === 0 ? "clean first pass" : `${d.retries} retr${d.retries === 1 ? "y" : "ies"}`;
		const check = d.reportCheck !== undefined ? ` · report ${d.reportCheck}` : "";
		const rows = [`gate       ${d.outcome} · ${retries}${check}`];
		for (const cmd of d.verified) rows.push(`             verified ${cmd}`);
		for (const r of d.reasons ?? []) rows.push(`             because ${r}`);
		for (const a of d.attempts ?? []) {
			rows.push(
				`             retry ${a.retry}: ${a.cmd} exited ${a.exitCode}${a.skipped ? " (skipped)" : ""}`,
			);
			for (const t of a.tail.split("\n")) rows.push(`               ${t}`);
		}
		return rows;
	}
	const head =
		d.error !== undefined
			? `context    FAILED (${d.error}) — the run proceeded with the base prompt alone`
			: `context    ${d.tokens}/${d.budget} tokens, ${d.included} blocks kept, ${d.omitted} dropped with reasons`;
	const rows = d.sources.map(
		(s) => `             ${s.source.padEnd(12)} ${s.status.padEnd(9)} kept ${s.kept}`,
	);
	return [head, ...rows];
}

export function renderDecisionLog(log: DecisionLog): string {
	const out: string[] = [
		`run ${log.runId} · ${log.taskKind ?? "run"} · ${log.createdAt}`,
		`task: ${log.task}`,
		"",
	];
	if (log.decisions.length === 0) {
		out.push("no decision entries — this session predates decision recording");
	}
	for (const { decision } of log.decisions) out.push(...line(decision));
	out.push("");
	if (log.gate === null) {
		out.push("gate       no facts of record (memory disabled or store unavailable)");
	} else {
		const g = log.gate;
		if (g.outcome !== undefined) out.push(`outcome    ${g.outcome} (fact of record)`);
		for (const cmd of g.verifiedBy) out.push(`verified   ${cmd}`);
		if (g.verifiedBy.length === 0) out.push("verified   nothing — no verify command passed or gate skipped");
		if (g.reportCheck !== undefined) out.push(`report     ${g.reportCheck} — closing report vs harness observations`);
	}
	if (log.endReason !== undefined) out.push(`ended      ${log.endReason}`);
	return `${out.join("\n")}\n`;
}
