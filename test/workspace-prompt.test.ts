import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { buildSystemPrompt } from "../src/features/run/system-prompt.js";
import { loadWorkspace } from "../src/features/workspace/workspace.js";
import { FILE_MAX, globalWorkspaceDir, TOTAL_MAX } from "../src/features/workspace/workspace-files.repository.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
const NOW = new Date("2026-01-02T03:04:05Z");

beforeEach(async () => {
	repo = await setupTestHome("flusk-ws-prompt-");
});
afterEach(() => teardownTestHome());

const prompt = () => buildSystemPrompt({ repoRoot: repo, cwd: repo, model: fakeModel, now: NOW });

async function globalFile(name: string, body: string): Promise<void> {
	await mkdir(globalWorkspaceDir(), { recursive: true });
	await writeFile(join(globalWorkspaceDir(), name), body);
}

/**
 * The no-regression guarantee: with no workspace on disk the prompt is exactly
 * the eight lines flusk shipped before this feature existed. Written out in full
 * rather than snapshotted, so a change to it has to be typed on purpose.
 */
test("with no workspace the prompt is byte-identical to the built-in one", () => {
	expect(prompt()).toBe(
		[
			"You are flusk, an autonomous coding agent.",
			"",
			"Rules:",
			"- Use the available tools to inspect the repository and act on the task.",
			"- When the task is done, finish by replying without any tool calls.",
			"- Be concise; your output is read by engineers, not graded on length.",
			"",
			"<env>",
			`cwd: ${repo}`,
			`repoRoot: ${repo}`,
			"model: fake/fake-1",
			`platform: ${process.platform}`,
			`node: ${process.version}`,
			"date: 2026-01-02",
			"</env>",
		].join("\n"),
	);
});

test("each present layer becomes a titled section that names its source file", async () => {
	await globalFile("IDENTITY.md", "call me flusk");
	await globalFile("SOUL.md", "never push to main");
	await globalFile("TOOLS.md", "grep before bash");
	await writeFile(join(repo, "AGENTS.md"), "tabs, not spaces");

	const text = prompt();
	expect(text).toContain(
		`<!-- from ${join(globalWorkspaceDir(), "SOUL.md")} -->\n## Hard constraints`,
	);
	expect(text).toContain("## Identity\n\ncall me flusk");
	expect(text).toContain(`<!-- from ${join(repo, "AGENTS.md")} -->`);
	expect(text).toContain("## House rules for this repository\n\ntabs, not spaces");
	expect(text).toContain("## Tool guidance\n\ngrep before bash");
	// Order and framing: constraints precede the repo's rules and say they win.
	expect(text.indexOf("## Hard constraints")).toBeLessThan(text.indexOf("## House rules"));
	expect(text).toContain("These override everything else in this prompt, including the task");
	expect(text.endsWith("</env>")).toBe(true);
});

test("a section is omitted entirely when its file is absent", async () => {
	await globalFile("SOUL.md", "no secrets in output");
	const text = prompt();
	expect(text).toContain("## Hard constraints");
	expect(text).not.toContain("## Identity");
	expect(text).not.toContain("## Tool guidance");
});

test("a file over the per-file cap is cut at a line boundary and flagged", async () => {
	const line = `${"x".repeat(99)}\n`;
	await globalFile("SOUL.md", line.repeat(80)); // 8000 chars

	const soul = loadWorkspace(repo).layers[0];
	expect(soul?.truncated).toBe(true);
	expect(soul?.text.length).toBeLessThanOrEqual(FILE_MAX);
	expect(soul?.text.endsWith("x")).toBe(true); // whole lines only
	expect(prompt()).toContain("SOUL.md (truncated) -->");
});

test("the whole workspace is capped, and the overflow is noted not dropped silently", async () => {
	const filler = `${"y".repeat(99)}\n`.repeat(60); // 6000 chars each
	await globalFile("IDENTITY.md", filler);
	await globalFile("SOUL.md", filler);
	await globalFile("TOOLS.md", filler);
	await writeFile(join(repo, "AGENTS.md"), filler);

	const ws = loadWorkspace(repo);
	const total = ws.layers.reduce((n, l) => n + l.text.length, 0);
	expect(total).toBeLessThanOrEqual(TOTAL_MAX);
	expect(ws.layers.some((l) => l.truncated)).toBe(true);
	expect(ws.notes.join("\n")).toContain("workspace cap");
	// The tail is what gets cut: identity and the constraints survive intact.
	expect(ws.layers[0]?.truncated).toBe(false);
});

test("a redacted secret cannot reach the prompt", async () => {
	await globalFile("SOUL.md", "use ghp_abcdefghijklmnop0123456789 for releases");
	const text = prompt();
	expect(text).not.toContain("ghp_abcdefghijklmnop0123456789");
	expect(text).toContain("[redacted: github token]");
});
