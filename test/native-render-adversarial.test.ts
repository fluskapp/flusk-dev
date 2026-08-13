/**
 * Adversarial half of the render differential: hand-built documents that aim
 * at every edge the reference owns — unclosed fences, wrapped tables, deep
 * lists, CRLF, frontmatter look-alikes — plus the injection corpus that
 * re-proves the escaping guarantee on BOTH implementations, byte for byte.
 */
import { describe, expect, it } from "vitest";
import { nativeRenderModule } from "../src/platform/native/render.js";
import { renderMarkdown } from "../src/ui/render/markdown.js";

const native = nativeRenderModule();
const describeNative = native === null ? describe.skip : describe;
const nat = native as NonNullable<typeof native>;

const ADVERSARIAL: string[] = [
	"```ts\nconst a = 1\nno closing fence ever",
	"````\n```ts\ninner fence stays code\n```\n````\ntail",
	"```\n@@ -1,2 +3,4 @@\n-old\n+new\n```", // diff sniffing on a bare fence
	"```\ndiff --git a/x b/x\nindex abcd1234..ef567890 100644\n--- a/x\n+++ b/x\n```",
	"| a | b |\n|---|:-:|\n| 1 | 2 |\n| wrapped\nstill row |\n| 3 | 4 |",
	"| a | b |\n|---|---|\n| never closes\n\nprose after the torn row",
	"| x |\n|--|\n|| || |||",
	"- a\n  - b\n    - c\n      - d\n1. one\n2. two\n  - mixed\n* stars",
	"- [ ] todo\n- [x] done\n- [X] DONE\n-   spaced marker",
	"# h1\n####### not a heading\n###no space\n## trailing ##\n",
	"> quote\n> continues\n>bare\nnot quote",
	"---\ntitle: doc\nstages.build: ok\nwrapped: \"open\nclose\"\n---\n# body",
	"---\njust a rule opener, no keys\n---\nthis section must survive",
	"---\r\ntitle: crlf\r\n---\r\nbody stays because CRLF never parses",
	"a\r\nb\rc d e",
	"*em* **strong** ***both*** _under_ a_b_c __notmd__ `code **not**`",
	"[t](https://x.y) [u](javascript:alert(1)) [v]() [w](/rel) ![img](x)",
	"[nest `code` and **bold**](https://x.y/p?a=1&b=2)",
	"para one\npara same\n# heading interrupts\npara two\n- list interrupts",
	" 　nbsp-indented list?\n - item",
	"``` ts\nweird ws info\n```",
	"``` \n\n```\nempty fence",
	"`` ` `` inline backtick soup ``` not a fence mid-line",
	"ends with opener **",
	"**\n\n*\n\n_\n\n`",
];

const SECURITY: string[] = [
	"<script>alert(1)</script>",
	"# <script>x</script>\n- <iframe src=x></iframe>\n> <svg onload=alert(1)>",
	'<img src=x onerror="alert(1)">',
	"[click](javascript:alert(1))",
	"[click](javascript:alert(1))",
	"[click](JaVaScRiPt:alert(1))",
	"[click](data:text/html,<script>alert(1)</script>)",
	"[click](//evil.example/x)",
	"[click](vbscript:msgbox)",
	'[x](https://a.b/"onmouseover="alert(1))',
	"| <script>a</script> | b |\n|---|---|\n| \"quoted\" & ampersand | <b>c</b> |",
	"```html\n<script>alert(1)</script>\n```",
	"```\n</code></pre><script>alert(1)</script>\n```",
	"- <script>li</script>\n- [x] <script>task</script>",
	"&lt;already&gt; &amp; \"entities\" <not>",
];

describeNative("native markdown ≡ TS on adversarial documents", () => {
	it("agrees byte-for-byte on every adversarial snippet", () => {
		for (const doc of ADVERSARIAL) {
			expect(nat.renderMarkdownHtml(doc), JSON.stringify(doc.slice(0, 50))).toBe(
				renderMarkdown(doc),
			);
		}
	});

	it("escapes injection attempts identically, and actually escapes them", () => {
		for (const doc of SECURITY) {
			const ts = renderMarkdown(doc);
			const rs = nat.renderMarkdownHtml(doc);
			expect(rs, JSON.stringify(doc.slice(0, 50))).toBe(ts);
			// The guarantee itself, re-proven on BOTH implementations: no tag
			// or scheme from the source survives into the HTML.
			for (const html of [ts, rs]) {
				expect(html).not.toMatch(/<script|<img|<svg|<iframe/i);
				expect(html).not.toMatch(/href="[^"]*(?:javascript|vbscript|data):/i);
				expect(html).not.toMatch(/<[a-z]+ on[a-z]+=/i);
			}
		}
	});

	it("highlight escapes fence bodies identically on both paths", () => {
		const body = '</code></pre><script>alert(1)</script> "quotes" & <amps>';
		for (const lang of ["ts", "python", "diff", "yaml", "md", "unknown"]) {
			const doc = `\`\`\`${lang}\n${body}\n\`\`\``;
			const ts = renderMarkdown(doc);
			const rs = nat.renderMarkdownHtml(doc);
			expect(rs, lang).toBe(ts);
			expect(rs).not.toMatch(/<script/i);
		}
	});
});
