/**
 * Position arithmetic, against the inputs that actually break it: TABS,
 * MULTI-BYTE characters and CRLF line endings.
 *
 * Every off-by-one in this feature is silent. It does not throw — it answers
 * about the character next door — so the only way to hold the line is to
 * compute the awkward positions by hand here and assert the exact numbers.
 * Three real bugs are pinned:
 *
 *  - `toLoc` wrote `endCol` INCLUSIVE while `ts-map.locIn` wrote it exclusive,
 *    so the two engines disagreed about the same span.
 *  - `wordAt` matched `[\w$]`, which is ASCII: it truncated `gréet` to `gr` and
 *    lost `名前` entirely — and that string is the name the panel shows, the
 *    key RELATED joins on, and the query Find in Files is handed.
 *  - `offsetAt` has to count a tab as ONE column and a CRLF as a line break,
 *    because that is what an editor gutter and the compiler both do.
 */
import { expect, it } from "vitest";
import { toLoc } from "../src/features/docs/lsp-convert.js";
import { wordAt } from "../src/features/docs/lsp-hover.js";
import { locIn, offsetAt } from "../src/features/docs/ts-map.js";
import { loadTypeScript } from "../src/features/docs/ts-service.js";

/** A source file the compiler can answer about, with no project around it. */
async function sourceFile(text: string): Promise<import("typescript").SourceFile> {
	const ts = await loadTypeScript();
	if (ts === null) throw new Error("typescript is required for this test");
	return ts.createSourceFile("/tmp/awkward.ts", text, ts.ScriptTarget.ES2022, true);
}

it("agrees with the TypeScript engine about where a span ends", async () => {
	// LSP 0:4–0:7, end-exclusive. Both contracts are end-EXCLUSIVE, so every
	// coordinate gains its +1 and a 3-character name at col 5 ends at col 8.
	expect(
		toLoc("/x.ts", { start: { line: 0, character: 4 }, end: { line: 0, character: 7 } }),
	).toEqual({ file: "/x.ts", line: 1, col: 5, endLine: 1, endCol: 8 });
	// The same span, computed by the TypeScript half from a real source file:
	// identical numbers, which is the agreement that used to be broken.
	const sf = await sourceFile("var abc = 1;\n");
	expect(locIn(sf, { start: 4, length: 3 })).toMatchObject({ line: 1, col: 5, endCol: 8 });
	// character 0 is the line boundary and becomes column 1, not a clamped 1
	// that hides a real 0. A zero-width range at the start of line 3:
	expect(
		toLoc("/x.ts", { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } }),
	).toEqual({ file: "/x.ts", line: 3, col: 1, endLine: 3, endCol: 1 });
});

it("counts a TAB as one column and a CRLF as one line break", async () => {
	// Two tabs, then `deep`. The identifier starts at column 3 — a tab is one
	// character of the file, whatever it looks like on screen.
	const text = "const a = 1;\r\n\t\tdeep;\r\nconst b = 2;\r\n";
	const sf = await sourceFile(text);
	const at = offsetAt(sf, 2, 3);
	expect(at).not.toBeNull();
	expect(text.slice(at as number, (at as number) + 4)).toBe("deep");
	// Round trip: that offset renders back as the same 1-based line/col.
	expect(locIn(sf, { start: at as number, length: 4 })).toMatchObject({
		line: 2,
		col: 3,
		endLine: 2,
		endCol: 7,
	});
	// The \r belongs to line 2, so col 7 is the last legal position on it and
	// the line after CRLF starts clean at col 1.
	expect(offsetAt(sf, 3, 1)).toBe(text.indexOf("const b"));
	expect(offsetAt(sf, 2, 99)).toBeNull(); // past the end of the line, not an error
	expect(wordAt(text, 2, 3)).toBe("deep"); // CRLF split, not a stray \r in the name
});

it("keeps a non-ASCII identifier whole", () => {
	// Measured before the fix: "gr", "" and "a" respectively.
	expect(wordAt("fn gréet(who: &str) {", 1, 4)).toBe("gréet");
	expect(wordAt("let 名前 = 1;", 1, 5)).toBe("名前");
	// An emoji is a Symbol, not a Letter, and no language flusk documents allows one
	// in an identifier — so it ENDS the name rather than being swallowed into it,
	// and the surrogate pair after it does not shift the columns either.
	expect(wordAt("let a😀b = 1;", 1, 5)).toBe("a");
	expect(wordAt("let a😀b = 1;", 1, 8)).toBe("b");
	// Still an identifier and not a phrase: punctuation and space still end it.
	expect(wordAt("gréet(x)", 1, 1)).toBe("gréet");
	expect(wordAt("café au lait", 1, 2)).toBe("café");
	expect(wordAt("  ", 1, 1)).toBe(""); // whitespace is not a symbol
	expect(wordAt("x", 9, 1)).toBe(""); // past the end is not an error
});

it("counts a multi-byte character as one column, matching the compiler", async () => {
	const text = "const gréet = 1;\nconst 名前 = gréet;\n";
	const sf = await sourceFile(text);
	// `gréet` on line 2 starts after "const " — column 7 in characters, even
	// though é is two bytes in UTF-8.
	const use = offsetAt(sf, 2, 12);
	expect(use).not.toBeNull();
	expect(text.slice(use as number, (use as number) + 5)).toBe("gréet");
	expect(locIn(sf, { start: use as number, length: 5 })).toMatchObject({
		line: 2,
		col: 12,
		endCol: 17,
	});
	expect(wordAt(text, 2, 12)).toBe("gréet");
	expect(wordAt(text, 2, 7)).toBe("名前");
});
