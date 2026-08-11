/**
 * The provider half: LSP's shapes → the frozen SymbolDoc contract.
 *
 * The assertion that earns this file is the position round trip. The fake
 * echoes the line/character it was SENT into its hover text, so
 * `docAt(file, 3, 5)` proving out as `seen=2:4` is direct evidence of the
 * 1-based → 0-based conversion, not a restatement of the code.
 */
import { writeFile } from "node:fs/promises";
import { execPath } from "node:process";
import { afterEach, describe, expect, it } from "vitest";
import { createLspProvider, type LspDocProvider } from "../src/doc/lsp-provider.js";
import { type Fake, FIXTURE, writeFakeServer } from "./doc-lsp-fake.js";

const providers: LspDocProvider[] = [];

function provider(fake: Fake, options = {}): LspDocProvider {
	const made = createLspProvider({
		id: "fake",
		command: execPath,
		args: fake.args(options),
		extensions: [".rs"],
		root: fake.dir,
		cwd: fake.dir,
		timeoutMs: 4000,
	});
	providers.push(made);
	return made;
}

afterEach(() => {
	for (const p of providers.splice(0)) p.dispose();
});

describe("createLspProvider", () => {
	it("answers about the position it was asked about, converted to 0-based", async () => {
		const fake = await writeFakeServer();
		const doc = await provider(fake).docAt(fake.file, 3, 5);
		expect(doc).not.toBeNull();
		expect(doc?.docs).toContain("seen=2:4");
		expect(doc?.name).toBe("greet"); // the identifier under 3:5 in the fixture
		expect(doc?.provider).toBe("lsp");
	});

	it("splits the hover fence into a signature and its tags", async () => {
		const fake = await writeFakeServer();
		const doc = await provider(fake).docAt(fake.file, 3, 5);
		expect(doc?.signature).toBe("fn greet(who: &str) -> String");
		expect(doc?.docs).toContain("Greets who warmly.");
		expect(doc?.docs).not.toContain("@param"); // tags are lifted out of prose
		expect(doc?.tags).toEqual([
			{ name: "param", text: "who the name to greet" },
			{ name: "returns", text: "the greeting" },
		]);
	});

	it("converts definition and references to 1-based, end-EXCLUSIVE spans", async () => {
		const fake = await writeFakeServer();
		const doc = await provider(fake).docAt(fake.file, 3, 5);
		// Both ends are exclusive (types.ts: "a 3-character name at col 5 ends at
		// col 8"), so every coordinate simply gains its +1: LSP 9:3–9:8 becomes
		// line 10, col 4, endCol 9 — a 5-character name spanning cols 4..8. The
		// TypeScript engine says the same thing for the same span (ts-map.locIn),
		// which is the agreement this pins.
		expect(doc?.defined).toEqual({
			file: fake.file,
			line: 10,
			col: 4,
			endLine: 10,
			endCol: 9,
		});
		expect((doc?.defined?.endCol ?? 0) - (doc?.defined?.col ?? 0)).toBe(5);
		expect(doc?.references.map((r) => `${r.line}:${r.col}-${r.endCol}`)).toEqual([
			"21:5-10",
			"31:1-6",
		]);
		expect(doc?.referenceCount).toBe(2);
		expect(doc?.truncated).toBeUndefined();
	});

	it("kinds the symbol from documentSymbol and nests the outline", async () => {
		const fake = await writeFakeServer();
		const engine = provider(fake);
		expect((await engine.docAt(fake.file, 3, 5))?.kind).toBe("function");
		expect(await engine.outline(fake.file)).toEqual([
			{ name: "greet", kind: "function", line: 3, depth: 0 },
			{ name: "who", kind: "variable", line: 3, depth: 1 },
		]);
	});

	it("re-syncs the document after an edit, instead of answering stale text", async () => {
		// LSP is stateful: a server answers about the text it was HANDED. Without a
		// didChange the panel showed the NEW symbol's name (read off disk here)
		// beside the OLD symbol's signature, docs, definition and usages — and the
		// mtime-keyed cache above it believed the whole card was fresh.
		const fake = await writeFakeServer();
		const engine = provider(fake);
		expect((await engine.docAt(fake.file, 3, 5))?.docs).toContain("changes=0");
		await writeFile(fake.file, `// edited\n${FIXTURE}`);
		const after = await engine.docAt(fake.file, 4, 5);
		expect(after?.docs).toContain("changes=1"); // the server was told
		expect(after?.name).toBe("greet"); // and the name still comes off the disk
		// Unchanged since: no second didChange for a file nobody touched.
		expect((await engine.docAt(fake.file, 4, 5))?.docs).toContain("changes=1");
	});

	it("supports only its configured extensions", async () => {
		const fake = await writeFakeServer();
		const engine = provider(fake);
		expect(engine.supports(fake.file)).toBe(true);
		expect(engine.supports("/tmp/x.py")).toBe(false);
		// An unsupported file never spawns the server, so nothing to dispose.
		expect(await engine.docAt("/tmp/x.py", 1, 1)).toBeNull();
		expect(await engine.outline("/tmp/x.py")).toEqual([]);
	});

	it("stops answering, rather than throwing, once the server dies", async () => {
		const fake = await writeFakeServer();
		// One full lookup is four requests; the fifth kills the fake.
		const engine = provider(fake, { dieAfter: 4 });
		expect((await engine.docAt(fake.file, 3, 5))?.signature).toBe("fn greet(who: &str) -> String");
		expect(await engine.outline(fake.file)).toEqual([]); // the request that kills it
		expect(engine.available()).toBe(false);
		// And a dead server answers null, not a card built from the word this
		// process happened to read off disk itself.
		expect(await engine.docAt(fake.file, 3, 5)).toBeNull();
	});

	it("answers null for a language server that is not installed", async () => {
		const fake = await writeFakeServer();
		const engine = createLspProvider({
			id: "absent",
			command: "ah-no-such-language-server",
			extensions: [".rs"],
			root: fake.dir,
			timeoutMs: 500,
		});
		providers.push(engine);
		expect(await engine.docAt(fake.file, 3, 5)).toBeNull();
		expect(engine.available()).toBe(false);
	});
});
