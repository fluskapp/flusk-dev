/**
 * The highlighter's speed invariant, pinned.
 *
 * A fenced block is attacker-supplied text — a journal, a document, a model
 * reply posted straight to /api/render — and the tokenizer runs on the
 * server's single thread. So "does it finish" is a correctness property, not
 * a nicety: two of the inputs below used to block the event loop for two and
 * five MINUTES respectively, with every other request behind them.
 */
import { expect, it } from "vitest";
import { highlightCode } from "../src/ui/render/highlight.js";

it("returns promptly for a 500KB single line", () => {
	const line = `const a=${"{x:1,y:'s',z:[2,3]},".repeat(25_000)};`;
	expect(line.length).toBeGreaterThan(500_000);
	for (const lang of ["ts", "json", "bash", "diff", "yaml"]) {
		const started = Date.now();
		const html = highlightCode(line, lang);
		expect(Date.now() - started).toBeLessThan(2000);
		expect(html.length).toBeGreaterThan(0);
	}
	// an unterminated string is the backtracking trap; it must not be one
	const started = Date.now();
	expect(highlightCode(`"${"a".repeat(500_000)}`, "ts").length).toBeGreaterThan(0);
	expect(Date.now() - started).toBeLessThan(2000);
});

it("never re-scans an unterminated opener, whatever form it takes", () => {
	// Both halves were measured DoS: `/*a` repeated made the lazy comment scan
	// run to end-of-input once per `/` (120s through /api/render), and `"\`
	// repeated made the old `(?:[^"\\\n]|\\.)*` string body backtrack for 324
	// SECONDS. Each of these is under rg's and readBody's 1MB caps.
	const cases: [string, string][] = [
		["ts", "/*a".repeat(300_000)],
		["ts", '"\\'.repeat(300_000)],
		["ts", "`a".repeat(300_000)],
		["ts", "'\\".repeat(300_000)],
		["json", "/*a".repeat(300_000)],
		["rust", '"\\'.repeat(300_000)],
		["bash", "'\\".repeat(300_000)],
		["python", `"""${"a".repeat(500_000)}`],
	];
	for (const [lang, code] of cases) {
		const started = Date.now();
		const html = highlightCode(code, lang);
		expect(html.length, lang).toBeGreaterThan(0);
		expect(Date.now() - started, `${lang} ${code.slice(0, 4)}`).toBeLessThan(2000);
	}
	// An unterminated opener still swallows the remainder, the way every real
	// highlighter renders it — one token, not a retry at every later position.
	expect(highlightCode("/* open\nstill open", "ts")).toBe(
		'<span class="hl-com">/* open\nstill open</span>',
	);
});
