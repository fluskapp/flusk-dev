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

/**
 * The form a browser will actually parse. Browsers strip C0 controls and
 * spaces before reading a URL, so a single `\x01` in front of `javascript:`
 * defeated an anchored scheme test while the script still ran — and the
 * page's CSP carries `script-src 'unsafe-inline'`. The decision below and the
 * href that is emitted must therefore both be made on this value, never on
 * the raw capture.
 */
export function normalizeUrl(url: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: browsers strip these before parsing
	return url.replace(/[\u0000-\u0020\u007f]/g, "");
}

/** Only http(s) and relative paths link; every other scheme stays plain text. */
export function isSafeUrl(url: string): boolean {
	const u = normalizeUrl(url);
	if (u === "") return false;
	if (/^https?:\/\//i.test(u)) return true;
	if (u.startsWith("//")) return false; // protocol-relative borrows any scheme
	return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u); // javascript:, data:, vbscript:, …
}

/**
 * `_` emphasis only when the delimiters sit at a word boundary. This corpus is
 * full of `snake_case` identifiers, `MAX_MATCHES` constants and git branches
 * like `yarden_sprint2_47_restorehook` — treating those underscores as
 * emphasis rewrites the very names a journal exists to record. CommonMark
 * disallows intraword `_` for the same reason; `*` keeps working intraword.
 */
function emphasis(s: string): string {
	return s
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>")
		.replace(/(?<![A-Za-z0-9_])_([^_\s][^_]*)_(?![A-Za-z0-9_])/g, "<em>$1</em>");
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
			// The NORMALIZED url, not the capture: emitting the raw one would put
			// back the very characters isSafeUrl had to look past.
			out += `<a href="${normalizeUrl(url)}" rel="noopener noreferrer">${emphasis(text ?? "")}</a>`;
		} else out += emphasis(whole);
		rest = rest.slice(m.index + whole.length);
	}
}
