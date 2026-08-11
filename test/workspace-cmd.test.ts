import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { loadWorkspace } from "../src/agent/workspace.js";
import { globalWorkspaceDir, projectWorkspaceDir } from "../src/agent/workspace-files.js";
import { workspaceCmd } from "../src/cli/workspace-cmd.js";
import { capture } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-ws-cmd-");
});
afterEach(() => teardownTestHome());

const run = (args: string[]) => {
	const cap = capture();
	const code = workspaceCmd(args, cap.out, repo);
	return { code, text: cap.text() };
};

test("init scaffolds the three files in the global workspace", () => {
	const { code, text } = run(["init"]);
	expect(code).toBe(0);
	for (const name of ["IDENTITY.md", "SOUL.md", "TOOLS.md"]) {
		expect(text).toContain(`wrote ${join(globalWorkspaceDir(), name)}`);
	}
	const ws = loadWorkspace(repo);
	expect(ws.layers.map((l) => l.kind)).toEqual(["identity", "soul", "tools"]);
});

test("the scaffolded SOUL.md carries real constraints, not a placeholder", () => {
	run(["init"]);
	const soul = loadWorkspace(repo).layers.find((l) => l.kind === "soul");
	expect(soul?.text).toContain("No secrets in output");
	expect(soul?.text).toContain("Never push to main");
	expect(soul?.text).toContain("Calibrated uncertainty");
	expect(soul?.text.length).toBeGreaterThan(200);
});

test("init is idempotent and never overwrites an edited file", async () => {
	run(["init"]);
	const soulPath = join(globalWorkspaceDir(), "SOUL.md");
	await writeFile(soulPath, "1. Only my rule.\n");

	const { code, text } = run(["init"]);
	expect(code).toBe(0);
	expect(text).toContain(`kept  ${soulPath} (already exists)`);
	expect(await readFile(soulPath, "utf8")).toBe("1. Only my rule.\n");
});

test("init --project writes into the repository's own workspace", () => {
	const { text } = run(["init", "--project"]);
	expect(text).toContain(`wrote ${join(projectWorkspaceDir(repo), "SOUL.md")}`);
	const soul = loadWorkspace(repo).layers.find((l) => l.kind === "soul");
	expect(soul?.source).toBe(join(projectWorkspaceDir(repo), "SOUL.md"));
});

test("show names every absent file and where it would go", () => {
	const { code, text } = run(["show"]);
	expect(code).toBe(0);
	expect(text).toContain("loaded: nothing");
	expect(text).toContain(`absent  ${join(globalWorkspaceDir(), "IDENTITY.md")}`);
	expect(text).toContain(`absent  ${join(projectWorkspaceDir(repo), "SOUL.md")}`);
	expect(text).toContain(`absent  ${join(repo, "AGENTS.md")}`);
});

test("show reports each loaded layer with its source and size", async () => {
	run(["init"]);
	await writeFile(join(repo, "AGENTS.md"), "tabs, not spaces\n");

	const { text } = run(["show"]);
	expect(text).toMatch(/loaded {2}soul {5}.*SOUL\.md \(\d+ chars\)/);
	expect(text).toContain(`loaded  house    ${join(repo, "AGENTS.md")} (16 chars)`);
	expect(text).toContain(`absent  ${join(repo, "CLAUDE.md")}`);
});

test("path prints the global workspace directory", () => {
	const { code, text } = run(["path"]);
	expect(code).toBe(0);
	expect(text.trim()).toBe(globalWorkspaceDir());
});

test("an unknown subcommand fails with usage", () => {
	expect(run(["nope"]).code).toBe(1);
	expect(run([]).code).toBe(1);
});
