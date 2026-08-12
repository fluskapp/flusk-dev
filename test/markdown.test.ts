import { expect, it } from "vitest";
import { renderMarkdown } from "../src/ui/render/markdown.js";

it("escapes HTML so a document can never inject markup", () => {
	const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="boom">');
	expect(html).not.toContain("<script>");
	expect(html).not.toContain("<img");
	expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
	expect(html).toContain("&quot;boom&quot;");
});

it("renders headings, paragraphs and rules", () => {
	expect(renderMarkdown("# One")).toBe("<h1>One</h1>");
	expect(renderMarkdown("#### Four")).toBe("<h4>Four</h4>");
	expect(renderMarkdown("hello\nworld")).toBe("<p>hello world</p>");
	expect(renderMarkdown("a\n\n---\n\nb")).toBe("<p>a</p>\n<hr>\n<p>b</p>");
	expect(renderMarkdown("***")).toBe("<hr>");
});

it("renders inline emphasis, code spans and blockquotes", () => {
	expect(renderMarkdown("**b** *i* _i2_ `c`")).toBe(
		"<p><strong>b</strong> <em>i</em> <em>i2</em> <code>c</code></p>",
	);
	expect(renderMarkdown("> quoted **thing**\n> more")).toBe(
		"<blockquote><p>quoted <strong>thing</strong> more</p></blockquote>",
	);
});

it("leaves snake_case identifiers alone — `_` emphasises only at word edges", () => {
	// A journal records branch names and constants; emphasis must not rewrite
	// them. Regression: `yarden_sprint2_47_restorehook` came back as
	// `yarden<em>sprint2</em>47_restorehook` from a real run journal.
	for (const src of [
		"snake_case_name",
		"MAX_FILES and MAX_MATCHES",
		"yarden_sprint2_47_restorehook",
		"file_name_test.ts",
		"do__not__break",
		"a_b_c_d_e",
	]) {
		const html = renderMarkdown(src);
		expect(html).toBe(`<p>${src}</p>`);
		expect(html).not.toContain("<em>");
	}
	// Word-edge underscores still emphasise, including next to punctuation.
	expect(renderMarkdown("a _real one_ here")).toBe("<p>a <em>real one</em> here</p>");
	expect(renderMarkdown("_start_ and (_paren_)")).toBe(
		"<p><em>start</em> and (<em>paren</em>)</p>",
	);
	// `*` is unaffected: it is the intraword emphasis marker.
	expect(renderMarkdown("in*ter*nal")).toBe("<p>in<em>ter</em>nal</p>");
});

it("renders fenced code with a language class and no inline formatting inside", () => {
	const html = renderMarkdown("```ts\nconst a = **b** <x> `c`;\n```");
	expect(html.startsWith('<pre class="code"><code class="lang-ts">')).toBe(true);
	expect(html.endsWith("</code></pre>")).toBe(true);
	// markdown stays inert inside a fence; the source is still escaped
	expect(html).not.toContain("<strong>");
	const text = html.replace(/<span class="hl-[\w-]+">|<\/span>/g, "");
	expect(text).toContain("&lt;x&gt;");
	expect(text).toContain("**b**");
	// …but the language is highlighted (see highlight.test.ts for the rules)
	expect(html).toContain('<span class="hl-kw">const</span>');
	expect(renderMarkdown("```\nplain\n```")).toBe('<pre class="code"><code>plain</code></pre>');
	// an unknown language is a plain, escaped block with its class kept
	expect(renderMarkdown("```cobol\nMOVE X < Y\n```")).toBe(
		'<pre class="code"><code class="lang-cobol">MOVE X &lt; Y</code></pre>',
	);
});

it("escapes markup a fence contains, whatever the language claims to be", () => {
	for (const lang of ["", "ts", "json", "bash", "yaml", "md", "diff", "cobol"]) {
		const html = renderMarkdown("```" + lang + "\n</code><script>alert(1)</script>\n```");
		expect(html).not.toContain("<script");
		expect(html).not.toContain("</code></code>");
		const text = html.replace(/<span class="hl-[\w-]+">|<\/span>/g, "");
		expect(text).toBe(
			`<pre class="code">${lang === "" ? "<code>" : `<code class="lang-${lang}">`}` +
				"&lt;/code&gt;&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>",
		);
	}
});

it("leaves inline code contents unformatted", () => {
	expect(renderMarkdown("use `a_b_c` and `**x**`")).toBe(
		"<p>use <code>a_b_c</code> and <code>**x**</code></p>",
	);
});

it("renders unordered, ordered and two-space nested lists", () => {
	expect(renderMarkdown("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
	expect(renderMarkdown("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>");
	expect(renderMarkdown("- a\n  - a1\n  - a2\n- b")).toBe(
		"<ul><li>a<ul><li>a1</li><li>a2</li></ul></li><li>b</li></ul>",
	);
});

it("renders GFM tables", () => {
	const html = renderMarkdown("| a | b |\n|---|:--:|\n| 1 | `2` |\n| 3 | 4 |");
	expect(html).toBe(
		"<table><thead><tr><th>a</th><th>b</th></tr></thead>" +
			"<tbody><tr><td>1</td><td><code>2</code></td></tr><tr><td>3</td><td>4</td></tr></tbody></table>",
	);
});

it("links only http(s) and relative targets", () => {
	expect(renderMarkdown("[a](https://x.dev/p)")).toBe(
		'<p><a href="https://x.dev/p" rel="noopener noreferrer">a</a></p>',
	);
	expect(renderMarkdown("[a](./docs/b.md)")).toContain('<a href="./docs/b.md"');
	for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.dev/x", "vbscript:x"]) {
		const html = renderMarkdown(`[click](${bad})`);
		expect(html).not.toContain("<a ");
		expect(html).toContain("click");
	}
	expect(renderMarkdown("see https://x.dev now")).not.toContain("<a ");
});

it("is not fooled by control characters in front of a scheme", () => {
	// Browsers strip leading C0 controls before parsing a URL, so an anchored
	// `^[a-zA-Z]` scheme test let `\x01javascript:` through as an href — and
	// the page's CSP allows inline script, so that href runs.
	for (const lead of ["\u0001", "\u0000", "\u001f", "\u007f", "\u0002\u0003"]) {
		for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.dev/x", "vbscript:x"]) {
			const html = renderMarkdown(`[click](${lead}${bad})`);
			expect(html, `${JSON.stringify(lead)}${bad}`).not.toContain("<a ");
			expect(html).toContain("click");
		}
	}
	// Controls sprinkled INSIDE the scheme defeat it the same way.
	expect(renderMarkdown("[click](java\u0001script:alert(1))")).not.toContain("<a ");
	// A link that survives carries the normalized url, never the raw capture.
	expect(renderMarkdown("[a](https://x.dev/p)")).toBe(
		'<p><a href="https://x.dev/p" rel="noopener noreferrer">a</a></p>',
	);
});

it("strips YAML frontmatter and survives edge input", () => {
	expect(renderMarkdown("---\ntitle: T\nstatus: ok\n---\n# Body")).toBe("<h1>Body</h1>");
	expect(renderMarkdown("")).toBe("");
	expect(renderMarkdown("\n\n  \n")).toBe("");
	expect(renderMarkdown("---\ntitle: T\n")).toBe("<hr>\n<p>title: T</p>");
	for (const odd of ["```", "| a |", "> ", "- ", "[a](", "**", "#", "\r\nx\r\n"]) {
		expect(() => renderMarkdown(odd)).not.toThrow();
	}
});
