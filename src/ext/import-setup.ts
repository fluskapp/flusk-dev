/**
 * Turning one file on disk into one setup function.
 *
 * WHY THIS FILE EXISTS: "plain JS, no build step" hides two Node traps that
 * would otherwise surface as mystery bugs in the loader.
 *
 *  1. Module kind. A `.js` file under ~/.ah has no package.json above it, so
 *     Node decides by sniffing its syntax (module-syntax detection, on by
 *     default since 22.7) — `export default` works. A project whose
 *     package.json says `"type": "commonjs"` overrides that sniffing and the
 *     same file is a SyntaxError. That is a failure, reported like any other,
 *     never a crash.
 *  2. Module cache. `import()` caches by URL forever, so in a long-lived
 *     process (`ah ui`, watch mode) an edited extension would keep serving the
 *     old module. The mtime rides in the query string to key the cache to the
 *     file's actual content.
 *
 * Note the boundary this file marks: from here on the imported code is not
 * ours. Everything it does happens inside the caller's try/catch.
 */
import { stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { ExtensionSetup } from "./types.js";

async function versionedUrl(source: string): Promise<string> {
	const url = pathToFileURL(source);
	const stamp = await stat(source).then(
		(s) => String(s.mtimeMs),
		() => "0",
	);
	return `${url.href}?mtime=${encodeURIComponent(stamp)}`;
}

/** Throws on anything that is not an ESM file default-exporting a function. */
export async function importSetup(source: string): Promise<ExtensionSetup> {
	const module: unknown = await import(await versionedUrl(source));
	const setup = (module as { default?: unknown }).default;
	if (typeof setup !== "function") {
		throw new Error(
			"an extension must default-export a setup function: export default (ah) => { … }",
		);
	}
	return setup as ExtensionSetup;
}
