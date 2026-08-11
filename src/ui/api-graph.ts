/**
 * The Graph tool window's routes: one read, one remedy.
 *
 *   GET  /api/graph?file=<path>[&symbol=<name>]   the four answers about a node
 *   POST /api/graph/build?repo=<root>             index (or continue indexing)
 *
 * The rules are the ones every other route here keeps, and they are kept in
 * this order deliberately: containment first (the path must be a file the
 * scanners already listed — exact membership, never a prefix test, so a
 * symlink out of the root cannot be asked about), then derivation, then the
 * store. Nothing reaches a graph file until the request has proved which
 * project it is allowed to ask about.
 *
 * A refusal carries its reason and an empty answer carries its remedy
 * (api-graph-report.ts mints both). The one thing this file must never do is
 * return 200 with four empty arrays and no sentence: that is the shape a
 * broken panel has, and the reader cannot tell the two apart.
 */
import type { ServerResponse } from "node:http";
import { basename } from "node:path";
import { loadConfig } from "../config/config.js";
import { indexedFile, json } from "./api-doc-util.js";
import { buildOnce, buildRoot, isBuilding } from "./api-graph-build.js";
import { graphReport } from "./api-graph-report.js";
import { rootFor, storeFor, targetFor } from "./api-graph-target.js";

export type { GraphReply, GraphState } from "./api-graph-types.js";
export { GRAPH_LIMITS } from "./api-graph-types.js";

/** Long enough for any identifier, short enough not to be a payload. */
const MAX_SYMBOL = 256;

/** The symbol asked about, or null for the file itself. */
function symbolOf(query: URLSearchParams): string | null {
	const raw = (query.get("symbol") ?? "").slice(0, MAX_SYMBOL).trim();
	return raw === "" ? null : raw;
}

async function serveGraph(query: URLSearchParams, res: ServerResponse): Promise<void> {
	try {
		const cfg = loadConfig(process.cwd());
		const file = await indexedFile(cfg, query.get("file"));
		if (file === null) return json(res, 400, { error: "not an indexed file" });
		const root = rootFor(cfg, file);
		if (root === null) return json(res, 400, { error: "no configured project holds that file" });
		const target = targetFor(root, file, symbolOf(query));
		// Unreachable through the membership test above, and cheap to be sure of:
		// an id that cannot be derived would otherwise be answered about as
		// "not indexed", which is a different and untrue sentence.
		if (target === null) return json(res, 400, { error: "no node id derivable from that file" });
		json(res, 200, await graphReport(target, storeFor(root.path)));
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}

async function serveBuild(query: URLSearchParams, res: ServerResponse): Promise<void> {
	try {
		const cfg = loadConfig(process.cwd());
		const root = buildRoot(cfg, query.get("repo"));
		if (root === null) return json(res, 400, { error: "not a configured project root" });
		// Reported before awaiting, so the reply can say whether this call did the
		// work or merely joined a pass that was already running.
		const joined = isBuilding(root);
		const report = await buildOnce(root, basename(root) || root);
		json(res, 200, { ...report, joined });
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}

/** Returns true when it handled the route. */
export function handleGraph(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method === "GET" && pathname === "/api/graph") void serveGraph(query, res);
	else if (method === "POST" && pathname === "/api/graph/build") void serveBuild(query, res);
	else return false;
	return true;
}
