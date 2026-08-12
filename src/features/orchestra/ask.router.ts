/**
 * The Ask-AI endpoints: who can answer, what would be attached, and (in
 * api-ask-stream.ts) the answer itself.
 *
 * The context route is a GET on purpose — it is a read of what is already on
 * screen, it changes nothing, and being able to paste its URL into a terminal
 * is how you find out why a block is missing. It never 500s on a half-failure:
 * `assembleContext` turns every absent half into a note, so the panel always
 * has something to print (a blank attachment box is indistinguishable from a
 * broken one).
 *
 * `repo` scopes the answerer list, because `<repo>/.flusk/agents/*.md` is
 * project-scoped: two projects legitimately offer different agents. It is
 * matched against the directories api-chat.ts already trusts, so the query
 * string cannot point the registry at an arbitrary directory on disk.
 */
import type { ServerResponse } from "node:http";
import { resolve } from "node:path";
import { loadConfig } from "../../platform/config/config.js";
import { allowedCwds } from "../chat/chat.router.js";
import { json } from "../docs/doc-util.js";
import { askAnswerers } from "./ask-answerers.js";
import { assembleContext } from "./ask-context.js";

/** A 1-based coordinate, or 0 for "no caret" — which still attaches a span. */
function coord(raw: string | null): number {
	const n = Number(raw ?? "");
	return Number.isInteger(n) && n >= 1 ? n : 0;
}

/** The repo the request names, when it is one this server already trusts. */
function repoOf(cfg: ReturnType<typeof loadConfig>, raw: string | null): string {
	if (raw === null || raw === "") return process.cwd();
	const path = resolve(raw);
	return allowedCwds(cfg).includes(path) ? path : process.cwd();
}

async function serveAnswerers(query: URLSearchParams, res: ServerResponse): Promise<void> {
	try {
		const cfg = loadConfig(process.cwd());
		const { list } = await askAnswerers(cfg, repoOf(cfg, query.get("repo")));
		json(res, 200, list);
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}

async function serveContext(query: URLSearchParams, res: ServerResponse): Promise<void> {
	try {
		const cfg = loadConfig(process.cwd());
		json(
			res,
			200,
			await assembleContext(cfg, {
				file: query.get("file"),
				line: coord(query.get("line")),
				col: coord(query.get("col")),
			}),
		);
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}

/** Returns true when it handled the route. */
export function handleAsk(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method !== "GET") return false;
	if (pathname === "/api/ask/answerers") void serveAnswerers(query, res);
	else if (pathname === "/api/ask/context") void serveContext(query, res);
	else return false;
	return true;
}
