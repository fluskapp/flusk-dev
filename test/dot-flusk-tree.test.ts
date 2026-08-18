import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { scanDotFlusk } from "../src/features/projects/dot-flusk.repository.js";

describe("scanDotFlusk", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await mkdtemp(join(tmpdir(), "flusk-dot-flusk-"));
	});

	async function put(rel: string, body = "x"): Promise<void> {
		const path = join(repo, ".flusk", rel);
		await mkdir(join(path, ".."), { recursive: true });
		await writeFile(path, body);
	}

	it("returns [] when the repo has no .flusk directory", () => {
		expect(scanDotFlusk(repo)).toEqual([]);
	});

	it("classifies every documented directory and file", async () => {
		await put("config.json");
		await put("workbench.json");
		await put("specs/plan.md");
		await put("runs/nightly.json");
		await put("flows/review.json");
		await put("agents/critic.md");
		await put("extensions/hook.js");
		await put("harnesses/codex.json");
		await put("workspace/IDENTITY.md");
		await put("mystery/blob.bin");
		await put("stray.txt");
		const kinds = Object.fromEntries(scanDotFlusk(repo).map((e) => [e.rel, e.kind]));
		expect(kinds).toEqual({
			"config.json": "config",
			"workbench.json": "workbench",
			"stray.txt": "other",
			"specs/plan.md": "spec",
			"runs/nightly.json": "runconfig",
			"flows/review.json": "flow",
			"agents/critic.md": "agent",
			"extensions/hook.js": "extension",
			"harnesses/codex.json": "harness",
			"workspace/IDENTITY.md": "workspace",
			"mystery/blob.bin": "other",
		});
	});

	it("carries absolute paths and sizes, sorted top files then dirs", async () => {
		await put("config.json", "{}");
		await put("specs/a.md", "hello");
		const [first, second] = scanDotFlusk(repo);
		expect(first).toEqual({
			rel: "config.json",
			abs: join(repo, ".flusk", "config.json"),
			kind: "config",
			size: 2,
		});
		expect(second?.rel).toBe(join("specs", "a.md"));
		expect(second?.size).toBe(5);
	});

	it("caps the scan at 200 entries", async () => {
		await mkdir(join(repo, ".flusk", "runs"), { recursive: true });
		for (let i = 0; i < 210; i++) {
			await writeFile(join(repo, ".flusk", "runs", `r${String(i).padStart(3, "0")}.json`), "{}");
		}
		expect(scanDotFlusk(repo)).toHaveLength(200);
	});
});
