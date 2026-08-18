/**
 * The dry preview: the composed plan — kind, model, tools, isolation, the
 * exact system prompt — captured for the dialog, with nothing started and
 * nothing written.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { saveRunConfigFile } from "../src/features/runconfig/runconfig-files.repository.js";
import { dryRunConfig } from "../src/features/runconfig/runconfig-launch.repository.js";
import { SPEC_DIR } from "../src/features/specs/spec.types.js";
import { sessionsDir } from "../src/platform/paths/paths.js";
import { SLOW, writeFakeScript } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-runconfig-dry-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

test("the plan names kind, model, tools and the isolation branch; nothing runs", async () => {
	await writeFakeScript(join(repo, "script.json"), "echo scripted");
	saveRunConfigFile(
		repo,
		"demo",
		{ type: "task", task: "say hi", kind: "review", fake: "script.json" },
		"project",
	);
	const dry = await dryRunConfig(repo, "demo");
	expect(dry.ok).toBe(true);
	if (!dry.ok) return;
	expect(dry.plan).toContain("kind: review");
	expect(dry.plan).toContain("model: fake/fake-1"); // a fake config plans the fake model
	expect(dry.plan).toMatch(/^tools: .*bash/m);
	expect(dry.plan).toContain("isolation: off (not a git repository)");
	expect(dry.plan).toContain("--- system prompt ---");
	// Nothing started: no session was ever opened for this repo.
	expect(existsSync(sessionsDir(repo))).toBe(false);
}, SLOW);

test("a spec config composes its plan from the spec file at preview time", async () => {
	await mkdir(join(repo, SPEC_DIR), { recursive: true });
	await writeFile(
		join(repo, SPEC_DIR, "retry-hook.md"),
		"---\ntitle: Ship the retry hook\nstatus: planned\nmode: refactor\nacceptance:\n" +
			"  - retries with backoff\n---\n\nThe dispatcher gives up on the first failure.\n",
	);
	await writeFakeScript(join(repo, "script.json"), "echo scripted");
	saveRunConfigFile(
		repo,
		"from-spec",
		{ type: "task", spec: "retry-hook", fake: "script.json" },
		"project",
	);
	const dry = await dryRunConfig(repo, "from-spec");
	expect(dry.ok).toBe(true);
	if (!dry.ok) return;
	expect(dry.plan).toContain("kind: code"); // MODE_KIND.refactor, not the classifier
}, SLOW);

test("a missing spec refuses the preview with the CLI's own reason", async () => {
	saveRunConfigFile(repo, "ghost", { type: "task", spec: "nope" }, "project");
	const dry = await dryRunConfig(repo, "ghost");
	expect(dry.ok).toBe(false);
	if (dry.ok) return;
	expect(dry.why).toMatch(/spec "nope"/);
}, SLOW);
