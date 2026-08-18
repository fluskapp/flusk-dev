import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, REPO_STRIPPED } from "../src/platform/config/config.js";
import { resolveConfig, type ResolvedConfig } from "../src/platform/config/provenance.js";
import { fluskHome } from "../src/platform/paths/paths.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

const key = (r: ResolvedConfig, path: string) => r.keys.find((k) => k.path === path);

describe("resolveConfig", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await setupTestHome("flusk-provenance-");
	});
	afterEach(() => teardownTestHome());

	async function writeGlobal(data: unknown): Promise<void> {
		await mkdir(fluskHome(), { recursive: true });
		await writeFile(join(fluskHome(), "config.json"), typeof data === "string" ? data : JSON.stringify(data));
	}

	async function writeRepo(data: unknown): Promise<string> {
		await mkdir(join(repo, ".flusk"), { recursive: true });
		const path = join(repo, ".flusk", "config.json");
		await writeFile(path, typeof data === "string" ? data : JSON.stringify(data));
		return path;
	}

	it("tracks the last layer that supplied each key", async () => {
		expect(key(resolveConfig(repo), "budgets.maxTurns")).toMatchObject({ value: 100, origin: "default" });
		await writeGlobal({ budgets: { maxTurns: 7 } });
		expect(key(resolveConfig(repo), "budgets.maxTurns")).toMatchObject({ value: 7, origin: "home" });
		await writeRepo({ budgets: { maxTurns: 42 } });
		const r = resolveConfig(repo);
		expect(key(r, "budgets.maxTurns")).toMatchObject({ value: 42, origin: "project" });
		expect(key(r, "budgets.maxCostUsd")).toMatchObject({ value: 10, origin: "default" });
		expect(r.layers.map((l) => l.state)).toEqual(["read", "read"]);
	});

	it("marks refused repo keys stripped and shows only the surviving value", async () => {
		await writeGlobal({ chat: { backends: [{ id: "mine", kind: "cli", command: "codex" }] } });
		await writeRepo({
			watch: { push: true },
			chat: { backends: [{ id: "evil", kind: "cli", command: "sh" }] },
		});
		const r = resolveConfig(repo);
		expect(key(r, "watch.push")).toMatchObject({ value: false, origin: "stripped" });
		expect(key(r, "chat.backends")).toMatchObject({
			value: [{ id: "mine", kind: "cli", command: "codex" }],
			origin: "stripped",
		});
		// and loadConfig proves the refused values did not apply
		const cfg = loadConfig(repo);
		expect(cfg.watch.push).toBe(false);
		expect(cfg.chat.backends).toEqual([{ id: "mine", kind: "cli", command: "codex" }]);
	});

	it("renders a malformed repo layer as a row instead of throwing", async () => {
		const path = await writeRepo("{ not json !");
		const r = resolveConfig(repo);
		expect(r.layers[1]).toMatchObject({ scope: "project", path, state: "malformed" });
		expect(r.layers[1]?.error).toContain(path);
		expect(key(r, "budgets.maxTurns")).toMatchObject({ value: 100, origin: "default" });
	});

	it("notes unknown sections and keys instead of failing", async () => {
		await writeRepo({ frobnicate: { on: true }, budgets: { maxTurnips: 9 } });
		const notes = resolveConfig(repo).notes.join("\n");
		expect(notes).toContain('unknown section "frobnicate"');
		expect(notes).toContain('unknown key "budgets.maxTurnips"');
	});

	it("drift guard: every REPO_STRIPPED path is inert in loadConfig", async () => {
		// One fixture per declared path; a new REPO_STRIPPED entry without a
		// fixture here fails the lookup, so declaration and behavior cannot drift.
		const SUPPLY: Record<string, Record<string, unknown>> = {
			"chat.backends": { chat: { backends: [{ id: "evil", kind: "cli", command: "sh" }] } },
			"doc.servers": { doc: { servers: [{ id: "evil", command: "sh", extensions: [".x"] }] } },
			"ui.projectDirs": { ui: { projectDirs: ["/tmp/secrets"] } },
			"ui.harnessDirs": { ui: { harnessDirs: ["/tmp/secrets"] } },
			watch: { watch: { push: true, maxRunsPerNight: 999 } },
		};
		const benign = { budgets: { maxTurns: 3 } };
		for (const path of REPO_STRIPPED) {
			const supply = SUPPLY[path];
			expect(supply, `fixture missing for REPO_STRIPPED entry "${path}"`).toBeDefined();
			await writeRepo({ ...benign, ...supply });
			const withStripped = loadConfig(repo);
			await writeRepo(benign);
			expect(withStripped, `repo-supplied ${path} changed loadConfig output`).toEqual(loadConfig(repo));
			expect(withStripped.budgets.maxTurns).toBe(3);
			const marked = resolveConfig(repo);
			expect(marked.keys.every((k) => k.origin !== "stripped")).toBe(true);
			await rm(join(repo, ".flusk", "config.json"));
		}
	});
});
