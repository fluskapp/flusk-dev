/**
 * Dependency-free syntax highlighting for fenced code blocks.
 *
 * Security invariant: the tokenizer only ever *slices* the source, and every
 * slice is passed through `escapeHtml` before it reaches the output. The class
 * names are literals from this file, never source-derived, so no path here can
 * emit markup a document supplied — a fence containing `</code><script>` comes
 * back as text.
 *
 * Speed invariant: one master regex per language, built from patterns that
 * cannot backtrack and that always CONSUME an unterminated opener rather than
 * retrying it at every later position (see highlight-langs.ts). Both halves
 * are load-bearing: without the first, 600KB of `"\` pairs blocked the event
 * loop for five minutes; without the second, 900KB of `/*a` blocked it for
 * two. The size cap below is a backstop, not the mechanism.
 */
import { resolveLang, SPECS, type Spec, type Token } from "./highlight-langs.js";
import { diffTokens, mdTokens, yamlTokens } from "./highlight-lines.js";
import { escapeHtml } from "./markdown-inline.js";

/** A backstop past which highlighting stops earning its cost; text still renders. */
const MAX_CHARS = 1_000_000;

const NUM = "\\b\\d[\\w.]*";
const IDENT = "[A-Za-z_$@][\\w$]*";
const PUNCT = "[{}()\\[\\].,;:+\\-*/%=<>!&|?~^#\\\\]+";

const compiled = new Map<string, RegExp>();

function master(name: string, spec: Spec): RegExp {
	const cached = compiled.get(name);
	if (cached !== undefined) return cached;
	const re = new RegExp(`(${spec.comment})|(${spec.string})|(${NUM})|(${IDENT})|(${PUNCT})`, "g");
	compiled.set(name, re);
	return re;
}

/** What follows the match, bounded — used for "is this a call?" and JSON keys. */
function peek(code: string, at: number): string {
	return code.slice(at, at + 8);
}

function classOf(m: RegExpExecArray, code: string, end: number, spec: Spec): string {
	if (m[1] !== undefined) return "hl-com";
	if (m[2] !== undefined)
		return spec.key === true && /^\s*:/.test(peek(code, end)) ? "hl-fn" : "hl-str";
	if (m[3] !== undefined) return "hl-num";
	if (m[4] !== undefined) {
		const word = m[4];
		if (spec.keywords.has(word)) return "hl-kw";
		if (word.startsWith("$") || word.startsWith("@")) return "hl-fn";
		return /^\s*\(/.test(peek(code, end)) ? "hl-fn" : "";
	}
	return "hl-punct";
}

function codeTokens(code: string, name: string, spec: Spec): Token[] {
	const re = master(name, spec);
	re.lastIndex = 0;
	const out: Token[] = [];
	let last = 0;
	for (let m = re.exec(code); m !== null; m = re.exec(code)) {
		if (m[0] === "") {
			re.lastIndex++; // a zero-width match would spin forever
			continue;
		}
		if (m.index > last) out.push({ cls: "", text: code.slice(last, m.index) });
		out.push({ cls: classOf(m, code, re.lastIndex, spec), text: m[0] });
		last = re.lastIndex;
	}
	if (last < code.length) out.push({ cls: "", text: code.slice(last) });
	return out;
}

function tokensFor(code: string, name: string): Token[] {
	if (name === "diff") return diffTokens(code);
	if (name === "yaml") return yamlTokens(code);
	if (name === "md") return mdTokens(code);
	const spec = SPECS[name];
	return spec === undefined ? [{ cls: "", text: code }] : codeTokens(code, name, spec);
}

/**
 * Escaped HTML for `code`, with `<span class="hl-*">` around what it knows.
 * An unsupported language (or anything that goes wrong) returns the escaped
 * source unchanged — this function never throws.
 */
export function highlightCode(code: string, lang: string): string {
	if (typeof code !== "string" || code === "") return "";
	const name = resolveLang(lang);
	if (name === "" || code.length > MAX_CHARS) return escapeHtml(code);
	try {
		let html = "";
		for (const t of tokensFor(code, name)) {
			const text = escapeHtml(t.text);
			html += t.cls === "" ? text : `<span class="${t.cls}">${text}</span>`;
		}
		return html;
	} catch {
		return escapeHtml(code);
	}
}
