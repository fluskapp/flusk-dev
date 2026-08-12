import { expect, it } from "vitest";
import { renderMarkdown } from "../src/ui/render/markdown.js";

it("renders task list items as disabled checkboxes", () => {
	const html = renderMarkdown("- [ ] open item\n- [x] done item\n- plain item");
	expect(html).toBe(
		'<ul><li class="task"><input type="checkbox" disabled> open item</li>' +
			'<li class="task"><input type="checkbox" disabled checked> done item</li>' +
			"<li>plain item</li></ul>",
	);
	// uppercase X counts, and inline markup inside the label still renders
	expect(renderMarkdown("- [X] **shipped** `x`")).toContain(
		'<input type="checkbox" disabled checked> <strong>shipped</strong> <code>x</code>',
	);
	// nesting keeps working under a task item
	expect(renderMarkdown("- [x] parent\n  - [ ] child")).toBe(
		'<ul><li class="task"><input type="checkbox" disabled checked> parent' +
			'<ul><li class="task"><input type="checkbox" disabled> child</li></ul></li></ul>',
	);
	// a bracket that is not a checkbox is left alone
	expect(renderMarkdown("- [xx] no")).toBe("<ul><li>[xx] no</li></ul>");
});

it("keeps a table row whose cell wrapped onto later lines", () => {
	// Exactly what a harness journal writes: a stage's detail is command
	// output, so the row's last cells sit lines below its first.
	const html = renderMarkdown(
		[
			"| stage | status | detail | time |",
			"|---|---|---|---|",
			"| resolve | failed | merge commit failed: On branch main",
			"Your branch is up to date with 'origin/main'.",
			"",
			"nothing to commit, working tree clean | 346.9s |",
			"| verify | pending |  |  |",
		].join("\n"),
	);
	expect(html.match(/<tr>/g)?.length).toBe(3); // head + two rows
	expect(html).toContain("<td>merge commit failed: On branch main Your branch is up to date");
	expect(html).toContain("<td>346.9s</td>");
	expect(html).toContain("<td>verify</td>");
	// the wrapped text stays inside the table, not below it as a paragraph
	expect(html).not.toContain("<p>Your branch");
	expect(html.indexOf("</table>")).toBe(html.length - "</table>".length);
});

it("ends a table where the document moves on", () => {
	const html = renderMarkdown(
		["| a | b |", "|---|---|", "| 1 | 2 |", "", "After the table.", "## Next"].join("\n"),
	);
	expect(html).toContain("<p>After the table.</p>");
	expect(html).toContain("<h2>Next</h2>");
	expect(html).not.toContain("<td>After the table.</td>");
	// an unfinished last row cannot swallow the rest of the document
	const open = renderMarkdown(
		["| a | b | c |", "|---|---|---|", "| 1", "", "# Heading"].join("\n"),
	);
	expect(open).toContain("<h1>Heading</h1>");
});

it("does not let a row that never closes eat the prose below it", () => {
	// Regression: the continuation pull stopped only on INTERRUPT (headings,
	// fences, `>`, `|`, list markers), so plain prose and blank lines were
	// absorbed — up to forty lines of a document vanished into one <td>.
	const html = renderMarkdown(
		["| a | b | c |", "|---|---|---|", "| 1 | 2", "just prose after", "", "para"].join("\n"),
	);
	expect(html).toContain("<p>just prose after</p>");
	expect(html).toContain("<p>para</p>");
	expect(html).not.toContain("just prose after  para");
	// the unfinished row is still a row, with what it did have
	expect(html).toContain("<td>1</td><td>2</td>");
	// and the table ends where the prose begins
	expect(html.indexOf("</table>")).toBeLessThan(html.indexOf("<p>just prose"));
});

it("highlights a patch inside a BARE fence, which is how journals write them", () => {
	// Measured: 301 real journals emit 309 bare fences and zero ```diff, so
	// gating diff colour on the info string left every patch unhighlighted.
	const html = renderMarkdown(
		[
			"```",
			"diff --git a/x.ts b/x.ts",
			"@@ -1,3 +1,3 @@",
			"-const a = 1;",
			"+const a = 2;",
			"```",
		].join("\n"),
	);
	expect(html).toContain('<span class="hl-del">-const a = 1;</span>');
	expect(html).toContain('<span class="hl-add">+const a = 2;</span>');
	expect(html).toContain('<span class="hl-meta">diff --git a/x.ts b/x.ts</span>');
	// a bare fence that is NOT a patch stays plain
	expect(renderMarkdown("```\n- a list\n+ not a patch\n```")).toBe(
		'<pre class="code"><code>- a list\n+ not a patch</code></pre>',
	);
});

it("closes a fence only on bare backticks, so a quoted transcript stays code", () => {
	// A real run journal: the agent's output is wrapped in a plain ``` block
	// and that output contains its own ```bash fence. Treating the inner
	// opener as a closer inverted the rest of the document — prose became
	// code and code became prose.
	const html = renderMarkdown(
		[
			"## Agent output",
			"```",
			"Task: fix the upload handler",
			"```bash",
			"npx skills add base44/skills",
			"```",
			"",
			"## Key Files",
		].join("\n"),
	);
	expect(html).toBe(
		"<h2>Agent output</h2>\n" +
			'<pre class="code"><code>Task: fix the upload handler\n' +
			"```bash\nnpx skills add base44/skills</code></pre>\n" +
			"<h2>Key Files</h2>",
	);
	// The heading after the block is a heading, not swallowed code…
	expect(html).toContain("<h2>Key Files</h2>");
	// …and the shell line never escapes the block as a paragraph.
	expect(html).not.toContain("<p>npx skills add");

	// A longer opener is not closed by a shorter run of backticks.
	const nested = renderMarkdown(
		["````", "outer", "```", "inner", "```", "````", "after"].join("\n"),
	);
	expect(nested).toContain("outer\n```\ninner\n```");
	expect(nested).toContain("<p>after</p>");

	// A closer may carry trailing whitespace but never an info string.
	expect(renderMarkdown("```\nx\n```   ")).toBe('<pre class="code"><code>x</code></pre>');
	expect(renderMarkdown("```ts\nconst a = 1;\n```")).toContain("</code></pre>");
});

it("renders headings down to h6", () => {
	expect(renderMarkdown("##### five")).toBe("<h5>five</h5>");
	expect(renderMarkdown("###### six")).toBe("<h6>six</h6>");
	expect(renderMarkdown("####### seven")).toBe("<p>####### seven</p>");
});
