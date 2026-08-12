/**
 * Title and frontmatter for one markdown artifact, read from the head of the
 * file only — a dashboard listing must not pay for whole documents.
 *
 * Only scalar `key: value` frontmatter is understood; nested blocks are
 * ignored rather than guessed at, and flusk takes no YAML dependency.
 */
import { closeSync, openSync, readSync } from "node:fs";
import { basename } from "node:path";

export const HEAD_BYTES = 4000;

/** First `HEAD_BYTES` of a file, or "" when it cannot be read. */
export function readHead(path: string, bytes = HEAD_BYTES): string {
	let fd: number | undefined;
	try {
		fd = openSync(path, "r");
		const buf = Buffer.alloc(bytes);
		const n = readSync(fd, buf, 0, bytes, 0);
		return buf.subarray(0, n).toString("utf8");
	} catch {
		return "";
	} finally {
		if (fd !== undefined) {
			try {
				closeSync(fd);
			} catch {
				// already gone — nothing to release
			}
		}
	}
}

function unquote(v: string): string {
	const t = v.trim();
	const q = t.startsWith('"') && t.endsWith('"');
	const s = t.startsWith("'") && t.endsWith("'");
	return (q || s) && t.length >= 2 ? t.slice(1, -1) : t;
}

export function parseScalarFrontmatter(head: string): Record<string, string> {
	if (!head.startsWith("---")) return {};
	const end = head.indexOf("\n---", 3);
	if (end === -1) return {};
	const out: Record<string, string> = {};
	for (const line of head.slice(4, end).split("\n")) {
		if (line.trim() === "" || /^\s/.test(line)) continue; // indented → nested block
		const m = /^([\w.-]+):\s*(.*)$/.exec(line);
		if (!m) continue;
		const value = unquote(m[2] ?? "");
		if (value === "") continue; // `key:` alone opens a block, not a scalar
		out[m[1] ?? ""] = value;
	}
	return out;
}

/** Frontmatter `title`, else the first ATX heading, else the bare filename. */
export function artifactTitle(path: string, head: string, fm: Record<string, string>): string {
	const fromFm = fm.title;
	if (fromFm !== undefined && fromFm !== "") return fromFm;
	const end = head.startsWith("---") ? head.indexOf("\n---", 3) : -1;
	const m = /^#\s+(.+)$/m.exec(end === -1 ? head : head.slice(end + 4));
	const heading = m?.[1]?.trim();
	if (heading !== undefined && heading !== "") return heading;
	return basename(path).replace(/\.md$/, "");
}
