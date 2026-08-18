/**
 * Config → runCmd options: every field lands exactly where the CLI flag
 * would put it, so a config run and the identical shell invocation are the
 * same runCmd call (acceptance 2c and 4).
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toRunCmdOpts } from "../src/features/runconfig/runconfig-opts.js";

const repo = "/tmp/repo";

describe("toRunCmdOpts", () => {
	it("maps budgets, verify and isolation to the CLI's vocabulary", () => {
		expect(
			toRunCmdOpts(
				{
					type: "task",
					task: "tighten the retry loop",
					kind: "code",
					model: "anthropic/claude-sonnet-4-5",
					budgets: { maxCostUsd: 2, for: "45m", maxTurns: 30 },
					verify: false,
					isolation: { none: true, allowDirty: true, container: true },
				},
				repo,
			),
		).toEqual({
			task: "tighten the retry loop",
			repoRoot: repo,
			kind: "code",
			model: "anthropic/claude-sonnet-4-5",
			maxCostUsd: 2,
			deadlineMs: 45 * 60_000,
			maxTurns: 30,
			noVerify: true,
			noIsolation: true,
			allowDirty: true,
			container: true,
		});
	});
	it("a minimal config adds no flags: runCmd keeps every default", () => {
		expect(toRunCmdOpts({ type: "task", task: "t" }, repo)).toEqual({ task: "t", repoRoot: repo });
	});
	it("a spec config passes the spec through; the task is a label until resolveSpecRun composes it", () => {
		const opts = toRunCmdOpts({ type: "task", spec: "retry-hook" }, repo);
		expect(opts.spec).toBe("retry-hook");
		expect(opts.task).toBe("(spec: retry-hook)");
	});
	it("resolves a relative fake script against the config's repo, not the server's cwd", () => {
		expect(toRunCmdOpts({ type: "task", task: "t", fake: "scripts/demo.json" }, repo).fake).toBe(
			join(repo, "scripts/demo.json"),
		);
		expect(toRunCmdOpts({ type: "task", task: "t", fake: "/abs/demo.json" }, repo).fake).toBe(
			"/abs/demo.json",
		);
	});
	it("verify defaults on: only an explicit false becomes --no-verify", () => {
		expect(toRunCmdOpts({ type: "task", task: "t", verify: true }, repo).noVerify).toBeUndefined();
		expect(toRunCmdOpts({ type: "task", task: "t" }, repo).noVerify).toBeUndefined();
	});
});
