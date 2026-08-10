import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEventBus } from "../src/core/events.js";
import { allowAllPolicy } from "../src/safety/policy.js";
import { globTool } from "../src/tools/glob.js";
import { grepTool } from "../src/tools/grep.js";
import type { ToolContext } from "../src/tools/tool.js";

let dir: string;

function ctx(): ToolContext {
	return {
		repoRoot: dir,
		cwd: dir,
		signal: new AbortController().signal,
		policy: allowAllPolicy,
		events: createEventBus(),
	};
}

beforeAll(async () => {
	dir = await mkdtemp(join(tmpdir(), "ah-search-"));
	await mkdir(join(dir, "sub"), { recursive: true });
	await mkdir(join(dir, "node_modules/pkg"), { recursive: true });
	await mkdir(join(dir, ".git"), { recursive: true });
	await writeFile(join(dir, "one.ts"), "const needle = 1;\nconst hay = 2;\n");
	await writeFile(join(dir, "sub/two.ts"), "// no match here\nexport const needle = 3;\n");
	await writeFile(join(dir, "three.md"), "needle in markdown\n");
	await writeFile(join(dir, "node_modules/pkg/dep.ts"), "const needle = 0;\n");
	await writeFile(join(dir, ".git/config"), "needle = git\n");
});

afterAll(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("grep tool", () => {
	it("finds matching lines with file names and line numbers", async () => {
		const res = await grepTool.execute({ pattern: "needle" }, ctx());
		expect(res.output).toMatch(/one\.ts:1:.*needle/);
		expect(res.output).toMatch(/two\.ts:2:.*needle/);
		expect(res.output).not.toContain("no match here");
	});

	it("reports no matches without throwing", async () => {
		const res = await grepTool.execute({ pattern: "definitely_absent_zzz" }, ctx());
		expect(res.output).toBe("No matches found");
	});

	it("restricts the search with a glob filter", async () => {
		const res = await grepTool.execute({ pattern: "needle", glob: "*.md" }, ctx());
		expect(res.output).toContain("three.md");
		expect(res.output).not.toContain("one.ts");
	});

	it("searches only the given path", async () => {
		const res = await grepTool.execute({ pattern: "needle", path: "sub" }, ctx());
		expect(res.output).toContain("two.ts");
		expect(res.output).not.toContain("one.ts");
	});
});

describe("glob tool", () => {
	it("matches files recursively and sorts the results", async () => {
		const res = await globTool.execute({ pattern: "**/*.ts" }, ctx());
		const lines = res.output.split("\n");
		expect(lines).toEqual(["one.ts", join("sub", "two.ts")]);
	});

	it("excludes node_modules and .git", async () => {
		const res = await globTool.execute({ pattern: "**/*" }, ctx());
		expect(res.output).not.toContain("node_modules");
		expect(res.output).not.toContain(".git");
		expect(res.output).toContain("three.md");
	});

	it("scopes matching to the given base path", async () => {
		const res = await globTool.execute({ pattern: "*.ts", path: "sub" }, ctx());
		expect(res.output).toBe("two.ts");
	});

	it("reports no matches without throwing", async () => {
		const res = await globTool.execute({ pattern: "*.rs" }, ctx());
		expect(res.output).toBe("No files matched");
	});
});
