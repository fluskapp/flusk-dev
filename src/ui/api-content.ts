/**
 * Content endpoints: harness journals, indexed markdown, and the overview.
 * Split from server.ts so each stays within the size standard.
 *
 * Every path a request can name is validated against the configured
 * directories before it is read — the dashboard serves files, so the only
 * readable ones are those the config already points at.
 */
import { readFileSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { resolve } from "node:path";
import { loadConfig } from "../config/config.js";
import { scanArtifacts } from "./artifact-scan.js";
import { expandHome, resolveJournalDirs, scanJournals } from "./journal-scan.js";
import { renderMarkdown } from "./markdown.js";
import { buildOverview } from "./overview.js";
import { scanSessions } from "./scan.js";

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

const ui = () => loadConfig(process.cwd()).ui;

/** Absolute path, but only if it sits inside one of `roots`. */
function within(target: string | null, roots: string[]): string | null {
	if (target === null || target === "") return null;
	const path = resolve(expandHome(target));
	return roots.some((r) => path.startsWith(`${resolve(r)}/`)) ? path : null;
}

/** Returns true when it handled the route. */
export function handleContent(
	method: string,
	pathname: string,
	repo: string | null,
	res: ServerResponse,
): boolean {
	if (method !== "GET") return false;

	if (pathname === "/api/journals") {
		json(res, 200, scanJournals(ui().harnessDirs));
		return true;
	}
	if (pathname === "/api/journal") {
		const path = within(repo, resolveJournalDirs(ui().harnessDirs));
		if (path === null) json(res, 400, { error: "not a configured journal path" });
		else sendText(path, res);
		return true;
	}
	if (pathname === "/api/artifacts") {
		json(res, 200, scanArtifacts(ui().projectDirs));
		return true;
	}
	if (pathname === "/api/artifact") {
		const roots = scanArtifacts(ui().projectDirs).map((a) => a.path);
		const path = repo === null ? null : resolve(expandHome(repo));
		// Exact membership, not prefix: only files the scanner already indexed.
		if (path === null || !roots.includes(path)) {
			json(res, 400, { error: "not an indexed document" });
			return true;
		}
		const meta = scanArtifacts(ui().projectDirs).find((a) => a.path === path);
		try {
			const text = readFileSync(path, "utf8");
			json(res, 200, {
				path,
				title: meta?.title ?? path,
				frontmatter: meta?.frontmatter ?? {},
				html: renderMarkdown(text),
			});
		} catch (e) {
			json(res, 404, { error: e instanceof Error ? e.message : String(e) });
		}
		return true;
	}
	if (pathname === "/api/overview") {
		const cfg = ui();
		json(
			res,
			200,
			buildOverview(scanSessions(), scanJournals(cfg.harnessDirs), scanArtifacts(cfg.projectDirs).length),
		);
		return true;
	}
	return false;
}

function sendText(path: string, res: ServerResponse): void {
	try {
		res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
		res.end(readFileSync(path, "utf8"));
	} catch (e) {
		json(res, 404, { error: e instanceof Error ? e.message : String(e) });
	}
}
