import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { AhConfig } from "../src/config/types.js";
import type { Usage } from "../src/core/types.js";
import { BudgetTracker } from "../src/safety/budget.js";
import { createAhPolicy } from "../src/safety/ah-policy.js";

let repo: string;
let outside: string;

beforeAll(() => {
	const tmp = mkdtempSync(join(tmpdir(), "ah-policy-"));
	repo = join(tmp, "repo");
	outside = join(tmp, "outside");
	mkdirSync(repo, { recursive: true });
	mkdirSync(outside, { recursive: true });
	writeFileSync(join(outside, "data.txt"), "secret");
	symlinkSync(outside, join(repo, "sneaky-link"));
});

function config(onUnknownCommand: "deny" | "allow"): AhConfig {
	const model = { provider: "fake", id: "fake-1" };
	return {
		models: { plan: model, code: model, review: model, summarize: model },
		budgets: { maxTurns: 10, maxCostUsd: 5, deadlineMinutes: null },
		unattended: { onUnknownCommand },
		isolation: { requireGit: true, branchPrefix: "ah/" },
		compaction: { reserveTokens: 4000, keepRecentTokens: 8000 },
		memory: {
			enabled: false,
			baseUrl: "http://127.0.0.1:7777",
			apiKey: null,
			autoSpawn: false,
			serverBin: null,
			dataDir: null,
			budgets: { repo: 2000, lessons: 1000 },
		},
		verify: { retries: 3, evidenceLines: 40 },
		ui: { harnessDirs: [], projectDirs: [] },
		chat: { backends: [] },
		doc: { enabled: true, servers: [], maxFiles: 50 },
		watch: {
			queues: [],
			maxRunsPerNight: 10,
			maxCostUsdPerRun: 2,
			maxRunMinutes: 30,
			pollIntervalMinutes: 10,
			cooldownHours: 4,
			failCooldownHours: 8,
			push: false,
		},
	};
}

const usage = (costUsd: number): Usage => ({ input: 10, output: 5, cacheRead: 0, costUsd });

describe("BudgetTracker", () => {
	it("accumulates cost and trips the budget at >= max", () => {
		const t = new BudgetTracker({ maxCostUsd: 1, deadlineMs: null }, 0);
		t.record(usage(0.4));
		expect(t.spentUsd()).toBeCloseTo(0.4);
		expect(t.breach(1_000)).toBeNull();
		t.record(usage(0.6));
		expect(t.spentUsd()).toBeCloseTo(1.0);
		expect(t.breach(1_000)).toBe("budget");
	});

	it("trips the deadline at >= startMs + deadlineMs", () => {
		const t = new BudgetTracker({ maxCostUsd: 100, deadlineMs: 60_000 }, 5_000);
		expect(t.breach(64_999)).toBeNull();
		expect(t.breach(65_000)).toBe("deadline");
	});

	it("null deadline never trips", () => {
		const t = new BudgetTracker({ maxCostUsd: 100, deadlineMs: null }, 0);
		expect(t.breach(Number.MAX_SAFE_INTEGER)).toBeNull();
	});

	it("budget wins when both limits are breached", () => {
		const t = new BudgetTracker({ maxCostUsd: 1, deadlineMs: 1 }, 0);
		t.record(usage(2));
		expect(t.breach(10)).toBe("budget");
	});
});

describe("createAhPolicy", () => {
	it("denies denied bash commands with the classifier's reason", () => {
		const d = createAhPolicy({ config: config("deny"), repoRoot: repo }).decide({
			kind: "bash",
			command: "sudo rm -rf /",
		});
		expect(d).toMatchObject({ allow: false });
		if (!d.allow) expect(d.reason).toContain("sudo");
	});

	it("routes unknown commands through unattended.onUnknownCommand", () => {
		const cmd = { kind: "bash", command: "frobnicate --now" } as const;
		const denyPolicy = createAhPolicy({ config: config("deny"), repoRoot: repo });
		expect(denyPolicy.decide(cmd).allow).toBe(false);
		const allowPolicy = createAhPolicy({ config: config("allow"), repoRoot: repo });
		expect(allowPolicy.decide(cmd).allow).toBe(true);
	});

	it("allows read and write classed commands", () => {
		const p = createAhPolicy({ config: config("deny"), repoRoot: repo });
		expect(p.decide({ kind: "bash", command: "ls -la" }).allow).toBe(true);
		expect(p.decide({ kind: "bash", command: "npm test" }).allow).toBe(true);
	});

	it("jails file writes to the repo and extra roots", () => {
		const p = createAhPolicy({ config: config("deny"), repoRoot: repo });
		expect(p.decide({ kind: "fileWrite", path: "src/index.ts" }).allow).toBe(true);
		expect(p.decide({ kind: "fileWrite", path: "../outside/x.txt" }).allow).toBe(false);
		expect(p.decide({ kind: "fileWrite", path: "sneaky-link/x.txt" }).allow).toBe(false);
		const withExtra = createAhPolicy({
			config: config("deny"),
			repoRoot: repo,
			extraWriteRoots: [outside],
		});
		expect(withExtra.decide({ kind: "fileWrite", path: join(outside, "y.txt") }).allow).toBe(
			true,
		);
		expect(withExtra.decide({ kind: "fileWrite", path: "sneaky-link/y.txt" }).allow).toBe(true);
	});

	it("caps subagent depth at 2", () => {
		const p = createAhPolicy({ config: config("deny"), repoRoot: repo });
		expect(p.decide({ kind: "subagent", depth: 0 }).allow).toBe(true);
		expect(p.decide({ kind: "subagent", depth: 1 }).allow).toBe(true);
		expect(p.decide({ kind: "subagent", depth: 2 }).allow).toBe(false);
		expect(p.decide({ kind: "subagent", depth: 5 }).allow).toBe(false);
	});
});
