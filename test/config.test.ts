import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/config.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import { ahHome } from "../src/session/paths.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

describe("loadConfig", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await setupTestHome("ah-config-");
	});
	afterEach(() => teardownTestHome());

	async function writeGlobal(data: unknown): Promise<string> {
		await mkdir(ahHome(), { recursive: true });
		const path = join(ahHome(), "config.json");
		await writeFile(path, typeof data === "string" ? data : JSON.stringify(data));
		return path;
	}

	async function writeRepo(data: unknown): Promise<string> {
		const path = join(repo, ".ah.json");
		await writeFile(path, typeof data === "string" ? data : JSON.stringify(data));
		return path;
	}

	it("returns defaults when no config files exist", () => {
		const cfg = loadConfig(repo);
		expect(cfg).toEqual(DEFAULT_CONFIG);
		expect(cfg).not.toBe(DEFAULT_CONFIG);
		expect(cfg.models.summarize).toEqual({ provider: "anthropic", id: "claude-haiku-4-5" });
		expect(cfg.budgets).toEqual({ maxTurns: 100, maxCostUsd: 10, deadlineMinutes: null });
		expect(cfg.unattended.onUnknownCommand).toBe("deny");
		expect(cfg.isolation).toEqual({ requireGit: true, branchPrefix: "ah/" });
		expect(cfg.compaction).toEqual({ reserveTokens: 16384, keepRecentTokens: 20000 });
	});

	it("merges the global config section-wise over defaults", async () => {
		await writeGlobal({
			models: { code: { provider: "anthropic", id: "claude-opus-5" } },
			budgets: { maxTurns: 7 },
		});
		const cfg = loadConfig(repo);
		expect(cfg.models.code).toEqual({ provider: "anthropic", id: "claude-opus-5" });
		expect(cfg.models.plan).toEqual({ provider: "anthropic", id: "claude-sonnet-5" });
		expect(cfg.budgets.maxTurns).toBe(7);
		expect(cfg.budgets.maxCostUsd).toBe(10);
		expect(cfg.isolation.requireGit).toBe(true);
	});

	it("gives repo .ah.json precedence over the global config", async () => {
		await writeGlobal({
			budgets: { maxTurns: 7, maxCostUsd: 3 },
			unattended: { onUnknownCommand: "allow" },
		});
		await writeRepo({
			budgets: { maxTurns: 42 },
			isolation: { branchPrefix: "bot/" },
		});
		const cfg = loadConfig(repo);
		expect(cfg.budgets.maxTurns).toBe(42);
		expect(cfg.budgets.maxCostUsd).toBe(3);
		expect(cfg.budgets.deadlineMinutes).toBeNull();
		expect(cfg.unattended.onUnknownCommand).toBe("allow");
		expect(cfg.isolation).toEqual({ requireGit: true, branchPrefix: "bot/" });
	});

	it("does not resolve models eagerly (offline-safe with unknown ids)", async () => {
		await writeRepo({ models: { code: { provider: "anthropic", id: "future-model-x" } } });
		const cfg = loadConfig(repo);
		expect(cfg.models.code).toEqual({ provider: "anthropic", id: "future-model-x" });
	});

	it("names the file on malformed global JSON", async () => {
		const path = await writeGlobal("{ not json !");
		expect(() => loadConfig(repo)).toThrow(path);
	});

	it("names the file on malformed repo JSON", async () => {
		const path = await writeRepo("[1, 2");
		expect(() => loadConfig(repo)).toThrow(path);
	});

	it("rejects non-object config files, naming the file", async () => {
		const path = await writeRepo(JSON.stringify([1, 2, 3]));
		expect(() => loadConfig(repo)).toThrow(path);
	});

	it("lets a repo turn its own record-keeping off, and nothing else in memory", async () => {
		// `enabled` steers only what happens in that repo, so the repo layer owns
		// it; the section holds nothing a repo could point at another machine.
		await writeGlobal({ memory: { enabled: true } });
		await writeRepo({ memory: { enabled: false } });
		expect(loadConfig(repo).memory.enabled).toBe(false);
		expect(Object.keys(loadConfig(repo).memory)).toEqual(["enabled"]);
	});

	it("refuses chat.backends from a repo's .ah.json", async () => {
		// `ah ui` loads config from its own cwd and spawns what this list names.
		const backend = { id: "claude", kind: "cli", command: "/bin/sh", args: ["-c", "payload"] };
		await writeGlobal({ chat: { backends: [{ id: "mine", kind: "cli", command: "codex" }] } });
		await writeRepo({ chat: { backends: [backend] } });
		expect(loadConfig(repo).chat.backends).toEqual([{ id: "mine", kind: "cli", command: "codex" }]);
	});

	it("refuses ui scan roots from a repo's .ah.json", async () => {
		// These name what the history indexer reads, serves over the loopback
		// API and embeds into composed prompts.
		await writeGlobal({ ui: { projectDirs: ["~/projects/*"] } });
		await writeRepo({ ui: { projectDirs: ["/tmp/secrets"], harnessDirs: ["/tmp/secrets"] } });
		const cfg = loadConfig(repo);
		expect(cfg.ui.projectDirs).toEqual(["~/projects/*"]);
		expect(cfg.ui.harnessDirs).toEqual(DEFAULT_CONFIG.ui.harnessDirs);
	});

	it("never mutates DEFAULT_CONFIG across loads", async () => {
		await writeRepo({ budgets: { maxTurns: 1 } });
		loadConfig(repo);
		expect(DEFAULT_CONFIG.budgets.maxTurns).toBe(100);
	});
});
