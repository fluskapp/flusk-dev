/**
 * Line-oriented highlighters: diff, YAML and Markdown are decided by what a
 * line *starts with*, not by a token grammar, so they get their own pass.
 *
 * Diff is the one that earns its keep — harness journals paste `git diff` and
 * `git status` output constantly, and an unhighlighted patch is unreadable.
 */
import type { Token } from "./highlight-langs.js";

/** Patch and porcelain headers, checked before the bare +/- rules. */
const DIFF_META =
	/^(?:diff |index |@@|\+\+\+|---|commit |Author:|Date:|new file|deleted file|old mode|new mode|similarity index|rename |copy |Binary files|=== )/;

function diffClass(line: string): string {
	if (DIFF_META.test(line)) return "hl-meta";
	if (line.startsWith("+")) return "hl-add";
	if (line.startsWith("-")) return "hl-del";
	return "";
}

/** Split into lines, classify each, and stitch the newlines back in. */
function byLine(code: string, classify: (line: string) => Token[]): Token[] {
	const out: Token[] = [];
	const lines = code.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (i > 0) out.push({ cls: "", text: "\n" });
		for (const t of classify(lines[i] ?? "")) if (t.text !== "") out.push(t);
	}
	return out;
}

export function diffTokens(code: string): Token[] {
	return byLine(code, (line) => [{ cls: diffClass(line), text: line }]);
}

const YAML_KEY = /^(\s*(?:-\s+)?)([\w.$/-]+)(:)(.*)$/;
const YAML_SCALAR = /^(true|false|null|~|-?\d[\d._]*(?:e[+-]?\d+)?)$/i;

function yamlValue(raw: string): Token[] {
	const value = raw.trim();
	if (value === "") return [{ cls: "", text: raw }];
	const lead = raw.slice(0, raw.indexOf(value));
	if (value.startsWith("#"))
		return [
			{ cls: "", text: lead },
			{ cls: "hl-com", text: value },
		];
	if (/^["'].*["']$/.test(value)) {
		return [
			{ cls: "", text: lead },
			{ cls: "hl-str", text: value },
		];
	}
	const cls = YAML_SCALAR.test(value) ? "hl-num" : "";
	return [
		{ cls: "", text: lead },
		{ cls, text: value },
	];
}

export function yamlTokens(code: string): Token[] {
	return byLine(code, (line) => {
		if (/^\s*#/.test(line)) return [{ cls: "hl-com", text: line }];
		if (/^\s*(?:---|\.\.\.)\s*$/.test(line)) return [{ cls: "hl-punct", text: line }];
		const m = YAML_KEY.exec(line);
		if (!m) return [{ cls: "", text: line }];
		return [
			{ cls: "", text: m[1] ?? "" },
			{ cls: "hl-kw", text: m[2] ?? "" },
			{ cls: "hl-punct", text: m[3] ?? "" },
			...yamlValue(m[4] ?? ""),
		];
	});
}

/** Inside a markdown line: code spans, links, bold runs. */
const MD_INLINE = /`[^`\n]*`|\[[^\]\n]*\]\([^)\s]*\)|\*\*[^*\n]+\*\*/g;

function mdInline(line: string): Token[] {
	const out: Token[] = [];
	let last = 0;
	MD_INLINE.lastIndex = 0;
	for (let m = MD_INLINE.exec(line); m !== null; m = MD_INLINE.exec(line)) {
		out.push({ cls: "", text: line.slice(last, m.index) });
		const first = m[0].charAt(0);
		out.push({ cls: first === "`" ? "hl-str" : first === "[" ? "hl-fn" : "hl-kw", text: m[0] });
		last = MD_INLINE.lastIndex;
	}
	out.push({ cls: "", text: line.slice(last) });
	return out;
}

export function mdTokens(code: string): Token[] {
	return byLine(code, (line) => {
		if (/^\s*#{1,6}\s/.test(line)) return [{ cls: "hl-kw", text: line }];
		if (/^\s*>/.test(line)) return [{ cls: "hl-com", text: line }];
		if (/^\s*(?:```|~~~)/.test(line)) return [{ cls: "hl-punct", text: line }];
		const marker = /^(\s*(?:[-*+]|\d+\.)\s)(.*)$/.exec(line);
		if (!marker) return mdInline(line);
		return [{ cls: "hl-punct", text: marker[1] ?? "" }, ...mdInline(marker[2] ?? "")];
	});
}
