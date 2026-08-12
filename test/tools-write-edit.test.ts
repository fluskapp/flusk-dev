import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEventBus } from "../src/platform/events/events.js";
import type { Policy } from "../src/features/safety/policy.js";
import { allowAllPolicy } from "../src/features/safety/policy.js";
import { editTool } from "../src/features/tools/edit.repository.js";
import type { ToolContext } from "../src/features/tools/tool.js";
import { writeTool } from "../src/features/tools/write.repository.js";

let dir: string;

function ctx(overrides: Partial<ToolContext> = {}): ToolContext {
	return {
		repoRoot: dir,
		cwd: dir,
		signal: new AbortController().signal,
		policy: allowAllPolicy,
		events: createEventBus(),
		...overrides,
	};
}

const denyWrites: Policy = {
	decide: (action) =>
		action.kind === "fileWrite"
			? { allow: false, reason: "writes are forbidden here" }
			: { allow: true },
};

beforeAll(async () => {
	dir = await mkdtemp(join(tmpdir(), "flusk-write-edit-"));
});

afterAll(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("write tool", () => {
	it("writes a file and reports byte count and absolute path", async () => {
		const res = await writeTool.execute({ file_path: "a.txt", content: "hello" }, ctx());
		expect(res.output).toBe(`Wrote 5 bytes to ${join(dir, "a.txt")}`);
		expect(await readFile(join(dir, "a.txt"), "utf8")).toBe("hello");
	});

	it("creates missing parent directories", async () => {
		await writeTool.execute({ file_path: "deep/nested/dir/b.txt", content: "x" }, ctx());
		expect(await readFile(join(dir, "deep/nested/dir/b.txt"), "utf8")).toBe("x");
	});

	it("overwrites an existing file", async () => {
		await writeTool.execute({ file_path: "over.txt", content: "first" }, ctx());
		await writeTool.execute({ file_path: "over.txt", content: "second" }, ctx());
		expect(await readFile(join(dir, "over.txt"), "utf8")).toBe("second");
	});

	it("throws and writes nothing when the policy denies", async () => {
		await expect(
			writeTool.execute({ file_path: "denied.txt", content: "no" }, ctx({ policy: denyWrites })),
		).rejects.toThrowError("writes are forbidden here");
		expect(existsSync(join(dir, "denied.txt"))).toBe(false);
	});
});

describe("edit tool", () => {
	it("replaces a unique occurrence", async () => {
		await writeFile(join(dir, "e1.txt"), "alpha beta gamma");
		const res = await editTool.execute(
			{ file_path: "e1.txt", old_string: "beta", new_string: "BETA" },
			ctx(),
		);
		expect(res.output).toContain("Replaced 1 occurrence");
		expect(await readFile(join(dir, "e1.txt"), "utf8")).toBe("alpha BETA gamma");
	});

	it("throws when old_string is not found", async () => {
		await writeFile(join(dir, "e2.txt"), "nothing here");
		await expect(
			editTool.execute({ file_path: "e2.txt", old_string: "absent", new_string: "x" }, ctx()),
		).rejects.toThrowError(/old_string not found/);
	});

	it("throws with the count when old_string is ambiguous", async () => {
		await writeFile(join(dir, "e3.txt"), "dup dup dup");
		await expect(
			editTool.execute({ file_path: "e3.txt", old_string: "dup", new_string: "one" }, ctx()),
		).rejects.toThrowError(/matches 3 times/);
	});

	it("replaces every occurrence with replace_all", async () => {
		await writeFile(join(dir, "e4.txt"), "dup dup dup");
		const res = await editTool.execute(
			{ file_path: "e4.txt", old_string: "dup", new_string: "one", replace_all: true },
			ctx(),
		);
		expect(res.output).toContain("Replaced 3 occurrences");
		expect(await readFile(join(dir, "e4.txt"), "utf8")).toBe("one one one");
	});

	it("throws when old_string equals new_string", async () => {
		await writeFile(join(dir, "e5.txt"), "same same");
		await expect(
			editTool.execute({ file_path: "e5.txt", old_string: "same", new_string: "same" }, ctx()),
		).rejects.toThrowError(/identical/);
	});

	it("throws on a missing file", async () => {
		await expect(
			editTool.execute({ file_path: "missing.txt", old_string: "a", new_string: "b" }, ctx()),
		).rejects.toThrowError(/File not found/);
	});

	it("throws and edits nothing when the policy denies", async () => {
		await writeFile(join(dir, "e6.txt"), "keep me");
		await expect(
			editTool.execute(
				{ file_path: "e6.txt", old_string: "keep", new_string: "lose" },
				ctx({ policy: denyWrites }),
			),
		).rejects.toThrowError("writes are forbidden here");
		expect(await readFile(join(dir, "e6.txt"), "utf8")).toBe("keep me");
	});
});
