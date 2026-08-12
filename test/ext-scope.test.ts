/**
 * Scope rules: who may run code from where, and in what order.
 * The untrusted-project case is the security boundary of the whole feature.
 */
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadExtensions } from "../src/features/extensions/load.js";
import { fluskHome } from "../src/platform/paths/paths.js";
import { toolExtension, trustProject, writeExtension } from "./ext-fixture.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

describe("extension scopes", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await setupTestHome("flusk-ext-scope-");
	});
	afterEach(() => teardownTestHome());

	it("loads global before project, alphabetically within each scope", async () => {
		await writeExtension("global", repo, "b-two.js", toolExtension("g2", "g2"));
		await writeExtension("global", repo, "a-one.js", toolExtension("g1", "g1"));
		await writeExtension("project", repo, "z-last.js", toolExtension("p2", "p2"));
		await writeExtension("project", repo, "m-mid.js", toolExtension("p1", "p1"));
		await trustProject(repo);

		const load = await loadExtensions({ repoRoot: repo });
		expect(load.extensions.map((e) => `${e.scope}:${e.name}`)).toEqual([
			"global:a-one",
			"global:b-two",
			"project:m-mid",
			"project:z-last",
		]);
		expect(load.tools.map((t) => t.name)).toEqual(["g1", "g2", "p1", "p2"]);
		expect(load.failures).toEqual([]);
	});

	it("gives a project extension the last word on a duplicated tool name", async () => {
		await writeExtension("global", repo, "dep.js", toolExtension("deploy", "global deploy"));
		await writeExtension("project", repo, "dep.js", toolExtension("deploy", "project deploy"));
		await trustProject(repo);

		const load = await loadExtensions({ repoRoot: repo });
		const outputs = await Promise.all(
			load.tools.map(async (t) => (await t.execute({}, {} as never)).output),
		);
		expect(outputs).toEqual(["global deploy", "project deploy"]);
	});

	it("does not load an untrusted project extension, and says why", async () => {
		await writeExtension("global", repo, "mine.js", toolExtension("mine", "mine"));
		await writeExtension("project", repo, "theirs.js", toolExtension("theirs", "theirs"));

		const load = await loadExtensions({ repoRoot: repo });
		expect(load.tools.map((t) => t.name)).toEqual(["mine"]);

		const skippedExt = load.extensions.find((e) => e.name === "theirs");
		expect(skippedExt).toMatchObject({ scope: "project", tools: [], flows: [], events: [] });
		expect(skippedExt?.error).toContain("not listed in");
		expect(skippedExt?.error).toContain("trusted-projects.json");
		// A refusal on purpose is not a load failure; it is still reported above.
		expect(load.failures).toEqual([]);
	});

	it("never lets a repo vouch for itself through its own files", async () => {
		await mkdir(join(repo, ".flusk"), { recursive: true });
		await mkdir(join(repo, ".flusk"), { recursive: true });
	await writeFile(join(repo, ".flusk", "config.json"), JSON.stringify({ trusted: true, extensions: true }));
		await writeFile(join(repo, ".flusk", "trusted-projects.json"), JSON.stringify([repo]));
		await writeExtension("project", repo, "theirs.js", toolExtension("theirs", "theirs"));

		const load = await loadExtensions({ repoRoot: repo });
		expect(load.tools).toEqual([]);
		expect(load.extensions[0]?.error).toContain("not listed in");
	});

	it("ignores a malformed trust file rather than trusting everything", async () => {
		await mkdir(fluskHome(), { recursive: true });
		await writeFile(join(fluskHome(), "trusted-projects.json"), "{ not json");
		await writeExtension("project", repo, "theirs.js", toolExtension("theirs", "theirs"));

		const load = await loadExtensions({ repoRoot: repo });
		expect(load.tools).toEqual([]);
	});

	it("refuses a project extension symlinked out of the repo", async () => {
		const outside = join(fluskHome(), "..", "outside.js");
		await mkdir(fluskHome(), { recursive: true });
		await writeFile(outside, toolExtension("escapee", "escaped"));
		await writeExtension("project", repo, "keep.js", toolExtension("keep", "keep"));
		await symlink(outside, join(repo, ".flusk", "extensions", "escape.js"));
		await trustProject(repo);

		const load = await loadExtensions({ repoRoot: repo });
		expect(load.tools.map((t) => t.name)).toEqual(["keep"]);
		expect(load.failures).toHaveLength(1);
		expect(load.failures[0]?.error).toContain("outside allowed roots");
	});
});
