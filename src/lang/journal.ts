/**
 * The run journal a flow writes: a harness-shaped markdown file under the
 * project's `docs/runs/`, byte-compatible with src/ui/journal-frontmatter.ts,
 * so flow runs show up in the workbench Runs view beside every other harness
 * with no new UI.
 *
 * The frontmatter carries the RUN ID. Without it the Flows panel had to guess
 * which journal belonged to which checkpoint by flow name and a time window,
 * and two runs of the same flow minutes apart in different projects were
 * attributed to the wrong one.
 */
import { lastAttempts } from "./nodes.js";
import { flowRunId, startedAtOf } from "./record.js";
import type { FlowResult, FlowStep } from "./types.js";

/** Frontmatter is line-, quote- and pipe-delimited: keep values on one line. */
export const clean = (s: string, cap = 110): string =>
	s
		.replace(/[\r\n"|]+/g, " ")
		.trim()
		.slice(0, cap);

/** A journal's top-level status; "blocked" is a gate verdict, not a status. */
const STATUS: Record<FlowResult["outcome"], string> = {
	completed: "done",
	blocked: "failed",
	failed: "failed",
};

function secs(s: FlowStep): string {
	const ms = Date.parse(s.endedAt ?? s.startedAt) - Date.parse(s.startedAt);
	return `${(Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0).toFixed(1)}s`;
}

/**
 * `docs/runs` basename, keyed off the RUN ID rather than the wall clock: a
 * resume replays its steps with fresh timestamps, so a start-time name gave one
 * logical run two journals. The id's own stamp keeps the name sortable.
 */
export function journalName(r: FlowResult, runId?: string): string {
	const id = runId ?? flowRunId(r);
	const stamp =
		/(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})$/.exec(id)?.[1] ?? id.replace(/[^\w.-]+/g, "-");
	const task = r.state.task
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `${stamp}-${task.slice(0, 40) || "flow"}.md`;
}

const detailOf = (s: FlowStep, tries = 1): string =>
	clean(
		`${s.kind}${tries > 1 ? ` · attempt ${tries}` : ""} · ` +
			`${s.note ?? s.output.split("\n").find((l) => l.trim() !== "") ?? ""}`,
	);

/** One stage line per node, carrying its LAST attempt: a reader scores any
 * failed stage as a failed run (src/history/source-journals.ts), so a step
 * retried into success must not still show its first attempt. The attempt
 * count says a retry happened; the table below keeps every one. */
export function journalText(r: FlowResult, runId?: string): string {
	const title = `Flow: ${clean(r.state.task, 80)}`;
	const flow = clean(r.spec, 40);
	const stages = lastAttempts(r.state.steps).map(
		({ step: s, tries }) =>
			`  ${s.nodeId.replace(/[^\w-]+/g, "-")}: "${s.ok ? "done" : "failed"}|${secs(s)}|${detailOf(s, tries)}"`,
	);
	// A gate stage that does not say "pass" reads as blocked (source-journals.ts),
	// which is exactly what a blocked flow means. A crash gets no gate stage.
	if (r.outcome !== "failed") stages.push(`  gate: "done|0.0s|${r.ok ? "pass" : "blocked"}"`);
	const front = [
		"---",
		`title: "${title}"`,
		`date: ${startedAtOf(r)}`,
		`status: ${STATUS[r.outcome]}`,
		'kind: "flow"',
		`tool: "${flow}"`,
		`runId: "${clean(runId ?? flowRunId(r), 80)}"`,
		`cost: ${r.state.costUsd}`,
		"stages:",
		...stages,
		"---",
	].join("\n");
	const rows = r.state.steps
		.map((s) => `| ${s.nodeId} | ${s.ok ? "done" : "failed"} | ${detailOf(s)} | ${secs(s)} |`)
		.join("\n");
	const head = `# ${title}\n\n**Status: ${r.outcome}** — flow \`${flow}\`, ${r.state.steps.length} step(s)`;
	return `${front}\n\n${head}\n\n| step | status | detail | time |\n|---|---|---|---|\n${rows}\n`;
}
