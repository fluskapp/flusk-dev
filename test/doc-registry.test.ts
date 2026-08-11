/**
 * Choosing an engine — and, more importantly, explaining a refusal.
 *
 * On the machine this ships to there is no language server installed at all,
 * so "no provider" is the COMMON path, not the edge case. Every test here
 * asserts the sentence the workbench will show, because an empty doc panel and
 * a broken doc panel look identical to the user.
 */
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execPath } from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { AhConfig, DocServerConfig } from "../src/config/types.js";
import { createDocRegistry, type DocRegistry, resolveBinary } from "../src/doc/registry.js";
import { writeFakeServer } from "./doc-lsp-fake.js";

const open: DocRegistry[] = [];

function config(doc: Partial<AhConfig["doc"]>): AhConfig {
	return { ...DEFAULT_CONFIG, doc: { ...DEFAULT_CONFIG.doc, ...doc } };
}

function registry(cfg: AhConfig, root: string): DocRegistry {
	const made = createDocRegistry(cfg, root);
	open.push(made);
	return made;
}

const rustServer: DocServerConfig = {
	id: "rust-analyzer",
	command: "rust-analyzer",
	extensions: [".rs"],
};

afterEach(() => {
	for (const r of open.splice(0)) r.dispose();
});

describe("resolveBinary", () => {
	it("finds a command on PATH and rejects one that is absent", async () => {
		const dir = await mkdtemp(join(tmpdir(), "ah-bin-"));
		const bin = join(dir, "faux-server");
		await writeFile(bin, "#!/bin/sh\n");
		await chmod(bin, 0o755);
		const env = { PATH: `${dir}:/nonexistent` };
		expect(resolveBinary("faux-server", env)).toBe(bin);
		expect(resolveBinary("definitely-not-here", env)).toBeNull();
	});

	it("checks an explicit path directly rather than searching PATH", async () => {
		const dir = await mkdtemp(join(tmpdir(), "ah-bin-"));
		const notExecutable = join(dir, "data.txt");
		await writeFile(notExecutable, "x");
		expect(resolveBinary(execPath, {})).toBe(execPath);
		expect(resolveBinary(notExecutable, {})).toBeNull();
	});
});

describe("createDocRegistry", () => {
	it("uses the bundled TypeScript engine for .ts, with no server installed", async () => {
		const root = await mkdtemp(join(tmpdir(), "ah-reg-"));
		const file = join(root, "a.ts");
		await writeFile(file, "export function greet(who: string): string {\n\treturn who;\n}\n");
		const choice = await registry(config({}), root).for(file);
		expect(choice.reason).toBeUndefined();
		expect(choice.provider?.id).toBe("typescript");
	});

	it("explains that no server is configured, naming the extension", async () => {
		const root = await mkdtemp(join(tmpdir(), "ah-reg-"));
		const choice = await registry(config({}), root).for(join(root, "main.rs"));
		expect(choice.provider).toBeNull();
		expect(choice.reason).toContain(".rs");
		expect(choice.reason).toContain("doc.servers");
	});

	it("explains that a configured server's binary is not on PATH", async () => {
		const root = await mkdtemp(join(tmpdir(), "ah-reg-"));
		const cfg = config({ servers: [rustServer] });
		const choice = await registry(cfg, root).for(join(root, "main.rs"));
		expect(choice.provider).toBeNull();
		expect(choice.reason).toContain("rust-analyzer");
		expect(choice.reason).toContain("not on PATH");
	});

	it("uses a configured server whose binary resolves, and caches it", async () => {
		const fake = await writeFakeServer();
		const cfg = config({
			servers: [{ id: "fake", command: execPath, args: fake.args(), extensions: [".rs"] }],
		});
		const reg = registry(cfg, fake.dir);
		const choice = await reg.for(fake.file);
		expect(choice.reason).toBeUndefined();
		expect(choice.provider?.id).toBe("lsp:fake");
		// Cached: a second lookup is the same instance, so the index is paid for
		// once rather than once per keystroke in the doc panel.
		expect((await reg.for(fake.file)).provider).toBe(choice.provider);
		expect((await choice.provider?.docAt(fake.file, 3, 5))?.name).toBe("greet");
	});

	it("refuses when the feature is off, or the file has no extension", async () => {
		const root = await mkdtemp(join(tmpdir(), "ah-reg-"));
		const off = await registry(config({ enabled: false }), root).for(join(root, "a.ts"));
		expect(off.provider).toBeNull();
		expect(off.reason).toContain("doc.enabled");
		const bare = await registry(config({}), root).for(join(root, "Makefile"));
		expect(bare.provider).toBeNull();
		expect(bare.reason).toContain("no extension");
	});

	it("says so instead of respawning once a server has stopped responding", async () => {
		const fake = await writeFakeServer();
		const cfg = config({
			servers: [
				{ id: "fake", command: execPath, args: fake.args({ dieAfter: 0 }), extensions: [".rs"] },
			],
		});
		const reg = registry(cfg, fake.dir);
		const first = await reg.for(fake.file);
		expect(await first.provider?.docAt(fake.file, 3, 5)).toBeNull(); // kills it
		await new Promise((r) => setTimeout(r, 50));
		const second = await reg.for(fake.file);
		expect(second.provider).toBeNull();
		expect(second.reason).toContain("stopped responding");
	});

	it("ships no servers by default, so nothing is ever spawned unasked", () => {
		expect(DEFAULT_CONFIG.doc.servers).toEqual([]);
		expect(DEFAULT_CONFIG.doc.enabled).toBe(true);
	});
});
