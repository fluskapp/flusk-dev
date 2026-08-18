/**
 * The .flusk/runs storage: the project dir shadows ~/.flusk/runs by name (the
 * workspace-layer precedent), a broken file is skipped WITH its reason, and a
 * saved config round-trips through JSON unchanged.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
	deleteRunConfigFile,
	globalRunDir,
	projectRunDir,
	readRunConfig,
	saveRunConfigFile,
	scanRunConfigs,
} from "../src/features/runconfig/runconfig-files.repository.js";
import { RUN_DIR, type RunConfig } from "../src/features/runconfig/runconfig.types.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-runconfig-");
	await mkdir(projectRunDir(repo), { recursive: true });
	await mkdir(globalRunDir(), { recursive: true });
});
afterEach(() => teardownTestHome());

const config = (over: Partial<RunConfig> = {}): RunConfig => ({
	type: "task",
	task: "tighten the retry loop",
	...over,
});

const write = (dir: string, name: string, data: unknown) =>
	writeFile(join(dir, `${name}.json`), typeof data === "string" ? data : JSON.stringify(data));

test("project shadows global by name; scopes and paths are truthful", async () => {
	await write(globalRunDir(), "fix-ci", config({ task: "the global one" }));
	await write(globalRunDir(), "nightly", config({ task: "nightly global" }));
	await write(projectRunDir(repo), "fix-ci", config({ task: "the project one" }));
	const scan = scanRunConfigs(repo);
	expect(scan.skipped).toEqual([]);
	expect(scan.configs.map((c) => [c.name, c.scope, c.task])).toEqual([
		["fix-ci", "project", "the project one"],
		["nightly", "global", "nightly global"],
	]);
	expect(scan.configs[0]?.path).toBe(`${RUN_DIR}/fix-ci.json`);
	expect(scan.configs[1]?.path).toBe(join(globalRunDir(), "nightly.json"));
});

test("bad JSON, unknown keys and future types are skipped with a why, never dropped", async () => {
	await write(projectRunDir(repo), "broken", "{ not json");
	await write(projectRunDir(repo), "future", { type: "task", task: "x", retries: 3 });
	await write(projectRunDir(repo), "goal", { type: "goal", task: "x" });
	await write(projectRunDir(repo), "good", config());
	const scan = scanRunConfigs(repo);
	expect(scan.configs.map((c) => c.name)).toEqual(["good"]);
	const whys = Object.fromEntries(scan.skipped.map((s) => [s.path, s.why]));
	expect(whys[`${RUN_DIR}/future.json`]).toBe('unknown key "retries"');
	expect(whys[`${RUN_DIR}/goal.json`]).toBe('type must be "task"');
	expect(whys[`${RUN_DIR}/broken.json`]).toMatch(/JSON|Unexpected/i);
});

test("save → read round-trips every field; delete uncovers the shadowed global", async () => {
	const full = config({
		kind: "code",
		model: "anthropic/claude-sonnet-4-5",
		budgets: { maxCostUsd: 2, for: "45m", maxTurns: 30 },
		verify: true,
		isolation: { none: false, allowDirty: false, container: false },
		tags: ["nightly", "refactor"],
	});
	await write(globalRunDir(), "nightly", config({ task: "the global one" }));
	expect(saveRunConfigFile(repo, "nightly", full, "project")).toBe(`${RUN_DIR}/nightly.json`);
	const read = readRunConfig(repo, "nightly");
	expect(read.ok && read.meta).toMatchObject(full);
	expect(deleteRunConfigFile(repo, "nightly", "project")).toBe(true);
	const uncovered = readRunConfig(repo, "nightly");
	expect(uncovered.ok && uncovered.meta.task).toBe("the global one");
	expect(uncovered.ok && uncovered.meta.scope).toBe("global");
	expect(deleteRunConfigFile(repo, "nightly", "project")).toBe(false); // already gone
});

test("a broken project file refuses the name rather than silently running the global", async () => {
	await write(globalRunDir(), "demo", config());
	await write(projectRunDir(repo), "demo", "{ nope");
	expect(readRunConfig(repo, "demo").ok).toBe(false);
});

test("a path is not a name: traversal is refused on read and write", async () => {
	expect(readRunConfig(repo, "../evil").ok).toBe(false);
	expect(() => saveRunConfigFile(repo, "a/b", config(), "project")).toThrow(/letters, digits/);
});
