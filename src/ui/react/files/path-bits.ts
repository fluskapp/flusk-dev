/**
 * Path string helpers shared by the file, find and palette windows — the
 * client-core vocabulary (`base`, `dirOf`, `ext`, `fileGlyph`), ported once so
 * every window prints a path the same way.
 */
export function base(p: string): string {
	const parts = String(p ?? "").split("/");
	return parts[parts.length - 1] || String(p);
}

export function dirOf(p: string): string {
	const s = String(p ?? "");
	const at = s.lastIndexOf("/");
	return at <= 0 ? "" : s.slice(0, at);
}

export function ext(p: string): string {
	const m = /\.([\w+#-]+)$/.exec(String(p ?? ""));
	return m === null ? "" : (m[1] ?? "").toLowerCase();
}

export function isMd(p: string): boolean {
	const e = ext(p);
	return e === "md" || e === "markdown";
}

/** The little kind chip a file row carries: "md", "ts", or plain "file". */
export function fileGlyph(path: string): string {
	return isMd(path) ? "md" : ext(path) || "file";
}
