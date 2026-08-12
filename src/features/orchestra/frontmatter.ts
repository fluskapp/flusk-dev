/**
 * The header half of an agent spec file, parsed by hand.
 *
 * WHY not a YAML library: flusk takes no YAML dependency (src/ui/journal-
 * frontmatter.ts already parses journal headers this way), and a spec header
 * is a fixed, tiny shape — scalars plus one string list. A real YAML loader
 * would additionally accept anchors, tags and merge keys, which is surface a
 * file authored by a cloned repo does not need to have.
 *
 * Nothing here decides what a key MEANS: this returns raw strings so
 * spec-parse.ts stays the single place that validates. A file whose header
 * cannot be parsed comes back as a reason string, never a throw and never a
 * half-filled object — one bad file must not blank the registry.
 */

export interface SpecFile {
	/** Scalar `key: value` pairs, quotes stripped. */
	fields: Record<string, string>;
	/** `key: [a, b]` or an indented `- item` block. Empty list = present-but-none. */
	lists: Record<string, string[]>;
	/** Everything after the closing fence: the prompt. Never interpreted here. */
	body: string;
}

export type SpecFileParse = { ok: true; file: SpecFile } | { ok: false; reason: string };

const FENCE = /^---\s*$/;
const KEY = /^([A-Za-z][\w-]*):\s*(.*)$/;
const ITEM = /^\s*-\s+(.*)$/;

/** Strips one layer of matching quotes; there are no escapes to honour. */
function unquote(value: string): string {
	const t = value.trim();
	const q = t.charAt(0);
	if (t.length > 1 && (q === '"' || q === "'") && t.endsWith(q)) return t.slice(1, -1).trim();
	return t;
}

function inlineList(value: string): string[] {
	return value
		.slice(1, -1)
		.split(",")
		.map(unquote)
		.filter((v) => v !== "");
}

export function parseSpecFile(text: string): SpecFileParse {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	if (lines[0] === undefined || !FENCE.test(lines[0])) {
		return { ok: false, reason: "missing frontmatter: the file must start with ---" };
	}
	const end = lines.findIndex((l, i) => i > 0 && FENCE.test(l));
	if (end === -1) return { ok: false, reason: "unterminated frontmatter: no closing ---" };

	const fields: Record<string, string> = {};
	const lists: Record<string, string[]> = {};
	let openList: string | undefined;
	for (let i = 1; i < end; i++) {
		const line = lines[i] ?? "";
		if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
		const item = ITEM.exec(line);
		if (item !== null && openList !== undefined) {
			const value = unquote(item[1] ?? "");
			if (value !== "") lists[openList]?.push(value);
			continue;
		}
		const kv = KEY.exec(line);
		if (kv === null) return { ok: false, reason: `unparseable frontmatter line ${i + 1}` };
		const key = kv[1] ?? "";
		const raw = (kv[2] ?? "").trim();
		openList = undefined;
		if (raw.startsWith("[") && raw.endsWith("]")) lists[key] = inlineList(raw);
		else if (raw === "") {
			// A bare `key:` opens an indented list. It cannot open a nested map:
			// no spec field is one, so treating it as a list keeps the grammar
			// closed instead of silently accepting structure nothing reads.
			lists[key] = [];
			openList = key;
		} else fields[key] = unquote(raw);
	}
	return {
		ok: true,
		file: {
			fields,
			lists,
			body: lines
				.slice(end + 1)
				.join("\n")
				.trim(),
		},
	};
}
