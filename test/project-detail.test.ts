import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { projectDetail } from "../src/ui/project-detail.js";
import { journal, tree, write } from "./project-fixture.js";

const NOW = new Date("2026-08-11T00:00:00.000Z");
let t: ReturnType<typeof tree>;

beforeAll(() => {
	t = tree();
	const { work } = t;

	write(work, "linof/bin/linof.js", "\n");
	write(work, "linof/src/pipeline.js", "\n");
	write(work, "linof/package.json", JSON.stringify({ scripts: { test: "vitest" } }));
	write(
		work,
		"linof/config.json",
		JSON.stringify({
			tools: ["claude", "codex", "kimi"],
			verify: ["npm run lint", "npm run build"],
			huge: "x".repeat(3000),
		}),
	);
	write(
		work,
		"linof/data/benchmarks.json",
		JSON.stringify({
			code: { claude: 0.9, codex: 0.5 },
			review: { claude: 0.8 },
		}),
	);
	write(work, "linof/prompts/main.md", "You are linof, a shipping harness.\n");
	write(work, "linof/CLAUDE.md", "not the prompt we should pick\n");
	journal(
		join(work, "linof"),
		"2026-08-10-run",
		{ title: '"Run: ship"', date: "2026-08-10T12:00:00.000Z", status: "done" },
		[
			["intent", "done|1s|code"],
			["gate", "done|0s|pass"],
		],
	);

	// A harness known only by its journals: no config.json, no prompts dir.
	journal(
		join(work, "bare"),
		"2026-08-09-run",
		{ title: '"Run: something"', date: "2026-08-09T12:00:00.000Z", status: "done" },
		[
			["plan", "done|1s|x"],
			["ship", "done|1s|y"],
		],
	);
	write(work, "bare/CLAUDE.md", "Bare harness context.\n");

	// flusk's own checkout, recognised by the system-prompt module it owns.
	write(work, "flusk/src/agent/system-prompt.ts", "export {};\n");
	write(work, "flusk/.flusk/config.json", JSON.stringify({ verify: ["npm test"], namespace: "repo:flusk" }));
	write(work, "flusk/package.json", JSON.stringify({ scripts: { build: "tsc" } }));
});

afterAll(() => t.cleanup());

it("returns null for a project the config does not point at", () => {
	expect(projectDetail(t.cfg, "nope", NOW)).toBeNull();
});

it("describes flusk from its own config, toolbelt and prompt builder", () => {
	const d = projectDetail(t.cfg, "flusk", NOW);
	expect(d?.kind).toBe("repo");
	expect(d?.models).toEqual([
		{ id: "anthropic/claude-sonnet-5", role: "plan" },
		{ id: "anthropic/claude-sonnet-5", role: "code" },
		{ id: "anthropic/claude-sonnet-5", role: "review" },
		{ id: "anthropic/claude-haiku-4-5", role: "summarize" },
	]);
	expect(d?.tools).toEqual(["read", "bash", "write", "edit", "glob", "grep", "task"]);
	expect(d?.systemPrompt?.source).toBe("src/agent/system-prompt.ts");
	expect(d?.systemPrompt?.text).toContain(`repoRoot: ${join(t.work, "flusk")}`);
	expect(d?.verify).toEqual(["npm test"]); // .flusk/config.json wins over the build script
	expect(d?.config).toEqual({ verify: ["npm test"], namespace: "repo:flusk" });
});

it("describes a harness from config.json, learned benchmarks and its prompt file", () => {
	const d = projectDetail(t.cfg, "linof", NOW);
	expect(d?.kind).toBe("harness");
	expect(d?.runs).toBe(1);
	expect(d?.models).toEqual([
		{ id: "claude", role: "code", score: 0.9 },
		{ id: "claude", role: "review", score: 0.8 },
		{ id: "codex", role: "code", score: 0.5 },
		{ id: "kimi" }, // a candidate tool nothing has scored yet
	]);
	// config.tools names the MODELS it picks between (asserted above), so the
	// tool list is what the pipeline actually ran — not the same array twice.
	expect(d?.tools).toEqual(["intent", "gate"]);
	expect(d?.systemPrompt?.source).toBe(join(t.work, "linof", "prompts", "main.md"));
	expect(d?.systemPrompt?.text).toContain("You are linof");
	expect(d?.verify).toEqual(["npm run lint", "npm run build"]); // not the detected "npm test"
});

it("caps the config it ships to the webview", () => {
	const config = projectDetail(t.cfg, "linof", NOW)?.config ?? {};
	expect(config.tools).toEqual(["claude", "codex", "kimi"]);
	// Named, not silently dropped: a missing key is the one you opened this for.
	expect(String(config.huge)).toContain("omitted");
});

it("falls back to journal stage names and CLAUDE.md when a harness declares nothing", () => {
	const d = projectDetail(t.cfg, "bare", NOW);
	expect(d?.kind).toBe("harness");
	expect(d?.models).toEqual([]);
	expect(d?.tools).toEqual(["plan", "ship"]);
	expect(d?.systemPrompt?.source).toBe(join(t.work, "bare", "CLAUDE.md"));
	expect(d?.systemPrompt?.text).toContain("Bare harness context");
	expect(d?.verify).toEqual([]);
	expect(d?.config).toEqual({});
});
