/**
 * The Run Configurations form, pure: the draft the inputs edit and its
 * mapping to and from the `.flusk/runs/<name>.json` shape (RUNCONFIG §1).
 * No I/O and no React. The keystroke red-line half lives in form-validate.ts
 * (split at the 150-line seam) and is re-exported here so the dialog keeps
 * one import surface.
 */
export type Scope = "project" | "global";

/** The committed JSON, structurally — the spec's verbatim field set. */
export interface RunConfigShape {
	type?: string;
	task?: string;
	spec?: string;
	repo?: string;
	kind?: string;
	model?: string;
	budgets?: { maxCostUsd?: number; for?: string; maxTurns?: number };
	verify?: boolean;
	isolation?: { none?: boolean; allowDirty?: boolean; container?: boolean };
	fake?: string;
	tags?: string[];
	harness?: string;
}

/** Every field as the input renders it: strings and booleans, no undefineds. */
export interface ConfigDraft {
	name: string;
	scope: Scope;
	task: string;
	spec: string;
	repo: string;
	kind: string;
	model: string;
	maxCostUsd: string;
	forDur: string;
	maxTurns: string;
	verify: boolean;
	isoNone: boolean;
	allowDirty: boolean;
	container: boolean;
	fake: string;
	tags: string;
	harness: string;
}

export const KIND_OPTIONS = ["plan", "code", "review", "summarize"] as const;

export function emptyDraft(): ConfigDraft {
	return {
		name: "", scope: "project", task: "", spec: "", repo: "", kind: "",
		model: "", maxCostUsd: "", forDur: "", maxTurns: "",
		verify: true, isoNone: false, allowDirty: false, container: false,
		fake: "", tags: "", harness: "",
	};
}

export function draftFrom(name: string, scope: Scope, c: RunConfigShape): ConfigDraft {
	return {
		...emptyDraft(),
		name, scope,
		task: c.task ?? "", spec: c.spec ?? "", repo: c.repo ?? "",
		kind: c.kind ?? "", model: c.model ?? "", harness: c.harness ?? "",
		maxCostUsd: c.budgets?.maxCostUsd !== undefined ? String(c.budgets.maxCostUsd) : "",
		forDur: c.budgets?.for ?? "",
		maxTurns: c.budgets?.maxTurns !== undefined ? String(c.budgets.maxTurns) : "",
		verify: c.verify !== false,
		isoNone: c.isolation?.none === true,
		allowDirty: c.isolation?.allowDirty === true,
		container: c.isolation?.container === true,
		fake: c.fake ?? "", tags: (c.tags ?? []).join(", "),
	};
}

/** Empty strings vanish; defaults (verify true, isolation all-off) are not
 * written, so a dialog round-trip leaves a hand-written file unchanged. */
export function toConfig(d: ConfigDraft): RunConfigShape {
	const out: RunConfigShape = { type: "task" };
	if (d.task.trim() !== "") out.task = d.task.trim();
	if (d.spec.trim() !== "") out.spec = d.spec.trim();
	if (d.repo.trim() !== "") out.repo = d.repo.trim();
	if (d.kind.trim() !== "") out.kind = d.kind.trim();
	if (d.model.trim() !== "") out.model = d.model.trim();
	const budgets: NonNullable<RunConfigShape["budgets"]> = {};
	if (d.maxCostUsd.trim() !== "") budgets.maxCostUsd = Number(d.maxCostUsd);
	if (d.forDur.trim() !== "") budgets.for = d.forDur.trim();
	if (d.maxTurns.trim() !== "") budgets.maxTurns = Number(d.maxTurns);
	if (Object.keys(budgets).length > 0) out.budgets = budgets;
	if (!d.verify) out.verify = false;
	if (d.isoNone || d.allowDirty || d.container) {
		out.isolation = { none: d.isoNone, allowDirty: d.allowDirty, container: d.container };
	}
	if (d.fake.trim() !== "") out.fake = d.fake.trim();
	if (d.harness.trim() !== "") out.harness = d.harness.trim();
	const tags = d.tags.split(",").map((t) => t.trim()).filter((t) => t !== "");
	if (tags.length > 0) out.tags = tags;
	return out;
}

export { durationMs, footerIssue, validateDraft } from "./form-validate.js";
export type { HarnessOptionShape, Issue, ValidateCtx } from "./form-validate.js";
