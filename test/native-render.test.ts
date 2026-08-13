/**
 * The differential harness for the render stage: TS reference and Rust port
 * run over the same documents IN THE SAME PROCESS and the HTML must be BYTE
 * EQUAL — the workbench CSS addresses the exact class vocabulary these emit.
 * When the prebuilt is absent the suite skips rather than lies. Adversarial
 * and fuzz corpora live in the sibling native-render-*.test.ts files.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createRenderer, nativeRenderModule } from "../src/platform/native/render.js";
import { renderMarkdown } from "../src/ui/render/markdown.js";

const native = nativeRenderModule();
const describeNative = native === null ? describe.skip : describe;
const nat = native as NonNullable<typeof native>;

const root = join(fileURLToPath(import.meta.url), "..", "..");
const corpus: [string, string][] = readdirSync(join(root, "docs"))
	.filter((f) => f.endsWith(".md"))
	.map((f) => [`docs/${f}`, readFileSync(join(root, "docs", f), "utf8")]);
corpus.push(["README.md", readFileSync(join(root, "README.md"), "utf8")]);

describeNative("native markdown ≡ TypeScript reference", () => {
	it("is actually the native implementation under test", () => {
		expect(createRenderer().impl).toBe("native");
	});

	it("agrees byte-for-byte on every doc in the repo", () => {
		expect(corpus.length).toBeGreaterThan(3);
		for (const [name, doc] of corpus) {
			expect(nat.renderMarkdownHtml(doc), name).toBe(renderMarkdown(doc));
		}
	});

	it("async form emits the same bytes and carries the >64KB seam route", async () => {
		const big = corpus
			.map(([, d]) => d)
			.join("\n\n---\n\n")
			.repeat(3);
		expect(big.length).toBeGreaterThan(64 * 1024);
		const ts = renderMarkdown(big);
		expect(await nat.renderMarkdownHtmlAsync(big)).toBe(ts);
		expect(await createRenderer().markdown(big)).toBe(ts);
	});

	it("a mermaid fence routes the whole document to the reference", async () => {
		const doc = 'before\n\n```mermaid\nflowchart LR\n  a["A ✅"] --> b\n```\n\nafter';
		// The mermaid subsystem is not ported; the seam must serve the TS answer.
		const out = await createRenderer().markdown(doc);
		expect(out).toBe(renderMarkdown(doc));
		expect(out).toContain("<svg"); // and the reference actually drew it
	});

	it("highlight async form emits the same bytes as the sync form", async () => {
		const code = readFileSync(join(root, "src", "ui", "render", "markdown.ts"), "utf8");
		expect(await nat.highlightHtmlAsync(code, "ts")).toBe(nat.highlightHtml(code, "ts"));
	});

	it("FLUSK_NATIVE=0 forces the TypeScript path", () => {
		process.env.FLUSK_NATIVE = "0";
		try {
			expect(createRenderer().impl).toBe("ts");
		} finally {
			delete process.env.FLUSK_NATIVE;
		}
	});
});
