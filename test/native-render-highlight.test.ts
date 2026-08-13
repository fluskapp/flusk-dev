/**
 * Highlight differential over REAL source: every supported language family
 * fed the repo's own files (TS, Rust, JSON, bash, markdown) plus synthetic
 * python/diff/yaml in their natural shapes — byte equality per file and per
 * alias, because the workbench CSS keys on these exact spans.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { nativeRenderModule } from "../src/platform/native/render.js";
import { highlightCode } from "../src/ui/render/highlight.js";

const native = nativeRenderModule();
const describeNative = native === null ? describe.skip : describe;
const nat = native as NonNullable<typeof native>;

const root = join(fileURLToPath(import.meta.url), "..", "..");
const read = (...p: string[]): string => readFileSync(join(root, ...p), "utf8");

const PY = 'import os\n\nclass A:\n\t"""doc\n\tstring"""\n\tdef f(self, n=42):\n\t\t# comment\n\t\treturn f"{n}" + \'\'\'tri\'\'\'\n';
const DIFF =
	"diff --git a/x.ts b/x.ts\nindex ab12cd34..ef56ab78 100644\n--- a/x.ts\n+++ b/x.ts\n@@ -1,3 +1,4 @@\n-const a = 1\n+const a = 2\n context\nrename from x\n";
const YAML =
	"---\ntitle: run 42\nstages:\n  - name: build\n    status: \"ok\"\n  count: 3.5e2\nflag: true\nnote: ~ # nil\n...\n";

describeNative("native highlight ≡ TS on real source files", () => {
	it("agrees on every TypeScript file in src/ui/render and the seam", () => {
		const dirs: [string, string[]][] = [
			["src/ui/render", readdirSync(join(root, "src", "ui", "render"))],
			["src/platform/native", readdirSync(join(root, "src", "platform", "native"))],
		];
		let seen = 0;
		for (const [dir, files] of dirs) {
			for (const f of files.filter((f) => f.endsWith(".ts"))) {
				const code = read(...dir.split("/"), f);
				seen++;
				expect(nat.highlightHtml(code, "ts"), `${dir}/${f}`).toBe(highlightCode(code, "ts"));
			}
		}
		expect(seen).toBeGreaterThan(10);
	});

	it("agrees on every Rust file of the port itself", () => {
		const dir = join(root, "crates", "flusk-core", "src", "render");
		for (const f of readdirSync(dir).filter((f) => f.endsWith(".rs"))) {
			const code = readFileSync(join(dir, f), "utf8");
			expect(nat.highlightHtml(code, "rust"), f).toBe(highlightCode(code, "rust"));
		}
	});

	it("agrees on JSON, bash and markdown from the repo", () => {
		const cases: [string, string][] = [
			[read("package.json"), "json"],
			[read("tsconfig.json"), "jsonc"],
			[read("scripts", "check-standards.sh"), "bash"],
			[read("README.md"), "md"],
			[read("docs", "architecture.md"), "markdown"],
		];
		for (const [code, lang] of cases) {
			expect(nat.highlightHtml(code, lang), lang).toBe(highlightCode(code, lang));
		}
	});

	it("agrees on python, diff and yaml in their natural shapes", () => {
		const cases: [string, string[]][] = [
			[PY, ["python", "py", "python3"]],
			[DIFF, ["diff", "patch", ""]],
			[YAML, ["yaml", "yml"]],
		];
		for (const [code, langs] of cases) {
			for (const lang of langs) {
				expect(nat.highlightHtml(code, lang), lang || "(empty)").toBe(highlightCode(code, lang));
			}
		}
	});

	it("agrees on alias, casing and unsupported-language handling", () => {
		const code = read("src", "ui", "render", "highlight.ts");
		for (const lang of ["TS", " typescript ", ".rs", "console", "zsh", "json5", "c++", "cobol", ""]) {
			expect(nat.highlightHtml(code, lang), JSON.stringify(lang)).toBe(highlightCode(code, lang));
		}
	});
});
