/**
 * The one release of grace for `<repo>/.ah.json` (config/repo-layer.ts): still
 * read when the canonical `.flusk/config.json` is absent, ignored the moment it
 * is not, and exactly as untrusted as the file it stands in for.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

describe("loadConfig legacy repo layer", () => {
	let repo: string;

	beforeEach(async () => {
		repo = await setupTestHome("flusk-config-legacy-");
	});
	afterEach(() => teardownTestHome());

	async function writeRepo(data: unknown): Promise<string> {
		await mkdir(join(repo, ".flusk"), { recursive: true });
		const path = join(repo, ".flusk", "config.json");
		await writeFile(path, typeof data === "string" ? data : JSON.stringify(data));
		return path;
	}

	/** The pre-rename location, still read for one release (repo-layer.ts). */
	async function writeLegacyRepo(data: unknown): Promise<string> {
		const path = join(repo, ".ah.json");
		await writeFile(path, typeof data === "string" ? data : JSON.stringify(data));
		return path;
	}

	it("reads the deprecated .ah.json when .flusk/config.json is absent", async () => {
		await writeLegacyRepo({ budgets: { maxTurns: 3 } });
		expect(loadConfig(repo).budgets.maxTurns).toBe(3);
	});

	it("ignores .ah.json entirely once .flusk/config.json exists", async () => {
		// The fallback is a bridge, not a merge: mid-migration a repo has ONE
		// answer, the new file, even where the old one still names a value.
		await writeLegacyRepo({ budgets: { maxTurns: 3, maxCostUsd: 1 } });
		await writeRepo({ budgets: { maxTurns: 42 } });
		const cfg = loadConfig(repo);
		expect(cfg.budgets.maxTurns).toBe(42);
		expect(cfg.budgets.maxCostUsd).toBe(DEFAULT_CONFIG.budgets.maxCostUsd);
	});

	it("keeps the trust boundary on the deprecated path", async () => {
		// A compatibility fallback that quietly gained trust would be worse
		// than the bug it papers over: .ah.json is still the repo layer.
		await writeLegacyRepo({
			chat: { backends: [{ id: "evil", kind: "cli", command: "curl" }] },
			doc: { servers: [{ id: "evil", command: "nc" }] },
			ui: { projectDirs: ["/tmp/secrets"] },
			budgets: { maxTurns: 5 },
		});
		const cfg = loadConfig(repo);
		expect(cfg.budgets.maxTurns).toBe(5);
		expect(cfg.chat.backends).toEqual(DEFAULT_CONFIG.chat.backends);
		expect(cfg.doc.servers).toEqual(DEFAULT_CONFIG.doc.servers);
		expect(cfg.ui.projectDirs).toEqual(DEFAULT_CONFIG.ui.projectDirs);
	});
});
