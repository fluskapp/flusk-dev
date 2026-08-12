import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { loadWorkspace } from "../src/features/workspace/workspace.js";
import { globalWorkspaceDir, projectWorkspaceDir } from "../src/features/workspace/workspace-files.repository.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-workspace-");
});
afterEach(() => teardownTestHome());

async function write(dir: string, name: string, body: string): Promise<string> {
	await mkdir(dir, { recursive: true });
	const path = join(dir, name);
	await writeFile(path, body);
	return path;
}

const globalFile = (name: string, body: string) => write(globalWorkspaceDir(), name, body);
const projectFile = (name: string, body: string) => write(projectWorkspaceDir(repo), name, body);

test("an absent workspace loads nothing and reports nothing", () => {
	const ws = loadWorkspace(repo);
	expect(ws.layers).toEqual([]);
	expect(ws.notes).toEqual([]);
});

test("the project workspace overrides the global file of the same kind", async () => {
	await globalFile("SOUL.md", "global soul");
	await globalFile("IDENTITY.md", "global identity");
	const projectSoul = await projectFile("SOUL.md", "project soul");

	const ws = loadWorkspace(repo);
	const soul = ws.layers.filter((l) => l.kind === "soul");
	expect(soul).toHaveLength(1);
	expect(soul[0]?.text).toBe("project soul");
	expect(soul[0]?.source).toBe(projectSoul);
	// The kind the project did not override still comes from the global layer.
	expect(ws.layers.find((l) => l.kind === "identity")?.text).toBe("global identity");
});

test("AGENTS.md comes before CLAUDE.md and both load when both exist", async () => {
	await writeFile(join(repo, "CLAUDE.md"), "claude rules");
	await writeFile(join(repo, "AGENTS.md"), "agents rules");

	const house = loadWorkspace(repo).layers.filter((l) => l.kind === "house");
	expect(house.map((l) => l.text)).toEqual(["agents rules", "claude rules"]);
});

test("only AGENTS.md is loaded when it is the only house-rules file", async () => {
	await writeFile(join(repo, "AGENTS.md"), "agents rules");
	const house = loadWorkspace(repo).layers.filter((l) => l.kind === "house");
	expect(house).toHaveLength(1);
	expect(house[0]?.source).toBe(join(repo, "AGENTS.md"));
});

test("layers appear in prompt order: identity, soul, house, tools", async () => {
	await globalFile("TOOLS.md", "tools");
	await globalFile("IDENTITY.md", "identity");
	await globalFile("SOUL.md", "soul");
	await writeFile(join(repo, "AGENTS.md"), "house");

	expect(loadWorkspace(repo).layers.map((l) => l.kind)).toEqual([
		"identity",
		"soul",
		"house",
		"tools",
	]);
});

test("a secret pasted into a workspace file is redacted before it reaches a layer", async () => {
	await globalFile("IDENTITY.md", "deploy with token ghp_abcdefghijklmnop0123456789 please");

	const identity = loadWorkspace(repo).layers[0];
	expect(identity?.text).not.toContain("ghp_abcdefghijklmnop0123456789");
	expect(identity?.text).toContain("[redacted: github token]");
});

test("an unreadable file is skipped with a note, and the rest still load", async () => {
	await mkdir(join(globalWorkspaceDir(), "SOUL.md"), { recursive: true }); // a directory, not a file
	await globalFile("IDENTITY.md", "identity survives");

	const ws = loadWorkspace(repo);
	expect(ws.layers.map((l) => l.kind)).toEqual(["identity"]);
	expect(ws.notes.join("\n")).toContain("skipped");
	expect(ws.notes.join("\n")).toContain("SOUL.md");
});

test("an empty or whitespace-only file contributes no layer", async () => {
	await globalFile("SOUL.md", "   \n\n");
	expect(loadWorkspace(repo).layers).toEqual([]);
});
