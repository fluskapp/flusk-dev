/**
 * Throwing away everything that is not the page: chrome, behaviour, and the
 * furniture around the prose.
 *
 * Two jobs. Deleting whole elements (script, style, nav, header, footer,
 * aside…) removes both the code a page wanted to run — which is never run
 * here, since nothing but text survives to the renderer — and the navigation
 * that makes a docs page unreadable in a narrow rail. Then narrowing to
 * <main>/<article> when the page marks one, because a site that says where
 * its content is should be believed.
 */
import { firstSpan } from "./html-scan.js";

/**
 * Deleted whole, content included. `script`/`style`/`template` because their
 * text is not prose; `svg`/`canvas`/`iframe`/`object`/`embed` because their
 * text is markup; the rest because it is navigation, and reading a page
 * beside your code is exactly when a sidebar is worth nothing.
 */
const DROP = [
	"head",
	"script",
	"style",
	"noscript",
	"template",
	"svg",
	"canvas",
	"iframe",
	"object",
	"embed",
	"form",
	"select",
	"nav",
	"header",
	"footer",
	"aside",
	"dialog",
];

/** Comments first: a comment can contain what looks like any tag at all. */
function dropComments(html: string): string {
	return html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, " ");
}

export function dropElement(html: string, tag: string): string {
	let out = html;
	for (let span = firstSpan(out, tag); span !== null; span = firstSpan(out, tag)) {
		out = `${out.slice(0, span.open)} ${out.slice(span.end)}`;
	}
	return out;
}

/**
 * The region worth reading. <main> and <article> are the page's own claim
 * about where its content is; the fallback chain ends at <body>, and at the
 * whole string for a fragment with no body at all.
 */
export function mainRegion(html: string): string {
	for (const tag of ["main", "article"]) {
		const span = firstSpan(html, tag);
		const inner = span === null ? "" : html.slice(span.innerStart, span.innerEnd);
		// A <main> holding a spinner is not the content: too small to be the
		// article, so keep looking rather than rendering an empty page.
		if (inner.trim().length > 200) return inner;
	}
	const body = firstSpan(html, "body");
	return body === null ? html : html.slice(body.innerStart, body.innerEnd);
}

/** Chrome and behaviour gone, narrowed to the content region. */
export function cleanDocument(html: string): string {
	let out = dropComments(html);
	for (const tag of DROP) out = dropElement(out, tag);
	return mainRegion(out);
}
