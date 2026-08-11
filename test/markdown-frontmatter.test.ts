import { expect, it } from "vitest";
import { renderMarkdown } from "../src/ui/markdown.js";
import { frontmatterRows, renderFrontmatter } from "../src/ui/markdown-frontmatter.js";

const JOURNAL = [
	"---",
	'title: "Run: review PR #7"',
	"date: 2026-08-04T12:31:10.054Z",
	"status: failed",
	"stages:",
	'  intent: "done|1.9s|review"',
	'  resolve: "failed|346.9s|merge commit failed: On branch main',
	'nothing to commit, working tree clean"',
	"---",
	"",
	"# Body",
].join("\n");

it("renders frontmatter as a definition table and counts its keys", () => {
	const { html, keys } = renderFrontmatter(JOURNAL);
	expect(keys).toBe(5);
	expect(html.startsWith('<table class="fm"><tbody>')).toBe(true);
	expect(html).toContain(
		'<tr><th class="fm-k">title</th><td class="fm-v">Run: review PR #7</td></tr>',
	);
	expect(html).toContain('<th class="fm-k">status</th><td class="fm-v">failed</td>');
	// nested keys keep their parent, and a wrapped value is joined, not lost
	expect(html).toContain('<th class="fm-k">stages.intent</th>');
	expect(html).toContain(
		"merge commit failed: On branch main nothing to commit, working tree clean",
	);
	// the container is not repeated per row
	expect(html.match(/<table/g)?.length).toBe(1);
});

it("escapes keys and values, so frontmatter cannot inject markup", () => {
	const { html } = renderFrontmatter('---\ntitle: <img src=x onerror="boom">\n---\nbody');
	expect(html).not.toContain("<img");
	expect(html).toContain("&lt;img src=x onerror=&quot;boom&quot;&gt;");
});

it("returns nothing when there is no frontmatter to show", () => {
	for (const src of ["", "# just a doc", "---\n", "text\n---\ntitle: x\n---", "----\nx\n----"]) {
		expect(renderFrontmatter(src)).toEqual({ html: "", keys: 0 });
	}
	// a horizontal rule is not an empty frontmatter block
	expect(renderFrontmatter("---\n---\n# Body")).toEqual({ html: "", keys: 0 });
});

it("never throws on malformed frontmatter", () => {
	for (const odd of ["---\n:\n---", "---\n   \n---", "---\na: b\n  c: d\n---", "---\n- x\n---"]) {
		expect(() => renderFrontmatter(odd)).not.toThrow();
	}
	expect(frontmatterRows("a: 1\nb: 2")).toEqual([
		{ key: "a", value: "1" },
		{ key: "b", value: "2" },
	]);
});

it("leaves renderMarkdown's stripping behaviour alone", () => {
	// the two are complementary: the table is metadata, the body is the doc
	expect(renderMarkdown(JOURNAL)).toBe("<h1>Body</h1>");
	expect(renderFrontmatter(JOURNAL).html).not.toContain("<h1>");
});

it("strips only what renderFrontmatter would have shown", () => {
	// A model reply that opens with a horizontal rule used to lose everything
	// up to the next `---`, with no table rendered to compensate: the two
	// disagreed about what counts as frontmatter, so the text simply vanished.
	const rule = "---\nHere is the summary.\n\n---\n\nAnd here is the rest.";
	expect(renderFrontmatter(rule)).toEqual({ html: "", keys: 0 });
	const html = renderMarkdown(rule);
	expect(html).toContain("<p>Here is the summary.</p>");
	expect(html).toContain("<p>And here is the rest.</p>");
	expect(html.startsWith("<hr>")).toBe(true);
	// `---foo` is not a delimiter either, and nothing after it is eaten
	expect(renderMarkdown("---foo\nbar\n---\nbaz")).toContain("bar");
	expect(renderMarkdown("---foo\nbar\n---\nbaz")).toContain("baz");
	// real frontmatter is still consumed exactly once
	expect(renderMarkdown("---\ntitle: T\n---\n# Body")).toBe("<h1>Body</h1>");
});
