/**
 * The form's keystroke red-line, split from form-model.ts at the 150-line
 * seam: hard errors disable Run/Save, warnings render amber and block
 * nothing. The authoritative validator ships with the feature
 * (runconfig-validate.ts); this mirror is the dialog's instant feedback,
 * same messages.
 */
import type { ConfigDraft } from "./form-model.js";

export interface Issue {
	level: "error" | "warn";
	message: string;
}

/** run-args' duration grammar, mirrored: "2h", "30m", "45s", "1h30m" → ms. */
export function durationMs(text: string): number | null {
	const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(text);
	if (!m || m[0] === "") return null;
	return (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)) * 1000;
}

/** A harness row as the select fetched it — enough to mirror the feature rules. */
export interface HarnessOptionShape {
	id: string;
	available: boolean;
	note?: string;
}

export interface ValidateCtx {
	/** Configured project roots; membership, never a prefix test. */
	roots: string[];
	/** detectVerifyCommands(repo).length via the server, null while unknown. */
	verifyCommands: number | null;
	/** listHarnessConfigs rows; absent/null = not probed (never blocks). */
	harnesses?: HarnessOptionShape[] | null;
}

/** The feature validator's harness matrix (H3 §6), mirrored keystroke-side. */
function harnessIssues(d: ConfigDraft, ctx: ValidateCtx, push: (i: Issue) => void): void {
	const id = d.harness.trim();
	if (id === "" || id === "native") return;
	const rows = ctx.harnesses ?? null;
	const row = rows?.find((h) => h.id === id);
	if (rows !== null && row === undefined) {
		push({ level: "error", message: `harness "${id}" is not a configured harness` });
	} else if (row !== undefined && !row.available) {
		push({ level: "error", message: row.note ?? `harness "${id}" is unavailable` });
	}
	if (d.fake.trim() !== "") {
		push({ level: "error", message: "fake scripts the native provider — not a foreign harness" });
	}
	if (d.container) {
		push({ level: "error", message: "container execution applies to the native loop only" });
	}
	if (d.model.trim() !== "") {
		push({ level: "warn", message: "model is ignored — a harness chooses its model in its own args" });
	}
	if (d.maxTurns.trim() !== "" || d.maxCostUsd.trim() !== "") {
		push({ level: "warn", message: "turn/cost budgets are not enforceable on an external harness" });
	}
}

/** Hard errors first (they disable Run/Save), then the amber warnings. */
export function validateDraft(d: ConfigDraft, ctx: ValidateCtx): Issue[] {
	const issues: Issue[] = [];
	const err = (message: string) => issues.push({ level: "error", message });
	if (d.name.trim() === "") err("name is required — it becomes .flusk/runs/<name>.json");
	else if (!/^[A-Za-z0-9._-]+$/.test(d.name.trim())) {
		err("name must be a file stem — letters, digits, dots, dashes");
	}
	if (d.task.trim() === "" && d.spec.trim() === "") err("task and spec are both empty");
	if (d.forDur.trim() !== "" && durationMs(d.forDur.trim()) === null) {
		err("--for must look like 2h, 30m, 45s or 1h30m");
	}
	if (d.maxCostUsd.trim() !== "" && !(Number(d.maxCostUsd) > 0)) {
		err("--max-cost must be a positive number of dollars");
	}
	const turns = d.maxTurns.trim() === "" ? undefined : Number(d.maxTurns);
	if (turns !== undefined && (!Number.isInteger(turns) || turns <= 0)) {
		err("--max-turns must be a positive integer");
	}
	if (d.repo.trim() !== "" && !ctx.roots.includes(d.repo.trim())) {
		err("repo is not a configured project root");
	}
	harnessIssues(d, ctx, (i) => issues.push(i));
	if (d.verify && ctx.verifyCommands === 0) {
		issues.push({ level: "warn", message: "repo has no verify commands — the gate would pass vacuously" });
	}
	if (d.fake.trim() !== "") issues.push({ level: "warn", message: "runs against the scripted provider" });
	return issues;
}

/** The footer shows ONE line: the first error, else the first warning. */
export function footerIssue(issues: Issue[]): Issue | null {
	return issues.find((i) => i.level === "error") ?? issues[0] ?? null;
}
