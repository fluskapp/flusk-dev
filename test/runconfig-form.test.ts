/**
 * The Run Configurations form's pure half: the draft ↔ JSON mapping and the
 * keystroke red-line. The mapping is asserted as a ROUND TRIP — a saved file
 * must re-open into the same form, and a defaults-only draft must write the
 * minimal file — because "the dialog rewrote my hand-written config" is the
 * bug that makes committable JSON stop being diffable.
 */
import { expect, it } from "vitest";
import {
	draftFrom,
	durationMs,
	emptyDraft,
	footerIssue,
	toConfig,
	validateDraft,
	type ConfigDraft,
	type RunConfigShape,
} from "../src/ui/react/runconfig/form-model.js";

const ROOT = "/repo/a";
const ctx = { roots: [ROOT], verifyCommands: 2 as number | null };
const okDraft = (over: Partial<ConfigDraft> = {}): ConfigDraft => ({
	...emptyDraft(),
	name: "nightly",
	task: "tighten the retry loop",
	...over,
});
const errors = (d: ConfigDraft, c = ctx) =>
	validateDraft(d, c).filter((i) => i.level === "error").map((i) => i.message);
const warns = (d: ConfigDraft, c = ctx) =>
	validateDraft(d, c).filter((i) => i.level === "warn").map((i) => i.message);

it("writes only what deviates: a defaults-only draft is {type} plus the task", () => {
	expect(toConfig(okDraft())).toEqual({ type: "task", task: "tighten the retry loop" });
});

it("round-trips the full field set through draft → config → draft", () => {
	const full: RunConfigShape = {
		type: "task", spec: "retry-hook", repo: ROOT, kind: "code",
		model: "anthropic/claude-sonnet-4-5",
		budgets: { maxCostUsd: 2, for: "45m", maxTurns: 30 },
		verify: false, isolation: { none: true, allowDirty: false, container: true },
		fake: "scripts/demo.json", tags: ["nightly", "refactor"],
	};
	const back = toConfig(draftFrom("nightly", "global", full));
	expect(back).toEqual({ ...full, isolation: { none: true, allowDirty: false, container: true } });
});

it("keeps verify:true and all-off isolation OUT of the file", () => {
	const c = toConfig(okDraft({ verify: true, isoNone: false, allowDirty: false, container: false }));
	expect(c.verify).toBeUndefined();
	expect(c.isolation).toBeUndefined();
});

it("trims and drops empties: blank budgets never materialize a budgets object", () => {
	const c = toConfig(okDraft({ model: "  ", tags: " , , ", maxCostUsd: "" }));
	expect(c.model).toBeUndefined();
	expect(c.tags).toBeUndefined();
	expect(c.budgets).toBeUndefined();
});

it("speaks the run-args duration grammar and refuses the rest", () => {
	const table: Array<[string, number | null]> = [
		["2h", 7_200_000], ["30m", 1_800_000], ["45s", 45_000], ["1h30m", 5_400_000],
		["", null], ["90", null], ["m30", null], ["1d", null],
	];
	for (const [text, ms] of table) expect(durationMs(text), text).toBe(ms);
});

it("red-lines the spec's stated hard errors", () => {
	expect(errors(okDraft({ name: "" }))).toContain("name is required — it becomes .flusk/runs/<name>.json");
	expect(errors(okDraft({ name: "a/b" }))[0]).toMatch(/file stem/);
	expect(errors(okDraft({ task: " ", spec: "" }))).toContain("task and spec are both empty");
	expect(errors(okDraft({ forDur: "soon" }))).toContain("--for must look like 2h, 30m, 45s or 1h30m");
	expect(errors(okDraft({ maxCostUsd: "-1" }))[0]).toMatch(/max-cost/);
	expect(errors(okDraft({ maxTurns: "2.5" }))[0]).toMatch(/max-turns/);
	expect(errors(okDraft({ repo: "/repo/a/nested" }))).toContain("repo is not a configured project root");
	expect(errors(okDraft({ repo: ROOT }))).toEqual([]);
});

it("ambers the verify vacuum and the scripted provider without blocking", () => {
	expect(warns(okDraft(), { roots: [ROOT], verifyCommands: 0 }))
		.toContain("repo has no verify commands — the gate would pass vacuously");
	// verify off, or commands unknown (null): no vacuous-gate warning.
	expect(warns(okDraft({ verify: false }), { roots: [ROOT], verifyCommands: 0 })).toEqual([]);
	expect(warns(okDraft())).toEqual([]);
	expect(warns(okDraft({ fake: "scripts/demo.json" }))).toContain("runs against the scripted provider");
});

it("footers ONE line: the first error beats every warning", () => {
	const issues = validateDraft(okDraft({ task: "", fake: "x.json" }), ctx);
	expect(footerIssue(issues)).toEqual({ level: "error", message: "task and spec are both empty" });
	expect(footerIssue(validateDraft(okDraft({ fake: "x.json" }), ctx))?.level).toBe("warn");
	expect(footerIssue(validateDraft(okDraft(), ctx))).toBeNull();
});
