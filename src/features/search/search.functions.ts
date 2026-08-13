/**
 * The search feature's typed server surface for Find in Files: one function,
 * delegating to the same ripgrep pipeline /api/find serves, so the two
 * surfaces cannot drift while both exist. Bounds and refusals travel inside
 * FindResult (`truncated`, `note`) — the transport never invents its own.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { find } from "./ripgrep.js";
import type { FindQuery, FindResult } from "./types.js";

export type { FindFile, FindMatch, FindQuery, FindResult } from "./types.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** Content search across the configured roots. Empty queries answer empty. */
export const findInFiles = createServerFn({ method: "POST" })
	.inputValidator((data: FindQuery) => data)
	.handler(async ({ data }): Promise<FindResult> => {
		return find(cfg(), data);
	});
