/**
 * The membership test and the JSON writer every documentation route shares.
 *
 * Containment is the whole security story of this feature, so it is stated
 * ONCE: a request names a path, the path is resolved, and it must be a file
 * `rg --files` already listed under one of the configured roots. A lexical
 * prefix test would admit a symlink that resolves out of the root and every
 * unindexed file sitting beside the indexed ones.
 */
import type { ServerResponse } from "node:http";
import { resolve } from "node:path";
import type { AhConfig } from "../config/types.js";
import { isIndexedFile } from "../find/files.js";
import { expandHome } from "./journal-scan.js";

export function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** The indexed file the request names, or null — never a prefix test. */
export async function indexedFile(cfg: AhConfig, raw: string | null): Promise<string | null> {
	if (raw === null || raw === "") return null;
	const path = resolve(expandHome(raw));
	return (await isIndexedFile(cfg, path)) ? path : null;
}
