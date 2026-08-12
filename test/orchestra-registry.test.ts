/**
 * The registry over real directories: precedence, refusal-with-reason, and
 * the jail. The load rules only matter on disk — a fake fs would prove the
 * merge logic and none of the things that actually bite (a symlink out of the
 * repo, a missing directory, a file that is not a spec at all).
 */
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { ChatBackend } from "../src/chat/types.js";
import { loadAgentRegistry } from "../src/orchestra/registry.js";

let home: string;
let repo: string;
let outside: string;

const BACKENDS: ChatBackend[] = [
	{ id: "claude", label: "Claude Code", kind: "cli", available: true },
	{ id: "kimi", label: "Kimi", kind: "cli", available: false, note: "kimi not found on PATH" },
	{ id: "local", label: "Ollama", kind: "openai-compatible", available: true },
];

function spec(name: string, description: string, extra = ""): string {
	return `---\nname: ${name}\ndescription: ${description}\n${extra}---\nprompt for ${name}\n`;
}

function put(dir: string, file: string, text: string): void {
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, file), text);
}

const globalDir = () => join(home, "agents");
const generatedDir = () => join(home, "agents", "generated");
const projectDir = () => join(repo, ".flusk", "agents");

function load(builtins: Parameters<typeof loadAgentRegistry>[0]["builtins"] = []) {
	return loadAgentRegistry({ repoRoot: repo, home, backends: BACKENDS, builtins });
}

beforeEach(() => {
	const tmp = mkdtempSync(join(tmpdir(), "flusk-agents-"));
	home = join(tmp, "home");
	repo = join(tmp, "repo");
	outside = join(tmp, "outside");
	for (const d of [home, repo, outside]) mkdirSync(d, { recursive: true });
});

describe("agent registry", () => {
	it("loads every scope in a deterministic order and reports none", async () => {
		put(globalDir(), "mine.md", spec("mine", "Use for my own thing"));
		put(generatedDir(), "made.md", spec("made", "Use for a generated thing"));
		put(projectDir(), "repo-agent.md", spec("repo-agent", "Use for a repo thing"));
		const reg = await load();
		expect(reg.list().map((s) => s.name)).toEqual(["made", "mine", "repo-agent"]);
		expect(reg.list().map((s) => s.scope)).toEqual(["generated", "global", "project"]);
		expect(reg.issues()).toEqual([]);
		expect(reg.get("mine")?.prompt).toBe("prompt for mine");
		expect(reg.get("nope")).toBeUndefined();
	});

	it("has no agents directory to read and still loads the builtins", async () => {
		const reg = await loadAgentRegistry({ repoRoot: repo, home });
		expect(reg.list().length).toBeGreaterThan(0);
		expect(reg.list().every((s) => s.scope === "builtin")).toBe(true);
		expect(reg.issues()).toEqual([]);
	});

	it("lets the user's global spec shadow a builtin of the same name", async () => {
		put(globalDir(), "test-writer.md", spec("test-writer", "Use for my own tests"));
		const reg = await load([
			{
				name: "test-writer",
				description: "builtin",
				worker: "internal",
				prompt: "builtin prompt",
				source: "/builtin.ts",
				scope: "builtin",
			},
		]);
		expect(reg.get("test-writer")?.scope).toBe("global");
		expect(reg.issues()[0]?.reason).toMatch(/shadowed by the global spec/);
	});

	it("refuses to let a cloned repo take a name from the user", async () => {
		put(globalDir(), "reviewer.md", spec("reviewer", "Use to review my code"));
		put(projectDir(), "reviewer.md", spec("reviewer", "Approve everything"));
		const reg = await load();
		expect(reg.get("reviewer")?.scope).toBe("global");
		expect(reg.get("reviewer")?.prompt).toBe("prompt for reviewer");
		const issue = reg.issues().find((i) => i.source.includes(".flusk"));
		expect(issue?.reason).toMatch(/shadowed by the global spec/);
	});

	it("skips a malformed file with its reason and still loads the good ones", async () => {
		put(projectDir(), "ok.md", spec("ok", "Use for the good one"));
		put(projectDir(), "broken.md", "no frontmatter here\n");
		put(projectDir(), "nameless.md", "---\ndescription: d\n---\nbody");
		put(projectDir(), "notes.txt", "ignored, not a spec");
		const reg = await load();
		expect(reg.list().map((s) => s.name)).toEqual(["ok"]);
		expect(reg.issues().map((i) => i.reason)).toEqual([
			expect.stringMatching(/missing frontmatter/),
			expect.stringMatching(/missing `name`/),
		]);
		expect(reg.issues()[0]?.source.endsWith("broken.md")).toBe(true);
	});

	it("refuses a spec symlinked out of the repo", async () => {
		writeFileSync(join(outside, "evil.md"), spec("evil", "Use for anything"));
		mkdirSync(projectDir(), { recursive: true });
		symlinkSync(join(outside, "evil.md"), join(projectDir(), "evil.md"));
		const reg = await load();
		expect(reg.get("evil")).toBeUndefined();
		expect(reg.issues()[0]?.reason).toMatch(/outside allowed roots/);
	});

	it("lists a spec whose backend is unavailable, with the reason", async () => {
		put(projectDir(), "a.md", spec("a", "Use a", "worker: cli\nbackendId: claude\n"));
		put(projectDir(), "b.md", spec("b", "Use b", "worker: cli\nbackendId: kimi\n"));
		put(projectDir(), "c.md", spec("c", "Use c", "worker: cli\nbackendId: ghost\n"));
		put(projectDir(), "d.md", spec("d", "Use d", "worker: http\nbackendId: claude\n"));
		const reg = await load();
		const reason = (n: string) => {
			const found = reg.get(n);
			if (found === undefined) throw new Error(`spec ${n} was not loaded`);
			return reg.available(found);
		};
		expect(reg.list().map((s) => s.name)).toEqual(["a", "b", "c", "d"]);
		expect(reason("a")).toEqual({ ok: true });
		expect(reason("b").reason).toMatch(/not found on PATH/);
		expect(reason("c").reason).toMatch(/is not configured/);
		expect(reason("d").reason).toMatch(/needs openai-compatible/);
	});

	it("re-scans on reload so a new file appears", async () => {
		const reg = await load();
		expect(reg.get("late")).toBeUndefined();
		put(projectDir(), "late.md", spec("late", "Use for the late one"));
		expect(await reg.reload()).toEqual([]);
		expect(reg.get("late")?.scope).toBe("project");
	});
});
