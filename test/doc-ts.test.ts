/**
 * The documentation engine that works on a machine with no language server:
 * the TypeScript compiler API behind the DocProvider contract.
 *
 * The assertion this suite exists for is ONE-BASEDNESS. The compiler speaks
 * 0-based line/character and flat offsets; the contract and the workbench
 * speak 1-based line/col. An off-by-one does not throw — it quietly documents
 * the character next door — so every location here is checked against a
 * position the test computed itself from the source text.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { withDocCache } from "../src/doc/cache.js";
import { createTsProvider } from "../src/doc/ts-provider.js";
import { disposeService, serviceStatus } from "../src/doc/ts-service.js";
import type { DocProvider } from "../src/doc/types.js";
import { type DocFixture, docProject, GREET_TS, posOf, USE_TS } from "./doc-fixture.js";

let t: DocFixture;
let doc: DocProvider;

beforeAll(async () => {
	t = docProject();
	const made = await createTsProvider(t.root, { fileCap: 100 });
	if (!made.ok) throw new Error(made.reason);
	doc = made.provider;
});

afterAll(() => {
	doc?.dispose();
	disposeService();
	t.cleanup();
});

const decl = posOf(GREET_TS, "greet(who: string)");

it("documents a function: signature, prose, and JSDoc tags", async () => {
	const d = await doc.docAt(t.greet, decl.line, decl.col);
	expect(d?.name).toBe("greet");
	expect(d?.kind).toBe("function");
	expect(d?.signature).toBe("function greet(who: string): string");
	expect(d?.docs).toBe("Greets a person by name.");
	expect(d?.tags).toEqual([
		{ name: "param", text: "who the name to greet" },
		{ name: "returns", text: "the greeting line" },
	]);
	expect(d?.provider).toBe("typescript");
	expect(d?.truncated).toBeUndefined();
});

it("reports the definition in 1-based line/col", async () => {
	const d = await doc.docAt(t.greet, decl.line, decl.col);
	expect(d?.defined).toMatchObject({ file: t.greet, line: decl.line, col: decl.col });
	// The span is 1-based and end-exclusive: "greet" is five characters.
	expect(d?.defined?.endLine).toBe(decl.line);
	expect(d?.defined?.endCol).toBe(decl.col + "greet".length);
	// Sanity on the fixture's own maths: line 6, and the source line agrees.
	expect(GREET_TS.split("\n")[decl.line - 1]?.slice(decl.col - 1)).toMatch(/^greet\(who/);
});

it("finds usages across files, and does not count the declaration as one", async () => {
	const d = await doc.docAt(t.greet, decl.line, decl.col);
	const call = posOf(USE_TS, 'greet("world")');
	expect(d?.referenceCount).toBe(d?.references.length);
	expect(d?.references).toContainEqual({
		file: t.use,
		line: call.line,
		col: call.col,
		endLine: call.line,
		endCol: call.col + "greet".length,
	});
	// USAGES means usages. `getReferencesAtPosition` includes the declaration and
	// LSP's `includeDeclaration: false` does not, so the field would mean two
	// things per engine and the panel would print the declaration as usage #1
	// directly under "Defined in". The one use inside greet.ts is Greeter.all's.
	expect(d?.references).not.toContainEqual(d?.defined);
	expect(d?.references.filter((r) => r.line === decl.line)).toEqual([]);
	const inGreet = d?.references.filter((r) => r.file === t.greet) ?? [];
	expect(inGreet.map((r) => r.line)).toEqual([posOf(GREET_TS, "greet(p.name)").line]);
	// use.ts imports it and calls it; greet.ts uses it once inside Greeter.all.
	expect(d?.referenceCount).toBe(3);
});

it("documents an interface and a class method", async () => {
	const iface = posOf(GREET_TS, "Person {");
	const person = await doc.docAt(t.greet, iface.line, iface.col);
	expect(person?.kind).toBe("interface");
	expect(person?.signature).toBe("interface Person");
	const method = posOf(GREET_TS, "all(people");
	const all = await doc.docAt(t.greet, method.line, method.col);
	expect(all?.kind).toBe("method");
	expect(all?.signature).toBe("(method) Greeter.all(people: Person[]): string");
	expect(all?.docs).toBe("Greets everyone in the room.");
});

it("outlines a file in SOURCE order, with nesting depth and no closures", async () => {
	const items = await doc.outline(t.greet);
	// Source order, not alphabetical: the strip sits beside the file and
	// `outlineClick` navigates by line, so a name-sorted list cannot track it.
	// And a callback inside a function body is not a landmark you scroll to.
	expect(items.map((i) => `${i.depth}:${i.name}`)).toEqual([
		"0:greet",
		"0:Person",
		"1:name",
		"0:Greeter",
		"1:all",
	]);
	expect(items.map((i) => i.line)).toEqual([...items.map((i) => i.line)].sort((a, b) => a - b));
	expect(items.find((i) => i.name === "greet")).toMatchObject({
		kind: "function",
		line: decl.line,
		depth: 0,
	});
	expect(items.every((i) => i.line >= 1 && i.name !== "")).toBe(true);
	expect(await doc.outline(`${t.root}/README.md`)).toEqual([]);
});

it("keeps imports out of the structure view", async () => {
	// `use.ts` imports `greet`; an import alias is the top of a file, not its
	// shape, and 13 of 31 top-level rows on a real file were exactly this.
	const items = await doc.outline(t.use);
	expect(items.map((i) => i.name)).toEqual(["line"]);
	expect(items.every((i) => i.kind !== "alias")).toBe(true);
});

it("answers null instead of throwing when there is no symbol", async () => {
	expect(doc.supports(t.greet)).toBe(true);
	expect(doc.supports(`${t.root}/README.md`)).toBe(false);
	expect(await doc.docAt(t.greet, 8, 1)).toBeNull(); // a blank line
	expect(await doc.docAt(t.greet, 9999, 1)).toBeNull(); // past the end
	expect(await doc.docAt(t.greet, 0, 0)).toBeNull(); // not 1-based
	expect(await doc.docAt(`${t.root}/README.md`, 1, 1)).toBeNull(); // unsupported
	expect(await doc.docAt("/nope/absent.ts", 1, 1)).toBeNull(); // outside the project
});

it("refuses a project over the file cap, with a reason", async () => {
	const big = docProject(
		Object.fromEntries([1, 2, 3].map((n) => [`f${n}.ts`, "export const x = 1;\n"])),
	);
	const made = await createTsProvider(big.root, { fileCap: 2 });
	expect(made.ok).toBe(false);
	expect(made.ok === false && made.reason).toMatch(/more than 2 source files/);
	expect(serviceStatus()).toMatchObject({ state: "refused", root: big.root });
	big.cleanup();
});
