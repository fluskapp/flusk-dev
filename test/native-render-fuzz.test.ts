/**
 * Fuzz half of the render differential: deterministic random documents built
 * from the tokens that drive every branch of the grammar — fences, tables,
 * emphasis runs, injection fragments, JS-whitespace oddities — asserted BYTE
 * EQUAL between the TS reference and the Rust port. Seeded PRNG: a failure
 * reproduces by seed number.
 */
import { describe, expect, it } from "vitest";
import { nativeRenderModule } from "../src/platform/native/render.js";
import { highlightCode } from "../src/ui/render/highlight.js";
import { renderMarkdown } from "../src/ui/render/markdown.js";

const native = nativeRenderModule();
const describeNative = native === null ? describe.skip : describe;
const nat = native as NonNullable<typeof native>;

/** mulberry32 — deterministic across platforms. */
function prng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// biome-ignore format: a wordlist, one item per branch of the grammar
const MD_TOKENS = [
	"word", "snake_case", "MAX_MATCHES", "**", "*", "_", "`", "``", "```", "```ts", "```diff",
	"~~~", "\n", "\n\n", " ", "  ", "\t", "\u00a0", "\u3000", "\ufeff", "\u2028", "\u2029", "\r\n", "\r",
	"#", "## ", "###### ", "####### ", ">", "&gt;", "- ", "* ", "+ ", "1. ", "12.", "[ ] ", "[x] ",
	"|", "|---|", ":-:", "---", "----", "***", "___", "[", "]", "(", ")", "[text](", "https://a.b/c",
	"javascript:x", "/rel", "<script>alert(1)</script>", "<b>", "&amp;", "&", "\"", "'", "\\",
	"title:", "stages.a:", "😀", "é", "diff --git ", "@@ -1 +1 @@", "+++ ", "--- ", "index abcd12..",
];

// biome-ignore format: source-shaped fragments for the tokenizer
const CODE_TOKENS = [
	"const", "return", "fn", "def", "if", "word", "x1", "42", "3.14", "0x_z", "(", ")", "{", "}",
	"; ", " ", "\t", "\n", "\"", "'", "`", "\\", "\\\"", "//", "/*", "*/", "#", "$var", "@dec",
	"'''", '"""', ": ", "->", "špeĉial", "😀", "\u2028", "\u2029", "\u00a0", "\r", "key:", "- item", "**b**", "[l](u)",
];

function build(tokens: string[], rand: () => number, count: number): string {
	let out = "";
	for (let i = 0; i < count; i++) out += tokens[Math.floor(rand() * tokens.length)] ?? "";
	return out;
}

const LANGS = ["ts", "tsx", "js", "rust", "rs", "python", "py", "bash", "sh", "json", "diff", "yaml", "md", ".ts", "  TS  ", "nope"];

describeNative("native render ≡ TS under fuzz", () => {
	it("markdown agrees byte-for-byte on 300 random documents", () => {
		for (let seed = 1; seed <= 300; seed++) {
			const rand = prng(seed);
			const doc = build(MD_TOKENS, rand, 40 + Math.floor(rand() * 120));
			if (/```\s*mermaid(?![\w+#.-])/.test(doc)) continue; // documented gap: seam routes these to TS
			expect(nat.renderMarkdownHtml(doc), `seed ${seed}`).toBe(renderMarkdown(doc));
		}
	});

	it("highlight agrees byte-for-byte on 200 random snippets across languages", () => {
		for (let seed = 1; seed <= 200; seed++) {
			const rand = prng(seed * 7919);
			const code = build(CODE_TOKENS, rand, 30 + Math.floor(rand() * 100));
			const lang = LANGS[seed % LANGS.length] ?? "ts";
			expect(nat.highlightHtml(code, lang), `seed ${seed} lang ${lang}`).toBe(
				highlightCode(code, lang),
			);
		}
	});

	it("pathological inputs return the reference's bytes without the reference's minutes", () => {
		const cases: [string, string][] = [
			['"\\'.repeat(60_000), "ts"], // 600KB-class: unrolled string body
			["/*a".repeat(50_000), "ts"], // unterminated opener consumed, not retried
			[`x = """${"a\n".repeat(2_000)}`, "python"],
		];
		for (const [code, lang] of cases) {
			expect(nat.highlightHtml(code, lang)).toBe(highlightCode(code, lang));
		}
	});
});
