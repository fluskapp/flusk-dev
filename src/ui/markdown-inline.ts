/**
 * Inline markdown → HTML. Every string reaching this module has already been
 * HTML-escaped by `renderMarkdown`, so nothing here can emit markup the source
 * did not already own — the tags below are the only ones ever produced.
 */

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
};

/** Escape before anything is emitted — the security invariant of this renderer. */
export function escapeHtml(src: string): string {
	return src.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);
}

/** Only http(s) and relative paths link; every other scheme stays plain text. */
export function isSafeUrl(url: string): boolean {
	if (url === "") return false;
	if (/^https?:\/\//i.test(url)) return true;
	if (url.startsWith("//")) return false; // protocol-relative borrows any scheme
	return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url); // javascript:, data:, vbscript:, …
}

function emphasis(s: string): string {
	return s
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>")
		.replace(/_([^_\s][^_]*)_/g, "<em>$1</em>");
}

/** Code spans and links are consumed by the scanner so emphasis never enters them. */
const TOKEN = /`([^`]+)`|\[([^\]]*)\]\(([^)\s]*)\)/;

export function renderInline(escaped: string): string {
	let out = "";
	let rest = escaped;
	for (;;) {
		const m = TOKEN.exec(rest);
		if (!m) return out + emphasis(rest);
		const [whole = "", code, text, url] = m;
		out += emphasis(rest.slice(0, m.index));
		if (code !== undefined) out += `<code>${code}</code>`;
		else if (url !== undefined && isSafeUrl(url)) {
			out += `<a href="${url}" rel="noopener noreferrer">${emphasis(text ?? "")}</a>`;
		} else out += emphasis(whole);
		rest = rest.slice(m.index + whole.length);
	}
}
