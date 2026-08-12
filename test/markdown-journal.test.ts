/**
 * Golden-ish rendering checks against files that exist on this machine: the
 * harness journals flusk is a dashboard *for*, and real project docs.
 *
 * Fixtures lie by omission — the stage table with a command's output wrapped
 * across three source lines was rendered as a broken table plus loose
 * paragraphs for as long as the only tables under test were hand-written. So
 * these read the real files, and say so clearly when they are not there.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { highlightCode } from "../src/ui/render/highlight.js";
import { renderMarkdown } from "../src/ui/render/markdown.js";
import { renderFrontmatter } from "../src/ui/render/markdown-frontmatter.js";

const RUNS = "/Users/ashb/projects/playground/linof-harness/docs/runs";
const journals = existsSync(RUNS)
	? readdirSync(RUNS)
			.filter((f) => f.endsWith(".md"))
			.sort()
			.map((f) => join(RUNS, f))
	: [];

if (journals.length === 0) {
	console.warn(`SKIPPED: no harness journals at ${RUNS} — real-journal rendering is unchecked.`);
}

/** The table a journal writes for its stages, as rendered. */
function firstTable(html: string): string {
	const at = html.indexOf("<table>");
	return at === -1 ? "" : html.slice(at, html.indexOf("</table>", at) + 8);
}

it.runIf(journals.length > 0)("renders every real harness journal without throwing", () => {
	let tables = 0;
	let drawn = 0;
	for (const path of journals) {
		const src = readFileSync(path, "utf8");
		let html = "";
		expect(() => {
			html = renderMarkdown(src);
		}, path).not.toThrow();
		expect(html.length, path).toBeGreaterThan(0);
		// a journal always declares frontmatter, and always carries its pipeline
		// graph — as a DRAWN diagram now, which is why this no longer demands a
		// code fence: for most journals the mermaid graph was the only one.
		expect(renderFrontmatter(src).keys, path).toBeGreaterThan(0);
		expect(html, path).toMatch(/<pre class="code">|<div class="mmd">/);
		if (html.includes('<div class="mmd">')) drawn++;
		if (html.includes("<table>")) tables++;
		// nothing a journal quotes may escape as markup
		expect(html).not.toContain("<script");
	}
	expect(tables).toBeGreaterThan(journals.length - 5);
	// The whole point of the renderer: these are diagrams, not fenced text.
	expect(drawn).toBeGreaterThan(journals.length - 5);
});

it.runIf(journals.length > 0)("keeps a wrapped stage row inside the table", () => {
	// A row whose last cells sit on later source lines, found in real files
	// rather than invented: "| resolve | failed | …output…" then two lines.
	const wrapped = /\n(\|[^\n|]*\|[^\n]*[^|\s])\n([^|\n][^\n]*)\n/;
	const found = journals
		.map((p) => ({ path: p, src: readFileSync(p, "utf8") }))
		.find((j) => wrapped.test(j.src) && j.src.includes("| stage |"));
	if (found === undefined) {
		console.warn("SKIPPED: no journal on this machine has a wrapped table row.");
		return;
	}
	const m = wrapped.exec(found.src);
	const tail = (m?.[2] ?? "").trim();
	const table = firstTable(renderMarkdown(found.src));
	expect(table, found.path).toContain(tail);
	// the header keeps its own row, and every stage still has one
	expect(table).toContain("<th>stage</th>");
	expect((table.match(/<tr>/g) ?? []).length).toBeGreaterThan(3);
});

it("renders this repo's own docs, highlighted", () => {
	for (const doc of ["CONTRIBUTING.md", "README.md"]) {
		const html = renderMarkdown(readFileSync(doc, "utf8"));
		expect(html, doc).toContain("<h1>");
		expect(html, doc).toContain('<pre class="code"><code class="lang-bash">');
		expect(html, doc).toContain('<span class="hl-com">');
		expect(html, doc).not.toContain("<script");
	}
});

const DOCS = [
	"/Users/ashb/projects/playground/prime-agent/AGENTS.md",
	"/Users/ashb/projects/playground/linof-harness/CLAUDE.md",
].filter((p) => existsSync(p));

it.runIf(DOCS.length > 0)("renders real project docs on this machine", () => {
	for (const path of DOCS) {
		const src = readFileSync(path, "utf8");
		const html = renderMarkdown(src);
		expect(html.length, path).toBeGreaterThan(0);
		expect(html, path).not.toContain("<script");
		// every fence pair in the source became a block, indented ones included
		const fences = (src.match(/^[ \t]*```/gm) ?? []).length;
		expect((html.match(/<pre class="code">/g) ?? []).length, path).toBe(Math.floor(fences / 2));
		expect(html, path).not.toContain("<p>```");
	}
	// these docs open with a heading, not frontmatter: no table, nothing eaten
	for (const path of DOCS) {
		const src = readFileSync(path, "utf8");
		expect(renderFrontmatter(src), path).toEqual({ html: "", keys: 0 });
		expect(renderMarkdown(src), path).toContain("<h1>");
	}
	expect(highlightCode("npm run build # go", "bash")).toContain('<span class="hl-com">');
});
