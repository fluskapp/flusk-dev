import { expect, it } from "vitest";
import { highlightCode } from "../src/ui/render/highlight.js";

/** Every span the highlighter emits, as [class, text] pairs. */
function spans(html: string): [string, string][] {
	const out: [string, string][] = [];
	const re = /<span class="(hl-[\w-]+)">([^<]*)<\/span>/g;
	for (let m = re.exec(html); m !== null; m = re.exec(html)) {
		out.push([m[1] ?? "", m[2] ?? ""]);
	}
	return out;
}

/** Spans hold escaped text, so the needle is escaped the same way. */
function classOf(html: string, text: string): string | undefined {
	const needle = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
	return spans(html).find(([, t]) => t === needle)?.[0];
}

it("highlights TypeScript keywords, strings, numbers, comments and calls", () => {
	const html = highlightCode('// note\nconst n = 42;\nawait send("hi");', "ts");
	expect(classOf(html, "// note")).toBe("hl-com");
	expect(classOf(html, "const")).toBe("hl-kw");
	expect(classOf(html, "42")).toBe("hl-num");
	expect(classOf(html, '"hi"')).toBe("hl-str");
	expect(classOf(html, "send")).toBe("hl-fn");
	expect(classOf(html, ";")).toBe("hl-punct");
	// tsx/js/jsx are the same family, not an unknown language
	for (const lang of ["tsx", "js", "jsx", "TypeScript"]) {
		expect(classOf(highlightCode("const x = 1;", lang), "const")).toBe("hl-kw");
	}
});

it("highlights json keys apart from string values", () => {
	const html = highlightCode('{"name": "flusk", "n": 2, "ok": true}', "json");
	expect(classOf(html, '"name"')).toBe("hl-fn");
	expect(classOf(html, '"flusk"')).toBe("hl-str");
	expect(classOf(html, "2")).toBe("hl-num");
	expect(classOf(html, "true")).toBe("hl-kw");
});

it("highlights bash, rust, python and yaml", () => {
	const sh = highlightCode('# run\nfor f in *.ts; do echo "$f"; done', "bash");
	expect(classOf(sh, "# run")).toBe("hl-com");
	expect(classOf(sh, "for")).toBe("hl-kw");

	const rs = highlightCode("pub fn main() { let x: u32 = 7; }", "rust");
	expect(classOf(rs, "pub")).toBe("hl-kw");
	expect(classOf(rs, "main")).toBe("hl-fn");
	expect(classOf(rs, "7")).toBe("hl-num");

	const py = highlightCode('def go(n):\n    return "x" # tail', "python");
	expect(classOf(py, "def")).toBe("hl-kw");
	expect(classOf(py, "go")).toBe("hl-fn");
	expect(classOf(py, "# tail")).toBe("hl-com");

	const yml = highlightCode('# top\nstatus: failed\ncount: 3\nname: "flusk"', "yaml");
	expect(classOf(yml, "# top")).toBe("hl-com");
	expect(classOf(yml, "status")).toBe("hl-kw");
	expect(classOf(yml, "3")).toBe("hl-num");
	expect(classOf(yml, '"flusk"')).toBe("hl-str");
});

it("highlights markdown structure inside a fence", () => {
	const html = highlightCode("# Title\n- a `code` item\n> quoted", "md");
	expect(classOf(html, "# Title")).toBe("hl-kw");
	expect(classOf(html, "`code`")).toBe("hl-str");
	expect(classOf(html, "> quoted")).toBe("hl-com");
});

it("highlights diff added, removed and header lines", () => {
	const patch = [
		"diff --git a/x.ts b/x.ts",
		"index 1111111..2222222 100644",
		"--- a/x.ts",
		"+++ b/x.ts",
		"@@ -1,3 +1,3 @@",
		" context",
		"-const old = 1;",
		"+const now = 2;",
	].join("\n");
	const html = highlightCode(patch, "diff");
	expect(classOf(html, "-const old = 1;")).toBe("hl-del");
	expect(classOf(html, "+const now = 2;")).toBe("hl-add");
	// the file headers are metadata, not an added/removed line
	expect(classOf(html, "--- a/x.ts")).toBe("hl-meta");
	expect(classOf(html, "+++ b/x.ts")).toBe("hl-meta");
	expect(classOf(html, "@@ -1,3 +1,3 @@")).toBe("hl-meta");
	expect(classOf(html, "diff --git a/x.ts b/x.ts")).toBe("hl-meta");
	expect(html).toContain(" context");
	expect(highlightCode(patch, "patch")).toBe(html);
});

it("escapes the source on every path, including the ones it highlights", () => {
	const payload = "</code><script>alert(1)</script>";
	for (const lang of ["", "ts", "json", "bash", "rust", "python", "yaml", "md", "diff", "cobol"]) {
		const html = highlightCode(payload, lang);
		expect(html).not.toContain("<script");
		expect(html).not.toContain("</code>");
		// the only tags in the output are the highlighter's own spans; strip
		// them and nothing that could open a tag is left
		const text = html.replace(/<span class="hl-[\w-]+">/g, "").replace(/<\/span>/g, "");
		expect(text).not.toContain("<");
		expect(text).not.toContain(">");
		expect(text).toContain("&lt;");
		expect(text).toContain("&gt;");
	}
	// a string literal full of markup is still a string, still escaped
	const str = highlightCode('const a = "<img src=x onerror=boom>";', "ts");
	expect(str).toContain("&lt;img src=x onerror=boom&gt;");
	expect(str).not.toContain("<img");
	// attribute-quote injection through a value
	expect(highlightCode('{"a": "\\" onmouseover=x"}', "json")).not.toContain('"a"><');
});

it("returns escaped text unchanged for an unknown language and odd input", () => {
	expect(highlightCode("a < b && c", "brainfuck")).toBe("a &lt; b &amp;&amp; c");
	expect(highlightCode("", "ts")).toBe("");
	for (const odd of ['"unterminated', "/* open", "'", "```", "\\", "#", "@"]) {
		for (const lang of ["ts", "json", "bash", "python", "yaml", "md", "diff", ""]) {
			expect(() => highlightCode(odd, lang)).not.toThrow();
		}
	}
});
