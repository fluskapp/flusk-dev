/**
 * Hover markdown → the contract's three fields: `signature`, `docs`, `tags`.
 *
 * LSP hands back one blob of prose. Every server that exists puts the
 * declaration in the first fenced code block and the human words after it
 * (rust-analyzer, gopls, pyright and typescript-language-server all do), so
 * that fence IS the signature and the remainder is documentation. When there
 * is no fence — plain-text hovers still happen — the first line stands in,
 * which is wrong-ish but never empty.
 *
 * `contents` has three legal shapes across LSP versions (MarkupContent, a
 * MarkedString, or an array of MarkedStrings) and all three are in the wild,
 * so all three are read.
 */
import type { DocTag } from "./types.js";

/** ```lang\n…\n``` at the start of the hover: the declaration. */
const FENCE = /^```[\w+#.-]*\r?\n([\s\S]*?)\r?\n?```/;
/** A JSDoc/rustdoc tag line: `@param x the thing`, `\param` in some servers. */
const TAG = /^\s*[@\\](\w+)\s*(.*)$/;

function marked(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value !== "object" || value === null) return "";
	const rec = value as Record<string, unknown>;
	const text = rec["value"];
	if (typeof text !== "string") return "";
	const lang = rec["language"];
	// A MarkedString carries its language beside the text; MarkupContent (the
	// modern shape) has already fenced it, and has no `language`.
	return typeof lang === "string" && lang !== "" ? `\`\`\`${lang}\n${text}\n\`\`\`` : text;
}

/** A hover reply → one markdown string. "" when there was nothing to show. */
function hoverMarkdown(hover: unknown): string {
	if (typeof hover !== "object" || hover === null) return "";
	const contents = (hover as Record<string, unknown>)["contents"];
	const parts = Array.isArray(contents) ? contents.map(marked) : [marked(contents)];
	return parts
		.filter((p) => p.trim() !== "")
		.join("\n\n")
		.trim();
}

/**
 * Prose split from its tags. Once the first tag line is seen the prose is
 * over, so a wrapped `@param` continuation line joins the tag it belongs to
 * rather than reappearing in the middle of the description.
 */
function splitTags(text: string): { docs: string; tags: DocTag[] } {
	const prose: string[] = [];
	const tags: DocTag[] = [];
	for (const line of text.split("\n")) {
		const m = TAG.exec(line);
		if (m?.[1] !== undefined) {
			tags.push({ name: m[1], text: (m[2] ?? "").trim() });
			continue;
		}
		const last = tags[tags.length - 1];
		if (last === undefined) prose.push(line);
		else if (line.trim() !== "") last.text = `${last.text} ${line.trim()}`.trim();
	}
	return { docs: prose.join("\n").trim(), tags };
}

export interface HoverDoc {
	signature: string;
	docs: string;
	tags: DocTag[];
}

export function parseHover(hover: unknown): HoverDoc {
	const md = hoverMarkdown(hover);
	if (md === "") return { signature: "", docs: "", tags: [] };
	const fence = FENCE.exec(md);
	const signature = (fence?.[1] ?? md.split("\n")[0] ?? "").trim();
	const rest = fence === null ? md.slice(signature.length) : md.slice(fence[0].length);
	return { signature, ...splitTags(rest.trim()) };
}

/**
 * The identifier under a 1-based line/col — the symbol's name.
 *
 * UNICODE-AWARE on purpose. `[\w$]` is ASCII, and this name is not cosmetic:
 * it is the key `relatedFor` joins history on and the query Alt+F7 hands to
 * Find in Files, so truncating an accented identifier to its first two ASCII
 * letters — or losing a CJK one entirely — silently asks the wrong question.
 * The Unicode letter and number classes keep the whole identifier.
 */
export function wordAt(text: string, line: number, col: number): string {
	const row = text.split(/\r?\n/)[line - 1];
	if (row === undefined) return "";
	const at = Math.min(Math.max(col - 1, 0), row.length);
	const before = /[\p{L}\p{N}_$]*$/u.exec(row.slice(0, at))?.[0] ?? "";
	const after = /^[\p{L}\p{N}_$]*/u.exec(row.slice(at))?.[0] ?? "";
	return before + after;
}
