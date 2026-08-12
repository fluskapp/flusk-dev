/**
 * POST /api/render — the server's markdown/highlight renderer, exposed.
 *
 * The dashboard has exactly one markdown implementation and it lives on this
 * side of the wire (escaping is its security invariant, and duplicating it in
 * the client would mean maintaining that invariant twice). Any view holding
 * text it did not fetch from an endpoint that already renders — a journal, a
 * streamed chat reply — posts it here instead of doing its own thing.
 *
 * `text` renders as markdown, with the frontmatter table ahead of the body, so
 * a journal's metadata arrives as a table rather than raw YAML. Passing `lang`
 * renders one highlighted code block instead.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { readBody, TOO_LARGE } from "../chat/chat-body.js";
import { highlightCode } from "../../ui/render/highlight.js";
import { renderFrontmatter, renderMarkdown } from "../../ui/render/markdown.js";

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** Languages that mean "this is a document", not "this is a code block". */
const AS_MARKDOWN = new Set(["", "md", "markdown", "mdx", "text", "txt"]);

/** The class name is source-derived, so it is reduced to the safe alphabet. */
function langClass(lang: string): string {
	return lang.replace(/[^\w+#.-]/g, "").slice(0, 24);
}

export function renderPayload(text: string, lang: string): { html: string } {
	if (AS_MARKDOWN.has(lang.trim().toLowerCase())) {
		return { html: renderFrontmatter(text).html + renderMarkdown(text) };
	}
	const cls = langClass(lang);
	const open = cls === "" ? "<code>" : `<code class="lang-${cls}">`;
	return { html: `<pre class="code">${open}${highlightCode(text, lang)}</code></pre>` };
}

/** Throws a message the route turns into a 400. */
function parseRenderRequest(raw: string): { text: string; lang: string } {
	let body: unknown;
	try {
		body = JSON.parse(raw) as unknown;
	} catch {
		throw new Error("body must be JSON");
	}
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		throw new Error("body must be a JSON object");
	}
	const { text, lang } = body as Record<string, unknown>;
	if (typeof text !== "string") throw new Error("text is required");
	if (lang !== undefined && typeof lang !== "string") throw new Error("lang must be a string");
	return { text, lang: typeof lang === "string" ? lang : "" };
}

/** Returns true when it handled the route. Every reply is JSON. */
export function handleRender(
	method: string,
	pathname: string,
	req: IncomingMessage,
	res: ServerResponse,
): boolean {
	if (method !== "POST" || pathname !== "/api/render") return false;
	void readBody(req).then(
		(raw) => {
			try {
				const { text, lang } = parseRenderRequest(raw);
				json(res, 200, renderPayload(text, lang));
			} catch (e) {
				json(res, 400, { error: e instanceof Error ? e.message : String(e) });
			}
		},
		(e: unknown) => {
			const msg = e instanceof Error ? e.message : String(e);
			json(res, msg === TOO_LARGE ? 413 : 400, { error: msg });
		},
	);
	return true;
}
