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
	if (d.kind === "model") {
		return [`model      ${d.ref} — ${MODEL_SOURCE[d.source] ?? d.source} [${d.taskKind}]`];
	}
	if (d.kind === "isolation") {
		return [
			d.branch !== null
				? `isolation  branch ${d.branch} — ${d.why}`
				: `isolation  none — ${d.why}`,
		];
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
