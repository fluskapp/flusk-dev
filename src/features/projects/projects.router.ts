/**
 * Project endpoints: the project list that is the dashboard's front page, one
 * project in full, and the unified run feed.
 *
 * Every answer is derived from the filesystem — sessions, journals, git — so
 * the dashboard has nothing to be disconnected from and no state of its own to
 * fall out of date.
 *
 * Config is re-read per request on purpose — the same choice api-content.ts
 * makes — so editing ~/.flusk/config.json shows up without restarting `flusk ui`.
 */
import type { ServerResponse } from "node:http";
import { loadConfig } from "../../platform/config/config.js";
import type { FluskConfig } from "../../platform/config/types.js";
import { projectDetail } from "./project-detail.repository.js";
import { scanProjects } from "./project-scan.repository.js";
import { runFeed } from "./run-feed.js";

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

const config = (): FluskConfig => loadConfig(process.cwd());

/** A positive integer query param, or undefined when absent/garbage. */
function count(raw: string | null): number | undefined {
	if (raw === null || raw.trim() === "") return undefined;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/** Returns true when it handled the route. */
export function handleProjects(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method === "GET" && pathname === "/api/projects") {
		json(res, 200, scanProjects(config()));
		return true;
	}
	if (method === "GET" && pathname === "/api/project") {
		const name = query.get("name") ?? "";
		const scanned = projectDetail(config(), name);
		if (scanned === null) json(res, 404, { error: `unknown project: ${name}` });
		else json(res, 200, scanned);
		return true;
	}
	if (method === "GET" && pathname === "/api/runs") {
		const project = query.get("project");
		const limit = count(query.get("limit"));
		json(
			res,
			200,
			runFeed(config(), {
				...(project !== null && project !== "" ? { project } : {}),
				...(limit !== undefined ? { limit } : {}),
			}),
		);
		return true;
	}
	return false;
}
