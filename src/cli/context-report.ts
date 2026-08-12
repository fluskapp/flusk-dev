/**
 * The report half of `ah context`: per-source token counts, the omission list
 * and the block itself, computed ONCE and shared by the printed output and
 * `--json`.
 *
 * Two renderers would drift, and drift here is fatal to the command's whole
 * purpose: a JSON view that disagreed with the printed one would make the
 * debugging tool the thing you have to debug. So both call `sourceLines` and
 * both carry `BuiltContext.text` byte for byte — the block is never
 * reformatted, because a debugger that rewrites its subject is showing you a
 * different artefact from the one the run received.
 *
 * `BuiltContext.outcomes` carries every gathered item, bodies included. The
 * rows here carry counts instead, so `--json` does not quote every body twice
 * (once inside `text`, once inside the report) for no added fact.
 */
import type { BuiltContext, Omission, SourceStatus } from "../context/types.js";

/** One registered source, as the report sees it. Every source gets a row. */
export interface SourceLine {
	source: string;
	label: string;
	status: SourceStatus;
	/** Items the source gathered, before diversity, floors and the budget. */
	found: number;
	/** How many of those reached the block. */
	kept: number;
	/** What the kept items actually cost, delimiters and headings included. */
	tokens: number;
	/** Why the status is not "ok", and any trim the assembler had to make. */
	notes: string[];
}

/**
 * Token spend is summed from `included`, not from what the sources estimated:
 * the delimiters are the assembler's cost, so a source's own number is a lower
 * bound and would under-report the row that is actually eating the budget.
 */
export function sourceLines(built: BuiltContext): SourceLine[] {
	const spend = new Map<string, number>();
	for (const item of built.included) {
		spend.set(item.source, (spend.get(item.source) ?? 0) + item.tokens);
	}
	return built.outcomes.map((o) => ({
		source: o.source,
		label: o.label,
		status: o.status,
		found: o.items.length,
		kept: o.kept,
		tokens: spend.get(o.source) ?? 0,
		notes: o.notes,
	}));
}

/** Everything the printed form says, in the shape a script can read. */
export function contextJson(
	built: BuiltContext,
	task: string,
	repo: string,
): Record<string, unknown> {
	return {
		task,
		repo,
		budget: built.budget,
		tokens: built.tokens,
		text: built.text,
		sources: sourceLines(built),
		included: built.included,
		omitted: built.omitted,
	};
}

const RULE = "-".repeat(72);
const pad = (s: string, w: number): string =>
	s.length >= w ? `${s} ` : s + " ".repeat(w - s.length);
const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? "" : "s"}`;

function sourceRows(lines: readonly SourceLine[]): string[] {
	const out = ["SOURCES"];
	for (const l of lines) {
		const counts = pad(`${l.kept} of ${l.found}`, 10);
		out.push(
			`  ${pad(l.source, 14)}${pad(l.status, 9)}${counts}${String(l.tokens).padStart(5)} tok`,
		);
		// A note is the only thing that explains a "skipped" or a "partial"; it
		// is never elided, or the row reads as "there was nothing there".
		for (const n of l.notes) out.push(`      ${n}`);
	}
	return out;
}

function omittedRows(omitted: readonly Omission[]): string[] {
	if (omitted.length === 0) return ["OMITTED  nothing — every gathered item is in the block"];
	const out = [`OMITTED  ${plural(omitted.length, "item")}`];
	for (const o of omitted) {
		out.push(`  ${pad(o.reason, 11)}${o.id}`);
		out.push(`               ${o.note}`);
	}
	return out;
}

/** The printed form. The block goes last so it can be read, or cut, whole. */
export function renderContext(built: BuiltContext, task: string, repo: string): string {
	const counts = [
		`${built.tokens} of ${built.budget} tokens`,
		plural(built.included.length, "block"),
		`${built.omitted.length} omitted`,
	];
	const head = [`context for "${task}"`, `repo: ${repo} · ${counts.join(" · ")}`, ""];
	// An empty block is an answer, not a blank screen: a run starting with no
	// context at all is exactly the bug this command exists to make visible.
	const body =
		built.text === ""
			? ["BLOCK  empty — this run would start with no context block at all"]
			: ["BLOCK  verbatim, exactly what the run is given:", RULE, built.text, RULE];
	const lines = [
		...head,
		...sourceRows(sourceLines(built)),
		"",
		...omittedRows(built.omitted),
		"",
		...body,
	];
	return `${lines.join("\n")}\n`;
}
