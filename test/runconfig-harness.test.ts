/**
 * The `harness` field on the run-config wire: parse accepts it (unknown keys
 * are still refused), the validator's harness matrix, the form-model round
 * trip, the `via <id>` option label, and proof the native path never sees
 * the field (toRunCmdOpts untouched).
 */
import { expect, it } from "vitest";
import { parseRunConfig } from "../src/features/runconfig/runconfig-parse.js";
import { toRunCmdOpts } from "../src/features/runconfig/runconfig-opts.js";
import { validateRunConfig, type ValidateCtx } from "../src/features/runconfig/runconfig-validate.js";
import type { RunConfig } from "../src/features/runconfig/runconfig.types.js";
import { draftFrom, toConfig, type RunConfigShape } from "../src/ui/react/runconfig/form-model.js";
import { optionLabel } from "../src/ui/react/runconfig/widget-model.js";

const config = (over: Partial<RunConfig> = {}): RunConfig => ({ type: "task", task: "t", ...over });
const ctx = (harness: ValidateCtx["harness"] = null): ValidateCtx => ({
	repoOk: null,
	verifyCommands: null,
	harness,
});
const issues = (c: RunConfig, cx = ctx()) => validateRunConfig(c, cx);
const errors = (c: RunConfig, cx = ctx()) =>
	issues(c, cx).filter((i) => i.level === "error").map((i) => i.message);
const warns = (c: RunConfig, cx = ctx()) =>
	issues(c, cx).filter((i) => i.level === "warning").map((i) => i.message);

it("parses harness as a string and still refuses unknown keys", () => {
	const parsed = parseRunConfig({ type: "task", task: "x", harness: "claude-code" });
	expect(parsed.ok && parsed.config.harness).toBe("claude-code");
	expect(parseRunConfig({ type: "task", task: "x", harness: 3 })).toEqual({
		ok: false,
		why: '"harness" must be a string',
	});
	expect(parseRunConfig({ type: "task", task: "x", harnesses: "y" })).toEqual({
		ok: false,
		why: 'unknown key "harnesses"',
	});
});

it("red-lines an unknown or unavailable harness id when probed; null never blocks", () => {
	expect(errors(config({ harness: "ghost" }), ctx({ known: false, available: false })))
		.toContain('harness "ghost" is not a configured harness');
	expect(errors(config({ harness: "evil" }), ctx({ known: true, available: false, note: "project harness — repo not trusted" })))
		.toContain("project harness — repo not trusted");
	expect(issues(config({ harness: "maybe" }), ctx(null))).toEqual([]);
	expect(issues(config({ harness: "maybe" }), { repoOk: null, verifyCommands: null })).toEqual([]);
});

it("refuses fake and container with a harness; native skips the whole matrix", () => {
	expect(errors(config({ harness: "cc", fake: "demo.json" })))
		.toContain("fake scripts the native provider — not a foreign harness");
	expect(errors(config({ harness: "cc", isolation: { container: true } })))
		.toContain("container execution applies to the native loop only");
	expect(errors(config({ harness: "native", fake: "demo.json" }))).toEqual([]);
});

it("ambers model and turn/cost budgets on a harness without blocking", () => {
	expect(warns(config({ harness: "cc", model: "anthropic/claude-sonnet-4-5" })))
		.toContain("model is ignored — a harness chooses its model in its own args");
	expect(warns(config({ harness: "cc", budgets: { maxTurns: 5 } })))
		.toContain("turn/cost budgets are not enforceable on an external harness");
	expect(warns(config({ harness: "cc", budgets: { maxCostUsd: 2 } })))
		.toContain("turn/cost budgets are not enforceable on an external harness");
	expect(errors(config({ harness: "cc", budgets: { maxTurns: 5 } }))).toEqual([]);
});

it("round-trips a harness-bearing file through the form unchanged", () => {
	const full: RunConfigShape = { type: "task", task: "t", harness: "claude-code" };
	expect(toConfig(draftFrom("nightly", "project", full))).toEqual(full);
	// No harness in the file → none materializes on save.
	expect(toConfig(draftFrom("plain", "project", { type: "task", task: "t" }))).toEqual({
		type: "task",
		task: "t",
	});
});

it("labels a config plainly, or `· via <id>` when a harness is set", () => {
	expect(optionLabel({ name: "nightly" })).toBe("nightly");
	expect(optionLabel({ name: "nightly", harness: "claude-code" })).toBe("nightly · via claude-code");
	expect(optionLabel({ name: "nightly", harness: "" })).toBe("nightly");
});

it("keeps toRunCmdOpts byte-for-byte harness-blind — the native path proof", () => {
	const withHarness = toRunCmdOpts(config({ harness: "claude-code" }), "/repo");
	const without = toRunCmdOpts(config(), "/repo");
	expect(withHarness).toEqual(without);
	expect("harness" in withHarness).toBe(false);
});
