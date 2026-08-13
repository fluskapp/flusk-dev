/**
 * The docs feature's typed server functions: the indexed-markdown list and
 * one document, rendered. Bodies delegate to the same modules the legacy
 * /api/artifacts and /api/artifact handlers used (artifact-scan, the shared
 * markdown renderer), and keep that handler's security rule: exact
 * membership of the scanner's index, never a prefix test.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { resolve } from "node:path";
import { loadConfig } from "../../platform/config/config.js";
import { renderMarkdown } from "../../ui/render/markdown.js";
import { type Artifact, scanArtifacts } from "../projects/artifact-scan.repository.js";
import { readTextSync } from "../projects/file-read.repository.js";
import { expandHome } from "../projects/journal-scan.repository.js";

export type { Artifact } from "../projects/artifact-scan.repository.js";

const ui = createServerOnlyFn(() => loadConfig(process.cwd()).ui);

/** The artifact the request names — only files the scanner already indexed. */
const indexedArtifact = createServerOnlyFn((target: string): Artifact | null => {
	if (target === "") return null;
	const path = resolve(expandHome(target));
	return scanArtifacts(ui().projectDirs).find((a) => a.path === path) ?? null;
});

/** Every indexed markdown file across the configured project roots. */
export const getArtifacts = createServerFn().handler(async (): Promise<Artifact[]> => {
	return scanArtifacts(ui().projectDirs);
});

/** The light half of a document: what the toolbar and property table need. */
export interface DocMeta {
	path: string;
	title: string;
	project: string;
	frontmatter: Record<string, string>;
}

export const getDocMeta = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<DocMeta | null> => {
		const a = indexedArtifact(data.path);
		if (a === null) return null;
		return { path: a.path, title: a.title, project: a.project, frontmatter: a.frontmatter };
	});

export interface DocBody {
	text: string;
	html: string;
}

/**
 * The heavy half, deferred by the route loader. `text` as well as `html`:
 * without the source, Split and Raw would be disabled on every document tab
 * while the help sheet still advertises s / R (see content.router.ts).
 */
export const getDocBody = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }): Promise<DocBody> => {
		const a = indexedArtifact(data.path);
		if (a === null) throw new Error("not an indexed document");
		const text = readTextSync(a.path);
		return { text, html: renderMarkdown(text) };
	});
