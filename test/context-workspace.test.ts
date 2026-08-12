import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { globalWorkspaceDir, projectWorkspaceDir } from "../src/agent/workspace-files.js";
import { createWorkspaceSource } from "../src/context/source-workspace.js";
import type { ContextRequest } from "../src/context/types.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-ctx-workspace-");
});
afterEach(() => teardownTestHome());

const req = (over: Partial<ContextRequest> = {}): ContextRequest => ({
	task: "add a verify step to the gate",
	repoRoot: repo,
	budgetTokens: 4000,
	isResume: false,
	...over,
});

/** The wiring for a caller that took the workspace out of its system prompt. */
const emitting = () => createWorkspaceSource({ alsoInSystemPrompt: [] });

async function globalFile(name: string, body: string): Promise<string> {
	await mkdir(globalWorkspaceDir(), { recursive: true });
	const path = join(globalWorkspaceDir(), name);
	await writeFile(path, body);
	return path;
}

test("no workspace on disk is a skip with a reason, not a failure", () => {
	const out = emitting().gather(req());
	expect(out.items).toEqual([]);
	expect(out.status).toBe("skipped");
	expect(out.notes.join("\n")).toContain("IDENTITY.md");
	expect(out.notes.join("\n")).toContain("~/.ah/workspace");
});

test("by default the layers the system prompt already renders are not repeated", async () => {
	await globalFile("SOUL.md", "never force-push");
	const out = createWorkspaceSource().gather(req());
	expect(out.items).toEqual([]);
	expect(out.status).toBe("skipped");
	expect(out.notes.join("\n")).toContain("buildSystemPrompt");
	expect(out.notes.join("\n")).toContain("SOUL.md");
});

test("the three owned layers are emitted in prompt order when the caller asks for them", async () => {
	await globalFile("TOOLS.md", "prefer rg over grep");
	await globalFile("IDENTITY.md", "you are ah");
	await globalFile("SOUL.md", "never force-push");

	const out = emitting().gather(req());
	expect(out.status).toBe("ok");
	expect(out.notes).toEqual([]);
	expect(out.items.map((i) => i.id)).toEqual([
		"workspace:identity:~/.ah/workspace/IDENTITY.md",
		"workspace:soul:~/.ah/workspace/SOUL.md",
		"workspace:tools:~/.ah/workspace/TOOLS.md",
	]);
});

test("an unreadable layer degrades to partial: the rest still load, with the reason", async () => {
	await mkdir(join(globalWorkspaceDir(), "SOUL.md"), { recursive: true }); // a directory
	await globalFile("IDENTITY.md", "you are ah");

	const out = emitting().gather(req());
	expect(out.status).toBe("partial");
	expect(out.items).toHaveLength(1);
	const notes = out.notes.join("\n");
	expect(notes).toContain("SOUL.md");
	// The loader writes its notes with absolute paths; none may survive.
	expect(notes).not.toContain(globalWorkspaceDir());
	expect(notes).toContain("~/.ah/workspace/SOUL.md");
});

test("house rules are left to the house-rules source and said so", async () => {
	await writeFile(join(repo, "AGENTS.md"), "tabs, 150 lines");
	await globalFile("IDENTITY.md", "you are ah");

	const out = emitting().gather(req());
	expect(out.items.map((i) => i.id)).toEqual(["workspace:identity:~/.ah/workspace/IDENTITY.md"]);
	expect(out.notes.join("\n")).toContain("house-rules source");
});

test("a project file overrides the global one and is cited project-relative", async () => {
	await globalFile("SOUL.md", "global soul");
	await mkdir(projectWorkspaceDir(repo), { recursive: true });
	await writeFile(join(projectWorkspaceDir(repo), "SOUL.md"), "project soul");

	const item = emitting().gather(req()).items[0];
	expect(item?.body).toBe("project soul");
	expect(item?.path).toBe(".ah/workspace/SOUL.md");
	expect(item?.title).toContain("repo/.ah/workspace/SOUL.md");
});

test("gather is total: a repoRoot that is not a directory returns a result, not a throw", () => {
	const out = emitting().gather(req({ repoRoot: join(repo, "nope", "deeper") }));
	expect(out.items).toEqual([]);
	expect(out.status).toBe("skipped");
	expect(out.notes.length).toBeGreaterThan(0);
});

test("the same repo and corpus gather byte-identically, resume included", async () => {
	await globalFile("IDENTITY.md", "you are ah");
	await globalFile("SOUL.md", "never force-push");

	const first = JSON.stringify(emitting().gather(req()));
	const again = JSON.stringify(emitting().gather(req()));
	const resumed = JSON.stringify(emitting().gather(req({ isResume: true })));
	expect(again).toBe(first);
	expect(resumed).toBe(first);
});

test("preloaded layers are used verbatim, so the run reads these files once", () => {
	const source = createWorkspaceSource({
		alsoInSystemPrompt: [],
		loaded: {
			layers: [
				{
					kind: "soul",
					source: join(globalWorkspaceDir(), "SOUL.md"),
					text: "never force-push",
					truncated: false,
				},
			],
			notes: [],
		},
	});
	const out = source.gather(req());
	expect(out.status).toBe("ok");
	expect(out.items[0]?.body).toBe("never force-push");
});
