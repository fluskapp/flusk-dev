/**
 * Go to File, as a typed server function: the same `rg --files` listing and
 * fuzzy score /api/files serves, so the palette's ranking order is the
 * ranker's — never a client-side re-sort. A request names a project, never a
 * directory, so `../` and absolute paths stay inexpressible here too.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { fuzzyPath, listFiles, projectFor, searchRoots } from "./files.js";

/** One Go-to-File row: the path, and which configured root owns it. */
export interface GotoHit {
	path: string;
	project: string;
}

/** Results one request returns; the palette shows far fewer. */
const FILE_RESULTS = 50;

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

export const gotoFiles = createServerFn({ method: "POST" })
	.inputValidator((data: { q: string; project?: string; limit?: number }) => data)
	.handler(async ({ data }): Promise<GotoHit[]> => {
		const c = cfg();
		const roots = searchRoots(c, data.project);
		const files = await listFiles(c, data.project !== undefined ? { project: data.project } : {});
		return fuzzyPath(files, data.q, data.limit ?? FILE_RESULTS).map((path) => ({
			path,
			project: projectFor(roots, path),
		}));
	});
