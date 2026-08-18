/**
 * The red-line idiom as a table: every hard error and warning the dialog can
 * show, the duration grammar, and the shape rules the parser enforces.
 * Pure — no disk anywhere in this file.
 */
import { describe, expect, it } from "vitest";
import { parseRunConfig } from "../src/features/runconfig/runconfig-parse.js";
import {
	parseDuration,
	validateRunConfig,
	type ValidateCtx,
} from "../src/features/runconfig/runconfig-validate.js";
import type { RunConfig } from "../src/features/runconfig/runconfig.types.js";

const ctx = (over: Partial<ValidateCtx> = {}): ValidateCtx => ({
	repoOk: null,
	verifyCommands: null,
	...over,
});

const config = (over: Partial<RunConfig> = {}): RunConfig => ({ type: "task", task: "t", ...over });

const messages = (c: RunConfig, cx = ctx()) => validateRunConfig(c, cx).map((i) => i.message);

describe("the duration grammar", () => {
	it.each([
		["2h", 7_200_000],
		["30m", 1_800_000],
		["45s", 45_000],
		["1h30m", 5_400_000],
		["1h30m15s", 5_415_000],
	])("%s → %dms", (text, ms) => {
		expect(parseDuration(text)).toBe(ms);
	});
	it.each(["", "90x", "h", "30", "1m2h", "-5m"])("refuses %j", (text) => {
		expect(parseDuration(text)).toBeNull();
	});
});

describe("hard errors", () => {
	it("task and spec both empty", () => {
		expect(messages({ type: "task" })).toEqual(["task and spec are both empty"]);
		expect(messages({ type: "task", task: "  " })).toEqual(["task and spec are both empty"]);
	});
	it("task and spec both set", () => {
		expect(messages(config({ spec: "retry-hook" }))).toEqual([
			"task and spec are both set — the spec IS the task",
		]);
	});
	it("bad duration, spec-verbatim message", () => {
		expect(messages(config({ budgets: { for: "90x" } }))).toEqual([
			"--for must look like 2h, 30m, 45s or 1h30m",
		]);
	});
	it("unconfigured repo", () => {
		expect(messages(config({ repo: "/nope" }), ctx({ repoOk: false }))).toEqual([
			"repo is not a configured project root",
		]);
	});
	it("budgets and model shape", () => {
		expect(messages(config({ budgets: { maxCostUsd: 0 } }))).toEqual([
			"budgets.maxCostUsd must be a positive number of dollars",
		]);
		expect(messages(config({ budgets: { maxTurns: 2.5 } }))).toEqual([
			"budgets.maxTurns must be a positive integer",
		]);
		expect(messages(config({ model: "sonnet" }))).toEqual(['model must look like "provider/id"']);
	});
});

describe("warnings block nothing", () => {
	it("no verify commands → amber, not red", () => {
		const issues = validateRunConfig(config(), ctx({ verifyCommands: [] }));
		expect(issues).toEqual([
			{ level: "warning", message: "repo has no verify commands — the gate would pass vacuously" },
		]);
	});
	it("verify: false silences the probe; commands silence it too", () => {
		expect(validateRunConfig(config({ verify: false }), ctx({ verifyCommands: [] }))).toEqual([]);
		expect(validateRunConfig(config(), ctx({ verifyCommands: ["npm test"] }))).toEqual([]);
	});
	it("a fake config confesses the scripted provider", () => {
		expect(validateRunConfig(config({ fake: "demo.json" }), ctx())).toEqual([
			{ level: "warning", message: "runs against the scripted provider" },
		]);
	});
	it("a well-formed config raises nothing", () => {
		expect(messages(config({ budgets: { maxCostUsd: 2, for: "45m", maxTurns: 30 } }))).toEqual([]);
	});
});

describe("the parser refuses drift with a reason", () => {
	it("accepts the schema example shape", () => {
		const r = parseRunConfig({
			type: "task",
			spec: "retry-hook",
			kind: "code",
			model: "anthropic/claude-sonnet-4-5",
			budgets: { maxCostUsd: 2, for: "45m", maxTurns: 30 },
			verify: true,
			isolation: { none: false, allowDirty: false, container: false },
			tags: ["nightly"],
		});
		expect(r.ok).toBe(true);
	});
	it.each([
		[{ type: "task", task: "x", retries: 3 }, 'unknown key "retries"'],
		[{ type: "goal", task: "x" }, 'type must be "task"'],
		[{ type: "task", task: 3 }, '"task" must be a string'],
		[{ type: "task", kind: "ship" }, '"kind" must be plan, code, review or summarize'],
		[{ type: "task", budgets: { hours: 2 } }, 'unknown key "budgets.hours"'],
		[{ type: "task", budgets: { maxTurns: "30" } }, '"budgets.maxTurns" must be a number'],
		[{ type: "task", isolation: { none: "yes" } }, '"isolation.none" must be a boolean'],
		[{ type: "task", tags: [1] }, '"tags" must be an array of strings'],
		[[], "not a JSON object"],
	])("refuses %j", (raw, why) => {
		expect(parseRunConfig(raw)).toEqual({ ok: false, why });
	});
});
