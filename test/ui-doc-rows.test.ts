/**
 * The Documentation window's one security rule, exercised rather than
 * pattern-matched: NOTHING the server sends is interpolated unescaped.
 *
 * A symbol name, a doc tag, a path, a commit subject and a `why` clause all
 * originate in a repository — a branch can name a function `</span><script>`
 * — so the row builders are compiled here and run over hostile values, and
 * the output is checked for markup. The only HTML the panel ever inserts
 * unescaped is what POST /api/render returned, which the server escaped.
 */
import { expect, it } from "vitest";
import { CLIENT_CORE_JS } from "../src/ui/client-core.js";
import { CLIENT_DOC_ROWS_JS } from "../src/ui/client-doc-rows.js";

interface Rows {
	docSections(p: unknown): string;
	docRelRow(it: unknown): string;
	docUses(doc: unknown): string;
}

/** esc/base come from the client's own vocabulary, not from a stub. */
const rows = new Function(
	`${CLIENT_CORE_JS}${CLIENT_DOC_ROWS_JS}
	return { docSections: docSections, docRelRow: docRelRow, docUses: docUses };`,
)() as Rows;

const XSS = '"><img src=x onerror="alert(1)"></span><script>bad()</script>';

const clean = (html: string): void => {
	expect(html).not.toContain("<img");
	expect(html).not.toContain("<script");
	expect(html).not.toContain('onerror="alert');
	// The value is still THERE — escaped, not dropped: a panel that silently
	// deletes a symbol's name is a panel that lies about the symbol.
	expect(html).toContain("&lt;script&gt;");
};

const doc = (over: Record<string, unknown> = {}): unknown => ({
	name: XSS,
	kind: XSS,
	signature: `function ${XSS}(): void`,
	docs: "",
	tags: [{ name: XSS, text: XSS }],
	defined: { file: `/tmp/${XSS}.ts`, line: 3, col: 5 },
	references: [{ file: `/tmp/${XSS}.ts`, line: 9, col: 1 }],
	referenceCount: 42,
	provider: "typescript",
	...over,
});

it("escapes every field of a symbol, tags and locations included", () => {
	const html = rows.docSections({ doc: doc(), related: null, file: "/tmp/a.ts" });
	clean(html);
	// The sections themselves are all present, in IntelliJ's reading order.
	const order = [
		"Signature",
		"Documentation",
		"Parameters and returns",
		"Defined in",
		"Usages",
		"Related",
	];
	let at = -1;
	for (const title of order) {
		const next = html.indexOf(`<h4>${title}</h4>`);
		expect(next).toBeGreaterThan(at);
		at = next;
	}
});

it("escapes a related row's title, ref and why clause", () => {
	const html = rows.docRelRow({ title: XSS, ref: XSS, kind: "commit", at: XSS, why: XSS });
	clean(html);
	// A commit opens its history card; everything else is an openRef target.
	expect(html).toContain('data-doc="commit:');
	expect(rows.docRelRow({ title: "t", ref: "/x/j.md", kind: "doc", at: "", why: "w" })).toContain(
		'data-doc="ref:/x/j.md"',
	);
});

it("states the true usage count and the cap that shortened the list", () => {
	const html = rows.docUses(doc({ truncated: true }));
	clean(html);
	expect(html).toContain("42 usages");
	expect(html).toContain("first 1 shown");
	expect(rows.docUses(doc({ references: [], referenceCount: 0 }))).toContain(
		"no usages in the indexed sources",
	);
	expect(rows.docUses(doc({ referenceCount: 1 }))).toContain("1 usage<");
});

it("renders the related section even when there is no history at all", () => {
	const empty = rows.docSections({ doc: doc(), related: null, note: XSS });
	clean(empty);
	const none = rows.docSections({
		doc: doc(),
		related: { commits: [], runs: [], docs: [], mentions: 0 },
	});
	expect(none).toContain("nothing in the history index mentions this symbol yet");
	expect(none).toContain("0 literal mentions across your projects");
});
