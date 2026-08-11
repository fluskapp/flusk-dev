/**
 * GET /api/file — one tracked file's body.
 *
 * Go to File (⌘⇧O) lists every file `rg --files` reports, but the workbench
 * could only render the documents and journals its own scanners index, so the
 * flagship fuzzy finder could FIND a source file and then land on an apology
 * instead of the file. This serves the rest.
 *
 * Containment is the exact-membership rule /api/files already uses: the path
 * must be one `listFiles(cfg)` returned. A request still names no directory,
 * so `../` and an absolute path outside the config are not expressible and
 * this adds no traversal surface.
 */
import { readFile } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { resolve } from "node:path";
import { loadConfig } from "../config/config.js";
import { listFiles } from "../find/files.js";
import { expandHome } from "./journal-scan.js";

/** Bytes served for one file. Past this a reader wants an editor, not a tab. */
const MAX_BYTES = 512 * 1024;
/** Head of the file checked for NUL — the cheap "is this text?" test. */
const SNIFF = 8_000;

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** Returns true when it handled the route. */
export function handleFileBody(
	method: string,
	pathname: string,
	repo: string | null,
	res: ServerResponse,
): boolean {
	if (method !== "GET" || pathname !== "/api/file") return false;
	void serve(repo, res);
	return true;
}

async function serve(repo: string | null, res: ServerResponse): Promise<void> {
	if (repo === null || repo === "") {
		json(res, 400, { error: "not a tracked file" });
		return;
	}
	const target = resolve(expandHome(repo));
	const files = await listFiles(loadConfig(process.cwd()));
	if (!files.includes(target)) {
		json(res, 400, { error: "not a tracked file" });
		return;
	}
	try {
		const buf = await readFile(target);
		// A binary file has no body worth rendering; say so rather than shipping
		// half a megabyte of replacement characters.
		if (buf.subarray(0, SNIFF).includes(0)) {
			json(res, 415, { error: "binary file" });
			return;
		}
		json(res, 200, {
			path: target,
			text: buf.subarray(0, MAX_BYTES).toString("utf8"),
			bytes: buf.length,
			truncated: buf.length > MAX_BYTES,
		});
	} catch (e) {
		json(res, 404, { error: e instanceof Error ? e.message : String(e) });
	}
}
