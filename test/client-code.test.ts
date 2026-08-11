/**
 * The code viewer's one non-obvious half: turning highlighted HTML into
 * clickable positions — and the wiring that makes any of it reachable.
 *
 * The pass is pure string work, so it is evaluated here and run for real
 * rather than pattern-matched — an assertion that the module "contains
 * data-line" would stay green with the column arithmetic off by one, which is
 * exactly the bug that makes a lookup document the character next door.
 *
 * The second half of this file exists because the viewer was, for a while,
 * dead code: `openCode` was defined and called from nowhere, so no identifier
 * was ever clickable and the Documentation window could only ever show its
 * empty state. Declarations are not enough; a CALL SITE is asserted.
 */
import { expect, it } from "vitest";
import { CLIENT_CODE_JS } from "../src/ui/client-code.js";
import { CLIENT_CODE_OUTLINE_JS } from "../src/ui/client-code-outline.js";
import { CLIENT_FILE_JS } from "../src/ui/client-file.js";
import { highlightCode } from "../src/ui/highlight.js";

interface CodeApi {
	codePositions(html: string): string;
	codeGutter(text: string): string;
	C: { capped?: boolean };
}

/** The module is plain JS in a string; this is the only way to execute it. */
const api = new Function(
	`${CLIENT_CODE_JS}\nreturn { codePositions: codePositions, codeGutter: codeGutter, C: C };`,
)() as CodeApi;

const SRC = "const a = greet(x);\nconst b = a && c;\n";

it("wraps every identifier with the 1-based position it starts at", () => {
	const out = api.codePositions(highlightCode(SRC, "ts"));
	// Columns counted by hand from SRC: `greet` is the 11th character.
	expect(out).toContain('<span class="idn" data-line="1" data-col="11">greet</span>');
	expect(out).toContain('<span class="idn" data-line="1" data-col="17">x</span>');
	// `&amp;` is ONE column of the file, not five characters of HTML — and the
	// entity itself is passed through untouched, since escaping is the server's.
	expect(out).toContain("&amp;&amp;");
	expect(out).toContain('<span class="idn" data-line="2" data-col="16">c</span>');
	// The highlighter's markup survives, nested rather than replaced.
	expect(out).toContain('<span class="hl-kw"><span class="idn" data-line="1" data-col="1">const');
	// Every identifier is a target, including keywords and words in comments:
	// the position is the question, and the server answers "no symbol" for the
	// ones that are not symbols.
	expect(out.match(/class="idn"/g)).toHaveLength(8);
});

it("keeps a non-ASCII identifier as ONE click target", () => {
	// `[A-Za-z_$]` rendered `gréet` as two separate spans and gave a CJK name
	// none at all, so the column the server was sent named the wrong character.
	const out = api.codePositions("const gréet = 1;\nconst 名前 = gréet;\n");
	expect(out).toContain('<span class="idn" data-line="1" data-col="7">gréet</span>');
	expect(out).toContain('<span class="idn" data-line="2" data-col="7">名前</span>');
	// And the multi-byte name does not shift the column of what follows it.
	expect(out).toContain('<span class="idn" data-line="2" data-col="12">gréet</span>');
});

it("stops emitting click targets on a file big enough to hang the tab", () => {
	// A minified bundle is one line of 120,000 identifiers; wrapping them all
	// produced 12.8MB of DOM. Past the budget the source still renders.
	const huge = `${Array.from({ length: 25_000 }, (_, i) => `a${i}`).join(" ")}\n`;
	const out = api.codePositions(huge);
	const spans = out.match(/class="idn"/g) ?? [];
	expect(spans.length).toBeLessThanOrEqual(20_000);
	expect(api.C.capped).toBe(true);
	expect(out).toContain("a24999"); // still all there, just not all clickable
});

it("numbers one gutter row per line", () => {
	const rows = api.codeGutter(SRC).match(/data-gl="\d+"/g) ?? [];
	// Three: two lines of code and the empty one after the trailing newline.
	expect(rows).toEqual(['data-gl="1"', 'data-gl="2"', 'data-gl="3"']);
});

it("resolves a click into a /api/doc lookup for that position", () => {
	expect(CLIENT_CODE_JS).toContain('closest("[data-line][data-col]")');
	expect(CLIENT_CODE_JS).toContain("codeLookup(C.file, C.at.line, C.at.col)");
	expect(CLIENT_CODE_JS).toContain('"/api/doc?file=" + encodeURIComponent(file)');
	// One request: the server folds the history half in beside the signature.
	expect(CLIENT_CODE_JS).not.toContain("/api/related");
});

it("hands the answer to the documentation window, or announces it", () => {
	expect(CLIENT_CODE_JS).toContain('typeof showSymbolDoc === "function"');
	expect(CLIENT_CODE_JS).toContain('new CustomEvent("ah-doc"');
});

it("opens a file at a line, and lists its structure", () => {
	// What Find in Files and go-to-definition call.
	expect(CLIENT_CODE_OUTLINE_JS).toContain("async function openCode(path, line, host)");
	expect(CLIENT_CODE_OUTLINE_JS).toContain('"/api/source?file=" + encodeURIComponent(path)');
	expect(CLIENT_CODE_JS).toContain("function codeGoto(line)");
	expect(CLIENT_CODE_JS).toContain('.code-gutter .gl[data-gl="');
	expect(CLIENT_CODE_OUTLINE_JS).toContain('"/api/doc/outline?file=" + encodeURIComponent(path)');
	expect(CLIENT_CODE_OUTLINE_JS).toContain('if (row) codeGoto(+row.getAttribute("data-gl"));');
	// The strip prints the server's reason rather than a reasonless line.
	expect(CLIENT_CODE_OUTLINE_JS).toContain('esc((d && d.note) || "no structure for this file")');
});

it("is REACHED: the file tab routes source through the viewer", () => {
	// The bug this pins: every one of the assertions above passed while nothing
	// in the shipped client ever called any of it.
	expect(CLIENT_FILE_JS).toContain("await openCodeInto(host, t.ref, t.line || 0)");
	const calls = CLIENT_FILE_JS.match(/openCodeInto\(/g) ?? [];
	expect(calls.length).toBeGreaterThan(0);
	// And it falls through rather than throwing, so a journal still opens.
	expect(CLIENT_CODE_OUTLINE_JS).toContain("catch (e) { return false; }");
	expect(CLIENT_FILE_JS).toContain("if (await fileAsText(host, t)) return;");
	expect(CLIENT_FILE_JS).toContain("filePeek(host, t);");
});
