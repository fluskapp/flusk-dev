import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { readWorkbenchFile } from "../src/features/workbench/workbench-file.repository.js";
import { WORKBENCH_FILE } from "../src/features/workbench/workbench.types.js";

describe("readWorkbenchFile", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await mkdtemp(join(tmpdir(), "flusk-workbench-"));
	});

	async function write(data: unknown): Promise<string> {
		const path = join(repo, WORKBENCH_FILE);
		await mkdir(join(repo, ".flusk"), { recursive: true });
		await writeFile(path, typeof data === "string" ? data : JSON.stringify(data));
		return path;
	}

	it("treats an absent file as empty with no notes", () => {
		expect(readWorkbenchFile(repo)).toEqual({ file: {}, notes: [] });
	});

	it("round-trips a valid defaultRunConfig", async () => {
		await write({ defaultRunConfig: "nightly-verify" });
		expect(readWorkbenchFile(repo)).toEqual({ file: { defaultRunConfig: "nightly-verify" }, notes: [] });
	});

	it("ignores malformed JSON with a note naming the file", async () => {
		const path = await write("{ not json !");
		const r = readWorkbenchFile(repo);
		expect(r.file).toEqual({});
		expect(r.notes).toHaveLength(1);
		expect(r.notes[0]).toContain(path);
	});

	it("ignores a non-object body with a note", async () => {
		await write([1, 2, 3]);
		const r = readWorkbenchFile(repo);
		expect(r.file).toEqual({});
		expect(r.notes).toHaveLength(1);
	});

	it("ignores unknown keys with a note, never a refusal", async () => {
		await write({ defaultRunConfig: "nightly", theme: "dark" });
		const r = readWorkbenchFile(repo);
		expect(r.file).toEqual({ defaultRunConfig: "nightly" });
		expect(r.notes.join("\n")).toContain('unknown key "theme"');
	});

	it("notes a mistyped defaultRunConfig instead of carrying it", async () => {
		await write({ defaultRunConfig: 7 });
		const r = readWorkbenchFile(repo);
		expect(r.file).toEqual({});
		expect(r.notes.join("\n")).toContain("defaultRunConfig");
	});
});
