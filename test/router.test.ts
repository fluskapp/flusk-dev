import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { TaskKind } from "../src/config/types.js";
import { classifyTask } from "../src/provider/intent.js";
import { hasAuth, resolveModelRef } from "../src/provider/pi-ai.js";
import { chooseModel } from "../src/provider/router.js";
import {
	bestFor,
	loadScores,
	nudge,
	saveScores,
	scoresPath,
	type Scores,
} from "../src/provider/scores.js";
import { teardownTestHome } from "./helpers.js";

describe("resolveModelRef (real catalog, offline)", () => {
	it("resolves known anthropic models", () => {
		const sonnet = resolveModelRef({ provider: "anthropic", id: "claude-sonnet-5" });
		expect(sonnet).toMatchObject({ provider: "anthropic", id: "claude-sonnet-5" });
		expect(sonnet.contextWindow).toBeGreaterThan(0);
		const haiku = resolveModelRef({ provider: "anthropic", id: "claude-haiku-4-5" });
		expect(haiku.contextWindow).toBeGreaterThan(0);
	});

	it("throws on unknown ids, listing available ones", () => {
		expect(() => resolveModelRef({ provider: "anthropic", id: "gpt-999" })).toThrow(
			/anthropic\/gpt-999.*claude-/s,
		);
	});

	it("throws on unknown providers", () => {
		expect(() => resolveModelRef({ provider: "no-such", id: "x" })).toThrow(/no-such/);
	});
});

describe("hasAuth", () => {
	it("returns false for an unknown provider without throwing", async () => {
		await expect(hasAuth("no-such-provider")).resolves.toBe(false);
	});
});

describe("classifyTask", () => {
	const table: Array<[string, TaskKind]> = [
		["Review the open PR for regressions", "review"],
		["please audit the auth module", "review"],
		["Plan the migration to ESM", "plan"],
		["design a caching architecture", "plan"],
		["Write a spec for the new API", "plan"],
		["Summarize what this repo does", "summarize"],
		["explain the session store", "summarize"],
		["describe the event bus", "summarize"],
		["fix the flaky test in loop.ts", "code"],
		["add a --json flag to the CLI", "code"],
	];
	for (const [task, kind] of table) {
		it(`classifies "${task}" as ${kind}`, () => {
			expect(classifyTask(task)).toBe(kind);
		});
	}
});

describe("scores", () => {
	beforeEach(async () => {
		const tmp = await mkdtemp(join(tmpdir(), "hit-scores-"));
		process.env.HIT_HOME = join(tmp, "home");
	});
	afterEach(() => teardownTestHome());

	it("loads empty scores when no file exists", async () => {
		await expect(loadScores()).resolves.toEqual({});
	});

	it("nudges up +0.05 and down -0.10 from the 0.5 start", async () => {
		let scores = await nudge("code", "anthropic/claude-sonnet-5", true);
		expect(scores.code?.["anthropic/claude-sonnet-5"]).toBeCloseTo(0.55);
		scores = await nudge("code", "anthropic/claude-sonnet-5", false);
		expect(scores.code?.["anthropic/claude-sonnet-5"]).toBeCloseTo(0.45);
	});

	it("clamps to [0.05, 1] and persists to benchmarks.json", async () => {
		await saveScores({ code: { "a/x": 0.98, "a/y": 0.07 } });
		const up = await nudge("code", "a/x", true);
		expect(up.code?.["a/x"]).toBe(1);
		const down = await nudge("code", "a/y", false);
		expect(down.code?.["a/y"]).toBe(0.05);
		const onDisk = JSON.parse(await readFile(scoresPath(), "utf8")) as Scores;
		expect(onDisk.code?.["a/y"]).toBe(0.05);
	});

	it("bestFor picks the highest score, null when empty", () => {
		const scores: Scores = { code: { "a/x": 0.4, "a/y": 0.9, "a/z": 0.6 } };
		expect(bestFor("code", scores)).toBe("a/y");
		expect(bestFor("review", scores)).toBeNull();
		expect(bestFor("code", {})).toBeNull();
	});
});

describe("chooseModel", () => {
	it("uses the configured model when no scores are given", () => {
		const { ref, choice } = chooseModel(DEFAULT_CONFIG, "code");
		expect(choice).toEqual({ provider: "anthropic", id: "claude-sonnet-5" });
		expect(ref.id).toBe("claude-sonnet-5");
		const sum = chooseModel(DEFAULT_CONFIG, "summarize");
		expect(sum.ref.id).toBe("claude-haiku-4-5");
	});

	it("prefers a resolvable benchmarks winner", () => {
		const scores: Scores = { code: { "anthropic/claude-haiku-4-5": 0.9 } };
		const { ref, choice } = chooseModel(DEFAULT_CONFIG, "code", scores);
		expect(choice).toEqual({ provider: "anthropic", id: "claude-haiku-4-5" });
		expect(ref.id).toBe("claude-haiku-4-5");
	});

	it("falls back to config when the winner is unresolvable", () => {
		const scores: Scores = { code: { "bogus/never-heard-of-it": 0.99 } };
		const { ref } = chooseModel(DEFAULT_CONFIG, "code", scores);
		expect(ref.id).toBe("claude-sonnet-5");
	});

	it("ignores winners for other kinds", () => {
		const scores: Scores = { review: { "anthropic/claude-haiku-4-5": 0.9 } };
		const { ref } = chooseModel(DEFAULT_CONFIG, "code", scores);
		expect(ref.id).toBe("claude-sonnet-5");
	});

	it("throws when the configured model itself is unknown", () => {
		const cfg = structuredClone(DEFAULT_CONFIG);
		cfg.models.code = { provider: "anthropic", id: "claude-imaginary-9" };
		expect(() => chooseModel(cfg, "code")).toThrow(/claude-imaginary-9/);
	});
});
