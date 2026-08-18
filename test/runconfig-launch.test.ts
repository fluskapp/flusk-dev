/**
 * launchConfig end to end, offline: the config file on disk (with a scripted
 * fake provider — the --fake precedent) goes through startRealRun → runCmd,
 * the live feed replays to run:end, and a session JSONL lands under the
 * scratch FLUSK_HOME — which is exactly how the Runs feed picks it up.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { saveRunConfigFile } from "../src/features/runconfig/runconfig-files.repository.js";
import { launchRunConfig } from "../src/features/runconfig/runconfig-launch.repository.js";
import { sessionsDir } from "../src/platform/paths/paths.js";
import { SLOW, writeFakeScript } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-runconfig-launch-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

test("a fake-scripted config runs to run:end and records its session", async () => {
	await writeFakeScript(join(repo, "script.json"), "echo scripted");
	saveRunConfigFile(
		repo,
		"demo",
		{ type: "task", task: "say hi", verify: false, fake: "script.json" },
		"project",
	);
	const launched = await launchRunConfig(repo, "demo");
	expect(launched.ok).toBe(true);
	if (!launched.ok) return;
	expect(launched.run.runId).toMatch(/^[0-9a-f]{8}$/);
	expect(launched.run.task).toBe("say hi");
	await launched.run.done;
	// The feed replays the whole run for a consumer that arrives late.
	const types = launched.run.feed.readSince(0).events.map((e) => e.event.type);
	expect(types[0]).toBe("run:start");
	expect(types.at(-1)).toBe("run:end");
	expect(types).toContain("tool:end");
	// The session JSONL is on disk, so /runs lists it with zero new code.
	const sessions = await readdir(sessionsDir(repo));
	expect(sessions.filter((f) => f.endsWith(".jsonl"))).toHaveLength(1);
}, SLOW);

test("abort works through the LiveRun handle the widget's Stop square uses", async () => {
	await writeFakeScript(join(repo, "script.json"), "echo scripted");
	saveRunConfigFile(
		repo,
		"demo",
		{ type: "task", task: "say hi", verify: false, fake: "script.json" },
		"project",
	);
	const launched = await launchRunConfig(repo, "demo");
	expect(launched.ok).toBe(true);
	if (!launched.ok) return;
	launched.run.abort();
	await launched.run.done;
	const types = launched.run.feed.readSince(0).events.map((e) => e.event.type);
	expect(types.at(-1)).toBe("run:end"); // the feed confesses the ending either way
}, SLOW);

test("a missing config refuses with its reason instead of starting anything", async () => {
	const launched = await launchRunConfig(repo, "nope");
	expect(launched.ok).toBe(false);
	if (launched.ok) return;
	expect(launched.why).toMatch(/ENOENT|no such file/i);
}, SLOW);

test("a hard-invalid config never starts: the red line is the refusal", async () => {
	saveRunConfigFile(repo, "empty", { type: "task" }, "project");
	expect(await launchRunConfig(repo, "empty")).toEqual({
		ok: false,
		why: "task and spec are both empty",
	});
}, SLOW);
