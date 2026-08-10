import { expect, it } from "vitest";
import { renderMarkdown } from "../src/ui/markdown.js";

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

it("renders fenced code with a language class and no inline formatting inside", () => {
	const html = renderMarkdown("```ts\nconst a = **b** <x> `c`;\n```");
	expect(html).toBe(
		'<pre class="code"><code class="lang-ts">const a = **b** &lt;x&gt; `c`;</code></pre>',
	);
	expect(html).not.toContain("<strong>");
	expect(renderMarkdown("```\nplain\n```")).toBe('<pre class="code"><code>plain</code></pre>');
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

it("strips YAML frontmatter and survives edge input", () => {
	expect(renderMarkdown("---\ntitle: T\nstatus: ok\n---\n# Body")).toBe("<h1>Body</h1>");
	expect(renderMarkdown("")).toBe("");
	expect(renderMarkdown("\n\n  \n")).toBe("");
	expect(renderMarkdown("---\ntitle: T\n")).toBe("<hr>\n<p>title: T</p>");
	for (const odd of ["```", "| a |", "> ", "- ", "[a](", "**", "#", "\r\nx\r\n"]) {
		expect(() => renderMarkdown(odd)).not.toThrow();
	}
});
