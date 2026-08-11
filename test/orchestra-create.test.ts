/**
 * Dynamic agent creation, end to end on a real temp repo.
 *
 * The load-bearing assertion is the ROUND TRIP: whatever we synthesise has to
 * come back out of an ordinary reload, because an agent that only exists in
 * the object that made it is the failure this seam exists to prevent. The
 * other one is the filename — the name is a path component, so a task written
 * to escape the directory must not produce one.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { agentForTask } from "../src/orchestra/agent-for-task.js";
import { loadAgentRegistry } from "../src/orchestra/registry.js";
import { genericDraft, normaliseDraft } from "../src/orchestra/spec-draft.js";
import { AGENT_NAME, deriveAgentName, safeAgentName } from "../src/orchestra/spec-name.js";

let home: string;
let repo: string;

const load = () => loadAgentRegistry({ repoRoot: repo, home, builtins: [] });

beforeEach(() => {
	// realpath, because the jail in src/safety/paths.ts resolves symlinks and
	// the system temp dir is one on macOS: the paths must be comparable.
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), "ah-create-")));
	home = join(tmp, "home");
	repo = join(tmp, "repo");
	for (const d of [home, repo]) mkdirSync(d, { recursive: true });
});

describe("agentForTask", () => {
	it("creates a spec offline, writes markdown, and finds it again on reload", async () => {
		const registry = await load();
		const task = "write vitest tests for the frontmatter parser";
		const made = await agentForTask({ task, registry, repoRoot: repo });
		expect(made.ok).toBe(true);
		if (!made.ok) return;
		expect(made.created).toBe(true);
		expect(made.spec.scope).toBe("project");
		expect(made.spec.worker).toBe("internal");
		expect(made.path).toBe(join(repo, ".ah", "agents", `${made.spec.name}.md`));

		// The round trip a user takes: open the file, read plain markdown.
		const text = readFileSync(made.spec.source, "utf8");
		expect(text.startsWith("---\n")).toBe(true);
		expect(text).toContain(`name: ${made.spec.name}`);

		// And the registry a later run builds finds it with no help from us.
		const fresh = await load();
		expect(fresh.get(made.spec.name)?.prompt).toBe(made.spec.prompt);
		expect(fresh.issues()).toEqual([]);
	});

	it("reuses an existing agent whose description covers the task", async () => {
		const registry = await load();
		const task = "review the diff for security bugs";
		const first = await agentForTask({ task, registry, repoRoot: repo });
		const again = await agentForTask({ task, registry, repoRoot: repo });
		expect(again.ok && again.created).toBe(false);
		expect(again.ok && first.ok && again.spec.name).toBe(first.ok ? first.spec.name : "");
		expect(again.ok && again.reason).toMatch(/matched .* on description/);
	});

	it("takes a model's draft but keeps the name a safe filename", async () => {
		const registry = await load();
		const made = await agentForTask({
			task: "do the thing",
			registry,
			repoRoot: repo,
			draft: async () => ({
				name: "../../etc/Pwned Agent",
				description: "Use when the sky is falling",
				prompt: "You handle falling skies.",
				tools: ["read", "bash"],
			}),
		});
		expect(made.ok).toBe(true);
		if (!made.ok) return;
		expect(made.spec.name).toMatch(AGENT_NAME);
		expect(made.spec.name).toBe("etc-pwned-agent");
		expect(made.spec.description).toBe("Use when the sky is falling");
		expect(made.spec.tools).toEqual(["read", "bash"]);
		expect(existsSync(join(repo, ".ah", "agents", "etc-pwned-agent.md"))).toBe(true);
	});

	it("falls back to the deterministic draft when the drafter throws or opts out", async () => {
		const registry = await load();
		const thrown = await agentForTask({
			task: "summarise the release notes",
			registry,
			repoRoot: repo,
			draft: async () => {
				throw new Error("no model configured");
			},
		});
		expect(thrown.ok).toBe(true);
		if (!thrown.ok) return;
		expect(thrown.created).toBe(true);
		expect(thrown.spec.description).toContain("summarise the release notes");
	});

	it("never collides with a name the registry already has", async () => {
		const registry = await load();
		const a = await agentForTask({ task: "handle flaky retries", registry, repoRoot: repo });
		const b = await agentForTask({
			task: "handle flaky retries",
			registry,
			repoRoot: repo,
			threshold: 2, // unreachable: force a second creation
		});
		expect(a.ok && b.ok && a.spec.name === b.spec.name).toBe(false);
		expect(b.ok && b.spec.name).toMatch(/-2$/);
	});
});

describe("agent names are always safe filenames", () => {
	it.each([
		"../../etc/passwd",
		"..",
		".",
		"C:\\Windows\\System32",
		"name with spaces and (parens)",
		"tests/for/../parser",
		"日本語のタスク",
		"",
		"-".repeat(50),
		"a".repeat(200),
	])("derives a kebab-case name from %j", (task) => {
		const name = deriveAgentName(task);
		expect(name).toMatch(AGENT_NAME);
		expect(name.includes("/")).toBe(false);
		expect(name.includes(".")).toBe(false);
		expect(join("/root", `${name}.md`).startsWith("/root/")).toBe(true);
	});

	it("returns an empty string rather than an invalid name", () => {
		expect(safeAgentName("...")).toBe("");
		expect(normaliseDraft({ name: "///" }, "fix the parser", new Set()).name).toBe(
			genericDraft("fix the parser").name,
		);
	});
});
