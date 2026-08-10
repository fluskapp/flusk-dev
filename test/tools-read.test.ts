import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEventBus } from "../src/core/events.js";
import { allowAllPolicy } from "../src/safety/policy.js";
import { readTool } from "../src/tools/read.js";
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
	dir = await mkdtemp(join(tmpdir(), "hit-read-"));
	await writeFile(join(dir, "lines.txt"), "first\nsecond\nthird\nfourth\n");
});

afterAll(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("read tool", () => {
	it("numbers lines cat -n style", async () => {
		const res = await readTool.execute({ file_path: "lines.txt" }, ctx());
		const lines = res.output.split("\n");
		expect(lines[0]).toMatch(/^\s+1\tfirst$/);
		expect(lines[3]).toMatch(/^\s+4\tfourth$/);
		expect(lines).toHaveLength(4);
	});

	it("resolves relative paths against ctx.cwd", async () => {
		const res = await readTool.execute({ file_path: "./lines.txt" }, ctx());
		expect(res.output).toContain("first");
	});

	it("applies offset and limit and notes truncation", async () => {
		const res = await readTool.execute({ file_path: "lines.txt", offset: 2, limit: 2 }, ctx());
		const [a, b] = res.output.split("\n");
		expect(a).toMatch(/^\s+2\tsecond$/);
		expect(b).toMatch(/^\s+3\tthird$/);
		expect(res.output).toContain("lines 2-3 of 4");
	});

	it("does not note truncation when the whole file is shown", async () => {
		const res = await readTool.execute({ file_path: "lines.txt" }, ctx());
		expect(res.output).not.toContain("use offset");
	});

	it("throws on a missing file", async () => {
		await expect(readTool.execute({ file_path: "nope.txt" }, ctx())).rejects.toThrowError(
			/File not found/,
		);
	});

	it("throws when the path is a directory", async () => {
		await expect(readTool.execute({ file_path: "." }, ctx())).rejects.toThrowError(/directory/);
	});
});
