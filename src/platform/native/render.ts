/**
 * Markdown and highlight behind the native seam: source text in, HTML out,
 * whoever answers. Nothing above this file knows which implementation ran —
 * the same surface is served by the Rust port when the prebuilt exists and
 * by the TypeScript reference (ui/render) otherwise, or always under
 * FLUSK_NATIVE=0. Inputs past 64KB go through the async binding so the
 * Electron main process never blocks on a large paste.
 */
import { highlightCode } from "../../ui/render/highlight.js";
import { renderMarkdown } from "../../ui/render/markdown.js";
import { nativeModule } from "./native.repository.js";

/** Past this many code units the native call runs as an AsyncTask. */
const ASYNC_PAST = 64 * 1024;

/**
 * The render slice of the binding. `nativeModule()` is typed for the history
 * stage; every stage lives in the same cdylib, so the presence check in
 * `nativeRenderModule` doubles as the stale-binary guard.
 */
interface NativeRender {
	renderMarkdownHtml(text: string): string;
	renderMarkdownHtmlAsync(text: string): Promise<string>;
	highlightHtml(code: string, lang: string): string;
	highlightHtmlAsync(code: string, lang: string): Promise<string>;
}

export interface Renderer {
	markdown(src: string): Promise<string>;
	highlight(code: string, lang: string): Promise<string>;
	/** Which implementation is answering — surfaced in logs and tests only. */
	readonly impl: "native" | "ts";
}

/**
 * Mermaid fences are drawn by the TS reference (mermaid-*.ts), which is not
 * ported; any document that could reach that path renders on the reference.
 * Over-matching is safe — the reference is correct by definition.
 */
const MERMAID_FENCE = /```\s*mermaid(?![\w+#.-])/;

/** The binding with the render exports present, or null (absent/disabled/stale). */
export function nativeRenderModule(): NativeRender | null {
	const native = nativeModule() as unknown as Partial<NativeRender> | null;
	if (native === null || typeof native.renderMarkdownHtml !== "function") return null;
	return native as NativeRender;
}

function tsRenderer(): Renderer {
	return {
		impl: "ts",
		markdown: async (src) => renderMarkdown(src),
		highlight: async (code, lang) => highlightCode(code, lang),
	};
}

export function createRenderer(): Renderer {
	const native = nativeRenderModule();
	if (native === null) return tsRenderer();
	return {
		impl: "native",
		markdown: async (src) => {
			if (typeof src !== "string" || src === "" || MERMAID_FENCE.test(src)) {
				return renderMarkdown(src);
			}
			try {
				return src.length > ASYNC_PAST
					? await native.renderMarkdownHtmlAsync(src)
					: native.renderMarkdownHtml(src);
			} catch {
				// Never let a native failure take rendering down: the reference answers.
				return renderMarkdown(src);
			}
		},
		highlight: async (code, lang) => {
			if (typeof code !== "string" || code === "") return "";
			try {
				return code.length > ASYNC_PAST
					? await native.highlightHtmlAsync(code, lang)
					: native.highlightHtml(code, lang);
			} catch {
				return highlightCode(code, lang);
			}
		},
	};
}
