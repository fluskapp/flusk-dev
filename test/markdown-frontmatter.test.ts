import { expect, it } from "vitest";
import { renderMarkdown } from "../src/ui/render/markdown.js";
import { frontmatterRows, renderFrontmatter } from "../src/ui/render/markdown-frontmatter.js";

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
	// title, date, status, and ONE row for the whole pipeline — not one row per
	// stage, which is what made a twelve-stage journal unreadable.
	expect(keys).toBe(4);
	expect(html.startsWith('<table class="fm"><tbody>')).toBe(true);
	expect(html).toContain(
		'<tr><th class="fm-k">title</th><td class="fm-v">Run: review PR #7</td></tr>',
	);
	expect(html).toContain('<th class="fm-k">status</th><td class="fm-v">failed</td>');
	// the container is not repeated per row
	expect(html.match(/<table/g)?.length).toBe(1);
});

it("draws the stages as a pipeline rather than printing their encoding", () => {
	const { html } = renderFrontmatter(JOURNAL);
	expect(html).not.toContain("stages.intent");
	expect(html).not.toContain("done|1.9s|");
	expect(html).toContain('<th class="fm-k">stages</th>');
	expect(html).toContain('class="stg-row"');
	// status as a glyph, and the failing stage carries the failure colour class
	expect(html).toContain('<span class="stage completed"');
	expect(html).toContain('<span class="stage error"');
	expect(html).toContain("✓");
	expect(html).toContain("✗");
	expect(html).toContain('<span class="stg-t">1.9s</span>');
});

it("keeps a wrapped stage detail whole, where it can still be read", () => {
	const { html } = renderFrontmatter(JOURNAL);
	// The value spans two source lines. Joining it was the point of the parser;
	// it now lands in the chip's tooltip rather than in a cell, so this asserts
	// the JOIN still happens and nothing was dropped on the way.
	expect(html).toContain(
		"merge commit failed: On branch main nothing to commit, working tree clean",
	);
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
